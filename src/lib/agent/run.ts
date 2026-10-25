import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { DesignIssue } from "@/lib/agent/checks";
import { AGENT_SYSTEM, agentContext, type AgentComment } from "@/lib/agent/prompt";
import { AgentWorkspace, applyOpsInput, checkDesignInput, findVisualInput, readArtboardInput, type AgentScope, type ToolOutcome, type VisualFinder } from "@/lib/agent/workspace";
import type { CanvasDesign } from "@/lib/canvas/document";
import type { DesignSystem } from "@/lib/design-systems/schema";
import type { CanvasOp } from "@/lib/canvas/ops";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** Claude model when someone brings their own Anthropic key. */
export const ANTHROPIC_AGENT_MODEL = process.env.DESIGN_AGENT_MODEL || "claude-opus-5-5";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];
const AGENT_EFFORT: Effort = (EFFORTS as readonly string[]).includes(process.env.DESIGN_AGENT_EFFORT ?? "") ? (process.env.DESIGN_AGENT_EFFORT as Effort) : "medium";

/** Hard stop on model round trips per request. */
const MAX_TURNS = 14;
const MAX_JSON_RETRIES = 2;

export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "ops"; ops: CanvasOp[]; label: string }
  | { type: "blocks"; blocks: VisualBlockRecord[] }
  | { type: "tool"; name: string; ok: boolean; summary: string }
  | { type: "done"; stopReason: string; turns: number; issues: DesignIssue[]; usage: { input: number; output: number; cacheRead: number }; model: string }
  | { type: "error"; message: string };

export type AgentRequest = {
  design: CanvasDesign;
  scope: AgentScope;
  prompt: string;
  comments?: AgentComment[];
  system?: DesignSystem;
  /** Data URLs: a render of the artboard in focus and any reference images. */
  images?: string[];
};

/** Which model service runs the loop and whose key pays for it. */
export type AgentProvider = { kind: "openrouter"; apiKey: string; model: string; fallbacks: string[] } | { kind: "anthropic"; apiKey: string; model: string };

export function parseDataUrl(url: string): { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string } | null {
  const match = url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  return match ? { mediaType: match[1] as "image/png", data: match[2]! } : null;
}

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "apply_ops",
    description: "Apply a batch of canvas ops to the design as one undo step. All-or-nothing: if any op is invalid nothing changes and the error says why.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Short name for this change, shown in the user's undo history" },
        ops: { type: "array", items: { type: "object" }, description: "Ops in the order to apply them" },
      },
      required: ["label", "ops"],
    },
  },
  {
    name: "read_artboard",
    description: "Return one artboard's full scene JSON.",
    input_schema: { type: "object", properties: { artboard_id: { type: "string" } }, required: ["artboard_id"] },
  },
  {
    name: "find_visual",
    description: "Find a library visual (product UI, illustration or 3D object) recoloured to the brand and place it in an existing visual node.",
    input_schema: {
      type: "object",
      properties: {
        artboard_id: { type: "string" },
        node_id: { type: "string", description: "Id of a visual node" },
        query: { type: "string", description: "Concrete subject of the visual" },
        kind: { type: "string", enum: ["ui", "illustration", "3d"] },
      },
      required: ["artboard_id", "node_id", "query", "kind"],
    },
  },
  {
    name: "check_design",
    description: "Check an artboard for broken accents, empty or placeholder content, likely overflow, low contrast and competing elements.",
    input_schema: { type: "object", properties: { artboard_id: { type: "string" } }, required: ["artboard_id"] },
  },
];

export const TOOL_DESCRIPTIONS = Object.fromEntries(TOOLS.map((tool) => [tool.name, tool.description ?? ""])) as Record<"apply_ops" | "read_artboard" | "find_visual" | "check_design", string>;

/** The slice of the SDK client the loop uses (tests pass a fake). */
export type AgentClient = { beta: { messages: { stream: Anthropic["beta"]["messages"]["stream"] } } };

export async function runTool(workspace: AgentWorkspace, block: Anthropic.Beta.BetaToolUseBlock): Promise<ToolOutcome> {
  // Inputs stream eagerly, so the API doesn't validate them: check the shape here.
  const invalid = (): ToolOutcome => ({ content: JSON.stringify({ INVALID_JSON: JSON.stringify(block.input) }), isError: true });
  switch (block.name) {
    case "apply_ops": {
      const input = applyOpsInput.safeParse(block.input);
      return input.success ? workspace.applyOps(input.data.label, input.data.ops) : invalid();
    }
    case "read_artboard": {
      const input = readArtboardInput.safeParse(block.input);
      return input.success ? workspace.readArtboard(input.data.artboard_id) : invalid();
    }
    case "find_visual": {
      const input = findVisualInput.safeParse(block.input);
      return input.success ? workspace.findVisual(input.data) : invalid();
    }
    case "check_design": {
      const input = checkDesignInput.safeParse(block.input);
      return input.success ? workspace.check(input.data.artboard_id) : invalid();
    }
    default:
      return { content: `Unknown tool ${block.name}`, isError: true };
  }
}

/** The opening user turn: the design context, then any images. */
export function openingContent(request: AgentRequest) {
  const text = agentContext(request.design, request.scope, request.prompt, request.comments, request.system);
  const images = (request.images ?? []).map(parseDataUrl).filter((image): image is NonNullable<ReturnType<typeof parseDataUrl>> => !!image).slice(0, 3);
  const note = images.length ? "\nThe first image is a render of the artboard in focus as it looks now; any others are references the user attached." : "";
  return { text: text + note, images };
}

/**
 * The design agent: a manual tool loop on Claude (used with a person's own
 * Anthropic key; the default provider is OpenRouter, see run-openrouter.ts). Ops are validated against a
 * working copy and streamed to the editor as they're accepted, so the user
 * watches the design change. The loop asks for a check before finishing.
 */
export async function runDesignAgent(
  request: AgentRequest,
  emit: (event: AgentEvent) => void,
  options: { client?: AgentClient; apiKey?: string; model?: string; findVisual?: VisualFinder; signal?: AbortSignal } = {},
): Promise<void> {
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey });
  const model = options.model || ANTHROPIC_AGENT_MODEL;
  const workspace = new AgentWorkspace(request.design, request.scope, {
    onOps: (ops, label) => emit({ type: "ops", ops, label }),
    onBlocks: (blocks) => emit({ type: "blocks", blocks }),
    findVisual: options.findVisual,
  });
  const opening = openingContent(request);
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: opening.images.length
        ? [...opening.images.map((image) => ({ type: "image" as const, source: { type: "base64" as const, media_type: image.mediaType, data: image.data } })), { type: "text" as const, text: opening.text }]
        : opening.text,
    },
  ];
  const usage = { input: 0, output: 0, cacheRead: 0 };
  let nudged = false;
  let jsonRetries = 0;
  let stopReason = "max_turns";
  let turns = 0;

  for (let attempt = 0; attempt < MAX_TURNS; attempt += 1) {
    if (options.signal?.aborted) {
      stopReason = "aborted";
      break;
    }
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 32000,
        // Refusals are retried server-side on a fallback model chosen by category.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: AGENT_EFFORT },
        system: [{ type: "text", text: AGENT_SYSTEM, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages,
      },
      { signal: options.signal },
    );
    stream.on("text", (delta) => emit({ type: "text", delta }));
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
      turns += 1;
    } catch (error) {
      // Only unparseable tool input is retried; API errors (auth, rate limits) surface.
      if (error instanceof Anthropic.APIError || options.signal?.aborted || jsonRetries++ >= MAX_JSON_RETRIES) throw error;
      continue;
    }
    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    stopReason = message.stop_reason ?? "unknown";

    if (message.stop_reason === "refusal") {
      emit({ type: "error", message: "The model declined this request." });
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }
    const toolUses = message.content.filter((block): block is Anthropic.Beta.BetaToolUseBlock => block.type === "tool_use");
    if (toolUses.length === 0) {
      if (workspace.appliedBatches > 0 && !workspace.checkedSinceLastEdit && !nudged) {
        // The check step: one reminder to verify before handing back.
        nudged = true;
        messages.push({ role: "assistant", content: message.content });
        messages.push({ role: "user", content: "Before you finish, call check_design on the artboards you changed and fix any errors it reports." });
        continue;
      }
      break;
    }
    if (message.stop_reason === "max_tokens") {
      // A cut-off tool input can parse as a valid partial object; never run it.
      emit({ type: "error", message: "The response was cut off before the change was complete." });
      break;
    }
    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of toolUses) {
      const outcome = await runTool(workspace, block);
      emit({ type: "tool", name: block.name, ok: !outcome.isError, summary: outcome.content.slice(0, 200) });
      results.push({ type: "tool_result", tool_use_id: block.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
  }

  emit({ type: "done", stopReason, turns, issues: workspace.lastIssues, usage, model });
}

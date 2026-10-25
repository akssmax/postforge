import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { isStepCount, streamText, tool, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { AGENT_SYSTEM } from "@/lib/agent/prompt";
import { openingContent, TOOL_DESCRIPTIONS, type AgentEvent, type AgentRequest } from "@/lib/agent/run";
import { AgentWorkspace, applyOpsInput, checkDesignInput, findVisualInput, readArtboardInput, type ToolOutcome, type VisualFinder } from "@/lib/agent/workspace";

/** Model round trips per request (each tool call is a step). */
const MAX_STEPS = 14;
const TIMEOUT_MS = 180_000;

/**
 * The design agent on OpenRouter (the default provider). Same tools and
 * workspace as the Claude loop; the AI SDK runs the tool loop, and the check
 * step is enforced with one follow-up turn if the model skipped it.
 */
export async function runDesignAgentOpenRouter(
  request: AgentRequest,
  emit: (event: AgentEvent) => void,
  options: { apiKey: string; model: string; fallbacks?: string[]; findVisual?: VisualFinder; signal?: AbortSignal; languageModel?: LanguageModel },
): Promise<void> {
  const workspace = new AgentWorkspace(request.design, request.scope, {
    onOps: (ops, label) => emit({ type: "ops", ops, label }),
    onBlocks: (blocks) => emit({ type: "blocks", blocks }),
    findVisual: options.findVisual,
  });
  const report = (name: string, outcome: ToolOutcome) => {
    emit({ type: "tool", name, ok: !outcome.isError, summary: outcome.content.slice(0, 200) });
    // Errors go back to the model as text so it can correct itself.
    return outcome.isError ? `ERROR: ${outcome.content}` : outcome.content;
  };
  const tools = {
    apply_ops: tool({ description: TOOL_DESCRIPTIONS.apply_ops, inputSchema: applyOpsInput.extend({ ops: z.array(z.record(z.string(), z.unknown())).min(1).max(200) }), execute: async (input) => report("apply_ops", workspace.applyOps(input.label, input.ops)) }),
    read_artboard: tool({ description: TOOL_DESCRIPTIONS.read_artboard, inputSchema: readArtboardInput, execute: async (input) => report("read_artboard", workspace.readArtboard(input.artboard_id)) }),
    find_visual: tool({ description: TOOL_DESCRIPTIONS.find_visual, inputSchema: findVisualInput, execute: async (input) => report("find_visual", await workspace.findVisual(input)) }),
    check_design: tool({ description: TOOL_DESCRIPTIONS.check_design, inputSchema: checkDesignInput, execute: async (input) => report("check_design", workspace.check(input.artboard_id)) }),
  };

  const openRouter = createOpenRouter({ apiKey: options.apiKey });
  const opening = openingContent(request);
  let messages: ModelMessage[] = [
    {
      role: "user",
      content: [...opening.images.map((image) => ({ type: "image" as const, image: image.data, mediaType: image.mediaType })), { type: "text" as const, text: opening.text }],
    },
  ];
  const usage = { input: 0, output: 0, cacheRead: 0 };
  let turns = 0;
  let stopReason = "unknown";
  let servedBy = options.model;

  for (let round = 0; round < 2; round += 1) {
    const result = streamText({
      model: options.languageModel ?? openRouter(options.model),
      // OpenRouter tries these if the primary free model is busy or retired.
      providerOptions: { openrouter: { models: [options.model, ...(options.fallbacks ?? []).filter((id) => id !== options.model)].slice(0, 3) } },
      system: AGENT_SYSTEM,
      messages,
      tools,
      toolChoice: "auto",
      stopWhen: isStepCount(MAX_STEPS),
      abortSignal: options.signal,
      timeout: TIMEOUT_MS,
    });
    for await (const delta of result.textStream) emit({ type: "text", delta });
    const [steps, total, response, finish] = await Promise.all([result.steps, result.totalUsage, result.response, result.finishReason]);
    turns += steps.length;
    usage.input += total.inputTokens ?? 0;
    usage.output += total.outputTokens ?? 0;
    usage.cacheRead += total.inputTokenDetails?.cacheReadTokens ?? 0;
    stopReason = String(finish);
    servedBy = response.modelId || servedBy;
    if (round > 0 || workspace.appliedBatches === 0 || workspace.checkedSinceLastEdit) break;
    // The check step: one reminder to verify before handing back.
    messages = [...messages, ...response.messages, { role: "user", content: "Before you finish, call check_design on the artboards you changed and fix any errors it reports." }];
  }

  emit({ type: "done", stopReason, turns, issues: workspace.lastIssues, usage, model: servedBy });
}

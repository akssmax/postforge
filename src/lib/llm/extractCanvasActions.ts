import type { UIMessage } from "ai";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { CANVAS_TOOL_PART_TYPES } from "@/lib/llm/schemas/canvasTools";
import { mergeCanvasPatches } from "@/lib/llm/services/computeCanvasPatch";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";

type ToolOutput = CanvasPatchResult & {
  plan?: ValidatedDesignPlan;
  score?: number;
};

const CANVAS_TOOL_TYPES = CANVAS_TOOL_PART_TYPES;

function extractPatchesFromParts(parts: UIMessage["parts"]): CanvasPatchResult[] {
  const patches: CanvasPatchResult[] = [];

  for (const part of parts) {
    if (
      CANVAS_TOOL_TYPES.includes(part.type as (typeof CANVAS_TOOL_TYPES)[number]) &&
      "state" in part &&
      part.state === "output-available" &&
      "output" in part
    ) {
      const output = part.output as ToolOutput;
      if (output?.success !== false) {
        if (output.document || output.brand || output.featured || output.clientAction) {
          patches.push(output);
        }
      }
    }
  }

  return patches;
}

/** Individual tool outputs — preserves per-tool targetArtboards. */
export function extractCanvasPatchesFromMessage(message: UIMessage): CanvasPatchResult[] {
  if (message.role !== "assistant") return [];
  return extractPatchesFromParts(message.parts);
}

export function extractCanvasPatchFromMessage(
  message: UIMessage,
): CanvasPatchResult | null {
  if (message.role !== "assistant") return null;
  const patches = extractPatchesFromParts(message.parts);
  return patches.length > 0 ? mergeCanvasPatches(patches) : null;
}

export function extractLatestCanvasPatch(messages: UIMessage[]): CanvasPatchResult | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const patch = extractCanvasPatchFromMessage(messages[i]!);
    if (patch) return patch;
  }
  return null;
}

/** Client actions may arrive on failed tool results (e.g. upload-required). */
export function extractLatestClientAction(
  messages: UIMessage[],
): CanvasPatchResult["clientAction"] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (
        CANVAS_TOOL_TYPES.includes(part.type as (typeof CANVAS_TOOL_TYPES)[number]) &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        const output = part.output as ToolOutput;
        if (output?.clientAction) return output.clientAction;
      }
    }
  }
  return null;
}

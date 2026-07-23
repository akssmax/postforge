import type { UIMessage } from "ai";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";

export type DesignVariantResult = {
  theme: string;
  layoutId: string;
  rationale: string;
  summary: string;
  score: number;
  plan: ValidatedDesignPlan;
};

type ToolOutput = {
  success?: boolean;
  plan?: ValidatedDesignPlan;
  variants?: DesignVariantResult[];
  error?: string;
};

export function extractLatestDesignPlan(
  messages: UIMessage[],
): ValidatedDesignPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (
        part.type === "tool-updateDesign" &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        const output = part.output as ToolOutput;
        if (output?.success && output.plan) {
          return output.plan;
        }
      }
    }
  }
  return null;
}

export function extractLatestDesignVariants(
  messages: UIMessage[],
): DesignVariantResult[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      if (
        part.type === "tool-updateDesignVariants" &&
        "state" in part &&
        part.state === "output-available" &&
        "output" in part
      ) {
        const output = part.output as ToolOutput;
        if (output?.success && output.variants?.length) {
          return output.variants;
        }
      }
    }
  }
  return null;
}

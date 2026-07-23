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

export function extractDesignPlanFromMessage(
  message: UIMessage,
): ValidatedDesignPlan | null {
  if (message.role !== "assistant") return null;

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
  return null;
}

export function extractLatestDesignPlan(
  messages: UIMessage[],
): ValidatedDesignPlan | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const plan = extractDesignPlanFromMessage(messages[i]!);
    if (plan) return plan;
  }
  return null;
}

export function extractDesignVariantsFromMessage(
  message: UIMessage,
): DesignVariantResult[] | null {
  if (message.role !== "assistant") return null;

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
  return null;
}

export function extractLatestDesignVariants(
  messages: UIMessage[],
): DesignVariantResult[] | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const variants = extractDesignVariantsFromMessage(messages[i]!);
    if (variants?.length) return variants;
  }
  return null;
}

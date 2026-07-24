import { generateObject } from "ai";
import type { UIMessage } from "ai";
import { createMistralModel, LLM_STAGE_TIMEOUT_MS, llmAbortSignal } from "@/lib/llm/mistral";
import {
  campaignPlanSchema,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import {
  detectFormatFromBrief,
  extractThemesFromBrief,
} from "@/lib/llm/rules";
import {
  listAllowedPatternIds,
  listAllowedRecipeIds,
} from "@/lib/design-config/registry";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import type { PlatformId } from "@/lib/social-tool/presets";

function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

/**
 * Stage 1 — Creative Planner.
 * Converts an unstructured brief into a CampaignPlan (marketing strategy only).
 * Never emits layout ids, coordinates, spacing, or geometry.
 */
export async function planCampaign(input: {
  userMessage: string;
  messages: UIMessage[];
  platformId: PlatformId;
  themeAngle?: string;
}): Promise<CampaignPlan> {
  const userMessage = input.userMessage || latestUserText(input.messages);
  if (!userMessage.trim()) {
    return campaignPlanFromBrief("", input.platformId, input.themeAngle);
  }

  const fallback = campaignPlanFromBrief(userMessage, input.platformId, input.themeAngle);
  const format = detectFormatFromBrief(userMessage);
  const themes = extractThemesFromBrief(userMessage);
  const patterns = listAllowedPatternIds();
  const recipes = listAllowedRecipeIds();

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: campaignPlanSchema,
      temperature: 0,
      abortSignal: llmAbortSignal(LLM_STAGE_TIMEOUT_MS),
      system: [
        "You are the Creative Planner for a marketing design compiler.",
        "Convert the brief into a structured CampaignPlan — marketing strategy only.",
        "Never choose layouts, coordinates, spacing, typography, colors as hex, or geometry.",
        `Target platform: ${input.platformId}`,
        `Allowed communication.pattern values: ${patterns.join(", ")}`,
        `Allowed communication.recipeId values (optional hint): ${recipes.join(", ")}`,
        "Pick the best communication pattern for the message, not a layout name.",
        "Set visual.featuredKind to ui for product/metrics/SaaS proof; illustration for narrative/brand/lifestyle.",
        format === "ad"
          ? "This is an advertisement — set campaign.type to advertisement or promotion and format to ad."
          : "",
        themes.length > 1
          ? `Brief themes/angles: ${themes.join(", ")}`
          : "",
        input.themeAngle
          ? `Focus this plan on theme angle: ${input.themeAngle}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "User brief:",
        userMessage,
        "",
        "Return a complete CampaignPlan JSON object.",
        `Set platform to "${input.platformId}".`,
      ].join("\n"),
    });

    const plan = campaignPlanSchema.parse({
      ...result.object,
      platform: input.platformId,
      format: result.object.format ?? format ?? result.object.format,
      themes: result.object.themes?.length ? result.object.themes : themes,
      keywords: result.object.keywords?.length
        ? result.object.keywords
        : fallback.keywords,
    });

    if (plan.communication.recipeId && !recipes.includes(plan.communication.recipeId)) {
      return {
        ...plan,
        communication: { ...plan.communication, recipeId: undefined },
      };
    }

    return plan;
  } catch {
    return fallback;
  }
}

/** @deprecated Use planCampaign — kept as thin wrapper during migration. */
export async function analyzeIntent(input: {
  userMessage: string;
  messages: UIMessage[];
  platformId: PlatformId;
}): Promise<import("@/lib/llm/schemas/campaignIntent").CampaignIntent> {
  const { campaignPlanToIntent } = await import("@/lib/llm/schemas/campaignPlan");
  const plan = await planCampaign(input);
  return campaignPlanToIntent(plan);
}

import type { OpenRouterChatModelId } from "@/lib/llm/models";
import { generateObject } from "ai";
import { z } from "zod";
import { createLlmModel, getLlmProviderOptions, LLM_STAGE_TIMEOUT_MS, llmAbortSignal } from "@/lib/llm/mistral";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import {
  campaignPlanToIntent,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { rulesProfilePrompt } from "@/lib/llm/rules";
import type { RecipeConfig } from "@/lib/design-config/registry";
import {
  formatCandidatesForPrompt,
  type LayoutCandidate,
} from "@/lib/social-tool/engine/layoutRetriever";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";





function asIntent(intentOrPlan: CampaignIntent | CampaignPlan): CampaignIntent {
  if ("campaign" in intentOrPlan && typeof intentOrPlan.campaign === "object") {
    return campaignPlanToIntent(intentOrPlan as CampaignPlan);
  }
  return intentOrPlan as CampaignIntent;
}

export async function rankLayout(
  intentOrPlan: CampaignIntent | CampaignPlan,
  candidates: LayoutCandidate[],
  userMessage: string,
  rulesProfile?: DesignRulesProfile,
  recipe?: RecipeConfig,
  artifact?: { id: string; label: string; category?: string },
  modelId?: OpenRouterChatModelId,
): Promise<{ layoutId: PostLayoutId; rationale: string }> {
  const intent = asIntent(intentOrPlan);
  const plan =
    "campaign" in intentOrPlan && typeof intentOrPlan.campaign === "object"
      ? (intentOrPlan as CampaignPlan)
      : null;

  if (candidates.length === 0) throw new Error("No compatible layout for this artifact and platform.");

  if (candidates.length === 1) {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} best matches ${plan?.primaryMessage ?? intent.primaryIntent}.`,
    };
  }

  try {
    const model = createLlmModel(modelId);
    const result = await generateObject({
      model,
      providerOptions: getLlmProviderOptions(modelId),
      schema: z.object({
        layoutId: z.enum(candidates.map(c => c.layout.id) as [PostLayoutId, ...PostLayoutId[]]),
        rationale: z.string().min(1),
      }),
      temperature: 0,
      abortSignal: llmAbortSignal(LLM_STAGE_TIMEOUT_MS),
      system: [
        "You rank proven marketing layouts for the requested design artifact.",
        artifact
          ? `Target artifact: ${artifact.label} (${artifact.id.replace(/_/g, " ")}, category ${artifact.category ?? "general"}).`
          : "",
        "Pick exactly one layout ID from the candidate list.",
        "Do not invent layouts or specify geometry.",
        "Never pick horizontal split layouts (split-feature-*, deck-sidebar) for square (~1:1) artboards — those are landscape-only.",
        recipe ? `Selected recipe: ${recipe.name} (${recipe.pattern}) — prefer layouts that fit this recipe.` : "",
        rulesProfile ? rulesProfilePrompt(rulesProfile) : "",
        rulesProfile?.layoutPolicy === "auto_by_density"
          ? "Prefer visual-first or balanced layouts when copy budget is tight."
          : "",
        "Text-heavy briefs: bold-statement-corner for thought-leadership statements; editorial-portrait for founder/team posts; display-quote for quotes; numbered-list for tips/steps lists.",
        "Promotion/travel/lifestyle briefs with hero imagery: promotion-hero (photo hero + button CTA) or social-ad.",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "User brief:",
        userMessage,
        "",
        plan ? "Campaign plan:" : "Campaign intent:",
        JSON.stringify(plan ?? intent, null, 2),
        "",
        "Candidate layouts:",
        formatCandidatesForPrompt(candidates),
        "",
        "Return the best layout id and a one-sentence rationale.",
      ].join("\n"),
    });

    if (!candidates.some(c => c.layout.id === result.object.layoutId)) {
      throw new Error("Ranker selected a layout outside the shortlist");
    }
    return result.object;
  } catch {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} ranked highest for ${plan?.primaryMessage ?? intent.primaryIntent}.`,
    };
  }
}

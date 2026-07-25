import { generateObject } from "ai";
import { z } from "zod";
import { createMistralModel, LLM_STAGE_TIMEOUT_MS, llmAbortSignal } from "@/lib/llm/mistral";
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
import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

const catalogIds = POST_LAYOUTS.map((layout) => layout.id) as [PostLayoutId, ...PostLayoutId[]];

const layoutRankSchema = z.object({
  layoutId: z.enum(catalogIds),
  rationale: z.string().min(1),
});

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
): Promise<{ layoutId: PostLayoutId; rationale: string }> {
  const intent = asIntent(intentOrPlan);
  const plan =
    "campaign" in intentOrPlan && typeof intentOrPlan.campaign === "object"
      ? (intentOrPlan as CampaignPlan)
      : null;

  if (candidates.length === 0) {
    return {
      layoutId: "classic-hero",
      rationale: "Default hero layout for general announcements.",
    };
  }

  if (candidates.length === 1) {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} best matches ${plan?.primaryMessage ?? intent.primaryIntent}.`,
    };
  }

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: layoutRankSchema,
      temperature: 0,
      abortSignal: llmAbortSignal(LLM_STAGE_TIMEOUT_MS),
      system: [
        "You rank proven social post layouts for marketing communication.",
        "Pick exactly one layout ID from the candidate list.",
        "Do not invent layouts or specify geometry.",
        "Never pick horizontal split layouts (split-feature-*, deck-sidebar) for square (~1:1) artboards — those are landscape-only.",
        recipe ? `Selected recipe: ${recipe.name} (${recipe.pattern}) — prefer layouts that fit this recipe.` : "",
        rulesProfile ? rulesProfilePrompt(rulesProfile) : "",
        rulesProfile?.layoutPolicy === "auto_by_density"
          ? "Prefer visual-first or balanced layouts when copy budget is tight."
          : "",
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

    return result.object;
  } catch {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} ranked highest for ${plan?.primaryMessage ?? intent.primaryIntent}.`,
    };
  }
}

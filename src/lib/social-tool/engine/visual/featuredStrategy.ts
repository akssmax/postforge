import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { RecipeConfig } from "@/lib/design-config/registry";
import { getVisualsStrategy } from "@/lib/design-config/registry";
import type { FeaturedPolicy } from "@/lib/llm/rules/types";

export type FeaturedStrategyResult = {
  featuredPolicy: FeaturedPolicy;
  featuredKind: "ui" | "illustration" | "3d";
  reason: string;
};

export function resolveFeaturedStrategy(input: {
  plan: CampaignPlan;
  rulesProfile: DesignRulesProfile;
  recipe?: RecipeConfig;
}): FeaturedStrategyResult {
  const table = getVisualsStrategy().featured;
  const campaignHint = table[input.plan.campaign.type];
  const featuredKind =
    input.plan.visual.featuredKind ??
    (campaignHint === "illustration"
      ? "illustration"
      : campaignHint === "3d"
        ? "3d"
        : "ui");

  return {
    featuredPolicy: input.rulesProfile.featuredPolicy,
    featuredKind,
    reason: `Featured ${featuredKind} via ${input.rulesProfile.featuredPolicy} (${campaignHint ?? input.plan.visual.focus})`,
  };
}

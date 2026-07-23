import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { RecipeConfig } from "@/lib/design-config/registry";
import { getVisualsStrategy } from "@/lib/design-config/registry";

export type DecorationStrategyResult = {
  decorationLevel: "minimal" | "offer" | "mesh" | "brand";
  showOfferBadge: boolean;
  showAnnouncementBadge: boolean;
  reason: string;
};

export function resolveDecorationStrategy(input: {
  plan: CampaignPlan;
  recipe?: RecipeConfig;
}): DecorationStrategyResult {
  const table = getVisualsStrategy().decoration;
  const fromTable = table[input.plan.campaign.type] as
    | DecorationStrategyResult["decorationLevel"]
    | undefined;
  const decorationLevel =
    fromTable ??
    input.plan.visual.decorationLevel ??
    "minimal";

  const showOfferBadge =
    decorationLevel === "offer" ||
    Boolean(input.recipe?.slots.includes("offer_badge")) ||
    input.plan.communication.pattern === "offer";

  const showAnnouncementBadge =
    Boolean(input.recipe?.slots.includes("badge")) ||
    input.plan.campaign.type === "announcement" ||
    input.plan.campaign.type === "product_launch";

  return {
    decorationLevel,
    showOfferBadge,
    showAnnouncementBadge,
    reason: `Decoration ${decorationLevel}`,
  };
}

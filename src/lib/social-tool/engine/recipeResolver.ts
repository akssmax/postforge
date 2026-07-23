import {
  getPattern,
  getRecipe,
  tryGetPattern,
  tryGetRecipe,
  type DesignSystemConfig,
  type PatternConfig,
  type RecipeConfig,
} from "@/lib/design-config/registry";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";

export type ResolvedRecipe = {
  pattern: PatternConfig;
  recipe: RecipeConfig;
  rationale: string;
};

function recipeScore(
  recipe: RecipeConfig,
  plan: CampaignPlan,
  system: DesignSystemConfig,
): number {
  let score = 0;
  if (recipe.pattern === plan.communication.pattern) score += 20;
  if (recipe.campaigns.includes(plan.campaign.type)) score += 12;
  if (recipe.density === plan.communication.contentDensity) score += 8;
  if (recipe.readingPattern === plan.communication.readingPattern) score += 6;
  if (plan.communication.recipeId === recipe.id) score += 25;

  const preferredInSystem = recipe.preferredLayouts.filter((id) =>
    system.layouts.includes(id),
  );
  score += preferredInSystem.length * 2;

  return score;
}

/**
 * Resolve communication pattern → layout recipe.
 * Planner may hint recipeId; engine validates and ranks otherwise.
 */
export function resolveRecipe(
  plan: CampaignPlan,
  system: DesignSystemConfig,
): ResolvedRecipe {
  const pattern =
    tryGetPattern(plan.communication.pattern) ??
    getPattern("announcement_hero");

  const hinted = plan.communication.recipeId
    ? tryGetRecipe(plan.communication.recipeId)
    : undefined;

  if (hinted && pattern.recipes.includes(hinted.id)) {
    return {
      pattern,
      recipe: hinted,
      rationale: `Planner selected recipe ${hinted.name} for ${pattern.label}.`,
    };
  }

  const candidates = pattern.recipes
    .map((id) => tryGetRecipe(id))
    .filter((r): r is RecipeConfig => Boolean(r))
    .map((recipe) => ({
      recipe,
      score: recipeScore(recipe, plan, system),
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    const fallback = getRecipe(pattern.recipes[0] ?? "announcement_center");
    return {
      pattern,
      recipe: fallback,
      rationale: `Fallback recipe ${fallback.name} for ${pattern.label}.`,
    };
  }

  const best = candidates[0];
  return {
    pattern,
    recipe: best.recipe,
    rationale: `Selected ${best.recipe.name} (${pattern.label}) for ${plan.campaign.type}.`,
  };
}

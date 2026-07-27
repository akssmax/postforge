import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import {
  getRecipe,
  listRecipes,
  tryGetRecipe,
  type RecipeConfig,
} from "@/lib/design-config/registry";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignSystemConfig } from "@/lib/design-config/registry";
import { resolveRecipe as resolveRecipeCore } from "@/lib/social-tool/engine/recipeResolver";

function recipeAllowedForArtifact(
  recipe: RecipeConfig,
  artifact: ArtifactDefinition,
): boolean {
  if (artifact.allowedRecipes.length > 0) {
    if (!artifact.allowedRecipes.includes(recipe.id)) return false;
  }
  if (recipe.artifactSupports.length > 0) {
    if (!recipe.artifactSupports.includes(artifact.id)) return false;
  }
  return true;
}

function recipeScoreForArtifact(
  recipe: RecipeConfig,
  plan: CampaignPlan,
  system: DesignSystemConfig,
  artifact: ArtifactDefinition,
): number {
  let score = 0;
  if (recipe.pattern === plan.communication.pattern) score += 20;
  if (recipe.campaigns.includes(plan.campaign.type)) score += 12;
  if (artifact.allowedRecipes.includes(recipe.id)) score += 15;
  if (artifact.recommendedBundles.some((b) => recipe.bundles.includes(b))) {
    score += 6;
  }
  if (recipe.density === plan.communication.contentDensity) score += 8;
  if (plan.communication.recipeId === recipe.id) score += 25;
  const preferredInSystem = recipe.preferredLayouts.filter((id) =>
    system.layouts.includes(id),
  );
  score += preferredInSystem.length * 2;
  return score;
}

/**
 * Filter recipes by artifact plugin, then rank — wraps core resolver.
 */
export function resolveRecipeForArtifact(
  plan: CampaignPlan,
  system: DesignSystemConfig,
  artifact: ArtifactDefinition,
) {
  const allowedIds =
    artifact.allowedRecipes.length > 0
      ? new Set(artifact.allowedRecipes)
      : null;

  const filteredPlan =
    allowedIds && plan.communication.recipeId
      ? plan.communication.recipeId &&
        !allowedIds.has(plan.communication.recipeId)
        ? {
            ...plan,
            communication: { ...plan.communication, recipeId: undefined },
          }
        : plan
      : plan;

  const result = resolveRecipeCore(filteredPlan, system);

  if (recipeAllowedForArtifact(result.recipe, artifact)) {
    return result;
  }

  const candidates = listRecipes()
    .filter((r) => recipeAllowedForArtifact(r, artifact))
    .map((recipe) => ({
      recipe,
      score: recipeScoreForArtifact(recipe, plan, system, artifact),
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return result;
  }

  const best = candidates[0]!;
  const pattern =
    tryGetRecipe(best.recipe.id)?.pattern === best.recipe.pattern
      ? result.pattern
      : result.pattern;

  return {
    pattern,
    recipe: best.recipe,
    rationale: `Artifact ${artifact.label} selected recipe ${best.recipe.name}.`,
  };
}

export function filterRecipesForArtifact(
  artifact: ArtifactDefinition,
): RecipeConfig[] {
  return listRecipes().filter((r) => recipeAllowedForArtifact(r, artifact));
}

export function getRecipeForArtifact(
  artifact: ArtifactDefinition,
  recipeId: string,
): RecipeConfig {
  const recipe = getRecipe(recipeId);
  if (!recipeAllowedForArtifact(recipe, artifact)) {
    throw new Error(`Recipe ${recipeId} not allowed for artifact ${artifact.id}`);
  }
  return recipe;
}

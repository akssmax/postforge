import {
  listBundles,
  tryGetBundle,
  type BlockBundleConfig,
  type RecipeConfig,
} from "@/lib/design-config/registry";
import type { SemanticPickContext } from "@/lib/social-tool/visualBlocks/semantic/types";

function scoreBundle(
  bundle: BlockBundleConfig,
  ctx: SemanticPickContext,
  recipe?: RecipeConfig,
): number {
  let score = 0;
  if (recipe?.bundles.includes(bundle.id)) score += 40;
  if (ctx.recipeId && bundle.compatibleRecipes.includes(ctx.recipeId)) score += 20;
  if (ctx.campaignType && bundle.campaigns.includes(ctx.campaignType)) score += 16;
  if (ctx.platformId && bundle.worksFor.includes(ctx.platformId)) score += 8;
  if (ctx.platformId && bundle.worksFor.length === 0) score += 2;
  return score;
}

/**
 * Prefer named bundles from the recipe; otherwise best campaign match.
 */
export function retrieveBundle(
  ctx: SemanticPickContext,
  recipe?: RecipeConfig,
): BlockBundleConfig | null {
  if (recipe?.bundles?.length) {
    for (const id of recipe.bundles) {
      const bundle = tryGetBundle(id);
      if (bundle) return bundle;
    }
  }

  const ranked = listBundles()
    .map((bundle) => ({ bundle, score: scoreBundle(bundle, ctx, recipe) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.bundle ?? null;
}

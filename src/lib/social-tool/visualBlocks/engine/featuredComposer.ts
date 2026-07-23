import { tryGetRecipe, type RecipeConfig } from "@/lib/design-config/registry";
import { retrieveBundle } from "@/lib/social-tool/visualBlocks/engine/bundleRetriever";
import {
  retrieveFamilyAssets,
  type RankedFamilyAsset,
} from "@/lib/social-tool/visualBlocks/engine/familyRetriever";
import { enforceHierarchy } from "@/lib/social-tool/visualBlocks/engine/hierarchyGuard";
import { resolveStylePack } from "@/lib/social-tool/visualBlocks/engine/stylePackResolver";
import {
  resolveComposition,
  resolveDensity,
} from "@/lib/social-tool/visualBlocks/engine/variantResolver";
import type {
  FeaturedComposition,
  SemanticBlockRequest,
  SemanticPickContext,
} from "@/lib/social-tool/visualBlocks/semantic/types";
import type { VisualBlockGenerateInput } from "@/lib/social-tool/visualBlocks/types";
import { buildDefaultUiContent } from "@/lib/social-tool/visualBlocks/content";

function buildContent(
  assetId: string,
  input: VisualBlockGenerateInput,
): Record<string, string> {
  return buildDefaultUiContent(assetId, {
    primary: input.brandColors?.primary ?? "#1E293B",
    accent: input.brandColors?.accent ?? "#7C9A92",
    headline: input.headline ?? "Your headline",
    theme: input.theme ?? input.brief ?? input.headline ?? "Product value",
    subheading: input.subheading,
  });
}

function pickBestForFamily(
  ranked: RankedFamilyAsset[],
  familyId: string,
  usedIds: Set<string>,
): RankedFamilyAsset | null {
  return (
    ranked.find((r) => r.family.id === familyId && !usedIds.has(r.pattern.id)) ??
    null
  );
}

/**
 * Build a single-slot featured composition from bundle (preferred) or families.
 * Illustration picks are always a single part — never stacked multi-family frames.
 */
export function composeFeaturedSemantic(input: {
  ctx: SemanticPickContext;
  generateInput: VisualBlockGenerateInput;
  recipe?: RecipeConfig;
  excludeLibraryIds?: string[];
}): FeaturedComposition | null {
  const recipe =
    input.recipe ??
    (input.ctx.recipeId ? tryGetRecipe(input.ctx.recipeId) : undefined);

  const preferredKind =
    input.generateInput.preferredKind ??
    input.generateInput.intent?.featuredVisualKind ??
    input.ctx.featuredKind;
  const illustrationOnly = preferredKind === "illustration";

  const bundle = illustrationOnly ? null : retrieveBundle(input.ctx, recipe);
  const ranked = retrieveFamilyAssets({
    ctx: input.ctx,
    generateInput: input.generateInput,
    recipe,
    familyIds: bundle?.contains.map((p) => p.family) ?? recipe?.families,
    excludeLibraryIds: input.excludeLibraryIds,
  });

  if (ranked.length === 0) return null;

  const usedIds = new Set<string>();
  const parts: SemanticBlockRequest[] = [];
  const stylePack = resolveStylePack(input.ctx, ranked[0]?.family);

  if (bundle && !illustrationOnly) {
    for (const part of bundle.contains) {
      const best = pickBestForFamily(ranked, part.family, usedIds);
      if (!best) continue;
      usedIds.add(best.pattern.id);
      const density = resolveDensity(input.ctx, best.family, part.density);
      const composition = resolveComposition(input.ctx, best.family);
      parts.push({
        familyId: best.family.id,
        density,
        composition,
        stylePackId: stylePack.id,
        hierarchy: part.hierarchy,
        assetId: best.pattern.id,
        kind: best.pattern.kind,
        content: buildContent(best.pattern.id, input.generateInput),
      });
    }
  }

  if (parts.length === 0) {
    const best = ranked[0];
    if (!best) return null;
    parts.push({
      familyId: best.family.id,
      density: resolveDensity(input.ctx, best.family),
      composition: resolveComposition(input.ctx, best.family),
      stylePackId: stylePack.id,
      hierarchy: best.family.hierarchy,
      assetId: best.pattern.id,
      kind: best.pattern.kind,
      content: buildContent(best.pattern.id, input.generateInput),
    });
  }

  // Illustrations never compose as multi-part stacks
  const finalParts = illustrationOnly || parts[0]?.kind === "illustration" ? parts.slice(0, 1) : parts;
  const guarded = enforceHierarchy(finalParts);

  return {
    bundleId: illustrationOnly ? undefined : bundle?.id,
    parts: guarded,
    stylePackId: stylePack.id,
    reason: bundle && !illustrationOnly
      ? `Bundle ${bundle.id} → ${guarded.map((p) => p.familyId).join("+")}`
      : `Families → ${guarded.map((p) => p.familyId).join("+")}`,
  };
}

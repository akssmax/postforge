import {
  getBlockFamily,
  illustrationTagsForFamily,
  listBlockFamilies,
  tryGetBlockFamily,
  type BlockFamilyConfig,
  type RecipeConfig,
} from "@/lib/design-config/registry";
import type { VisualBlockGenerateInput } from "@/lib/social-tool/visualBlocks/types";
import type { SemanticPickContext } from "@/lib/social-tool/visualBlocks/semantic/types";
import { getDeployableVisualLibrary } from "@/lib/social-tool/visualBlocks/library/deployableLibrary";
import {
  scoreVisualPattern,
  resolvePreferredVisualKind,
} from "@/lib/social-tool/visualBlocks/library/scoring";
import type { VisualLibraryPattern } from "@/lib/social-tool/visualBlocks/library/catalog";

export type RankedFamilyAsset = {
  family: BlockFamilyConfig;
  pattern: VisualLibraryPattern;
  score: number;
  assetRole: string;
};

function patternInFamily(
  family: BlockFamilyConfig,
  pattern: VisualLibraryPattern,
): { match: boolean; role: string } {
  const asset = family.assets.find((a) => a.id === pattern.id);
  if (asset) return { match: true, role: asset.role };

  if (pattern.kind === "illustration") {
    const tags = new Set([
      ...family.illustrationTags.map((t) => t.toLowerCase()),
      ...illustrationTagsForFamily(family.id).map((t) => t.toLowerCase()),
    ]);
    const hit = pattern.tags.some((t) => tags.has(t.toLowerCase()));
    return { match: hit, role: "illustration" };
  }

  return { match: false, role: "primary" };
}

function resolveFamilies(
  ctx: SemanticPickContext,
  recipe?: RecipeConfig,
  familyIds?: string[],
): BlockFamilyConfig[] {
  const ids =
    familyIds?.length
      ? familyIds
      : recipe?.families?.length
        ? recipe.families
        : [];

  if (ids.length) {
    return ids
      .map((id) => tryGetBlockFamily(id))
      .filter((f): f is BlockFamilyConfig => Boolean(f));
  }

  // Pattern / proof heuristics
  if (ctx.proof === "stat" || ctx.patternId === "statistic") {
    return [getBlockFamily("metric")];
  }
  if (ctx.proof === "logos" || ctx.patternId === "social_proof") {
    return [getBlockFamily("proof")];
  }
  if (ctx.patternId === "comparison") {
    return [getBlockFamily("comparison")];
  }
  if (ctx.patternId === "offer") {
    return [getBlockFamily("pricing"), getBlockFamily("metric")];
  }
  if (ctx.patternId === "problem_solution") {
    return [getBlockFamily("product"), getBlockFamily("benefits")];
  }

  return [getBlockFamily("product"), getBlockFamily("metric")];
}

/**
 * Rank deployable assets that belong to the requested families.
 * Family membership is primary; keyword score is a tie-breaker.
 */
export function retrieveFamilyAssets(input: {
  ctx: SemanticPickContext;
  generateInput: VisualBlockGenerateInput;
  recipe?: RecipeConfig;
  familyIds?: string[];
  excludeLibraryIds?: string[];
}): RankedFamilyAsset[] {
  const families = resolveFamilies(input.ctx, input.recipe, input.familyIds);
  if (families.length === 0) return [];

  const preferredKind = resolvePreferredVisualKind(input.generateInput);
  const excluded = new Set(input.excludeLibraryIds ?? []);
  const library = getDeployableVisualLibrary().filter((p) => !excluded.has(p.id));

  const ranked: RankedFamilyAsset[] = [];

  for (const family of families) {
    for (const pattern of library) {
      const { match, role } = patternInFamily(family, pattern);
      if (!match) continue;

      // Prefer ui/diagram for featured unless illustration requested
      let score = 20;
      if (preferredKind === "illustration" && pattern.kind === "illustration") score += 18;
      if (preferredKind === "ui" && pattern.kind === "ui") score += 18;
      if (preferredKind === "ui" && pattern.kind === "diagram") score += 12;
      if (preferredKind === "illustration" && pattern.kind !== "illustration") score -= 8;
      if (pattern.kind === "diagram" && preferredKind !== "illustration") score += 6;

      const assetMeta = family.assets.find((a) => a.id === pattern.id);
      if (assetMeta?.role === "primary") score += 10;

      score += scoreVisualPattern(pattern, input.generateInput) * 0.5;

      ranked.push({ family, pattern, score, assetRole: role });
    }
  }

  return ranked.sort((a, b) => b.score - a.score);
}

export function listFamiliesForContext(
  ctx: SemanticPickContext,
  recipe?: RecipeConfig,
): BlockFamilyConfig[] {
  return resolveFamilies(ctx, recipe);
}

export function allBlockFamilies(): BlockFamilyConfig[] {
  return listBlockFamilies();
}

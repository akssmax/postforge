import { sanitizeSvgMarkupServer } from "@/lib/social-tool/visualBlocks/sanitizeSvgServer";
import { createVisualBlockId } from "@/lib/social-tool/visualBlocks/storage";
import { buildDefaultUiContent, isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";
import type {
  VisualBlockGenerateInput,
  VisualBlockKind,
  VisualBlockRecord,
} from "@/lib/social-tool/visualBlocks/types";
import {
  VISUAL_LIBRARY,
  VISUAL_LIBRARY_BY_ID,
  isAssetPattern,
  isParametricPattern,
  type VisualLibraryPattern,
} from "./catalog";
import {
  countDeployedIllustrationsBySource,
  getDeployableVisualLibrary,
  isDeployableVisualPattern,
} from "./deployableLibrary";
import { resolveIllustrationSvg } from "./illustrations/resolver";
import { ILLUSTRATION_LIBRARY } from "./illustrations/manifest";
import {
  rankVisualPatterns,
  resolvePreferredVisualKind,
  scoreVisualPattern,
} from "./scoring";
import type { VisualTemplateContext } from "./templateContext";
import { composeFeaturedSemantic } from "@/lib/social-tool/visualBlocks/engine/featuredComposer";
import { tryGetRecipe } from "@/lib/design-config/registry";

export { VISUAL_LIBRARY, VISUAL_LIBRARY_BY_ID, isAssetPattern, isParametricPattern, type VisualLibraryPattern } from "./catalog";
export {
  ILLUSTRATION_LIBRARY,
  ILLUSTRATION_SOURCE_LABELS,
  type IllustrationLibraryEntry,
  type IllustrationSource,
} from "./illustrations/manifest";

function buildTemplateContext(input: VisualBlockGenerateInput): VisualTemplateContext {
  return {
    primary: input.brandColors?.primary ?? "#1E293B",
    accent: input.brandColors?.accent ?? "#7C9A92",
    headline: input.headline ?? "Your headline",
    theme: input.theme ?? input.brief ?? input.headline ?? "Product value",
    subheading: input.subheading,
  };
}

function pickWithKindDiversity(
  ranked: VisualLibraryPattern[],
  count: number,
): VisualLibraryPattern[] {
  const picked: VisualLibraryPattern[] = [];
  const usedIds = new Set<string>();
  const usedKinds = new Set<VisualBlockKind>();

  for (const pattern of ranked) {
    if (picked.length >= count) break;
    if (usedIds.has(pattern.id)) continue;
    if (usedKinds.has(pattern.kind) && picked.length < count - 1) continue;
    picked.push(pattern);
    usedIds.add(pattern.id);
    usedKinds.add(pattern.kind);
  }

  for (const pattern of ranked) {
    if (picked.length >= count) break;
    if (usedIds.has(pattern.id)) continue;
    picked.push(pattern);
    usedIds.add(pattern.id);
  }

  return picked;
}

export function getLibraryPattern(id: string): VisualLibraryPattern | undefined {
  return VISUAL_LIBRARY_BY_ID.get(id);
}

const FEATURED_SLOT_KINDS: VisualBlockKind[] = ["ui", "illustration"];

function trySemanticFeaturedPick(
  input: VisualBlockGenerateInput,
  excludeLibraryIds: string[],
): VisualBlockRecord | null {
  const semantic = input.semantic;
  if (!semantic?.campaignType && !semantic?.recipeId && !semantic?.patternId) {
    return null;
  }

  const recipe = semantic.recipeId ? tryGetRecipe(semantic.recipeId) : undefined;
  const composition = composeFeaturedSemantic({
    ctx: {
      campaignType: semantic.campaignType,
      recipeId: semantic.recipeId,
      patternId: semantic.patternId,
      designSystemId: semantic.designSystemId,
      contentDensity: semantic.contentDensity,
      readingPattern: semantic.readingPattern,
      colorMood: semantic.colorMood,
      brandTone: semantic.brandTone,
      featuredKind: semantic.featuredKind ?? input.preferredKind,
      proof: semantic.proof,
      platformId: semantic.platformId,
    },
    generateInput: input,
    recipe,
    excludeLibraryIds,
  });

  if (!composition || composition.parts.length === 0) return null;

  const primary = composition.parts[0]!;
  const pattern = getLibraryPattern(primary.assetId);
  if (!pattern || !isDeployableVisualPattern(pattern)) return null;

  const block = instantiateLibraryPattern(pattern, input);
  if (!block) return null;

  // Prefer primary part content from composer when present
  if (primary.content && Object.keys(primary.content).length > 0) {
    block.content = primary.content;
  }

  block.semantic = {
    familyId: primary.familyId,
    bundleId: composition.bundleId,
    density: primary.density,
    composition: primary.composition,
    stylePackId: composition.stylePackId,
    hierarchy: primary.hierarchy,
    compositionParts: composition.parts.map((part) => ({
      familyId: part.familyId,
      assetId: part.assetId,
      kind: part.kind,
      density: part.density,
      hierarchy: part.hierarchy,
    })),
  };
  block.prompt = composition.reason;

  return block;
}

export function pickFeaturedVisualFromLibrary(
  input: VisualBlockGenerateInput,
  options?: { excludeLibraryIds?: string[] },
): VisualBlockRecord | null {
  return pickShuffleFeaturedVisual(input, options?.excludeLibraryIds ?? [], {
    randomize: false,
  });
}

export function pickShuffleFeaturedVisual(
  input: VisualBlockGenerateInput,
  excludeLibraryIds: string[] = [],
  options?: { randomize?: boolean },
): VisualBlockRecord | null {
  const semanticHit = trySemanticFeaturedPick(input, excludeLibraryIds);
  if (semanticHit && options?.randomize === false) {
    return semanticHit;
  }
  // On shuffle with semantic context, still prefer family-ranked assets
  if (semanticHit && options?.randomize !== false && input.semantic) {
    // Fall through to kind-filtered ranking but bias via exclude of non-family later
  }

  const excluded = new Set(excludeLibraryIds.filter(Boolean));
  const preferredKind = resolvePreferredVisualKind(input);
  const deployableLibrary = getDeployableVisualLibrary();

  // Allow diagrams in featured when semantic path asked for them via composition
  let candidates = deployableLibrary.filter(
    (pattern) =>
      (FEATURED_SLOT_KINDS.includes(pattern.kind) || pattern.kind === "diagram") &&
      !excluded.has(pattern.id),
  );
  // Legacy featured path: ui + illustration only unless semantic present
  if (!input.semantic) {
    candidates = candidates.filter((pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind),
    );
  }
  if (preferredKind) {
    const kindMatches = candidates.filter((pattern) => pattern.kind === preferredKind);
    if (kindMatches.length > 0) candidates = kindMatches;
  }
  if (candidates.length === 0) {
    candidates = deployableLibrary.filter((pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind),
    );
  }
  if (candidates.length === 0) return null;

  const ranked = rankVisualPatterns(candidates, input);
  const block = instantiateFirstAvailable(ranked, input, options);
  if (block && semanticHit?.semantic) {
    // Preserve style pack from semantic resolver when shuffling within family
    block.semantic = {
      ...semanticHit.semantic,
      familyId: block.semantic?.familyId ?? semanticHit.semantic.familyId,
      stylePackId: semanticHit.semantic.stylePackId,
    };
  }
  return block ?? semanticHit;
}

function instantiateFirstAvailable(
  ranked: VisualLibraryPattern[],
  input: VisualBlockGenerateInput,
  options?: { randomize?: boolean },
): VisualBlockRecord | null {
  const deployable = ranked.filter(isDeployableVisualPattern);
  if (deployable.length === 0) return null;

  if (options?.randomize === false) {
    for (const pattern of deployable) {
      const block = instantiateLibraryPattern(pattern, input);
      if (block) return block;
    }
    return null;
  }

  const topScore = scoreVisualPattern(deployable[0]!, input);
  const poolSize =
    topScore > 0 ? Math.min(12, deployable.length) : Math.min(5, deployable.length);
  const pool = deployable.slice(0, poolSize);
  const start = Math.floor(Math.random() * pool.length);

  for (let offset = 0; offset < pool.length; offset += 1) {
    const pattern = pool[(start + offset) % pool.length]!;
    const block = instantiateLibraryPattern(pattern, input);
    if (block) return block;
  }

  return null;
}

export function pickFromLibrary(
  input: VisualBlockGenerateInput,
  count = 3,
): VisualLibraryPattern[] {
  const limit = Math.min(3, Math.max(1, count));
  const ranked = rankVisualPatterns(getDeployableVisualLibrary(), input);
  return pickWithKindDiversity(ranked, limit);
}

export function instantiateLibraryPattern(
  pattern: VisualLibraryPattern,
  input: VisualBlockGenerateInput,
): VisualBlockRecord | null {
  const ctx = buildTemplateContext(input);

  if (isParametricPattern(pattern) && isUiReactPattern(pattern.id)) {
    return {
      id: createVisualBlockId(),
      libraryId: pattern.id,
      label: pattern.label,
      kind: pattern.kind,
      svgMarkup: "",
      content: buildDefaultUiContent(pattern.id, ctx),
      createdAt: Date.now(),
      theme: ctx.theme,
    };
  }

  const raw = isAssetPattern(pattern)
    ? resolveIllustrationSvg(pattern, ctx)
    : pattern.render(ctx);
  if (!raw) return null;
  const svgMarkup = isAssetPattern(pattern) ? raw : sanitizeSvgMarkupServer(raw);
  if (!svgMarkup) return null;

  return {
    id: createVisualBlockId(),
    libraryId: pattern.id,
    label: pattern.label,
    kind: pattern.kind,
    svgMarkup,
    createdAt: Date.now(),
    theme: ctx.theme,
  };
}

export function composeVisualBlocksFromLibrary(
  input: VisualBlockGenerateInput,
  options?: { libraryIds?: string[] },
): VisualBlockRecord[] {
  const count = Math.min(3, Math.max(1, input.count ?? 3));
  const patterns = options?.libraryIds?.length
    ? options.libraryIds
        .map((id) => getLibraryPattern(id))
        .filter((entry): entry is VisualLibraryPattern => Boolean(entry))
        .filter(isDeployableVisualPattern)
    : pickFromLibrary(input, count);

  const blocks: VisualBlockRecord[] = [];
  for (const pattern of patterns) {
    const block = instantiateLibraryPattern(pattern, input);
    if (block) blocks.push(block);
    if (blocks.length >= count) break;
  }

  if (blocks.length >= count) {
    return blocks.slice(0, count);
  }

  const ranked = rankVisualPatterns(getDeployableVisualLibrary(), input);
  for (const pattern of ranked) {
    if (blocks.some((block) => block.libraryId === pattern.id)) continue;
    const block = instantiateLibraryPattern(pattern, input);
    if (!block) continue;
    blocks.push(block);
    if (blocks.length >= count) break;
  }

  return blocks.slice(0, count);
}

export function libraryPatternSummaryForPrompt(limit = 40): string {
  const deployable = getDeployableVisualLibrary();
  const parametric = deployable.filter((pattern) => isParametricPattern(pattern));
  const parametricLines = parametric.slice(0, limit).map((pattern) => {
    const source = isUiReactPattern(pattern.id)
      ? "HeroUI react template — edit content fields only"
      : "parametric svg template";
    return `- ${pattern.id}: ${pattern.label} (${pattern.kind}, ${source}) — ${pattern.description}; tags: ${pattern.tags.join(", ")}`;
  });

  const deployedBySource = countDeployedIllustrationsBySource();
  const illustrationCount = Object.values(deployedBySource).reduce((sum, n) => sum + n, 0);

  return [
    "Parametric UI + diagram patterns (instant, brand-themed):",
    parametricLines.join("\n"),
    "",
    `Illustration library: ${illustrationCount} deployed SVGs (${deployedBySource.storyset} Storyset, ${deployedBySource.undraw} unDraw, ${deployedBySource["open-doodles"]} Open Doodles).`,
    "Do NOT enumerate all illustrations — pick by libraryId using tag/intent overlap with the brief.",
    "Use intent.featuredVisualKind: ui → HeroUI stat/pricing/comparison cards; illustration → undraw/open-doodles/storyset scenes.",
    "Match brief keywords to illustration tags (examples: sync/integration→undraw-data-transfer, team→collaboration tags, growth/sales→revenue tags, chat→support tags).",
    "Prefer storyset-* when deployed for narrative/brand visuals, undraw-* for SaaS/tech scenes, open-doodles for playful tone.",
    "Use proofStrategy: product_ui → UI patterns; stats → diagrams; social_proof/awareness → illustrations.",
    "Pass libraryIds with the best tag match when you know the exact asset id.",
  ].join("\n");
}

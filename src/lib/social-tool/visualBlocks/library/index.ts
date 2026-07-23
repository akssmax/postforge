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
import { resolveIllustrationSvg } from "./illustrations/resolver";
import { ILLUSTRATION_LIBRARY } from "./illustrations/manifest";
import {
  rankVisualPatterns,
  resolvePreferredVisualKind,
  scoreVisualPattern,
} from "./scoring";
import type { VisualTemplateContext } from "./templateContext";

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
  const excluded = new Set(excludeLibraryIds.filter(Boolean));
  const preferredKind = resolvePreferredVisualKind(input);
  let candidates = VISUAL_LIBRARY.filter(
    (pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind) && !excluded.has(pattern.id),
  );
  if (preferredKind) {
    const kindMatches = candidates.filter((pattern) => pattern.kind === preferredKind);
    if (kindMatches.length > 0) candidates = kindMatches;
  }
  if (candidates.length === 0) {
    candidates = VISUAL_LIBRARY.filter((pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind),
    );
  }
  if (candidates.length === 0) return null;

  const ranked = rankVisualPatterns(candidates, input);
  const topScore = ranked[0] ? scoreVisualPattern(ranked[0], input) : 0;
  const poolSize =
    topScore > 0 ? Math.min(12, ranked.length) : Math.min(5, ranked.length);
  const pattern =
    options?.randomize === false
      ? ranked[0]!
      : ranked[Math.floor(Math.random() * poolSize)]!;
  return instantiateLibraryPattern(pattern, input);
}

export function pickFromLibrary(
  input: VisualBlockGenerateInput,
  count = 3,
): VisualLibraryPattern[] {
  const limit = Math.min(3, Math.max(1, count));
  const ranked = rankVisualPatterns(VISUAL_LIBRARY, input);
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
    : pickFromLibrary(input, count);

  return patterns
    .slice(0, count)
    .map((pattern) => instantiateLibraryPattern(pattern, input))
    .filter((block): block is VisualBlockRecord => block !== null);
}

export function libraryPatternSummaryForPrompt(limit = 40): string {
  const parametric = VISUAL_LIBRARY.filter((pattern) => isParametricPattern(pattern));
  const parametricLines = parametric.slice(0, limit).map((pattern) => {
    const source = isUiReactPattern(pattern.id)
      ? "HeroUI react template — edit content fields only"
      : "parametric svg template";
    return `- ${pattern.id}: ${pattern.label} (${pattern.kind}, ${source}) — ${pattern.description}; tags: ${pattern.tags.join(", ")}`;
  });

  const illustrationCount = ILLUSTRATION_LIBRARY.length;
  const storysetCount = ILLUSTRATION_LIBRARY.filter((e) => e.source === "storyset").length;

  return [
    "Parametric UI + diagram patterns (instant, brand-themed):",
    parametricLines.join("\n"),
    "",
    `Illustration library: ${illustrationCount} bundled SVGs (${storysetCount} Storyset, plus unDraw + Open Doodles).`,
    "Do NOT enumerate all illustrations — pick by libraryId using tag/intent overlap with the brief.",
    "Use intent.featuredVisualKind: ui → HeroUI stat/pricing/comparison cards; illustration → storyset/undraw/open-doodles scenes.",
    "Match brief keywords to illustration tags (examples: sync/integration→storyset-sync, team→collaboration tags, growth/sales→revenue tags, chat→support tags).",
    "Prefer storyset-* for narrative/brand visuals, undraw-* for SaaS/tech scenes, open-doodles for playful tone.",
    "Use proofStrategy: product_ui → UI patterns; stats → diagrams; social_proof/awareness → illustrations.",
    "Pass libraryIds with the best tag match when you know the exact asset id.",
  ].join("\n");
}

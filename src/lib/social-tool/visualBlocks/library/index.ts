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

function scorePattern(pattern: VisualLibraryPattern, input: VisualBlockGenerateInput): number {
  const haystack = [input.headline, input.subheading, input.theme, input.brief]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tokens = haystack.split(/\W+/).filter((token) => token.length > 2);

  let score = 0;
  for (const tag of pattern.tags) {
    const normalized = tag.toLowerCase();
    if (haystack.includes(normalized)) score += 4;
    for (const token of tokens) {
      if (normalized.includes(token) || token.includes(normalized)) score += 1;
    }
  }
  return score;
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
  let candidates = VISUAL_LIBRARY.filter(
    (pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind) && !excluded.has(pattern.id),
  );
  if (candidates.length === 0) {
    candidates = VISUAL_LIBRARY.filter((pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind),
    );
  }
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort(
    (a, b) => scorePattern(b, input) - scorePattern(a, input),
  );
  const pattern =
    options?.randomize === false
      ? ranked[0]!
      : ranked[Math.floor(Math.random() * Math.min(5, ranked.length))]!;
  return instantiateLibraryPattern(pattern, input);
}

export function pickFromLibrary(
  input: VisualBlockGenerateInput,
  count = 3,
): VisualLibraryPattern[] {
  const limit = Math.min(3, Math.max(1, count));
  const ranked = [...VISUAL_LIBRARY].sort(
    (a, b) => scorePattern(b, input) - scorePattern(a, input),
  );
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

export function libraryPatternSummaryForPrompt(limit = 50): string {
  return VISUAL_LIBRARY.slice(0, limit)
    .map((pattern) => {
      const source = isAssetPattern(pattern)
        ? `source: ${pattern.source}`
        : isUiReactPattern(pattern.id)
          ? "HeroUI react template — edit content fields only"
          : "parametric svg template";
      return `- ${pattern.id}: ${pattern.label} (${pattern.kind}, ${source}) — ${pattern.description}; tags: ${pattern.tags.join(", ")}`;
    })
    .join("\n");
}

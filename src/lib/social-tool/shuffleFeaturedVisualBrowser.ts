import {
  isAssetPattern,
  isIllustrationPattern,
  isParametricPattern,
  isThreeDPattern,
  VISUAL_LIBRARY,
  type VisualLibraryPattern,
} from "@/lib/social-tool/visualBlocks/library/catalog";
import { buildDefaultUiContent, isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";
import { recolorIllustrationForPreview, normalizeIllustrationSvg } from "@/lib/social-tool/visualBlocks/library/illustrations/recolor";
import type { IllustrationLibraryEntry } from "@/lib/social-tool/visualBlocks/library/illustrations/manifest";
import type { ThreeDLibraryEntry } from "@/lib/social-tool/visualBlocks/library/threeD/manifest";
import {
  rankVisualPatterns,
  resolvePreferredVisualKind,
  scoreVisualPattern,
} from "@/lib/social-tool/visualBlocks/library/scoring";
import type { VisualTemplateContext } from "@/lib/social-tool/visualBlocks/library/templateContext";
import { createVisualBlockId } from "@/lib/social-tool/visualBlocks/storage";
import type {
  VisualBlockGenerateInput,
  VisualBlockKind,
  VisualBlockRecord,
} from "@/lib/social-tool/visualBlocks/types";

const FEATURED_SLOT_KINDS: VisualBlockKind[] = ["ui", "illustration", "3d"];

const illustrationSvgCache = new Map<string, string>();
const illustrationFetchInflight = new Map<string, Promise<string | null>>();

function buildTemplateContext(input: VisualBlockGenerateInput): VisualTemplateContext {
  return {
    primary: input.brandColors?.primary ?? "#1E293B",
    accent: input.brandColors?.accent ?? "#7C9A92",
    headline: input.headline ?? "Your headline",
    theme: input.theme ?? input.brief ?? input.headline ?? "Product value",
    subheading: input.subheading,
  };
}

function resolveThreeDSvgClient(entry: ThreeDLibraryEntry): string {
  const size = 768;
  const href = entry.assetPath.startsWith("/")
    ? entry.assetPath
    : `/${entry.assetPath}`;
  const label = entry.label
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}"><image href="${href}" xlink:href="${href}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

async function fetchIllustrationSvg(
  entry: IllustrationLibraryEntry,
  ctx: VisualTemplateContext,
): Promise<string | null> {
  const cacheKey = entry.assetPath;
  const cached = illustrationSvgCache.get(cacheKey);
  if (cached) {
    return entry.source === "storyset"
      ? recolorIllustrationForPreview(cached, ctx.primary, ["#407BFF", "#407bff"])
      : entry.recolorAccents?.length
        ? recolorIllustrationForPreview(cached, ctx.primary, entry.recolorAccents)
        : recolorIllustrationForPreview(cached, ctx.primary);
  }

  let inflight = illustrationFetchInflight.get(cacheKey);
  if (!inflight) {
    inflight = (async () => {
      try {
        const response = await fetch(entry.assetPath);
        if (!response.ok) return null;
        const raw = normalizeIllustrationSvg(await response.text());
        if (!raw) return null;
        illustrationSvgCache.set(cacheKey, raw);
        return raw;
      } catch {
        return null;
      } finally {
        illustrationFetchInflight.delete(cacheKey);
      }
    })();
    illustrationFetchInflight.set(cacheKey, inflight);
  }

  const raw = await inflight;
  if (!raw) return null;

  if (entry.source === "storyset") {
    return recolorIllustrationForPreview(raw, ctx.primary, ["#407BFF", "#407bff"]);
  }
  if (entry.recolorAccents?.length) {
    return recolorIllustrationForPreview(raw, ctx.primary, entry.recolorAccents);
  }
  return recolorIllustrationForPreview(raw, ctx.primary);
}

async function instantiateLibraryPatternBrowser(
  pattern: VisualLibraryPattern,
  input: VisualBlockGenerateInput,
): Promise<VisualBlockRecord | null> {
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

  const raw = isThreeDPattern(pattern)
    ? resolveThreeDSvgClient(pattern)
    : isIllustrationPattern(pattern)
      ? await fetchIllustrationSvg(pattern, ctx)
      : pattern.render(ctx);
  if (!raw) return null;

  return {
    id: createVisualBlockId(),
    libraryId: pattern.id,
    label: pattern.label,
    kind: pattern.kind,
    svgMarkup: raw,
    createdAt: Date.now(),
    theme: ctx.theme,
  };
}

async function instantiateFromRankedPool(
  ranked: VisualLibraryPattern[],
  input: VisualBlockGenerateInput,
): Promise<VisualBlockRecord | null> {
  if (ranked.length === 0) return null;

  const topScore = scoreVisualPattern(ranked[0]!, input);
  const poolSize =
    topScore > 0 ? Math.min(12, ranked.length) : Math.min(5, ranked.length);
  const pool = ranked.slice(0, poolSize);
  const start = Math.floor(Math.random() * pool.length);

  for (let offset = 0; offset < pool.length; offset += 1) {
    const pattern = pool[(start + offset) % pool.length]!;
    const block = await instantiateLibraryPatternBrowser(pattern, input);
    if (block) return block;
  }

  return null;
}

/** Browser-only featured visual pick — avoids /api/visual-blocks/generate round-trip. */
export async function pickShuffleFeaturedVisualBrowser(
  input: VisualBlockGenerateInput,
  excludeLibraryIds: string[] = [],
): Promise<VisualBlockRecord | null> {
  const preferredKind = resolvePreferredVisualKind(input);
  const excluded = new Set(excludeLibraryIds.filter(Boolean));

  let candidates = VISUAL_LIBRARY.filter((pattern) => {
    if (excluded.has(pattern.id)) return false;
    if (isAssetPattern(pattern) && !isIllustrationPattern(pattern) && !isThreeDPattern(pattern)) {
      return false;
    }
    if (preferredKind === "illustration") return pattern.kind === "illustration";
    if (preferredKind === "3d") return pattern.kind === "3d";
    if (preferredKind === "ui") {
      return pattern.kind === "ui" || (Boolean(input.semantic) && pattern.kind === "diagram");
    }
    return FEATURED_SLOT_KINDS.includes(pattern.kind);
  });

  if (candidates.length === 0 && preferredKind) {
    candidates = VISUAL_LIBRARY.filter((pattern) => pattern.kind === preferredKind);
  }
  if (candidates.length === 0) {
    candidates = VISUAL_LIBRARY.filter((pattern) =>
      FEATURED_SLOT_KINDS.includes(pattern.kind),
    );
  }
  if (candidates.length === 0) return null;

  const ranked = rankVisualPatterns(candidates, input);
  return instantiateFromRankedPool(ranked, input);
}

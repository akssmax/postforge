import type { BackgroundPreset } from "@/lib/brand/types";
import { LIBRARY_PATTERNS, libraryPatternRef } from "@/lib/social-tool/patterns/library";
import {
  brandPatternRef,
  legacyPatternRef,
} from "@/lib/social-tool/patterns/resolvePattern";
import {
  BRAND_PATTERN_OPTIONS,
  type LegacyPatternId,
  type PatternRef,
} from "@/lib/social-tool/patterns/types";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

const SHUFFLE_LEGACY_PATTERNS: LegacyPatternId[] = [
  "monogram",
  "monogram-soft",
  "footer",
];

const SHUFFLE_PATTERN_OPACITIES = [0.12, 0.16, 0.2, 0.24, 0.28, 0.3] as const;

const SHUFFLE_PATTERN_SCALES = [
  0.5, 0.65, 0.8, 0.95, 1.1, 1.25, 1.4, 1.6, 1.8, 2, 2.25, 2.5, 2.75, 3, 3.25,
  3.5, 3.75, 4,
] as const;

const SHUFFLE_MINIMAL_PATTERN_LAYOUTS = new Set<PostLayoutId>([
  "product-focus",
  "copy-statement",
  "professional-left",
]);

export type ShuffleSurfaceInput = {
  backgrounds: BackgroundPreset[];
  currentBackgroundId: string | null;
  currentPattern: PatternRef;
  currentShowPattern: boolean;
  currentPatternOpacity: number;
  currentPatternScale: number;
  layoutId: PostLayoutId;
  shuffleBackground?: boolean;
  shufflePattern?: boolean;
  /** Logo-derived brand patterns require a monogram SVG in brand assets. */
  includeBrandPatterns?: boolean;
};

export type ShuffleSurfaceResult = {
  backgroundPresetId: string;
  pattern: PatternRef;
  showPattern: boolean;
  patternOpacity: number;
  patternScale: number;
};

function buildShufflePatternPool(includeBrandPatterns = false): PatternRef[] {
  return [
    ...SHUFFLE_LEGACY_PATTERNS.map((id) => legacyPatternRef(id)),
    ...LIBRARY_PATTERNS.map((pattern) => libraryPatternRef(pattern.id)),
    ...(includeBrandPatterns
      ? BRAND_PATTERN_OPTIONS.map((option) => brandPatternRef(option.id))
      : []),
  ];
}

const shufflePatternPoolCache = new Map<boolean, PatternRef[]>();

function getShufflePatternPool(includeBrandPatterns = false): PatternRef[] {
  const cached = shufflePatternPoolCache.get(includeBrandPatterns);
  if (cached) return cached;
  const pool = buildShufflePatternPool(includeBrandPatterns);
  shufflePatternPoolCache.set(includeBrandPatterns, pool);
  return pool;
}

function pickRandom<T>(pool: T[], exclude?: T | null): T {
  const filtered =
    exclude != null ? pool.filter((item) => item !== exclude) : pool;
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)]!;
}

function shouldShowPattern(layoutId: PostLayoutId): boolean {
  if (SHUFFLE_MINIMAL_PATTERN_LAYOUTS.has(layoutId)) {
    return Math.random() < 0.35;
  }
  return Math.random() < 0.88;
}

function pickRandomBackground(
  backgrounds: BackgroundPreset[],
  currentId: string | null,
): BackgroundPreset | undefined {
  const filtered = currentId
    ? backgrounds.filter((preset) => preset.id !== currentId)
    : backgrounds;
  const source = filtered.length > 0 ? filtered : backgrounds;
  return source[Math.floor(Math.random() * source.length)];
}

/** Pick a random background + pattern combo for shuffle (contrast is not filtered here). */
export function pickRandomShuffleSurface(
  input: ShuffleSurfaceInput,
): ShuffleSurfaceResult {
  const shuffleBackground = input.shuffleBackground ?? true;
  const shufflePattern = input.shufflePattern ?? true;
  const backgrounds = input.backgrounds.filter(Boolean);
  const patternPool = getShufflePatternPool(input.includeBrandPatterns ?? false);

  const backgroundPresetId = shuffleBackground
    ? (pickRandomBackground(backgrounds, input.currentBackgroundId)?.id ??
      backgrounds[0]?.id ??
      "default")
    : (input.currentBackgroundId ?? backgrounds[0]?.id ?? "default");

  if (!shufflePattern) {
    return {
      backgroundPresetId,
      pattern: input.currentPattern,
      showPattern: input.currentShowPattern,
      patternOpacity: input.currentPatternOpacity,
      patternScale: input.currentPatternScale,
    };
  }

  return {
    backgroundPresetId,
    pattern: pickRandom(patternPool, input.currentPattern),
    showPattern: shouldShowPattern(input.layoutId),
    patternOpacity: pickRandom([...SHUFFLE_PATTERN_OPACITIES]),
    patternScale: pickRandom([...SHUFFLE_PATTERN_SCALES]),
  };
}

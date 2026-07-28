import { buildBackgroundPresets } from "@/lib/brand/backgroundPresets";
import type { BackgroundPreset, BrandColors } from "@/lib/brand/types";
import type { LandingBrandId } from "@/components/landing/landingBrands";
import {
  getLandingBrandContent,
  landingDefaultDesignOverrides,
  pickLandingCopyVariant,
  pickLandingIllustration,
} from "@/components/landing/landingBrandContent";
import { getRandomPlaygroundLayout } from "@/lib/social-tool/layoutReviews";
import { resolveLayoutHierarchyFromIds } from "@/lib/social-tool/layoutHierarchy";
import { DEFAULT_POST_LAYOUT_SPACING } from "@/lib/social-tool/layoutSpacing";
import {
  DEFAULT_POST_LAYOUT_ID,
  getLayoutStatePatch,
  getPostLayout,
  layoutUsesSplit,
  seedCopyForLayout,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import {
  getPlatform,
  type LogoAlign,
  type LogoPlacement,
  type PlatformId,
  type PostCopy,
  type TextAlign,
} from "@/lib/social-tool/presets";
import {
  DEFAULT_SHUFFLE_PREFERENCES,
  type ShufflePreferences,
} from "@/lib/social-tool/shufflePreferences";
import { pickRandomShuffleSurface } from "@/lib/social-tool/shuffleSurface";

export type LandingDemoState = {
  platformId: PlatformId;
  layoutId: PostLayoutId;
  layoutName: string;
  copy: PostCopy;
  copyVariantIndex: number;
  typeScale: number;
  logoScale: number;
  logoAlign: LogoAlign;
  logoPlacement: LogoPlacement;
  textAlign: TextAlign;
  backgroundPresetId: string;
  backgroundCss: BackgroundPreset["css"];
  pattern: PatternRef;
  showPattern: boolean;
  patternOpacity: number;
  patternScale: number;
  /** Featured illustration public path (never GenUI on landing). */
  illustrationSrc: string;
  showFeaturedImage: boolean;
};

export const LANDING_SHUFFLE_PREFS: ShufflePreferences = {
  ...DEFAULT_SHUFFLE_PREFERENCES,
  featuredPosition: false,
};

/** Light solids + light gradients — used for Claude demos. */
export function landingBackgroundPool(
  colors: BrandColors,
  preferLight: boolean,
): BackgroundPreset[] {
  const all = buildBackgroundPresets(colors);
  if (!preferLight) {
    return all;
  }
  const light = all.filter(
    (preset) =>
      preset.id !== "default" &&
      (preset.gradientTheme === "light" ||
        (preset.kind === "solid" && preset.css.textOnBrand === "#0a1b25")),
  );
  if (light.length > 0) return light;
  return all.filter((preset) => preset.id !== "default");
}

function resolveBackground(
  pool: BackgroundPreset[],
  preferredId?: string | null,
): BackgroundPreset {
  return (
    pool.find((b) => b.id === preferredId) ??
    pool.find((b) => b.gradientTheme === "light") ??
    pool.find((b) => b.kind === "solid") ??
    pool[0]!
  );
}

/** Square canvases (e.g. 1080×1080) should not land on split layouts in demos. */
function isSquarePlatform(platformId: PlatformId): boolean {
  const platform = getPlatform(platformId);
  return platform.width === platform.height;
}

function pickLandingLayout(
  platformId: PlatformId,
  excludeId?: PostLayoutId,
): PostLayout {
  const preferNonSplit = isSquarePlatform(platformId);
  let layout = getRandomPlaygroundLayout(platformId, excludeId);
  if (!preferNonSplit || !layoutUsesSplit(layout)) return layout;

  for (let i = 0; i < 14; i++) {
    layout = getRandomPlaygroundLayout(platformId, layout.id);
    if (!layoutUsesSplit(layout)) return layout;
  }
  return getPostLayout(DEFAULT_POST_LAYOUT_ID);
}

function coerceLandingLayoutId(
  platformId: PlatformId,
  layoutId: PostLayoutId,
): PostLayoutId {
  if (isSquarePlatform(platformId) && layoutUsesSplit(getPostLayout(layoutId))) {
    return DEFAULT_POST_LAYOUT_ID;
  }
  return layoutId;
}

export function createLandingDemoState(
  brandId: LandingBrandId,
  colors: BrandColors,
  overrides?: Partial<LandingDemoState>,
): LandingDemoState {
  const content = getLandingBrandContent(brandId);
  const brandDefaults = landingDefaultDesignOverrides(brandId);
  const platformId = overrides?.platformId ?? brandDefaults.platformId;
  const layoutId = coerceLandingLayoutId(
    platformId,
    overrides?.layoutId ?? brandDefaults.layoutId,
  );
  const layout = getPostLayout(layoutId);
  const patch = getLayoutStatePatch(layout);
  const copy = seedCopyForLayout(
    overrides?.copy ?? brandDefaults.copy,
    layout,
  );
  const illustrationSrc =
    overrides?.illustrationSrc ?? brandDefaults.illustrationSrc;
  const backgrounds = landingBackgroundPool(colors, content.preferLightBackground);
  const background = resolveBackground(
    backgrounds,
    overrides?.backgroundPresetId ?? brandDefaults.backgroundPresetId,
  );
  const hierarchy = resolveLayoutHierarchyFromIds({
    platformId,
    layoutId,
    copy,
    spacing: DEFAULT_POST_LAYOUT_SPACING,
    showLogo: true,
    showFeaturedImage: overrides?.showFeaturedImage ?? brandDefaults.showFeaturedImage,
    featuredMode: "image",
    productPage: "leads",
    hasUploadedFeaturedImage: true,
  });

  return {
    platformId,
    layoutId,
    layoutName: layout.name,
    copy,
    copyVariantIndex:
      overrides?.copyVariantIndex ?? brandDefaults.copyVariantIndex,
    typeScale:
      overrides?.typeScale != null
        ? Math.min(overrides.typeScale, hierarchy.typeScale)
        : hierarchy.typeScale,
    logoScale: hierarchy.logoScale,
    logoAlign: patch.logoAlign,
    logoPlacement: patch.logoPlacement,
    textAlign: patch.textAlign,
    backgroundPresetId: background.id,
    backgroundCss: background.css,
    pattern: overrides?.pattern ?? brandDefaults.pattern,
    showPattern: overrides?.showPattern ?? brandDefaults.showPattern,
    patternOpacity: overrides?.patternOpacity ?? brandDefaults.patternOpacity,
    patternScale: overrides?.patternScale ?? brandDefaults.patternScale,
    illustrationSrc,
    showFeaturedImage: overrides?.showFeaturedImage ?? brandDefaults.showFeaturedImage,
  };
}

/** Client-only shuffle — layout / background / pattern / copy / illustration. No API. */
export function shuffleLandingDemo(
  brandId: LandingBrandId,
  state: LandingDemoState,
  colors: BrandColors,
  prefs: ShufflePreferences = LANDING_SHUFFLE_PREFS,
): LandingDemoState {
  const content = getLandingBrandContent(brandId);
  const nextLayout = prefs.layout
    ? pickLandingLayout(state.platformId, state.layoutId)
    : getPostLayout(coerceLandingLayoutId(state.platformId, state.layoutId));
  const patch = getLayoutStatePatch(nextLayout);

  let nextCopy = seedCopyForLayout(state.copy, nextLayout);
  let nextCopyVariantIndex = state.copyVariantIndex;
  if (prefs.content) {
    const shuffled = pickLandingCopyVariant(brandId, state.copyVariantIndex);
    nextCopy = seedCopyForLayout(shuffled.copy, nextLayout);
    nextCopyVariantIndex = shuffled.nextIndex;
  }

  const nextIllustration = prefs.content
    ? pickLandingIllustration(brandId, state.illustrationSrc)
    : state.illustrationSrc;

  const hierarchy = resolveLayoutHierarchyFromIds({
    platformId: state.platformId,
    layoutId: nextLayout.id,
    copy: nextCopy,
    spacing: DEFAULT_POST_LAYOUT_SPACING,
    showLogo: true,
    showFeaturedImage: state.showFeaturedImage,
    featuredMode: "image",
    productPage: "leads",
    hasUploadedFeaturedImage: true,
  });

  const backgrounds = landingBackgroundPool(colors, content.preferLightBackground);
  const surface = pickRandomShuffleSurface({
    backgrounds,
    currentBackgroundId: state.backgroundPresetId,
    currentPattern: state.pattern,
    currentShowPattern: state.showPattern,
    currentPatternOpacity: state.patternOpacity,
    currentPatternScale: state.patternScale,
    layoutId: nextLayout.id,
    shuffleBackground: prefs.background,
    shufflePattern: prefs.pattern,
    includeBrandPatterns: false,
  });

  const background = resolveBackground(backgrounds, surface.backgroundPresetId);

  return {
    ...state,
    layoutId: nextLayout.id,
    layoutName: nextLayout.name,
    copy: nextCopy,
    copyVariantIndex: nextCopyVariantIndex,
    typeScale: hierarchy.typeScale,
    logoScale: hierarchy.logoScale,
    logoAlign: patch.logoAlign,
    logoPlacement: patch.logoPlacement,
    textAlign: patch.textAlign,
    backgroundPresetId: background.id,
    backgroundCss: background.css,
    pattern: prefs.pattern ? surface.pattern : state.pattern,
    showPattern: prefs.pattern ? surface.showPattern : state.showPattern,
    patternOpacity: prefs.pattern ? surface.patternOpacity : state.patternOpacity,
    patternScale: prefs.pattern ? surface.patternScale : state.patternScale,
    illustrationSrc: nextIllustration,
  };
}

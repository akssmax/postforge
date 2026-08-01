import type { BackgroundPreset } from "@/lib/brand/types";
import { buildBackgroundPresets } from "@/lib/brand/backgroundPresets";
import { hasMonogramSvg } from "@/lib/brand/logoVariants";
import type { DesignSessionPersisted } from "@/lib/design/types";
import {
  catalogLayoutRef,
  catalogLayoutToDynamic,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import { resolveLayoutHierarchyFromIds } from "@/lib/social-tool/layoutHierarchy";
import {
  getRandomPlaygroundLayout,
  loadLayoutReviews,
  resolveLayoutSpacing,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import {
  getLayoutShuffleFamily,
  getLayoutStatePatch,
  getPostLayout,
  seedCopyForLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { layoutIdForDocument } from "@/lib/social-tool/layoutRegistry";
import { resolveCanvasShapes } from "@/lib/social-tool/shapes/placement";
import { pickNextCopyVariant } from "@/lib/social-tool/shuffleCopy";
import { pickRandomShuffleSurface } from "@/lib/social-tool/shuffleSurface";
import type { ShufflePreferences } from "@/lib/social-tool/shufflePreferences";
import {
  resolveVisualBlockDimensions,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import { attachCtaButtonsToTextSlots } from "@/lib/social-tool/visualBlocks/library/ctaButtons";
import { layoutUsesCtaButton } from "@/lib/social-tool/postLayouts";

export type ApplyShuffleOptions = {
  prefs: ShufflePreferences;
  /** Layout ids already used (origin + prior variants). */
  excludeLayoutIds?: readonly PostLayoutId[];
  /** Shuffle families already used. */
  excludeFamilies?: readonly string[];
  backgrounds?: BackgroundPreset[];
  record?: LayoutReviewRecord;
};

export type ApplyShuffleResult = {
  session: DesignSessionPersisted;
  shouldShuffleFeaturedVisual: boolean;
  layoutId: PostLayoutId;
  layoutFamily: string;
};

function composedBlockDimensions(session: DesignSessionPersisted) {
  const block = activeVisualBlock(
    session.featured.visualBlocks ?? [],
    session.featured.activeBlockId,
  );
  if (!block) return undefined;
  return resolveVisualBlockDimensions(block) ?? VISUAL_LIBRARY_FRAME;
}

/**
 * Apply shuffle preferences to a persisted session (pure; no React / network).
 * Featured visual shuffle is signaled separately for the caller to await.
 */
export function applyShuffleToSession(
  source: DesignSessionPersisted,
  options: ApplyShuffleOptions,
): ApplyShuffleResult {
  const prefs = options.prefs;
  const record = options.record ?? loadLayoutReviews();
  const doc = source.document;
  const backgrounds =
    options.backgrounds ?? buildBackgroundPresets(source.brand.colors);
  const currentLayoutId = layoutIdForDocument(doc);

  const nextLayout = prefs.layout
    ? getRandomPlaygroundLayout(
        doc.platformId,
        currentLayoutId,
        record,
        {
          excludeIds: options.excludeLayoutIds,
          excludeFamilies: options.excludeFamilies,
        },
      )
    : getPostLayout(currentLayoutId);

  const patch = getLayoutStatePatch(nextLayout);
  const nextSpacing = prefs.layout
    ? resolveLayoutSpacing(record, doc.platformId, nextLayout.id)
    : doc.layoutSpacing;

  let nextCopy = seedCopyForLayout(doc.copy, nextLayout);
  let nextCopyVariantIndex = doc.copyVariantIndex ?? 0;
  if (prefs.content) {
    const shuffled = pickNextCopyVariant(
      doc.copy,
      nextLayout,
      doc.copyVariants,
      doc.copyVariantIndex,
    );
    nextCopy = shuffled.copy;
    nextCopyVariantIndex = shuffled.nextIndex;
  }

  const shouldRecalcTypeScale = prefs.layout || prefs.content;
  const shouldRecalcFeaturedTransform =
    prefs.featuredPosition || source.featured.mode === "composed";

  const hierarchy =
    shouldRecalcTypeScale || shouldRecalcFeaturedTransform
      ? resolveLayoutHierarchyFromIds({
          platformId: doc.platformId,
          layoutId: nextLayout.id,
          copy: nextCopy,
          spacing: nextSpacing,
          showLogo: doc.showBrand,
          showFeaturedImage: doc.showFeaturedImage,
          featuredMode: source.featured.mode,
          productPage: source.featured.productPage,
          hasUploadedFeaturedImage: !!source.featured.image,
          visualBlockDimensions: composedBlockDimensions(source),
        })
      : null;

  const surface = pickRandomShuffleSurface({
    backgrounds,
    currentBackgroundId: source.brand.activeBackgroundPresetId,
    currentPattern: doc.pattern,
    currentShowPattern: doc.showPattern,
    currentPatternOpacity: doc.patternOpacity,
    currentPatternScale: doc.patternScale,
    layoutId: nextLayout.id,
    shuffleBackground: prefs.background,
    shufflePattern: prefs.pattern,
    includeBrandPatterns: hasMonogramSvg(source.brand),
  });

  const dynamicLayout = catalogLayoutToDynamic(nextLayout);
  let nextTextSlots =
    doc.textSlots ??
    textSlotsFromCopy(doc.copy, catalogLayoutToDynamic(getPostLayout(currentLayoutId)));
  if (prefs.layout || prefs.content) {
    nextTextSlots = textSlotsFromCopy(nextCopy, dynamicLayout);
  }

  let nextVisualBlocks = source.featured.visualBlocks ?? [];
  if (layoutUsesCtaButton(nextLayout) && (prefs.layout || prefs.content)) {
    const attached = attachCtaButtonsToTextSlots({
      textSlots: nextTextSlots,
      visualBlocks: nextVisualBlocks,
      layout: nextLayout,
      brandColors: {
        primary: source.brand.colors.primary,
        accent: source.brand.colors.accent,
      },
      headline: nextCopy.heading,
      subheading: nextCopy.subheading,
      randomize: prefs.content,
    });
    nextTextSlots = attached.textSlots;
    nextVisualBlocks = attached.visualBlocks;
  }

  const nextBrand = prefs.background
    ? {
        ...source.brand,
        activeBackgroundPresetId: surface.backgroundPresetId,
      }
    : source.brand;

  const nextDocument = {
    ...doc,
    ...(prefs.layout
      ? {
          layoutId: nextLayout.id,
          layoutRef: catalogLayoutRef(nextLayout.id),
          logoPlacement: patch.logoPlacement,
          logoAlign: patch.logoAlign,
          textAlign: patch.textAlign,
          layoutSpacing: nextSpacing,
          textSlots: nextTextSlots,
        }
      : prefs.content && layoutUsesCtaButton(nextLayout)
        ? { textSlots: nextTextSlots }
        : {}),
    copy: nextCopy,
    copyVariantIndex: nextCopyVariantIndex,
    ...(hierarchy
      ? {
          typeScale: hierarchy.typeScale,
          logoScale: hierarchy.logoScale,
          ...(shouldRecalcFeaturedTransform
            ? { featuredTransform: hierarchy.featuredTransform }
            : {}),
        }
      : {}),
    ...(prefs.layout && doc.decorationLevel
      ? {
          canvasShapes: resolveCanvasShapes({
            decorationLevel: doc.decorationLevel,
            layoutId: nextLayout.id,
            platformId: doc.platformId,
            spacing: nextSpacing,
            brandColors: {
              primary: source.brand.colors.primary,
              accent: source.brand.colors.accent,
            },
            designId: source.designId,
          }),
        }
      : {}),
    ...(prefs.pattern
      ? {
          pattern: surface.pattern,
          showPattern: surface.showPattern,
          patternOpacity: surface.patternOpacity,
          patternScale: surface.patternScale,
        }
      : {}),
    ...(prefs.background ? { showBackground: true } : {}),
  };

  const shouldShuffleFeaturedVisual =
    prefs.featuredPosition &&
    source.featured.mode === "composed" &&
    (source.featured.visualBlocks?.length ?? 0) > 0;

  return {
    session: {
      ...source,
      brand: nextBrand,
      featured: {
        ...source.featured,
        visualBlocks: nextVisualBlocks,
      },
      document: nextDocument,
      updatedAt: Date.now(),
    },
    shouldShuffleFeaturedVisual,
    layoutId: nextLayout.id,
    layoutFamily: getLayoutShuffleFamily(nextLayout),
  };
}

import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import { DEFAULT_FEATURED_TRANSFORM } from "@/lib/social-tool/featuredTransform";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";
import {
  canvasScaleFactor,
  DEFAULT_POST_LAYOUT_SPACING,
  spacingTokenToPx,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import {
  getPostLayout,
  layoutUsesSplit,
  layoutFeaturedZoneMode,
  resolveFeaturedLayoutZones,
  resolveSplitLayoutZones,
  estimateTextBandMinHeight,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { getProductPageFrame } from "@/lib/social-tool/productFrames";
import { getPlatform, type PlatformId, type PostCopy, type ProductPageId } from "@/lib/social-tool/presets";
import {
  computeVisualBlockFitScale,
  VISUAL_LIBRARY_FRAME,
  type VisualBlockDimensions,
} from "@/lib/social-tool/visualBlocks/dimensions";

const TYPE_SCALE_MIN = 0.75;
const TYPE_SCALE_MAX = 4;
const LOGO_SCALE_MIN = 0.5;
const LOGO_SCALE_MAX = 3;
/** GenUI product frames stay reasonably large in the slot. */
const GENUI_FEATURED_SCALE_MIN = 0.6;
/**
 * Composed library assets (illustrations / 3D / UI cards) must be allowed to
 * shrink well below 1 — short featured bands often need ~0.2–0.5 fit scale.
 */
const COMPOSED_FEATURED_SCALE_MIN = 0.12;
const FEATURED_SCALE_MAX = 4;

const LINKEDIN_PLATFORMS = new Set<PlatformId>([
  "linkedin-square",
  "linkedin-landscape",
]);

function isLinkedInAdPlatform(platformId: PlatformId): boolean {
  return LINKEDIN_PLATFORMS.has(platformId);
}

export type HierarchyInput = {
  width: number;
  height: number;
  platformId: PlatformId;
  layout: PostLayout;
  copy: Pick<PostCopy, "heading" | "subheading" | "extraFields">;
  spacing: PostLayoutSpacing;
  showLogo: boolean;
  showFeaturedImage: boolean;
  featuredMode: FeaturedBlockMode;
  productPage: ProductPageId;
  visualBlockDimensions?: VisualBlockDimensions;
  /** Visible featured cells sharing the product band (defaults to 1). */
  featuredSlotCount?: number;
};

export type HierarchyResult = {
  typeScale: number;
  logoScale: number;
  featuredTransform: FeaturedImageTransform;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScale(value: number): number {
  return Math.round(value * 100) / 100;
}

function plainHeadingText(heading: string): string {
  return heading.replace(/\[\[(.+?)\]\]/g, "$1").trim();
}

/** Longest line drives horizontal type scale — not total character count. */
function headingLineCharCount(heading: string): number {
  const plain = plainHeadingText(heading);
  const lines = plain.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return 0;
  return Math.max(...lines.map((line) => line.length));
}

function longestLineCharCount(text: string): number {
  const plain = plainHeadingText(text);
  const lines = plain.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return 0;
  return Math.max(...lines.map((line) => line.length));
}

/** Prefer headline length; fall back to subheading / first body line when headline is empty. */
function primaryCopyLineCharCount(
  copy: Pick<PostCopy, "heading" | "subheading" | "extraFields">,
): number {
  const headlineChars = headingLineCharCount(copy.heading);
  if (headlineChars > 0) return headlineChars;

  const subChars = longestLineCharCount(copy.subheading);
  if (subChars > 0) return subChars;

  for (const field of copy.extraFields) {
    const chars = longestLineCharCount(field.value);
    if (chars > 0) return chars;
  }

  return 1;
}

function estimateFooterHeight(opts: {
  width: number;
  height: number;
  layout: PostLayout;
  showLogo: boolean;
  copy: Pick<PostCopy, "extraFields">;
  spacing: PostLayoutSpacing;
  logoScale: number;
}): number {
  const { width, height, layout, showLogo, copy, spacing, logoScale } = opts;
  const showFooterLogo = showLogo && layout.logoPlacement === "footer";
  const showFooterExtras =
    layout.extrasPlacement === "footer" &&
    layout.footerBlocks.includes("extras");

  if (!showFooterLogo && !showFooterExtras) return 0;

  const scale = canvasScaleFactor(width, height);
  const footerPadPx = spacingTokenToPx(spacing.footerPad, width, height);
  const footerBlockGapPx = spacingTokenToPx(spacing.footerBlockGap, width, height);
  const logoH = Math.max(12, Math.round(34 * scale * logoScale));

  let footerH = footerPadPx;
  if (showFooterLogo) footerH += logoH + footerPadPx / 2;
  if (showFooterExtras) {
    const lineCount = Math.max(copy.extraFields.length, 1);
    footerH += Math.round(lineCount * 24 + 8) * scale;
    if (showFooterLogo) footerH += footerBlockGapPx;
  }
  footerH += footerPadPx;
  return footerH;
}

function resolveSlotDimensions(
  input: HierarchyInput,
  typeScale: number,
  logoScale: number,
): {
  textWidth: number;
  featuredSlotWidth: number;
  featuredSlotHeight: number;
} {
  const { width, height, layout, spacing, showLogo, showFeaturedImage, copy } = input;
  const isTallPrint = height / width >= 1.8;
  const layoutPad = spacingTokenToPx(spacing.layoutPad, width, height);
  const footerH = estimateFooterHeight({
    width,
    height,
    layout,
    showLogo,
    copy,
    spacing,
    logoScale,
  });

  if (layoutUsesSplit(layout)) {
    const split = resolveSplitLayoutZones({
      width,
      height,
      footerH,
      layout,
      showFeaturedImage,
      isTallPrint,
      showTopLogo: showLogo && layout.logoPlacement === "top",
      spacing,
      logoScale,
    });
    return {
      textWidth: split.textColumn,
      featuredSlotWidth: split.featuredColumn,
      featuredSlotHeight: split.rowHeight,
    };
  }

  const stacked = resolveFeaturedLayoutZones({
    width,
    height,
    footerH,
    layout,
    showFeaturedImage: showFeaturedImage && !layoutUsesSplit(layout),
    isTallPrint,
    typeScale,
    showTopLogo: showLogo && layout.logoPlacement === "top",
    spacing,
    logoScale,
    copy: input.copy,
    platformId: input.platformId,
  });

  if (layoutFeaturedZoneMode(layout) === "corner") {
    const corner = Math.round(Math.min(width, height) * 0.36);
    return {
      textWidth: width - 2 * layoutPad,
      featuredSlotWidth: corner,
      featuredSlotHeight: corner,
    };
  }

  return {
    textWidth: width - 2 * layoutPad,
    featuredSlotWidth: width - 2 * layoutPad,
    featuredSlotHeight: stacked.productZone,
  };
}

function resolveEffectiveCopyWidth(input: HierarchyInput, textWidth: number): number {
  if (layoutUsesSplit(input.layout)) return textWidth;
  const canvasScale = canvasScaleFactor(input.width, input.height);
  const maxCopyWidth = Math.round(920 * canvasScale);
  return Math.min(textWidth, maxCopyWidth);
}

function computeTypeScale(
  input: HierarchyInput,
  textWidth: number,
  logoScale: number,
): number {
  const { width, height, layout, copy, platformId } = input;
  const canvasScale = canvasScaleFactor(width, height);
  const charCount = primaryCopyLineCharCount(copy);
  const isTallPrint = height / width >= 1.8;
  const linkedInAd = isLinkedInAdPlatform(platformId);
  const effectiveTextWidth = resolveEffectiveCopyWidth(input, textWidth);

  const charWidthFactor = linkedInAd ? 0.34 : 0.4;
  const estimatedWidthAtOne = charCount * charWidthFactor * 52 * canvasScale;
  const fillRatio = linkedInAd ? 0.98 : 0.9;
  let typeScale = (effectiveTextWidth * fillRatio) / Math.max(estimatedWidthAtOne, 1);

  let maxScale = TYPE_SCALE_MAX;
  const profile = layout.headlineScaleProfile ?? "default";
  if (profile === "display") {
    maxScale = linkedInAd ? 3.8 : 3.2;
  } else if (profile === "poster") {
    maxScale = linkedInAd ? 4 : 3.6;
  } else if (layout.textZoneRatio >= 0.5 || layout.id === "copy-statement") {
    maxScale = linkedInAd ? 3.4 : 2.4;
  }
  if (layout.listStyle === "numbered") {
    maxScale = Math.min(maxScale, linkedInAd ? 2.15 : 1.85);
  }
  if (charCount > 28 && profile === "default") {
    maxScale = Math.min(maxScale, linkedInAd ? 3.2 : 2.6);
  } else if (charCount > 20 && profile === "default") {
    maxScale = Math.min(maxScale, linkedInAd ? 3.8 : 3);
  }

  if (isTallPrint) {
    maxScale *= linkedInAd ? 0.95 : 0.9;
  }

  typeScale = clamp(typeScale, TYPE_SCALE_MIN, maxScale);

  if (copy.subheading.trim() && charCount <= 32) {
    typeScale = Math.min(maxScale, typeScale * (linkedInAd ? 1.12 : 1.06));
  }

  if (linkedInAd && input.showLogo && layout.logoPlacement === "top") {
    const logoH = Math.max(12, 34 * canvasScale * logoScale);
    const headlineToLogoRatio = 2.1;
    const minTypeScale = (logoH * headlineToLogoRatio) / (52 * canvasScale);
    typeScale = Math.min(maxScale, Math.max(typeScale, minTypeScale));
  }

  return roundScale(typeScale);
}

function computeLogoScale(input: HierarchyInput): number {
  const { width, height, layout, showLogo, platformId } = input;
  if (!showLogo) return 1;

  const canvasScale = canvasScaleFactor(width, height);
  const linkedInAd = isLinkedInAdPlatform(platformId);
  const share = linkedInAd
    ? layout.logoAlign === "center"
      ? 0.038
      : 0.042
    : layout.logoAlign === "center"
      ? 0.055
      : 0.06;
  let targetLogoH = height * share;

  if (layout.logoPlacement === "footer") {
    targetLogoH *= linkedInAd ? 0.8 : 0.85;
  }

  const logoScale = targetLogoH / Math.max(34 * canvasScale, 1);
  return roundScale(clamp(logoScale, LOGO_SCALE_MIN, LOGO_SCALE_MAX));
}

function computeFeaturedTransform(
  input: HierarchyInput,
  slotWidth: number,
  slotHeight: number,
): FeaturedImageTransform {
  const base = { ...DEFAULT_FEATURED_TRANSFORM };

  if (!input.showFeaturedImage || slotWidth <= 0 || slotHeight <= 0) {
    return base;
  }

  const slotCount = Math.max(1, Math.round(input.featuredSlotCount ?? 1));
  const cellWidth = slotWidth / slotCount;

  if (input.featuredMode === "genui") {
    const native = getProductPageFrame(input.productPage);
    let scale = (cellWidth * 0.92) / native.width;

    if (layoutUsesSplit(input.layout)) {
      scale = Math.min(scale, (slotHeight * 0.95) / native.height);
    }

    scale = clamp(scale, GENUI_FEATURED_SCALE_MIN, FEATURED_SCALE_MAX);

    return {
      ...base,
      scale: roundScale(scale),
    };
  }

  if (input.featuredMode === "composed") {
    const native = input.visualBlockDimensions ?? VISUAL_LIBRARY_FRAME;
    const scale = clamp(
      computeVisualBlockFitScale(
        cellWidth,
        slotHeight,
        native.width,
        native.height,
      ),
      COMPOSED_FEATURED_SCALE_MIN,
      FEATURED_SCALE_MAX,
    );

    return {
      ...base,
      scale: roundScale(scale),
    };
  }

  if (input.featuredMode === "image") {
    const zoneMode = layoutFeaturedZoneMode(input.layout);
    if (zoneMode === "corner") {
      return {
        ...base,
        scale: roundScale(0.68),
        x: 34,
        y: -22,
        rotateZ: 0,
      };
    }
    if (zoneMode === "portrait-strip") {
      return {
        ...base,
        scale: roundScale(1.08),
        y: 0,
      };
    }
  }

  return base;
}

function stackedCopyFits(
  input: HierarchyInput,
  typeScale: number,
  logoScale: number,
): boolean {
  if (layoutUsesSplit(input.layout) || !input.showFeaturedImage) return true;
  if (layoutFeaturedZoneMode(input.layout) === "corner") return true;

  const isTallPrint = input.height / input.width >= 1.8;
  const footerH = estimateFooterHeight({
    width: input.width,
    height: input.height,
    layout: input.layout,
    showLogo: input.showLogo,
    copy: input.copy,
    spacing: input.spacing,
    logoScale,
  });
  const { textZone } = resolveFeaturedLayoutZones({
    width: input.width,
    height: input.height,
    footerH,
    layout: input.layout,
    showFeaturedImage: true,
    isTallPrint,
    typeScale,
    showTopLogo: input.showLogo && input.layout.logoPlacement === "top",
    spacing: input.spacing,
    logoScale,
    copy: input.copy,
    platformId: input.platformId,
  });
  const minTextZone = estimateTextBandMinHeight({
    width: input.width,
    height: input.height,
    layout: input.layout,
    showTopLogo: input.showLogo && input.layout.logoPlacement === "top",
    spacing: input.spacing,
    isTallPrint,
    logoScale,
    typeScale,
    copy: input.copy,
    platformId: input.platformId,
  });

  return minTextZone <= textZone;
}

function estimateSplitCopyStackHeight(
  input: HierarchyInput,
  typeScale: number,
  logoScale: number,
  textColumnWidth: number,
): number {
  const { width, height, layout, spacing, showLogo, copy, platformId } = input;
  const isTallPrint = height / width >= 1.8;
  const layoutPad = spacingTokenToPx(spacing.layoutPad, width, height);
  const bandHeight = estimateTextBandMinHeight({
    width,
    height,
    layout,
    showTopLogo: showLogo && layout.logoPlacement === "top",
    spacing,
    isTallPrint,
    logoScale,
    typeScale,
    copy,
    platformId,
    copyLineWidth: Math.max(1, textColumnWidth),
  });
  return Math.max(0, bandHeight - layoutPad);
}

function fitSplitTypeScaleToColumn(
  input: HierarchyInput,
  logoScale: number,
  textColumnWidth: number,
  rowHeight: number,
  typeScale: number,
): number {
  if (rowHeight <= 0 || textColumnWidth <= 0) return typeScale;

  const targetFill =
    input.layout.textVerticalAlign === "center" ? 0.58 : 0.72;
  let next = typeScale;
  let contentH = estimateSplitCopyStackHeight(
    input,
    next,
    logoScale,
    textColumnWidth,
  );

  for (let i = 0; i < 24 && contentH < rowHeight * targetFill && next < TYPE_SCALE_MAX; i += 1) {
    next = roundScale(next * 1.05);
    contentH = estimateSplitCopyStackHeight(
      input,
      next,
      logoScale,
      textColumnWidth,
    );
  }

  for (let i = 0; i < 24 && contentH > rowHeight * 0.94 && next > TYPE_SCALE_MIN; i += 1) {
    next = roundScale(next * 0.94);
    contentH = estimateSplitCopyStackHeight(
      input,
      next,
      logoScale,
      textColumnWidth,
    );
  }

  return next;
}

function clampTypeScaleToFit(input: HierarchyInput, typeScale: number, logoScale: number): number {
  let next = typeScale;
  while (next > TYPE_SCALE_MIN && !stackedCopyFits(input, next, logoScale)) {
    next = roundScale(next * 0.92);
  }
  return Math.max(TYPE_SCALE_MIN, next);
}

export function resolveLayoutHierarchy(input: HierarchyInput): HierarchyResult {
  const logoScale = computeLogoScale(input);
  const slotsAtOne = resolveSlotDimensions(input, 1, logoScale);
  let typeScale = computeTypeScale(input, slotsAtOne.textWidth, logoScale);
  typeScale = clampTypeScaleToFit(input, typeScale, logoScale);

  if (layoutUsesSplit(input.layout) && input.showFeaturedImage) {
    const split = resolveSplitLayoutZones({
      width: input.width,
      height: input.height,
      footerH: estimateFooterHeight({
        width: input.width,
        height: input.height,
        layout: input.layout,
        showLogo: input.showLogo,
        copy: input.copy,
        spacing: input.spacing,
        logoScale,
      }),
      layout: input.layout,
      showFeaturedImage: input.showFeaturedImage,
      isTallPrint: input.height / input.width >= 1.8,
      showTopLogo: input.showLogo && input.layout.logoPlacement === "top",
      spacing: input.spacing,
      logoScale,
    });
    typeScale = fitSplitTypeScaleToColumn(
      input,
      logoScale,
      split.textColumn,
      split.rowHeight,
      typeScale,
    );
  }

  const slots = resolveSlotDimensions(input, typeScale, logoScale);
  const featuredTransform = computeFeaturedTransform(
    input,
    slots.featuredSlotWidth,
    slots.featuredSlotHeight,
  );

  return { typeScale, logoScale, featuredTransform };
}

export function resolveLayoutHierarchyFromIds(opts: {
  platformId: PlatformId;
  layoutId: PostLayoutId;
  copy: PostCopy;
  spacing: PostLayoutSpacing;
  showLogo: boolean;
  showFeaturedImage: boolean;
  featuredMode: FeaturedBlockMode;
  productPage: ProductPageId;
  hasUploadedFeaturedImage?: boolean;
  visualBlockDimensions?: VisualBlockDimensions;
  featuredSlotCount?: number;
}): HierarchyResult {
  const platform = getPlatform(opts.platformId);
  const layout = getPostLayout(opts.layoutId);
  const featuredMode =
    opts.featuredMode === "image" && opts.hasUploadedFeaturedImage
      ? "image"
      : opts.featuredMode === "composed"
        ? "composed"
        : opts.featuredMode === "placeholder"
          ? "placeholder"
          : "genui";
  return resolveLayoutHierarchy({
    width: platform.width,
    height: platform.height,
    platformId: opts.platformId,
    layout,
    copy: opts.copy,
    spacing: opts.spacing,
    showLogo: opts.showLogo,
    showFeaturedImage: opts.showFeaturedImage,
    featuredMode,
    productPage: opts.productPage,
    visualBlockDimensions: opts.visualBlockDimensions,
    featuredSlotCount: opts.featuredSlotCount,
  });
}

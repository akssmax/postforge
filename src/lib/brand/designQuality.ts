import {
  contrastRatio,
  extractSvgFills,
  passesContrast,
  requiredRatio,
  resolveBackgroundHex,
  resolveForegroundHex,
  type ContrastLevel,
  type ContrastResult,
} from "@/lib/brand/contrast";
import { evaluateSvgGraphicContrast } from "@/lib/brand/logoContrastFix";
import {
  hexToRgb,
  isNearNeutral,
  relativeLuminance,
  rgbToHsl,
  withLightness,
} from "@/lib/brand/colorUtils";
import { getPostLayout, DEFAULT_POST_LAYOUT_ID } from "@/lib/social-tool/postLayouts";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  stepSpacingToken,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";

export type VisualDesignCheckInput = {
  backgroundCss: string;
  accentColor?: string;
  headingText?: string;
  showFeaturedImage?: boolean;
  featuredMode?: FeaturedBlockMode;
  featuredSvgMarkup?: string | null;
  featuredScale?: number;
  showPattern?: boolean;
  patternOpacity?: number;
  showContent?: boolean;
  layoutId?: PostLayoutId;
  typeScale?: number;
  brandAccent?: string;
  layoutSpacing?: PostLayoutSpacing;
};

export type VisualBalanceFixPatch = {
  typeScale?: number;
  featuredTransformScale?: number;
  layoutSpacing?: PostLayoutSpacing;
  patternOpacity?: number;
  accentColor?: string;
};

function hasAccentMarkup(text: string): boolean {
  return /\[\[(.+?)\]\]/.test(text);
}

/** Minimum contrast for accent highlights to read as intentional (not weak visual pop). */
export const ACCENT_VISUAL_POP_RATIO = 5.75;

function hueDistance(a: string, b: string): number {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  if (!ra || !rb) return 180;
  const ha = rgbToHsl(ra).h;
  const hb = rgbToHsl(rb).h;
  const diff = Math.abs(ha - hb);
  return Math.min(diff, 360 - diff);
}

function isCamouflaged(foreground: string, background: string): boolean {
  if (isNearNeutral(foreground) || isNearNeutral(background)) return false;
  const ratio = contrastRatio(foreground, background);
  if (ratio >= 3.5) return false;
  return hueDistance(foreground, background) < 28;
}

function dominantSvgColor(colors: string[]): string | null {
  if (colors.length === 0) return null;
  let best = colors[0];
  let bestScore = -1;
  for (const color of colors) {
    if (isNearNeutral(color)) continue;
    const rgb = hexToRgb(color);
    if (!rgb) continue;
    const { s, l } = rgbToHsl(rgb);
    const score = s * (1 - Math.abs(l - 55) / 55);
    if (score > bestScore) {
      bestScore = score;
      best = color;
    }
  }
  return best ?? colors[0] ?? null;
}

function makeIssue(
  partial: Pick<ContrastResult, "blockId" | "kind" | "label" | "alert" | "severity"> &
    Partial<
      Pick<
        ContrastResult,
        "ratio" | "required" | "level" | "foreground" | "background"
      >
    >,
): ContrastResult {
  return {
    ratio: null,
    required: null,
    level: null,
    foreground: null,
    background: null,
    passes: false,
    ...partial,
  };
}

export function evaluateAccentContrast(input: {
  backgroundCss: string;
  accentColor?: string;
  headingText?: string;
}): ContrastResult | null {
  const { backgroundCss, accentColor, headingText = "" } = input;
  if (!accentColor || !hasAccentMarkup(headingText)) return null;

  const bg = resolveBackgroundHex(backgroundCss);
  const fg = resolveForegroundHex(accentColor, bg);
  const ratio = contrastRatio(fg, bg);
  const level: ContrastLevel = "aaLarge";
  const required = requiredRatio(level);
  const passes = passesContrast(ratio, level);
  const camouflaged = isCamouflaged(fg, bg);

  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  const weakVisualPop =
    fgRgb &&
    bgRgb &&
    passes &&
    ratio < ACCENT_VISUAL_POP_RATIO &&
    rgbToHsl(fgRgb).s > 42 &&
    rgbToHsl(bgRgb).s > 22 &&
    !isNearNeutral(fg);

  if (passes && !camouflaged && !weakVisualPop) return null;

  const alert = camouflaged
    ? "Highlighted words blend into the background hue — pick a brighter or more contrasting accent."
    : weakVisualPop
      ? "Accent color reads, but it doesn't pop enough against this saturated background — try a lighter or higher-contrast highlight."
      : ratio < required
        ? "Accent highlight is hard to read on this background. Lighten the accent or boost text contrast."
        : "Accent contrast is borderline — consider a stronger highlight color.";

  return {
    blockId: "accent",
    kind: "text",
    ratio,
    passes: false,
    required,
    level,
    foreground: fg,
    background: bg,
    label: "Accent highlight",
    alert,
    severity: ratio < 3 || camouflaged ? "error" : "warning",
  };
}

export function evaluateFeaturedVisualContrast(input: {
  backgroundCss: string;
  featuredSvgMarkup?: string | null;
  showFeaturedImage?: boolean;
}): ContrastResult | null {
  const { backgroundCss, featuredSvgMarkup, showFeaturedImage } = input;
  if (!showFeaturedImage || !featuredSvgMarkup) return null;

  const bg = resolveBackgroundHex(backgroundCss);
  const svgEval = evaluateSvgGraphicContrast(featuredSvgMarkup, backgroundCss);
  if (!svgEval) return null;

  const { ratio, foreground } = svgEval;
  const colors = extractSvgFills(featuredSvgMarkup);
  const dominant = dominantSvgColor(colors.length > 0 ? colors : [foreground]);
  const camouflaged = dominant ? isCamouflaged(dominant, bg) : false;
  const level: ContrastLevel = "graphic";
  const required = 2.5;
  const passes = ratio >= required && !camouflaged;

  if (passes) return null;

  const alert = camouflaged
    ? "The illustration colors are too close to the background — it may disappear into the canvas."
    : ratio < 2
      ? "Featured visual lacks separation from the background. Try a lighter backdrop or a bolder illustration palette."
      : "Featured visual contrast is weak — the illustration may not read clearly at a glance.";

  return {
    blockId: "featured",
    kind: "visual",
    ratio,
    passes: false,
    required,
    level,
    foreground: dominant ?? foreground,
    background: bg,
    label: "Featured visual",
    alert,
    severity: ratio < 2 || camouflaged ? "error" : "warning",
  };
}

export function evaluatePatternInterference(input: {
  backgroundCss: string;
  showPattern?: boolean;
  patternOpacity?: number;
  textColor: string;
  subTextColor: string;
}): ContrastResult | null {
  const {
    backgroundCss,
    showPattern,
    patternOpacity = 0,
    textColor,
    subTextColor,
  } = input;
  if (!showPattern || patternOpacity < 0.22) return null;

  const bg = resolveBackgroundHex(backgroundCss);
  const headingFg = resolveForegroundHex(textColor, bg);
  const subFg = resolveForegroundHex(subTextColor, bg);
  const headingRatio = contrastRatio(headingFg, bg);
  const subRatio = contrastRatio(subFg, bg);

  const noisePenalty = (patternOpacity - 0.18) * 4.5;
  const effectiveHeading = headingRatio - noisePenalty;
  const effectiveSub = subRatio - noisePenalty;

  const headingOk = effectiveHeading >= requiredRatio("aaLarge");
  const subOk = effectiveSub >= requiredRatio("aa");
  if (headingOk && subOk) return null;

  const alert =
    !headingOk && !subOk
      ? "Background pattern adds visual noise that makes both headline and subheading harder to read."
      : !subOk
        ? "Background pattern competes with the subheading — lower pattern opacity or simplify the backdrop."
        : "Background pattern may reduce headline legibility — try lowering opacity.";

  return {
    blockId: "pattern",
    kind: "visual",
    ratio: Math.min(effectiveHeading, effectiveSub),
    passes: false,
    required: requiredRatio("aa"),
    level: "aa",
    foreground: headingFg,
    background: bg,
    label: "Pattern noise",
    alert,
    severity: effectiveHeading < 3 || effectiveSub < 3 ? "error" : "warning",
  };
}

export function evaluateVisualBalance(
  input: VisualDesignCheckInput,
): ContrastResult | null {
  const {
    showFeaturedImage,
    showContent,
    layoutId,
    typeScale = 1,
    showPattern,
    patternOpacity = 0,
    featuredScale = 1,
    backgroundCss,
    accentColor,
    headingText = "",
    featuredSvgMarkup,
    brandAccent,
  } = input;

  if (!showFeaturedImage || !showContent) return null;

  const layout = getPostLayout(layoutId ?? DEFAULT_POST_LAYOUT_ID);
  const alerts: string[] = [];

  const featuredShare =
    layout.composition === "split"
      ? 1 - (layout.textColumnRatio ?? 0.5)
      : 1 - (layout.textZoneRatio ?? 0.44);

  if (
    layout.composition !== "split" &&
    layout.stack === "text-first" &&
    featuredShare >= 0.52 &&
    featuredScale >= 0.85
  ) {
    alerts.push(
      "Visual weight sits low — the illustration dominates the bottom while copy floats above. Try a tighter crop or shuffle to a more balanced layout.",
    );
  }

  if (layout.stack === "featured-first" && typeScale > 1.08) {
    alerts.push(
      "Large headline with a top visual can feel top-heavy — center the copy band or reduce type scale.",
    );
  }

  if (
    layout.composition === "split" &&
    (layout.textColumnRatio ?? 0.5) < 0.38
  ) {
    alerts.push(
      "The copy column is narrow — headline and subheading may feel squeezed against the visual.",
    );
  }

  if (showPattern && patternOpacity > 0.24 && showFeaturedImage) {
    alerts.push(
      "Pattern, illustration, and copy all compete for attention — simplify the background or reduce pattern opacity.",
    );
  }

  const bg = resolveBackgroundHex(backgroundCss);
  if (hasAccentMarkup(headingText) && accentColor && isCamouflaged(accentColor, bg)) {
    alerts.push(
      "Accent highlight and background share a similar hue — the emphasized words won't pop.",
    );
  }

  if (featuredSvgMarkup && brandAccent) {
    const dominant = dominantSvgColor(extractSvgFills(featuredSvgMarkup));
    if (dominant && hueDistance(dominant, brandAccent) < 18 && !isNearNeutral(dominant)) {
      alerts.push(
        "Illustration and brand accent use similar colors — the layout can feel visually flat.",
      );
    }
  }

  const bgRgb = hexToRgb(bg);
  if (bgRgb && relativeLuminance(bgRgb) < 0.2 && typeScale > 1.05 && featuredShare > 0.5) {
    alerts.push(
      "Dark canvas with a large visual leaves little breathing room — add spacing or reduce illustration scale.",
    );
  }

  if (alerts.length === 0) return null;

  return makeIssue({
    blockId: "balance",
    kind: "balance",
    label: "Visual balance",
    alert: alerts[0],
    severity: "warning",
  });
}

function roundScale(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Adjust spacing and scale to rebalance a bottom-heavy or crowded layout. */
export function suggestVisualBalanceFix(
  input: VisualDesignCheckInput,
): VisualBalanceFixPatch {
  const spacing = input.layoutSpacing ?? DEFAULT_POST_LAYOUT_SPACING;
  const layout = getPostLayout(input.layoutId ?? DEFAULT_POST_LAYOUT_ID);
  const typeScale = input.typeScale ?? 1;
  const featuredScale = input.featuredScale ?? 1;

  const featuredShare =
    layout.composition === "split"
      ? 1 - (layout.textColumnRatio ?? 0.5)
      : 1 - (layout.textZoneRatio ?? 0.44);

  const patch: VisualBalanceFixPatch = {
    layoutSpacing: { ...spacing },
  };
  let changed = false;

  if (
    layout.composition !== "split" &&
    layout.stack === "text-first" &&
    featuredShare >= 0.52 &&
    featuredScale >= 0.85
  ) {
    patch.featuredTransformScale = roundScale(Math.max(0.7, featuredScale * 0.88));
    patch.typeScale = roundScale(Math.max(0.88, typeScale * 0.96));
    patch.layoutSpacing = {
      ...spacing,
      logoCopyGap: stepSpacingToken(spacing.logoCopyGap, 1),
      copyBlockGap: stepSpacingToken(spacing.copyBlockGap, 1),
      textZonePadBottom: stepSpacingToken(spacing.textZonePadBottom, 1),
    };
    changed = true;
  }

  if (layout.stack === "featured-first" && typeScale > 1.08) {
    patch.typeScale = roundScale(Math.min(typeScale, 1.02));
    patch.layoutSpacing = {
      ...(patch.layoutSpacing ?? spacing),
      copyBlockGap: stepSpacingToken(spacing.copyBlockGap, 1),
    };
    changed = true;
  }

  if (
    layout.composition === "split" &&
    (layout.textColumnRatio ?? 0.5) < 0.38
  ) {
    patch.typeScale = roundScale(Math.max(0.9, typeScale * 0.94));
    patch.layoutSpacing = {
      ...(patch.layoutSpacing ?? spacing),
      copyBlockGap: stepSpacingToken(spacing.copyBlockGap, -1),
      logoCopyGap: stepSpacingToken(spacing.logoCopyGap, 1),
    };
    changed = true;
  }

  if (input.showPattern && (input.patternOpacity ?? 0) > 0.24) {
    patch.patternOpacity = Math.min(input.patternOpacity ?? 0.28, 0.16);
    changed = true;
  }

  const bg = resolveBackgroundHex(input.backgroundCss);
  if (
    hasAccentMarkup(input.headingText ?? "") &&
    input.accentColor &&
    isCamouflaged(input.accentColor, bg)
  ) {
    patch.accentColor = suggestReadableAccent(bg, input.accentColor);
    changed = true;
  }

  if (input.featuredSvgMarkup && input.brandAccent) {
    const dominant = dominantSvgColor(extractSvgFills(input.featuredSvgMarkup));
    if (
      dominant &&
      hueDistance(dominant, input.brandAccent) < 18 &&
      !isNearNeutral(dominant)
    ) {
      patch.featuredTransformScale =
        patch.featuredTransformScale ??
        roundScale(Math.max(0.72, featuredScale * 0.86));
      if (input.showPattern && (input.patternOpacity ?? 0) > 0.18) {
        patch.patternOpacity = Math.min(input.patternOpacity ?? 0.28, 0.14);
      }
      changed = true;
    }
  }

  const bgRgb = hexToRgb(bg);
  if (
    bgRgb &&
    relativeLuminance(bgRgb) < 0.2 &&
    typeScale > 1.05 &&
    featuredShare > 0.5
  ) {
    patch.featuredTransformScale =
      patch.featuredTransformScale ??
      roundScale(Math.max(0.75, featuredScale * 0.9));
    patch.layoutSpacing = {
      ...(patch.layoutSpacing ?? spacing),
      layoutPad: stepSpacingToken(spacing.layoutPad, 1),
    };
    changed = true;
  }

  if (!changed) {
    patch.featuredTransformScale = roundScale(Math.max(0.75, featuredScale * 0.92));
    patch.typeScale = roundScale(Math.max(0.9, typeScale * 0.97));
    patch.layoutSpacing = {
      ...spacing,
      logoCopyGap: stepSpacingToken(spacing.logoCopyGap, 1),
      copyBlockGap: stepSpacingToken(spacing.copyBlockGap, 1),
    };
  }

  return patch;
}

export function resolveFeaturedSvgForContrast(featured: {
  mode?: FeaturedBlockMode;
  visualBlocks?: VisualBlockRecord[];
  activeBlockId?: string | null;
  image?: { svgMarkup?: string } | null;
}): string | null {
  if (featured.mode === "composed" || featured.mode === "genui") {
    const block = activeVisualBlock(
      featured.visualBlocks ?? [],
      featured.activeBlockId,
    );
    return block?.svgMarkup ?? null;
  }
  return featured.image?.svgMarkup ?? null;
}

export function suggestReadableAccent(bgHex: string, accentHex: string): string {
  const bgL = relativeLuminance(hexToRgb(bgHex) ?? { r: 0, g: 0, b: 0 });
  const targets =
    bgL > 0.45
      ? [
          withLightness(accentHex, 12),
          withLightness(accentHex, 22),
          withLightness(accentHex, 32),
          withLightness(accentHex, 42),
          withLightness(accentHex, 52),
        ]
      : [
          withLightness(accentHex, 88),
          withLightness(accentHex, 78),
          withLightness(accentHex, 68),
          withLightness(accentHex, 58),
          withLightness(accentHex, 92),
        ];

  for (const candidate of targets) {
    if (contrastRatio(candidate, bgHex) >= ACCENT_VISUAL_POP_RATIO) {
      return candidate;
    }
  }
  for (const candidate of targets) {
    if (passesContrast(contrastRatio(candidate, bgHex), "aaLarge")) {
      return candidate;
    }
  }
  return targets[0] ?? accentHex;
}

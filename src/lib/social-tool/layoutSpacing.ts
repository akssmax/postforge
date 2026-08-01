/** Tailwind default spacing scale (rem × 16 at root) */
export const SPACING_TOKENS = [
  0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24,
] as const;

export type SpacingToken = (typeof SPACING_TOKENS)[number];

/** px at 16px root — matches Tailwind `spacing` config */
export const SPACING_PX: Record<SpacingToken, number> = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

export type PostLayoutSpacing = {
  /** Outer inset on all sides of the post layout (`p-*`) */
  layoutPad: SpacingToken;
  /** Bottom padding inside the text band */
  textZonePadBottom: SpacingToken;
  /** Space between top logo and copy stack */
  logoCopyGap: SpacingToken;
  /** Gap between headline, subheading, and extras */
  copyBlockGap: SpacingToken;
  /** Gap between copy and visual columns in split layouts */
  splitColumnGap: SpacingToken;
  /** Gap between multiple featured visual slots */
  featuredSlotGap: SpacingToken;
  /** Footer strip vertical padding */
  footerPad: SpacingToken;
  /** Gap between footer logo and footer extras */
  footerBlockGap: SpacingToken;
  /** Split copy column width share (0.32–0.52). Uses layout default when unset. */
  splitTextColumnShare?: number;
};

export const SPACING_TOKEN_KEYS = [
  "layoutPad",
  "textZonePadBottom",
  "logoCopyGap",
  "copyBlockGap",
  "splitColumnGap",
  "featuredSlotGap",
  "footerPad",
  "footerBlockGap",
] as const satisfies readonly (keyof PostLayoutSpacing)[];

export type SpacingTokenKey = (typeof SPACING_TOKEN_KEYS)[number];

export const SPLIT_TEXT_COLUMN_SHARE_MIN = 0.32;
export const SPLIT_TEXT_COLUMN_SHARE_MAX = 0.52;
export const SPLIT_TEXT_COLUMN_SHARE_STEP = 0.02;

export const DEFAULT_POST_LAYOUT_SPACING: PostLayoutSpacing = {
  layoutPad: 16,
  textZonePadBottom: 5,
  logoCopyGap: 10,
  copyBlockGap: 4,
  splitColumnGap: 8,
  featuredSlotGap: 2,
  footerPad: 8,
  footerBlockGap: 2,
};

export function resolveSplitTextColumnShare(
  spacing: PostLayoutSpacing,
  layoutDefault: number,
): number {
  const share = spacing.splitTextColumnShare ?? layoutDefault;
  return Math.max(
    SPLIT_TEXT_COLUMN_SHARE_MIN,
    Math.min(SPLIT_TEXT_COLUMN_SHARE_MAX, share),
  );
}

export function stepSplitTextColumnShare(
  share: number,
  direction: 1 | -1,
): number {
  const next =
    Math.round((share + direction * SPLIT_TEXT_COLUMN_SHARE_STEP) * 100) / 100;
  return Math.max(
    SPLIT_TEXT_COLUMN_SHARE_MIN,
    Math.min(SPLIT_TEXT_COLUMN_SHARE_MAX, next),
  );
}

export function spacingTokenLabel(token: SpacingToken): string {
  return token === 0 ? "0" : String(token);
}

/** Scale from 1080 reference using the shorter canvas side (prevents landscape slot overflow). */
export function canvasScaleFactor(
  canvasWidth: number,
  canvasHeight = canvasWidth,
): number {
  return Math.min(canvasWidth, canvasHeight) / 1080;
}

/** Resolved typography CSS vars for `.social-post` (inline overrides sheet defaults). */
export function socialPostTypographyVars(
  canvasWidth: number,
  canvasHeight: number,
  typeScale: number,
): Record<string, string | number> {
  const canvasRatio = canvasScaleFactor(canvasWidth, canvasHeight);
  const scale = Number.isFinite(typeScale) && typeScale > 0 ? typeScale : 1;
  const unit = canvasRatio * scale;
  return {
    "--sp-type-scale": scale,
    "--sp-canvas-ratio": canvasRatio,
    "--sp-unit": `${unit}px`,
    "--sp-fs-display": `${52 * unit}px`,
    "--sp-fs-sub": `${22 * unit}px`,
    "--sp-fs-extra": `${18 * unit}px`,
    "--sp-gap-text": `${16 * unit}px`,
    "--sp-gap-extra": `${10 * unit}px`,
  };
}

/** Pixel font sizes for canvas copy (inline on nodes — avoids var() lag/miss on scaled artboards). */
export function socialPostCopyFontSizes(
  canvasWidth: number,
  canvasHeight: number,
  typeScale: number,
): { display: string; sub: string; extra: string } {
  const vars = socialPostTypographyVars(canvasWidth, canvasHeight, typeScale);
  return {
    display: String(vars["--sp-fs-display"]),
    sub: String(vars["--sp-fs-sub"]),
    extra: String(vars["--sp-fs-extra"]),
  };
}

export type SocialPostCopyFieldRole = "headline" | "subheading" | "extra";

/** Full inline typography for canvas copy fields (matches sheet + survives preview transform). */
export function socialPostCopyFieldStyle(
  canvasWidth: number,
  canvasHeight: number,
  typeScale: number,
  role: SocialPostCopyFieldRole,
  fonts: { heading: string; sub: string },
  options?: { headlineProfile?: "default" | "display" | "poster" },
): Record<string, string | number> {
  const sizes = socialPostCopyFontSizes(canvasWidth, canvasHeight, typeScale);
  if (role === "headline") {
    const profile = options?.headlineProfile ?? "default";
    return {
      fontSize: sizes.display,
      fontFamily: fonts.heading,
      fontWeight: 700,
      letterSpacing: profile === "poster" ? "-0.05em" : profile === "display" ? "-0.045em" : "-0.04em",
      lineHeight: profile === "poster" ? 0.98 : profile === "display" ? 1.02 : 1.08,
    };
  }
  if (role === "subheading") {
    return {
      fontSize: sizes.sub,
      fontFamily: fonts.sub,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    };
  }
  return {
    fontSize: sizes.extra,
    fontFamily: fonts.sub,
    fontWeight: 400,
    lineHeight: 1.45,
  };
}

export function spacingTokenToPx(
  token: SpacingToken,
  canvasWidth = 1080,
  canvasHeight?: number,
): number {
  const base = SPACING_PX[token];
  const scale =
    canvasHeight != null
      ? canvasScaleFactor(canvasWidth, canvasHeight)
      : canvasWidth / 1080;
  return Math.round(base * scale);
}

export function clampSpacingIndex(index: number): number {
  return Math.max(0, Math.min(SPACING_TOKENS.length - 1, index));
}

export function stepSpacingToken(
  token: SpacingToken,
  direction: 1 | -1,
): SpacingToken {
  const index = SPACING_TOKENS.indexOf(token);
  if (index < 0) return token;
  return SPACING_TOKENS[clampSpacingIndex(index + direction)];
}

/** @deprecated use clampSpacingIndex */
export function clampSpacingToken(value: number): SpacingToken {
  return SPACING_TOKENS[clampSpacingIndex(value)];
}

/** Snap accumulated drag pixels to token steps (screen space) */
export function dragPxToTokenSteps(
  deltaPx: number,
  pxPerStep = 10,
): number {
  return Math.round(deltaPx / pxPerStep);
}

export function applyTokenSteps(
  token: SpacingToken,
  steps: number,
): SpacingToken {
  const index = SPACING_TOKENS.indexOf(token);
  if (index < 0) return token;
  return SPACING_TOKENS[clampSpacingIndex(index + steps)];
}

export function spacingToCssVars(
  spacing: PostLayoutSpacing,
  canvasWidth: number,
  canvasHeight?: number,
): Record<string, string> {
  return {
    "--sp-layout-pad": `${spacingTokenToPx(spacing.layoutPad, canvasWidth, canvasHeight)}px`,
    "--sp-text-zone-pb": `${spacingTokenToPx(spacing.textZonePadBottom, canvasWidth, canvasHeight)}px`,
    "--sp-logo-copy-gap": `${spacingTokenToPx(spacing.logoCopyGap, canvasWidth, canvasHeight)}px`,
    "--sp-copy-block-gap": `${spacingTokenToPx(spacing.copyBlockGap, canvasWidth, canvasHeight)}px`,
    "--sp-split-column-gap": `${spacingTokenToPx(spacing.splitColumnGap, canvasWidth, canvasHeight)}px`,
    "--sp-featured-slot-gap": `${spacingTokenToPx(spacing.featuredSlotGap, canvasWidth, canvasHeight)}px`,
    "--sp-footer-pad": `${spacingTokenToPx(spacing.footerPad, canvasWidth, canvasHeight)}px`,
    "--sp-footer-block-gap": `${spacingTokenToPx(spacing.footerBlockGap, canvasWidth, canvasHeight)}px`,
  };
}

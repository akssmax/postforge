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
  /** Footer strip vertical padding */
  footerPad: SpacingToken;
  /** Gap between footer logo and footer extras */
  footerBlockGap: SpacingToken;
};

export const DEFAULT_POST_LAYOUT_SPACING: PostLayoutSpacing = {
  layoutPad: 16,
  textZonePadBottom: 5,
  logoCopyGap: 10,
  copyBlockGap: 4,
  footerPad: 8,
  footerBlockGap: 2,
};

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
    "--sp-footer-pad": `${spacingTokenToPx(spacing.footerPad, canvasWidth, canvasHeight)}px`,
    "--sp-footer-block-gap": `${spacingTokenToPx(spacing.footerBlockGap, canvasWidth, canvasHeight)}px`,
  };
}

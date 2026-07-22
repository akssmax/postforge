import {
  hexToRgb,
  invertHex,
  mixHex,
  normalizeHex,
  relativeLuminance,
  rgbToHex,
} from "@/lib/brand/colorUtils";

export type DesignBlockId = "logo" | "headline" | "subheading";

export type ContrastLevel = "aa" | "aaLarge" | "graphic";

export type ContrastResult = {
  blockId: DesignBlockId;
  ratio: number;
  passes: boolean;
  required: number;
  level: ContrastLevel;
  foreground: string;
  background: string;
  label: string;
};

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

/** Matches `.brand-logo-backdrop` in social-tool.css */
export const LOGO_BACKDROP_COLOR = "#ffffff";
export const LOGO_BACKDROP_OPACITY = 0.94;

export function contrastRatio(fg: string, bg: string): number {
  const f = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!f || !b) return 1;
  const l1 = relativeLuminance(f);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function passesContrast(
  ratio: number,
  level: ContrastLevel,
): boolean {
  if (level === "aa") return ratio >= 4.5;
  if (level === "aaLarge") return ratio >= 3;
  return ratio >= 3;
}

export function requiredRatio(level: ContrastLevel): number {
  if (level === "aa") return 4.5;
  return 3;
}

export function parseCssColor(raw: string): string | null {
  const trimmed = raw.trim();
  const hex = normalizeHex(trimmed);
  if (hex) return hex;

  const rgbMatch = trimmed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i,
  );
  if (rgbMatch) {
    const r = Math.round(Number(rgbMatch[1]));
    const g = Math.round(Number(rgbMatch[2]));
    const b = Math.round(Number(rgbMatch[3]));
    return rgbToHex({ r, g, b });
  }
  return null;
}

/** Blend semi-transparent foreground over an opaque background */
export function resolveForegroundHex(fgRaw: string, bgHex: string): string {
  const trimmed = fgRaw.trim();
  const rgbaMatch = trimmed.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i,
  );
  if (rgbaMatch) {
    const fgHex = rgbToHex({
      r: Math.round(Number(rgbaMatch[1])),
      g: Math.round(Number(rgbaMatch[2])),
      b: Math.round(Number(rgbaMatch[3])),
    });
    const alpha =
      rgbaMatch[4] != null ? clampAlpha(Number(rgbaMatch[4])) : 1;
    if (alpha >= 1) return fgHex;
    return mixHex(bgHex, fgHex, alpha);
  }
  return parseCssColor(trimmed) ?? fgRaw;
}

function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

/** Pick a representative background tone from CSS background value */
export function resolveBackgroundHex(background: string): string {
  const colors = background.match(HEX_RE) ?? [];
  if (colors.length === 0) {
    return "#091a24";
  }
  if (colors.length === 1) {
    return normalizeHex(colors[0]) ?? "#091a24";
  }

  let darkest: string = colors[0] ?? "#091a24";
  let minL = Infinity;
  for (const c of colors) {
    const hex = normalizeHex(c);
    if (!hex) continue;
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const l = relativeLuminance(rgb);
    if (l < minL) {
      minL = l;
      darkest = hex;
    }
  }
  return normalizeHex(darkest) ?? "#091a24";
}

/** Canvas bg behind the logo, or composited backdrop plate when enabled */
export function resolveLogoBackground(
  backgroundCss: string,
  logoBackdrop = false,
): string {
  const canvasBg = resolveBackgroundHex(backgroundCss);
  if (!logoBackdrop) return canvasBg;
  return mixHex(canvasBg, LOGO_BACKDROP_COLOR, LOGO_BACKDROP_OPACITY);
}

function isIgnorablePaint(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === "none" ||
    trimmed === "transparent" ||
    trimmed === "currentcolor" ||
    trimmed.startsWith("url(")
  );
}

function addPaintColor(raw: string, found: Set<string>): void {
  if (isIgnorablePaint(raw)) return;
  const hex = parseCssColor(raw);
  if (hex) found.add(hex);
}

export function extractSvgFills(svgMarkup: string): string[] {
  const found = new Set<string>();
  const paintRe = /(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = paintRe.exec(svgMarkup))) {
    addPaintColor(m[1], found);
  }

  const styleRe = /style\s*=\s*["']([^"']+)["']/gi;
  while ((m = styleRe.exec(svgMarkup))) {
    const style = m[1];
    const fillMatch = style.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
    const strokeMatch = style.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i);
    if (fillMatch) addPaintColor(fillMatch[1], found);
    if (strokeMatch) addPaintColor(strokeMatch[1], found);
  }

  return [...found];
}

export function worstLogoContrast(
  logoColors: string[],
  background: string,
  invert = false,
): { ratio: number; foreground: string } {
  const bg = resolveBackgroundHex(background);
  const colors = invert
    ? logoColors.map((color) => invertHex(color))
    : logoColors;
  if (colors.length === 0) {
    const fg = invert ? "#000000" : "#ffffff";
    return { ratio: contrastRatio(fg, bg), foreground: fg };
  }
  let worst = Infinity;
  let fg = colors[0];
  for (const color of colors) {
    const ratio = contrastRatio(color, bg);
    if (ratio < worst) {
      worst = ratio;
      fg = color;
    }
  }
  return { ratio: worst, foreground: fg };
}

export type ContrastCheckInput = {
  enabled: boolean;
  backgroundCss: string;
  logoSvgMarkup?: string | null;
  showLogo: boolean;
  textColor: string;
  subTextColor: string;
  logoBackdrop?: boolean;
  logoInvert?: boolean;
};

export function evaluateCanvasContrast(
  input: ContrastCheckInput,
): ContrastResult[] {
  if (!input.enabled) return [];

  const bg = resolveBackgroundHex(input.backgroundCss);
  const logoBg = resolveLogoBackground(
    input.backgroundCss,
    input.logoBackdrop,
  );
  const results: ContrastResult[] = [];

  if (input.showLogo && input.logoSvgMarkup) {
    const logoColors = extractSvgFills(input.logoSvgMarkup);
    const { ratio, foreground } = worstLogoContrast(
      logoColors,
      logoBg,
      input.logoInvert,
    );
    results.push({
      blockId: "logo",
      ratio,
      passes: passesContrast(ratio, "graphic"),
      required: requiredRatio("graphic"),
      level: "graphic",
      foreground,
      background: logoBg,
      label: "Logo",
    });
  }

  const headingFg = resolveForegroundHex(input.textColor, bg);
  const headingRatio = contrastRatio(headingFg, bg);
  results.push({
    blockId: "headline",
    ratio: headingRatio,
    passes: passesContrast(headingRatio, "aaLarge"),
    required: requiredRatio("aaLarge"),
    level: "aaLarge",
    foreground: headingFg,
    background: bg,
    label: "Heading",
  });

  const subFg = resolveForegroundHex(input.subTextColor, bg);
  const subRatio = contrastRatio(subFg, bg);
  results.push({
    blockId: "subheading",
    ratio: subRatio,
    passes: passesContrast(subRatio, "aa"),
    required: requiredRatio("aa"),
    level: "aa",
    foreground: subFg,
    background: bg,
    label: "Subheading",
  });

  return results;
}

export function formatContrastRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

export function suggestHighContrastBackgroundId(): string {
  return "light-editorial";
}

export function readableTextOnBackground(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "#f4f4f4";
  return relativeLuminance(rgb) > 0.45 ? "#0a1b25" : "#f4f4f4";
}

export function readableSubTextOnBackground(bgHex: string): string {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return "rgba(255,255,255,0.72)";
  return relativeLuminance(rgb) > 0.45
    ? "rgba(10,27,37,0.65)"
    : "rgba(255,255,255,0.72)";
}

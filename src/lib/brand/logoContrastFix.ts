import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import {
  contrastRatio,
  parseCssColor,
  passesContrast,
  readableTextOnBackground,
  resolveLogoBackground,
  worstLogoContrast,
} from "@/lib/brand/contrast";
import {
  hexToRgb,
  invertHex,
  normalizeHex,
  relativeLuminance,
  withLightness,
} from "@/lib/brand/colorUtils";
import type { BrandLogoRecord } from "@/lib/brand/types";

const PAINT_ATTRS = ["fill", "stroke"] as const;
const CURRENT_COLOR = "currentcolor";
const INHERITED_LOGO_COLOR = "#ffffff";

export type LogoSvgContrastFix = {
  from: string;
  to: string;
  ratioBefore: number;
  ratioAfter: number;
};

type PaintRef = "currentColor" | string;

type PaintFix = LogoSvgContrastFix & { target: string };

function parsePaintValue(raw: string | null): PaintRef | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "none") return null;
  if (trimmed.toLowerCase() === CURRENT_COLOR) return "currentColor";
  return parseCssColor(trimmed) ?? normalizeHex(trimmed);
}

function parseStylePaint(style: string, prop: "fill" | "stroke"): PaintRef | null {
  const match = style.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i"));
  if (!match) return null;
  return parsePaintValue(match[1]);
}

function effectivePaintHex(value: PaintRef, inheritedColor: string): string {
  if (value === "currentColor") {
    return parseCssColor(inheritedColor) ?? INHERITED_LOGO_COLOR;
  }
  return value;
}

function shouldRecolorPaint(hex: string, bgHex: string): boolean {
  return !passesContrast(contrastRatio(hex, bgHex), "graphic");
}

function paintKey(value: PaintRef): string {
  return value === "currentColor" ? "currentColor" : value;
}

/** Shift a paint toward readable contrast while preserving hue when possible. */
export function suggestReadableSvgPaint(originalHex: string, bgHex: string): string {
  if (passesContrast(contrastRatio(originalHex, bgHex), "graphic")) {
    return originalHex;
  }

  const bgL = relativeLuminance(hexToRgb(bgHex) ?? { r: 0, g: 0, b: 0 });
  const steps =
    bgL > 0.45
      ? [12, 22, 32, 42, 52, 62]
      : [88, 78, 68, 58, 48, 92];
  const fallbacks =
    bgL > 0.45
      ? ["#0a1b25", "#1a2b35"]
      : ["#f4f4f4", "#ffffff"];

  for (const step of steps) {
    const candidate = withLightness(originalHex, step);
    if (passesContrast(contrastRatio(candidate, bgHex), "graphic")) {
      return candidate;
    }
  }

  for (const candidate of fallbacks) {
    if (passesContrast(contrastRatio(candidate, bgHex), "graphic")) {
      return candidate;
    }
  }

  return readableTextOnBackground(bgHex);
}

function setStylePaint(style: string, prop: "fill" | "stroke", next: string): string {
  const re = new RegExp(`((?:^|;)\\s*${prop}\\s*:\\s*)([^;]+)`, "i");
  if (re.test(style)) {
    return style.replace(re, `$1${next}`);
  }
  const trimmed = style.trim().replace(/;$/, "");
  return `${trimmed}${trimmed ? "; " : ""}${prop}: ${next}`;
}

function collectEffectivePaints(
  root: Element,
  inherited: string,
): Map<string, string> {
  const paints = new Map<string, string>();
  let usesCurrentColor = false;

  const register = (paint: PaintRef) => {
    const hex = effectivePaintHex(paint, inherited);
    paints.set(paintKey(paint), hex);
    if (paint === "currentColor") usesCurrentColor = true;
  };

  const walk = (el: Element) => {
    for (const attr of PAINT_ATTRS) {
      const parsed = parsePaintValue(el.getAttribute(attr));
      if (parsed) register(parsed);
    }

    const style = el.getAttribute("style");
    if (style) {
      for (const prop of PAINT_ATTRS) {
        const parsed = parseStylePaint(style, prop);
        if (parsed) register(parsed);
      }
    }

    for (const child of [...el.children]) walk(child);
  };

  walk(root);

  if (usesCurrentColor) {
    paints.set(
      "currentColor",
      effectivePaintHex("currentColor", inherited),
    );
  }

  return paints;
}

function collectFailingPaints(
  root: Element,
  bgHex: string,
  inherited: string,
): Map<string, PaintFix> {
  const fixes = new Map<string, PaintFix>();
  const paints = collectEffectivePaints(root, inherited);

  for (const [key, hex] of paints) {
    if (!shouldRecolorPaint(hex, bgHex)) continue;
    const target = suggestReadableSvgPaint(hex, bgHex);
    fixes.set(key, {
      from: key,
      to: target,
      target,
      ratioBefore: contrastRatio(hex, bgHex),
      ratioAfter: contrastRatio(target, bgHex),
    });
  }

  return fixes;
}

function applyFailingPaintFixes(
  root: Element,
  bgHex: string,
  inherited: string,
): LogoSvgContrastFix[] {
  const fixes = collectFailingPaints(root, bgHex, inherited);
  if (fixes.size === 0) return [];

  const targetFor = (paint: PaintRef | null): string | null => {
    if (!paint) return null;
    return fixes.get(paintKey(paint))?.target ?? null;
  };

  const walk = (el: Element) => {
    for (const attr of PAINT_ATTRS) {
      const parsed = parsePaintValue(el.getAttribute(attr));
      const target = targetFor(parsed);
      if (target) el.setAttribute(attr, target);
    }

    const style = el.getAttribute("style");
    if (style) {
      let nextStyle = style;
      for (const prop of PAINT_ATTRS) {
        const parsed = parseStylePaint(style, prop);
        const target = targetFor(parsed);
        if (target) nextStyle = setStylePaint(nextStyle, prop, target);
      }
      if (nextStyle !== style) el.setAttribute("style", nextStyle);
    }

    for (const child of [...el.children]) walk(child);
  };

  walk(root);
  return [...fixes.values()].map(({ from, to, ratioBefore, ratioAfter }) => ({
    from,
    to,
    ratioBefore,
    ratioAfter,
  }));
}

function parseSvgRoot(svgMarkup: string): Element | null {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const root = doc.documentElement;
  return root.tagName.toLowerCase() === "svg" ? root : null;
}

export function evaluateSvgGraphicContrast(
  svgMarkup: string,
  backgroundCss: string,
  options?: {
    logoBackdrop?: boolean;
    inheritedColor?: string;
    invert?: boolean;
  },
): { ratio: number; foreground: string; background: string } | null {
  const root = parseSvgRoot(svgMarkup);
  if (!root) return null;

  const bgHex = resolveLogoBackground(
    backgroundCss,
    options?.logoBackdrop ?? false,
  );
  const inherited = options?.inheritedColor ?? INHERITED_LOGO_COLOR;
  const paints = collectEffectivePaints(root, inherited);
  const colors = [...paints.values()].map((hex) =>
    options?.invert ? invertHex(hex) : hex,
  );

  const { ratio, foreground } = worstLogoContrast(colors, bgHex);
  return { ratio, foreground, background: bgHex };
}

export function previewLogoSvgContrastFixes(
  svgMarkup: string,
  backgroundCss: string,
  options?: { logoBackdrop?: boolean; inheritedColor?: string },
): LogoSvgContrastFix[] {
  const root = parseSvgRoot(svgMarkup);
  if (!root) return [];

  const bgHex = resolveLogoBackground(
    backgroundCss,
    options?.logoBackdrop ?? false,
  );
  const inherited = options?.inheritedColor ?? INHERITED_LOGO_COLOR;
  return [...collectFailingPaints(root, bgHex, inherited).values()].map(
    ({ from, to, ratioBefore, ratioAfter }) => ({
      from,
      to,
      ratioBefore,
      ratioAfter,
    }),
  );
}

export function canFixLogoSvgContrast(
  svgMarkup: string,
  backgroundCss: string,
  options?: { logoBackdrop?: boolean; inheritedColor?: string },
): boolean {
  return previewLogoSvgContrastFixes(svgMarkup, backgroundCss, options).length > 0;
}

export function fixLogoSvgContrast(
  svgMarkup: string,
  backgroundCss: string,
  options?: { logoBackdrop?: boolean; inheritedColor?: string },
): { markup: string; fixes: LogoSvgContrastFix[]; usesExplicitColors: boolean } {
  const root = parseSvgRoot(svgMarkup);
  if (!root) {
    return { markup: svgMarkup, fixes: [], usesExplicitColors: false };
  }

  const bgHex = resolveLogoBackground(
    backgroundCss,
    options?.logoBackdrop ?? false,
  );
  const inherited = options?.inheritedColor ?? INHERITED_LOGO_COLOR;
  const fixes = applyFailingPaintFixes(root, bgHex, inherited);

  if (fixes.length === 0) {
    return { markup: svgMarkup, fixes: [], usesExplicitColors: false };
  }

  const markup = sanitizeSvgMarkup(root.outerHTML) ?? root.outerHTML;
  return { markup, fixes, usesExplicitColors: true };
}

export function hasLogoSvgContrastFix(logo: BrandLogoRecord | null | undefined): boolean {
  if (!logo?.svgMarkupOriginal || !logo.svgMarkup) return false;
  return logo.svgMarkup !== logo.svgMarkupOriginal;
}

export function restoreLogoSvgOriginal(logo: BrandLogoRecord): BrandLogoRecord {
  if (!logo.svgMarkupOriginal) return logo;
  return {
    ...logo,
    svgMarkup: logo.svgMarkupOriginal,
    usesExplicitColors: false,
  };
}

export function withLogoSvgOriginal(logo: BrandLogoRecord): BrandLogoRecord {
  if (logo.mime !== "image/svg+xml" || !logo.svgMarkup) return logo;
  return {
    ...logo,
    svgMarkupOriginal: logo.svgMarkupOriginal ?? logo.svgMarkup,
  };
}

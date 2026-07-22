import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import {
  contrastRatio,
  parseCssColor,
  passesContrast,
  readableTextOnBackground,
  resolveLogoBackground,
} from "@/lib/brand/contrast";
import { normalizeHex } from "@/lib/brand/colorUtils";
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

function setStylePaint(style: string, prop: "fill" | "stroke", next: string): string {
  const re = new RegExp(`((?:^|;)\\s*${prop}\\s*:\\s*)([^;]+)`, "i");
  if (re.test(style)) {
    return style.replace(re, `$1${next}`);
  }
  const trimmed = style.trim().replace(/;$/, "");
  return `${trimmed}${trimmed ? "; " : ""}${prop}: ${next}`;
}

function collectFailingPaints(
  root: Element,
  bgHex: string,
  inherited: string,
  target: string,
): Map<string, LogoSvgContrastFix> {
  const fixes = new Map<string, LogoSvgContrastFix>();
  let usesCurrentColor = false;

  const register = (paint: PaintRef) => {
    const hex = effectivePaintHex(paint, inherited);
    if (!shouldRecolorPaint(hex, bgHex)) return;
    const key = paintKey(paint);
    if (fixes.has(key)) return;
    fixes.set(key, {
      from: key,
      to: target,
      ratioBefore: contrastRatio(hex, bgHex),
      ratioAfter: contrastRatio(target, bgHex),
    });
  };

  const walk = (el: Element) => {
    for (const attr of PAINT_ATTRS) {
      const parsed = parsePaintValue(el.getAttribute(attr));
      if (parsed === "currentColor") usesCurrentColor = true;
      if (parsed) register(parsed);
    }

    const style = el.getAttribute("style");
    if (style) {
      for (const prop of PAINT_ATTRS) {
        const parsed = parseStylePaint(style, prop);
        if (parsed === "currentColor") usesCurrentColor = true;
        if (parsed) register(parsed);
      }
    }

    for (const child of [...el.children]) walk(child);
  };

  walk(root);

  if (
    usesCurrentColor &&
    shouldRecolorPaint(effectivePaintHex("currentColor", inherited), bgHex)
  ) {
    register("currentColor");
  }

  return fixes;
}

function applyFailingPaintFixes(
  root: Element,
  bgHex: string,
  inherited: string,
  target: string,
): LogoSvgContrastFix[] {
  const fixes = collectFailingPaints(root, bgHex, inherited, target);
  if (fixes.size === 0) return [];

  const shouldRecolor = (paint: PaintRef | null): paint is PaintRef => {
    if (!paint) return false;
    return fixes.has(paintKey(paint));
  };

  const walk = (el: Element) => {
    for (const attr of PAINT_ATTRS) {
      const parsed = parsePaintValue(el.getAttribute(attr));
      if (shouldRecolor(parsed)) {
        el.setAttribute(attr, target);
      }
    }

    const style = el.getAttribute("style");
    if (style) {
      let nextStyle = style;
      for (const prop of PAINT_ATTRS) {
        const parsed = parseStylePaint(style, prop);
        if (shouldRecolor(parsed)) {
          nextStyle = setStylePaint(nextStyle, prop, target);
        }
      }
      if (nextStyle !== style) el.setAttribute("style", nextStyle);
    }

    for (const child of [...el.children]) walk(child);
  };

  walk(root);
  return [...fixes.values()];
}

function parseSvgRoot(svgMarkup: string): Element | null {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const root = doc.documentElement;
  return root.tagName.toLowerCase() === "svg" ? root : null;
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
  const target = readableTextOnBackground(bgHex);
  return [...collectFailingPaints(root, bgHex, inherited, target).values()];
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
  const target = readableTextOnBackground(bgHex);
  const fixes = applyFailingPaintFixes(root, bgHex, inherited, target);

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

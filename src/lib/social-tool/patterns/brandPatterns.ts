import {
  extractSvgInnerMarkup,
  parseSvgViewBox,
  tintSvgMarkup,
} from "@/lib/social-tool/patterns/tintSvg";
import {
  BRAND_PATTERN_OPTIONS,
  type BrandPatternId,
} from "@/lib/social-tool/patterns/types";

export type BrandPatternRender = {
  id: BrandPatternId;
  label: string;
  tileWidth: number;
  tileHeight: number;
  /** Full SVG for canvas layer */
  svgMarkup: string;
};

function stripFillsKeepStrokes(inner: string): string {
  return inner
    .replace(/\sfill="[^"]*"/gi, ' fill="none"')
    .replace(/\sfill='[^']*'/gi, " fill='none'");
}

function buildTiledPattern(
  inner: string,
  viewW: number,
  viewH: number,
  tileW: number,
  tileH: number,
  color: string,
  transform?: string,
): string {
  const tinted = tintSvgMarkup(inner, color);
  const patternTransform = transform ?? "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><defs><pattern id="p" patternUnits="userSpaceOnUse" width="${tileW}" height="${tileH}"${patternTransform ? ` patternTransform="${patternTransform}"` : ""}><svg width="${viewW}" height="${viewH}" viewBox="0 0 ${viewW} ${viewH}">${tinted}</svg></pattern></defs><rect width="100%" height="100%" fill="url(#p)"/></svg>`;
}

export function generateBrandPatterns(
  logoSvgMarkup: string,
  color: string,
): BrandPatternRender[] {
  const { width: viewW, height: viewH } = parseSvgViewBox(logoSvgMarkup);
  const inner = extractSvgInnerMarkup(logoSvgMarkup);
  const outlineInner = stripFillsKeepStrokes(inner);
  const scale = Math.min(1, 80 / Math.max(viewW, viewH));
  const tileW = Math.max(24, Math.round(viewW * scale));
  const tileH = Math.max(24, Math.round(viewH * scale));

  const variants: BrandPatternRender[] = [
    {
      id: "tile-grid",
      label: BRAND_PATTERN_OPTIONS[0]!.label,
      tileWidth: tileW,
      tileHeight: tileH,
      svgMarkup: buildTiledPattern(inner, viewW, viewH, tileW, tileH, color),
    },
    {
      id: "watermark",
      label: BRAND_PATTERN_OPTIONS[1]!.label,
      tileWidth: viewW,
      tileHeight: viewH,
      svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 1000"><g transform="translate(500,520) scale(2.2) translate(${-viewW / 2},${-viewH / 2})" opacity="0.35">${tintSvgMarkup(inner, color)}</g></svg>`,
    },
    {
      id: "diagonal",
      label: BRAND_PATTERN_OPTIONS[2]!.label,
      tileWidth: tileW,
      tileHeight: tileH,
      svgMarkup: buildTiledPattern(
        inner,
        viewW,
        viewH,
        tileW,
        tileH,
        color,
        "rotate(30)",
      ),
    },
    {
      id: "corner-strip",
      label: BRAND_PATTERN_OPTIONS[3]!.label,
      tileWidth: tileW * 3,
      tileHeight: tileH,
      svgMarkup: `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 1000"><g transform="translate(40,880) scale(0.45)">${tintSvgMarkup(inner, color)}</g></svg>`,
    },
    {
      id: "outline-tile",
      label: BRAND_PATTERN_OPTIONS[4]!.label,
      tileWidth: tileW,
      tileHeight: tileH,
      svgMarkup: buildTiledPattern(
        outlineInner,
        viewW,
        viewH,
        tileW,
        tileH,
        color,
      ),
    },
  ];

  return variants;
}

export function getBrandPatternById(
  logoSvgMarkup: string,
  color: string,
  id: BrandPatternId,
): BrandPatternRender | undefined {
  return generateBrandPatterns(logoSvgMarkup, color).find((p) => p.id === id);
}

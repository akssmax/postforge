import { buildBrandColorsFromPrimary } from "@/lib/brand/colorHarmony";
import type { BrandColors } from "@/lib/brand/types";
import {
  colorDistance,
  hexToRgb,
  isNearNeutral,
  normalizeHex,
  rgbToHex,
  type Rgb,
} from "@/lib/brand/colorUtils";
import { DEFAULT_BRAND_COLORS } from "@/lib/brand/types";

const HEX_IN_TEXT =
  /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]+\)/g;

function parseCssColor(raw: string): string | null {
  const hex = normalizeHex(raw);
  if (hex) return hex;

  const rgbMatch = raw.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (rgbMatch) {
    return rgbToHex({
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    });
  }
  return null;
}

function scoreColor(hex: string, weight: number): { hex: string; score: number } {
  const rgb = hexToRgb(hex);
  if (!rgb || isNearNeutral(hex)) return { hex, score: 0 };
  const { r, g, b } = rgb;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  return { hex, score: weight * (sat + 1) };
}

function pickPrimary(counts: Map<string, number>): string {
  let best = DEFAULT_BRAND_COLORS.primary;
  let bestScore = 0;
  for (const [hex, weight] of counts) {
    const { score } = scoreColor(hex, weight);
    if (score > bestScore) {
      bestScore = score;
      best = hex;
    }
  }
  return best;
}

export function extractColorsFromSvgMarkup(markup: string): BrandColors {
  const counts = new Map<string, number>();
  const fillStroke =
    /(?:fill|stroke)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = fillStroke.exec(markup))) {
    const hex = parseCssColor(m[1].trim());
    if (hex && hex !== "#ffffff" && hex !== "#000000") {
      counts.set(hex, (counts.get(hex) ?? 0) + 3);
    }
  }

  const inline = markup.match(HEX_IN_TEXT) ?? [];
  for (const token of inline) {
    const hex = parseCssColor(token);
    if (hex) counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  const primary = pickPrimary(counts);
  return buildBrandColorsFromPrimary(primary);
}

function samplePixel(data: Uint8ClampedArray, i: number): Rgb {
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

function quantizeChannel(v: number) {
  return Math.round(v / 16) * 16;
}

export async function extractColorsFromImageBlob(blob: Blob): Promise<BrandColors> {
  if (typeof document === "undefined") return DEFAULT_BRAND_COLORS;

  const bitmap = await createImageBitmap(blob);
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return DEFAULT_BRAND_COLORS;
  }

  ctx.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();

  const { data } = ctx.getImageData(0, 0, size, size);
  const counts = new Map<string, number>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const px = samplePixel(data, i);
    const hex = rgbToHex({
      r: quantizeChannel(px.r),
      g: quantizeChannel(px.g),
      b: quantizeChannel(px.b),
    });
    if (isNearNeutral(hex)) continue;
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const primary = sorted[0]?.[0] ?? DEFAULT_BRAND_COLORS.primary;

  const merged = new Map<string, number>();
  for (const [hex, weight] of sorted) {
    let placed = false;
    for (const key of merged.keys()) {
      if (colorDistance(key, hex) < 36) {
        merged.set(key, (merged.get(key) ?? 0) + weight);
        placed = true;
        break;
      }
    }
    if (!placed) merged.set(hex, weight);
  }

  return buildBrandColorsFromPrimary(pickPrimary(merged));
}

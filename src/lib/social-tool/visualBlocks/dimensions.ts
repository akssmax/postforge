import { isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** Canonical frame for parametric library SVGs and UI React patterns. */
export const VISUAL_LIBRARY_FRAME = {
  width: 480,
  height: 280,
} as const;

export type VisualBlockDimensions = {
  width: number;
  height: number;
};

export function parseSvgViewBox(svg: string): VisualBlockDimensions | null {
  const match = svg.match(/viewBox=["']([^"']+)["']/i);
  if (match) {
    const parts = match[1]
      .trim()
      .split(/[\s,]+/)
      .map((value) => Number.parseFloat(value));

    if (parts.length >= 4) {
      const width = parts[2]!;
      const height = parts[3]!;
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }
  }

  const widthAttr = svg.match(/\bwidth=["']([0-9.]+)(?:px)?["']/i);
  const heightAttr = svg.match(/\bheight=["']([0-9.]+)(?:px)?["']/i);
  if (widthAttr && heightAttr) {
    const width = Number.parseFloat(widthAttr[1]!);
    const height = Number.parseFloat(heightAttr[1]!);
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return { width, height };
    }
  }

  return null;
}

export function resolveVisualBlockDimensions(
  block: Pick<VisualBlockRecord, "svgMarkup" | "libraryId" | "kind">,
): VisualBlockDimensions {
  if (block.svgMarkup) {
    const parsed = parseSvgViewBox(block.svgMarkup);
    if (parsed) return parsed;
  }

  if (block.libraryId && isUiReactPattern(block.libraryId)) {
    return { ...VISUAL_LIBRARY_FRAME };
  }

  if (block.kind === "illustration" || block.kind === "3d" || block.kind === "diagram" || block.kind === "ui") {
    return { ...VISUAL_LIBRARY_FRAME };
  }

  return { ...VISUAL_LIBRARY_FRAME };
}

export function computeVisualBlockFitScale(
  slotWidth: number,
  slotHeight: number,
  nativeWidth: number,
  nativeHeight: number,
  padding = 0.92,
): number {
  if (slotWidth <= 0 || slotHeight <= 0 || nativeWidth <= 0 || nativeHeight <= 0) {
    return 1;
  }

  const scaleW = (slotWidth * padding) / nativeWidth;
  const scaleH = (slotHeight * padding) / nativeHeight;
  return Math.min(scaleW, scaleH);
}

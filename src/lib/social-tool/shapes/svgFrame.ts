import type { ShapeBrandColors } from "@/lib/social-tool/shapes/types";

const VIEWBOX = "0 0 200 200";

export function shapeSvg(
  inner: string,
  colors: ShapeBrandColors,
  opts?: { fill?: string; stroke?: string; strokeWidth?: number },
): string {
  const fill = opts?.fill ?? colors.accent;
  const stroke = opts?.stroke ?? colors.primary;
  const strokeWidth = opts?.strokeWidth ?? 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" fill="none" aria-hidden="true">${inner.replace(/\{\{fill\}\}/g, fill).replace(/\{\{stroke\}\}/g, stroke).replace(/\{\{sw\}\}/g, String(strokeWidth))}</svg>`;
}

import "server-only";

import { assetUrl } from "@/lib/assets/assetUrl";
import type { ThreeDLibraryEntry } from "./manifest";

/**
 * Wrap a PNG 3D asset as SVG so it flows through the existing visual-block
 * pipeline (svgMarkup). The image href points at the asset CDN (Vercel Blob).
 */
export function resolveThreeDSvg(entry: ThreeDLibraryEntry): string | null {
  const size = 768;
  const href = assetUrl(entry.assetPath);

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(entry.label)}"><image href="${href}" xlink:href="${href}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { ThreeDLibraryEntry } from "./manifest";

/**
 * Wrap a PNG 3D asset as SVG so it flows through the existing visual-block
 * pipeline (svgMarkup). Uses a same-origin public path for export capture.
 */
export function resolveThreeDSvg(entry: ThreeDLibraryEntry): string | null {
  const publicPath = path.join(
    process.cwd(),
    "public",
    entry.assetPath.replace(/^\//, ""),
  );
  if (!fs.existsSync(publicPath)) return null;

  const size = 768;
  const href = entry.assetPath.startsWith("/")
    ? entry.assetPath
    : `/${entry.assetPath}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${escapeXml(entry.label)}"><image href="${href}" xlink:href="${href}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

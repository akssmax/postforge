import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sanitizeSvgMarkupServer } from "@/lib/social-tool/visualBlocks/sanitizeSvgServer";
import type { IllustrationLibraryEntry } from "./manifest";
import type { VisualTemplateContext } from "../templateContext";
import {
  normalizeIllustrationSvg,
  recolorIllustrationForPreview,
} from "./recolor";

export { normalizeIllustrationSvg, recolorIllustrationForPreview } from "./recolor";

/** Storyset Rafiki style default editable accent (all bundled Storyset SVGs use this). */
const STORYSET_PRIMARY_ACCENTS = ["#407BFF", "#407bff"];

/** @deprecated Illustrations render without an outer frame wrapper. */
export function frameIllustrationSvg(rawSvg: string): string {
  return normalizeIllustrationSvg(rawSvg);
}

export function resolveIllustrationSvg(
  entry: IllustrationLibraryEntry,
  ctx: VisualTemplateContext,
): string | null {
  const publicPath = path.join(process.cwd(), "public", entry.assetPath.replace(/^\//, ""));
  if (!fs.existsSync(publicPath)) return null;

  let svg = fs.readFileSync(publicPath, "utf8");

  if (entry.source === "storyset") {
    svg = recolorIllustrationForPreview(svg, ctx.primary, STORYSET_PRIMARY_ACCENTS);
  } else if (entry.recolorAccents?.length) {
    svg = recolorIllustrationForPreview(svg, ctx.primary, entry.recolorAccents);
  }

  return sanitizeSvgMarkupServer(normalizeIllustrationSvg(svg));
}

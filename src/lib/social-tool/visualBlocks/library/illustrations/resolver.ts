import "server-only";

import { sanitizeSvgMarkupServer } from "@/lib/social-tool/visualBlocks/sanitizeSvgServer";
import { loadAssetText } from "@/lib/assets/loadAssetText";
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

export async function resolveIllustrationSvg(
  entry: IllustrationLibraryEntry,
  ctx: VisualTemplateContext,
): Promise<string | null> {
  const raw = await loadAssetText(entry.assetPath);
  if (!raw) return null;

  let svg = raw;

  if (entry.source === "storyset") {
    svg = recolorIllustrationForPreview(svg, ctx.primary, STORYSET_PRIMARY_ACCENTS);
  } else if (entry.recolorAccents?.length) {
    svg = recolorIllustrationForPreview(svg, ctx.primary, entry.recolorAccents);
  }

  return sanitizeSvgMarkupServer(normalizeIllustrationSvg(svg));
}

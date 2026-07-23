import fs from "node:fs";
import path from "node:path";
import { sanitizeSvgMarkupServer } from "@/lib/social-tool/visualBlocks/sanitizeSvgServer";
import type { IllustrationLibraryEntry } from "./manifest";
import type { VisualTemplateContext } from "../templateContext";

const DEFAULT_RECOLOR = ["#6c63ff", "#6C63FF", "#6366F1", "#6366f1"];

function recolorSvg(svg: string, accent: string, extra?: string[]): string {
  let out = svg;
  for (const hex of [...(extra ?? []), ...DEFAULT_RECOLOR]) {
    out = out.replaceAll(hex, accent);
  }
  return out;
}

export function normalizeIllustrationSvg(rawSvg: string): string {
  return rawSvg.replace(/<\?xml[\s\S]*?\?>/gi, "").trim();
}

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
  if (entry.recolorAccents?.length) {
    svg = recolorSvg(svg, ctx.accent, entry.recolorAccents);
  }

  return sanitizeSvgMarkupServer(normalizeIllustrationSvg(svg));
}

export function recolorIllustrationForPreview(
  svg: string,
  accent: string,
  extra?: string[],
): string {
  return recolorSvg(svg, accent, extra);
}

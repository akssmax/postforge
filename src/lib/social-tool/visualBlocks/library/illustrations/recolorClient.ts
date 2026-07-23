/** Client-safe illustration accent recolor (mirrors server resolver). */
const DEFAULT_RECOLOR = ["#6c63ff", "#6C63FF", "#6366F1", "#6366f1"];

export function recolorIllustrationSvg(
  svg: string,
  brandPrimary: string,
  extra?: readonly string[],
): string {
  let out = svg;
  for (const hex of [...(extra ?? []), ...DEFAULT_RECOLOR]) {
    out = out.replaceAll(hex, brandPrimary);
  }
  return out;
}

export function stripSvgXmlDecl(svg: string): string {
  return svg.replace(/<\?xml[\s\S]*?\?>/gi, "").trim();
}

/** Client-safe illustration accent recolor (mirrors server resolver). */
export const STORYSET_PRIMARY_ACCENTS = ["#407BFF", "#407bff"] as const;

const DEFAULT_RECOLOR = [
  "#6c63ff",
  "#6C63FF",
  "#6366F1",
  "#6366f1",
  ...STORYSET_PRIMARY_ACCENTS,
];

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

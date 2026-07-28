const DEFAULT_RECOLOR = ["#6c63ff", "#6C63FF", "#6366F1", "#6366f1"];

function recolorSvg(svg: string, brandPrimary: string, extra?: string[]): string {
  let out = svg;
  for (const hex of [...(extra ?? []), ...DEFAULT_RECOLOR]) {
    out = out.replaceAll(hex, brandPrimary);
  }
  return out;
}

export function recolorIllustrationForPreview(
  svg: string,
  primary: string,
  extra?: string[],
): string {
  return recolorSvg(svg, primary, extra);
}

export function normalizeIllustrationSvg(rawSvg: string): string {
  return rawSvg.replace(/<\?xml[\s\S]*?\?>/gi, "").trim();
}

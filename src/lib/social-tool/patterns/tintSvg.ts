/** Replace currentColor and common black tokens with a concrete tint hex */
export function tintSvgMarkup(svg: string, color: string): string {
  return svg
    .replace(/currentColor/gi, color)
    .replace(/#000000/gi, color)
    .replace(/#000\b/gi, color)
    .replace(/black/gi, color);
}

export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `url("data:image/svg+xml,${encoded}")`;
}

export function parseSvgViewBox(svgMarkup: string): {
  width: number;
  height: number;
} {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  const root = doc.documentElement;
  const viewBox = root.getAttribute("viewBox");
  if (viewBox) {
    const parts = viewBox.trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2]!, height: parts[3]! };
    }
  }
  const w = Number.parseFloat(root.getAttribute("width") ?? "100");
  const h = Number.parseFloat(root.getAttribute("height") ?? "100");
  return {
    width: Number.isFinite(w) ? w : 100,
    height: Number.isFinite(h) ? h : 100,
  };
}

export function extractSvgInnerMarkup(svgMarkup: string): string {
  const doc = new DOMParser().parseFromString(svgMarkup, "image/svg+xml");
  return doc.documentElement.innerHTML;
}

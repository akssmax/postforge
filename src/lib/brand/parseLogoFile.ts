const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "path",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "defs",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "use",
  "symbol",
]);

const BLOCKED = /(<script|javascript:|on[a-z]+=)/i;

export function sanitizeSvgMarkup(raw: string): string | null {
  if (BLOCKED.test(raw)) return null;

  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return null;

  const walk = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      el.remove();
      return true;
    }
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || attr.value.toLowerCase().includes("javascript:")) {
        el.removeAttribute(attr.name);
      }
    }
    for (const child of [...el.children]) {
      walk(child);
    }
    return false;
  };

  walk(root);

  if (!root.getAttribute("xmlns")) {
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  return root.outerHTML;
}

export type ParsedLogoFile =
  | { kind: "svg"; svgMarkup: string }
  | { kind: "png"; blob: Blob };

export async function parseLogoFile(file: File): Promise<ParsedLogoFile> {
  const name = file.name.toLowerCase();
  const isSvg =
    file.type === "image/svg+xml" || name.endsWith(".svg");
  const isPng = file.type === "image/png" || name.endsWith(".png");

  if (!isSvg && !isPng) {
    throw new Error("Upload a PNG or SVG logo.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Logo must be under 2 MB.");
  }

  if (isSvg) {
    const text = await file.text();
    const svgMarkup = sanitizeSvgMarkup(text);
    if (!svgMarkup) {
      throw new Error("Could not parse this SVG. Try exporting a simpler file.");
    }
    return { kind: "svg", svgMarkup };
  }

  return { kind: "png", blob: file };
}

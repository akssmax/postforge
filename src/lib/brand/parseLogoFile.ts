import { sanitizeSvgMarkupServer } from "@/lib/social-tool/visualBlocks/sanitizeSvgServer";

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
  "text",
  "tspan",
  "defs",
  "style",
  "lineargradient",
  "radialgradient",
  "stop",
  "clippath",
  "mask",
  "use",
  "symbol",
]);

const BLOCKED = /(<script|javascript:|on[a-z]+=)/i;
const BLOCKED_STYLE =
  /@import|javascript:|expression\s*\(|behavior\s*:|(?:^|[^-\w])url\s*\(\s*['"]?\s*data:/i;

function sanitizeSvgStyleContent(css: string): string {
  if (BLOCKED_STYLE.test(css)) return "";
  return css;
}

function inlineSvgClassStyles(root: Element): void {
  const rules = new Map<string, { fill?: string; stroke?: string }>();

  for (const styleEl of root.querySelectorAll("style")) {
    const css = styleEl.textContent ?? "";
    const ruleRe = /\.([a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = ruleRe.exec(css))) {
      const className = match[1];
      const body = match[2];
      const entry = rules.get(className) ?? {};
      const fillMatch = body.match(/(?:^|;)\s*fill\s*:\s*([^;]+)/i);
      const strokeMatch = body.match(/(?:^|;)\s*stroke\s*:\s*([^;]+)/i);
      if (fillMatch) entry.fill = fillMatch[1].trim();
      if (strokeMatch) entry.stroke = strokeMatch[1].trim();
      rules.set(className, entry);
    }
  }

  if (rules.size === 0) return;

  const walk = (el: Element) => {
    const classAttr = el.getAttribute("class");
    if (classAttr) {
      for (const className of classAttr.split(/\s+/)) {
        const rule = rules.get(className);
        if (!rule) continue;
        if (rule.fill && !el.getAttribute("fill")) {
          el.setAttribute("fill", rule.fill);
        }
        if (rule.stroke && !el.getAttribute("stroke")) {
          el.setAttribute("stroke", rule.stroke);
        }
      }
    }
    for (const child of [...el.children]) walk(child);
  };

  walk(root);
}

export function sanitizeSvgMarkup(raw: string): string | null {
  if (typeof DOMParser === "undefined") {
    return sanitizeSvgMarkupServer(raw);
  }

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
    if (tag === "style") {
      el.textContent = sanitizeSvgStyleContent(el.textContent ?? "");
    }
    for (const child of [...el.children]) {
      walk(child);
    }
    return false;
  };

  walk(root);
  inlineSvgClassStyles(root);

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

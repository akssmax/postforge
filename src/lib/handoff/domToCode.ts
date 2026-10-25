/**
 * Turn a rendered scene (the renderer's inline-styled DOM) into standalone
 * HTML or a React component. Working from the DOM keeps exports identical to
 * the canvas, visuals included.
 */

/** App font variables, replaced with real families outside the app. */
export const FONT_VARIABLES: Record<string, string> = {
  "var(--font-social-display)": '"Syne"',
  "var(--font-social-body)": '"DM Sans"',
  "var(--font-inter)": '"Inter"',
  "var(--font-geist-sans)": '"Geist"',
};
export const BUNDLED_GOOGLE_FONTS = ["Syne", "DM Sans", "Inter"];

export function replaceFontVariables(css: string): string {
  return Object.entries(FONT_VARIABLES).reduce((text, [variable, family]) => text.split(variable).join(family), css);
}

/** Families named in font-family declarations (for Google Fonts links). */
export function fontFamiliesIn(css: string): string[] {
  const families = new Set<string>();
  for (const match of css.matchAll(/font-family:\s*([^;"]*(?:"[^"]*"[^;"]*)*)/g)) {
    for (const part of match[1]!.split(",")) {
      const name = part.trim().replace(/^["']|["']$/g, "");
      if (name && !/^(serif|sans-serif|monospace|system-ui|ui-|-apple-system|var\()/.test(name)) families.add(name);
    }
  }
  return [...families];
}

export function googleFontsHref(families: string[]): string | null {
  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.map((family) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700;800`).join("&")}&display=swap`;
}

/** Make a detached copy fit for export: canvases become images, app-relative URLs absolute. */
export function prepareClone(root: HTMLElement, origin: string): HTMLElement {
  const clone = root.cloneNode(true) as HTMLElement;
  const sourceCanvases = root.querySelectorAll("canvas");
  clone.querySelectorAll("canvas").forEach((canvas, index) => {
    const source = sourceCanvases[index] as HTMLCanvasElement | undefined;
    let dataUrl = "";
    try {
      dataUrl = source?.toDataURL("image/png") ?? "";
    } catch {
      // A tainted or lost WebGL canvas can't be read; fall back to its parent's fill.
    }
    const img = document.createElement("img");
    if (dataUrl && dataUrl.length > 100) img.src = dataUrl;
    img.alt = "";
    img.setAttribute("style", `${canvas.getAttribute("style") ?? ""};width:100%;height:100%;object-fit:cover;display:block`);
    canvas.replaceWith(img);
  });
  clone.querySelectorAll<HTMLElement>("[src],[href]").forEach((element) => {
    for (const attr of ["src", "href"]) {
      const value = element.getAttribute(attr);
      if (value?.startsWith("/") && !value.startsWith("//")) element.setAttribute(attr, origin + value);
    }
  });
  clone.querySelectorAll<HTMLElement>("[style]").forEach((element) => element.setAttribute("style", replaceFontVariables(element.getAttribute("style")!)));
  clone.setAttribute("style", replaceFontVariables(clone.getAttribute("style") ?? ""));
  clone.style.transform = "none";
  return clone;
}

export function htmlDocument(title: string, bodies: Array<{ name: string; html: string; width: number; height: number }>): string {
  const allHtml = bodies.map((body) => body.html).join("\n");
  const fonts = googleFontsHref([...new Set([...fontFamiliesIn(allHtml), ...BUNDLED_GOOGLE_FONTS])]);
  const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]!);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="${fonts}">` : ""}
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; padding: 40px; background: #f2f2f2; font-family: Inter, system-ui, sans-serif; display: flex; flex-direction: column; gap: 40px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; }
  figcaption { font-size: 13px; color: #555; }
  p, h1, h2, h3 { margin: 0; }
</style>
</head>
<body>
${bodies.map((body) => `<figure data-artboard="${escapeHtml(body.name)}">\n<figcaption>${escapeHtml(body.name)} · ${body.width}×${body.height}</figcaption>\n${body.html}\n</figure>`).join("\n")}
</body>
</html>
`;
}

const SVG_KEEP = new Set(["viewBox", "preserveAspectRatio", "xmlns"]);
const REACT_ATTRIBUTE: Record<string, string> = { class: "className", for: "htmlFor", tabindex: "tabIndex", "xlink:href": "xlinkHref", "xmlns:xlink": "xmlnsXlink", "xml:space": "xmlSpace", crossorigin: "crossOrigin", srcset: "srcSet" };
const VOID = new Set(["img", "br", "hr", "input", "source", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "stop", "use"]);

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

/** Inline CSS text to a React style object literal. */
export function styleToObject(css: string): string {
  const entries = css
    .split(/;(?![^(]*\))/)
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      if (colon < 0) return null;
      const property = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      const key = property.startsWith("--") ? JSON.stringify(property) : camel(property.replace(/^-ms-/, "ms-"));
      return `${key}: ${JSON.stringify(value)}`;
    })
    .filter(Boolean);
  return `{ ${entries.join(", ")} }`;
}

function attributeToJsx(element: Element, name: string, value: string, inSvg: boolean): string | null {
  if (name === "style") return value.trim() ? `style={${styleToObject(value)}}` : null;
  if (name.startsWith("on")) return null;
  let key = REACT_ATTRIBUTE[name] ?? name;
  if (inSvg && !name.startsWith("data-") && !name.startsWith("aria-") && !SVG_KEEP.has(name)) key = REACT_ATTRIBUTE[name] ?? camel(name);
  if (!inSvg && !name.startsWith("data-") && !name.startsWith("aria-")) key = REACT_ATTRIBUTE[name] ?? (name.includes("-") ? camel(name) : name);
  return `${key}=${JSON.stringify(value)}`;
}

/** Serialize a DOM subtree as JSX (indented). */
export function domToJsx(node: Node, depth = 0, inSvg = false): string {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text.trim() ? `${pad}{${JSON.stringify(text.replace(/\s+/g, " "))}}` : "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (tag === "script" || tag === "style") return "";
  const svg = inSvg || tag === "svg";
  const reactTag = svg ? element.tagName.replace(/^([A-Z]+)$/, (upper) => upper.toLowerCase()) : tag;
  const attributes = [...element.attributes].map((attr) => attributeToJsx(element, attr.name, attr.value, svg)).filter(Boolean);
  const open = `<${reactTag}${attributes.length ? ` ${attributes.join(" ")}` : ""}`;
  const children = [...element.childNodes].map((child) => domToJsx(child, depth + 1, svg)).filter(Boolean);
  if (!children.length) return VOID.has(tag) || svg || tag === "div" || tag === "span" ? `${pad}${open} />` : `${pad}${open}></${reactTag}>`;
  return `${pad}${open}>\n${children.join("\n")}\n${pad}</${reactTag}>`;
}

export function componentName(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
  const pascal = words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("") || "Artboard";
  return /^\d/.test(pascal) ? `Artboard${pascal}` : pascal;
}

export function reactModule(name: string, jsx: string, width: number, height: number): string {
  const component = componentName(name);
  return `// ${name} (${width}×${height}), exported from Postforge.
// Inline styles mirror the canvas exactly. Fonts load from Google Fonts (see README.md).
export default function ${component}() {
  return (
${jsx
  .split("\n")
  .map((line) => `    ${line}`)
  .join("\n")}
  );
}
`;
}

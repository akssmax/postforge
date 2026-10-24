import { webFontFamily } from "@/lib/design-systems/schema";

const requested = new Set<string>();

/**
 * Load a font the app doesn't bundle from Google Fonts. `crossorigin` lets
 * exports read the stylesheet to embed the font in PNG and video frames.
 */
export function ensureWebFont(stack: string) {
  if (typeof document === "undefined") return;
  const family = webFontFamily(stack);
  if (!family || requested.has(family)) return;
  requested.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.crossOrigin = "anonymous";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

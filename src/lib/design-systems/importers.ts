import { colorDistance, hexToRgb, isNearNeutral, relativeLuminance, rgbToHex } from "@/lib/brand/colorUtils";
import type { SystemDraft } from "@/lib/design-systems/schema";

/**
 * Importers turn someone else's brand source (design tokens, a Tailwind
 * theme, a website's HTML and CSS) into a system draft. They only parse;
 * nothing is evaluated.
 */

// ---------- colours ----------

const clamp255 = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function oklchToHex(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_];
  const [r, g, bl] = linear.map((v) => clamp255(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055)));
  return rgbToHex({ r: r!, g: g!, b: bl! });
}

function hslToHexValue(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex({ r: clamp255(f(0) * 255), g: clamp255(f(8) * 255), b: clamp255(f(4) * 255) });
}

/** Parse a CSS colour (hex, rgb(), hsl(), oklch()) to #rrggbb; null for anything else. */
export function parseColor(input: string): string | null {
  const value = input.trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const digits = hex[1]!;
    if (digits.length === 3 || digits.length === 4) return `#${digits.slice(0, 3).split("").map((d) => d + d).join("")}`;
    if (digits.length === 6 || digits.length === 8) return `#${digits.slice(0, 6)}`;
    return null;
  }
  const numbers = (text: string) => text.split(/[\s,/]+/).filter(Boolean).map((part) => (part.endsWith("%") ? Number(part.slice(0, -1)) / 100 : part.endsWith("deg") ? Number(part.slice(0, -3)) : Number(part)));
  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean);
    const [r, g, b] = parts.slice(0, 3).map((part) => (part.endsWith("%") ? (Number(part.slice(0, -1)) / 100) * 255 : Number(part)));
    return [r, g, b].every((n) => Number.isFinite(n)) ? rgbToHex({ r: clamp255(r!), g: clamp255(g!), b: clamp255(b!) }) : null;
  }
  const hsl = value.match(/^hsla?\(([^)]+)\)$/);
  if (hsl) {
    const [h, s, l] = numbers(hsl[1]!);
    return [h, s, l].every((n) => Number.isFinite(n)) ? hslToHexValue(h!, s! > 1 ? s! / 100 : s!, l! > 1 ? l! / 100 : l!) : null;
  }
  const oklch = value.match(/^oklch\(([^)]+)\)$/);
  if (oklch) {
    const [l, c, h] = numbers(oklch[1]!);
    return [l, c, h].every((n) => Number.isFinite(n)) ? oklchToHex(l! > 1 ? l! / 100 : l!, c!, h!) : null;
  }
  return null;
}

type NamedColor = { name: string; hex: string; weight: number };

const ROLE_PATTERNS: Record<"primary" | "secondary" | "accent" | "neutral", RegExp> = {
  primary: /(^|[.\-_/])(primary|brand|main)([.\-_/]|$)/i,
  secondary: /(^|[.\-_/])secondary([.\-_/]|$)/i,
  accent: /(^|[.\-_/])(accent|highlight|cta|tertiary)([.\-_/]|$)/i,
  neutral: /(^|[.\-_/])(neutral|gray|grey|slate|zinc|ink|foreground|text|dark|black)([.\-_/]|$)/i,
};

/** Prefer the base/500-600 shade of a named scale ("primary.600", "primary-DEFAULT"). */
function shadeRank(name: string): number {
  if (/default|base|500|600/i.test(name)) return 0;
  if (/400|700/.test(name)) return 1;
  if (/\d/.test(name)) return 2;
  return 0;
}

/** Assign brand roles from named and frequency-weighted colours. */
export function assignColorRoles(colors: NamedColor[]): { primary?: string; secondary?: string; accent?: string; neutral?: string; extra: Array<{ name: string; hex: string }> } {
  const byRole = (role: keyof typeof ROLE_PATTERNS) =>
    colors.filter((color) => ROLE_PATTERNS[role].test(color.name)).sort((a, b) => shadeRank(a.name) - shadeRank(b.name) || b.weight - a.weight)[0]?.hex;
  const saturated = [...colors].filter((color) => !isNearNeutral(color.hex)).sort((a, b) => b.weight - a.weight);
  const distinct = (picked: Array<string | undefined>) => saturated.find((color) => picked.every((hex) => !hex || colorDistance(hex, color.hex) > 70))?.hex;

  const primary = byRole("primary") ?? saturated[0]?.hex;
  const accent = byRole("accent") ?? distinct([primary]);
  const secondary = byRole("secondary") ?? distinct([primary, accent]) ?? (primary ? darken(primary) : undefined);
  const neutral =
    byRole("neutral") ??
    [...colors].filter((color) => isNearNeutral(color.hex)).sort((a, b) => luminance(a.hex) - luminance(b.hex))[0]?.hex;
  const used = new Set([primary, secondary, accent, neutral]);
  const extra = colors
    .filter((color) => !used.has(color.hex) && /^[a-z][\w-]*$/i.test(color.name.split(/[./]/).pop() ?? "") && !/\d/.test(color.name))
    .slice(0, 8)
    .map((color) => ({ name: color.name.slice(0, 40), hex: color.hex }));
  return { primary, secondary, accent, neutral, extra };
}

const luminance = (hex: string) => {
  const rgb = hexToRgb(hex);
  return rgb ? relativeLuminance(rgb) : 1;
};

function darken(hex: string): string {
  const rgb = hexToRgb(hex)!;
  return rgbToHex({ r: clamp255(rgb.r * 0.7), g: clamp255(rgb.g * 0.7), b: clamp255(rgb.b * 0.7) });
}

function colorsDraft(named: NamedColor[]): SystemDraft["colors"] {
  const roles = assignColorRoles(named);
  return Object.fromEntries(Object.entries(roles).filter(([, value]) => value !== undefined && (!Array.isArray(value) || value.length))) as SystemDraft["colors"];
}

// ---------- fonts ----------

const ICON_FONT = /icon|awesome|material|glyph|symbol/i;
const GENERIC_FONT = /^(serif|sans-serif|monospace|system-ui|cursive|inherit|initial|ui-\w+|-apple-system|blinkmacsystemfont|segoe ui|helvetica( neue)?|arial|var\(.*)$/i;

/** First real family in a font-family list ("Poppins", sans-serif → Poppins). */
export function primaryFamily(list: string): string | null {
  for (const raw of list.split(",")) {
    const name = raw.trim().replace(/^["']|["']$/g, "").trim();
    if (name && !GENERIC_FONT.test(name) && !ICON_FONT.test(name) && name.length <= 60) return name;
  }
  return null;
}

// ---------- design tokens (DTCG, Style Dictionary, Tokens Studio) ----------

/** Import a design-tokens JSON file. */
export function importTokensJson(text: string): SystemDraft {
  const root = JSON.parse(text) as unknown;
  const named: NamedColor[] = [];
  const fonts: Array<{ path: string; value: string }> = [];
  let radius: number | null = null;
  const visit = (node: unknown, path: string[]) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const value = record.$value ?? record.value;
    const type = String(record.$type ?? record.type ?? "");
    if (value !== undefined && (typeof value === "string" || typeof value === "number")) {
      const name = path.join(".");
      const text = String(value);
      const color = typeof value === "string" ? parseColor(text) : null;
      if (color && (!type || /color/i.test(type))) named.push({ name, hex: color, weight: 1 });
      else if (/fontfamil/i.test(type) || /font.?famil|typeface/i.test(name)) fonts.push({ path: name, value: text });
      else if (/radius/i.test(name) && radius === null) radius = parseFloat(text);
      return;
    }
    for (const [key, child] of Object.entries(record)) if (!key.startsWith("$")) visit(child, [...path, key]);
  };
  visit(root, []);
  if (!named.length && !fonts.length) throw new Error("No colour or font tokens found in that JSON.");
  const heading = fonts.find((font) => /head|display|title/i.test(font.path)) ?? fonts[0];
  const body = fonts.find((font) => /body|text|base|sans/i.test(font.path)) ?? fonts[0];
  return {
    colors: colorsDraft(named),
    type: {
      ...(heading && primaryFamily(heading.value) ? { heading: primaryFamily(heading.value)! } : {}),
      ...(body && primaryFamily(body.value) ? { body: primaryFamily(body.value)! } : {}),
    },
    spacing: radius === null ? undefined : { radius: radiusToken(radius) },
    source: { kind: "tokens" },
  };
}

function radiusToken(px: number): "0" | "1" | "2" | "3" | "4" {
  if (!Number.isFinite(px) || px <= 1) return "0";
  if (px <= 6) return "1";
  if (px <= 12) return "2";
  if (px <= 20) return "3";
  return "4";
}

// ---------- CSS ----------

/** CSS custom properties (`--name: value`) in declaration order. */
export function cssCustomProperties(css: string): Array<{ name: string; value: string }> {
  const out: Array<{ name: string; value: string }> = [];
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;}{]+)/g)) out.push({ name: match[1]!, value: match[2]!.trim() });
  return out;
}

// ---------- Tailwind (v3 config objects, v4 @theme CSS) ----------

/** Leaf string values of a JS object literal with their key paths, without evaluating it. */
function objectLeaves(source: string): Array<{ path: string; value: string }> {
  const tokens = source.match(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|[\w$-]+|[{}[\]:,]/g) ?? [];
  const leaves: Array<{ path: string; value: string }> = [];
  const stack: string[] = [];
  /** Key of the array we're inside (arrays of strings, e.g. font stacks). */
  const arrays: Array<string | null> = [];
  let pendingKey: string | null = null;
  let lastWasColon = false;
  const unquote = (token: string) => token.replace(/^["'`]|["'`]$/g, "");
  const isString = (token: string) => /^["'`]/.test(token);
  for (const token of tokens) {
    if (token.startsWith("//") || token.startsWith("/*")) continue;
    if (token === "{") {
      stack.push(pendingKey ?? "");
      arrays.push(null);
      pendingKey = null;
      lastWasColon = false;
    } else if (token === "}") {
      stack.pop();
      arrays.pop();
      pendingKey = null;
    } else if (token === "[") {
      arrays.push(lastWasColon ? pendingKey : null);
      lastWasColon = false;
    } else if (token === "]") {
      arrays.pop();
      pendingKey = null;
    } else if (token === ":") {
      lastWasColon = true;
    } else if (token === ",") {
      if (!arrays.at(-1)) pendingKey = null;
      lastWasColon = false;
    } else if (lastWasColon) {
      if (isString(token) && pendingKey) leaves.push({ path: [...stack, pendingKey].filter(Boolean).join("."), value: unquote(token) });
      lastWasColon = false;
    } else if (arrays.at(-1) && isString(token)) {
      leaves.push({ path: [...stack, arrays.at(-1)!].filter(Boolean).join("."), value: unquote(token) });
    } else {
      pendingKey = unquote(token);
    }
  }
  return leaves;
}

/** Import a Tailwind theme: a v3 `tailwind.config.js` or v4 CSS with `@theme`. */
export function importTailwind(text: string): SystemDraft {
  const named: NamedColor[] = [];
  const fonts: Array<{ key: string; value: string }> = [];
  let radius: number | null = null;
  for (const { name, value } of cssCustomProperties(text)) {
    const color = parseColor(value);
    if (name.startsWith("--color-") && color) named.push({ name: name.slice(8), hex: color, weight: 1 });
    else if (name.startsWith("--font-") && !/weight|size/.test(name)) fonts.push({ key: name.slice(7), value });
    else if (name.startsWith("--radius") && radius === null) radius = parseFloat(value) * (value.includes("rem") ? 16 : 1);
  }
  for (const leaf of objectLeaves(text)) {
    const path = leaf.path.replace(/^(module\.exports|export default|theme|extend)\.?/g, "").replace(/(^|\.)(theme|extend)\./g, "$1");
    const color = parseColor(leaf.value);
    if (/(^|\.)colors\./.test(path) && color) named.push({ name: path.replace(/^.*?colors\./, ""), hex: color, weight: 1 });
    else if (/(^|\.)fontFamily\./.test(path)) fonts.push({ key: path.replace(/^.*?fontFamily\./, "").replace(/\.\d+$/, ""), value: leaf.value });
    else if (/(^|\.)borderRadius\./.test(path) && radius === null) radius = parseFloat(leaf.value) * (leaf.value.includes("rem") ? 16 : 1);
  }
  if (!named.length && !fonts.length) throw new Error("No theme colours or fonts found. Paste tailwind.config.js or your @theme CSS.");
  const family = (keys: RegExp) => fonts.filter((font) => keys.test(font.key)).map((font) => primaryFamily(font.value)).find(Boolean) ?? undefined;
  const heading = family(/display|heading|title|serif/) ?? family(/sans/);
  const body = family(/sans|body|text/) ?? heading;
  return {
    colors: colorsDraft(named),
    type: { ...(heading ? { heading } : {}), ...(body ? { body } : {}) },
    spacing: radius === null ? undefined : { radius: radiusToken(radius) },
    source: { kind: "tailwind" },
  };
}

// ---------- websites ----------

const COLOR_IN_CSS = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)/g;

function attr(tag: string, name: string): string | null {
  return tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"))?.slice(2).find((value) => value !== undefined) ?? null;
}

function meta(html: string, key: string): string | null {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, "name") ?? attr(tag, "property"))?.toLowerCase() === key) return attr(tag, "content");
  }
  return null;
}

const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

/** Stylesheet URLs a page links (resolved against the page URL). */
export function stylesheetLinks(html: string, pageUrl: string): string[] {
  return (html.match(/<link\b[^>]*>/gi) ?? [])
    .filter((tag) => /stylesheet/i.test(attr(tag, "rel") ?? ""))
    .map((tag) => attr(tag, "href"))
    .filter((href): href is string => !!href)
    .map((href) => {
      try {
        return new URL(decode(href), pageUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((href): href is string => !!href && /^https?:/.test(href));
}

/**
 * Read a brand from a page's HTML and CSS: theme colour, custom properties,
 * the most used non-grey colours, heading and body fonts (incl. Google
 * Fonts links), the logo and a voice seed from the description.
 */
export function importWebsite(html: string, css: string[], pageUrl: string): SystemDraft {
  const allCss = [...(html.match(/<style\b[^>]*>([\s\S]*?)<\/style>/gi) ?? []).map((block) => block.replace(/<\/?style[^>]*>/gi, "")), ...css].join("\n");
  const weights = new Map<string, NamedColor>();
  const add = (name: string, hex: string, weight: number) => {
    const existing = weights.get(hex);
    if (existing) {
      existing.weight += weight;
      if (ROLE_PATTERNS.primary.test(name) || ROLE_PATTERNS.accent.test(name) || ROLE_PATTERNS.secondary.test(name)) existing.name = name;
    } else weights.set(hex, { name, hex, weight });
  };
  const themeColor = parseColor(meta(html, "theme-color") ?? "");
  if (themeColor) add("brand", themeColor, 50);
  for (const { name, value } of cssCustomProperties(allCss)) {
    const color = parseColor(value);
    if (color) add(name.replace(/^--/, ""), color, 4);
  }
  // Colours used in fills and text, weighted by how often they appear.
  for (const match of allCss.matchAll(/(?:^|[;{\s])(background(?:-color)?|color|fill|border(?:-color)?)\s*:\s*([^;}]+)/g)) {
    for (const raw of match[2]!.match(COLOR_IN_CSS) ?? []) {
      const color = parseColor(raw);
      if (color) add(match[1] === "color" ? "text" : "surface", color, match[1]!.startsWith("background") ? 2 : 1);
    }
  }

  // Fonts: Google Fonts links, headings, then the most common family.
  const families = new Map<string, number>();
  let headingFont: string | null = null;
  for (const href of (html.match(/fonts\.googleapis\.com\/css2?\?[^"'\s>]+/g) ?? []).map(decode)) {
    for (const match of href.matchAll(/family=([^:&]+)/g)) {
      const family = decodeURIComponent(match[1]!.replace(/\+/g, " "));
      families.set(family, (families.get(family) ?? 0) + 5);
    }
  }
  for (const rule of allCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const familyDecl = rule[2]!.match(/font-family\s*:\s*([^;]+)/);
    if (!familyDecl) continue;
    const family = primaryFamily(familyDecl[1]!);
    if (!family) continue;
    families.set(family, (families.get(family) ?? 0) + 1);
    if (!headingFont && /(^|[\s,])h[12]\b|heading|title|display/i.test(rule[1]!)) headingFont = family;
  }
  const ranked = [...families.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const body = ranked[0];
  const heading = headingFont ?? ranked[1] ?? body;

  // Logo: an inline SVG or image marked as the logo.
  let logoSvg: string | null = null;
  let logoSrc: string | null = null;
  const logoBlock = html.match(/<(a|div|span|header)\b[^>]*(class|id|aria-label)\s*=\s*["'][^"']*logo[^"']*["'][^>]*>([\s\S]{0,40000}?)<\/\1>/i);
  const svg = (logoBlock?.[3] ?? "").match(/<svg\b[\s\S]*?<\/svg>/i)?.[0];
  if (svg && svg.length < 100_000) logoSvg = svg.includes("xmlns=") ? svg : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!logoSvg) {
    const img = (html.match(/<img\b[^>]*>/gi) ?? []).find((tag) => /logo/i.test(`${attr(tag, "src") ?? ""} ${attr(tag, "alt") ?? ""} ${attr(tag, "class") ?? ""}`));
    const src = img ? attr(img, "src") : null;
    if (src) {
      try {
        const resolved = new URL(decode(src), pageUrl).toString();
        if (/^https:/.test(resolved) && resolved.length <= 2000) logoSrc = resolved;
      } catch {
        // ignore unparseable src
      }
    }
  }

  const name = decode(meta(html, "og:site_name") ?? html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? new URL(pageUrl).hostname).split(/\s[|–—-]\s/)[0]!.slice(0, 80);
  const description = decode(meta(html, "description") ?? meta(html, "og:description") ?? "");
  return {
    name,
    colors: colorsDraft([...weights.values()]),
    type: { ...(heading ? { heading } : {}), ...(body ? { body } : {}) },
    logoSvg,
    logoSrc,
    voice: description ? { tone: `Match the voice of ${name}: ${description}`.slice(0, 600) } : undefined,
    source: { kind: "website", ref: pageUrl },
  };
}

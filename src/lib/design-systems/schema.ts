import { z } from "zod";
import { createId, type CanvasDesign } from "@/lib/canvas/document";
import type { CanvasOp } from "@/lib/canvas/ops";
import { sceneNodeSchema, spaceTokenSchema, type SceneNode } from "@/lib/scene/schema";
import { SOCIAL_FONTS } from "@/lib/social-tool/presets";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/**
 * A design system: the brand rules every design built on it shares. Colours
 * and fonts apply to designs directly; spacing, components and voice guide
 * the agent and the editor's insert menu.
 */
export const designSystemSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  name: z.string().min(1).max(80),
  colors: z.object({
    primary: hex,
    secondary: hex,
    accent: hex,
    neutral: hex,
    /** Extra named colours (e.g. success, highlight) for reference. */
    extra: z.array(z.object({ name: z.string().max(40), hex })).max(16).default([]),
  }),
  type: z.object({
    heading: z.string().min(1).max(60),
    body: z.string().min(1).max(60),
    scale: z.number().min(0.5).max(2).default(1),
    headlineStyle: z.enum(["display", "headline"]).default("headline"),
  }),
  spacing: z.object({ pad: spaceTokenSchema.default("6"), gap: spaceTokenSchema.default("4"), radius: spaceTokenSchema.default("2") }),
  logoSvg: z.string().max(200_000).nullable().default(null),
  logoSrc: z.string().max(3_000_000).nullable().default(null),
  components: z.array(z.object({ id: z.string(), name: z.string().min(1).max(60), description: z.string().max(200).default(""), node: sceneNodeSchema })).max(60).default([]),
  voice: z.object({
    tone: z.string().max(600).default(""),
    do: z.array(z.string().max(160)).max(12).default([]),
    dont: z.array(z.string().max(160)).max(12).default([]),
  }),
  source: z.object({ kind: z.enum(["manual", "brand-kit", "website", "tokens", "tailwind"]), ref: z.string().max(500).optional() }),
  updatedAt: z.number(),
});
export type DesignSystem = z.infer<typeof designSystemSchema>;
export type SystemDraft = Partial<Omit<DesignSystem, "colors" | "type" | "voice" | "spacing">> & {
  colors?: Partial<DesignSystem["colors"]>;
  type?: Partial<DesignSystem["type"]>;
  voice?: Partial<DesignSystem["voice"]>;
  spacing?: Partial<DesignSystem["spacing"]>;
};

export const DEFAULT_SYSTEM_COLORS = { primary: "#1f3a5f", secondary: "#14273f", accent: "#f0a35e", neutral: "#0b1726" };

/** Fill a partial system (from an importer or a form) with sensible defaults and validate it. */
export function buildSystem(draft: SystemDraft): DesignSystem {
  return designSystemSchema.parse({
    version: 1,
    id: draft.id ?? createId("sys"),
    name: draft.name?.trim() || "Untitled system",
    colors: { ...DEFAULT_SYSTEM_COLORS, extra: [], ...draft.colors },
    type: { heading: "Inter", body: "Inter", scale: 1, headlineStyle: "headline", ...draft.type },
    spacing: { pad: "6", gap: "4", radius: "2", ...draft.spacing },
    logoSvg: draft.logoSvg ?? null,
    logoSrc: draft.logoSrc ?? null,
    components: draft.components ?? [],
    voice: { tone: "", do: [], dont: [], ...draft.voice },
    source: draft.source ?? { kind: "manual" },
    updatedAt: draft.updatedAt ?? Date.now(),
  });
}

/** Fonts bundled with the app; anything else loads from Google Fonts by name. */
const BUNDLED: Record<string, string> = Object.fromEntries(SOCIAL_FONTS.filter((font) => font.id !== "mono").map((font) => [font.label.toLowerCase(), font.family]));
export const BUNDLED_FONT_NAMES = SOCIAL_FONTS.filter((font) => font.id !== "mono").map((font) => font.label);

const GENERIC = /^(serif|sans-serif|monospace|system-ui|cursive|ui-\w+|-apple-system|blinkmacsystemfont|segoe ui|helvetica( neue)?|arial|roboto mono|sfmono-regular|menlo|inherit)$/i;

/** CSS font stack for a family name; marks web fonts so the renderer can load them. */
export function fontStack(name: string): string {
  const clean = name.replace(/["']/g, "").trim();
  const bundled = BUNDLED[clean.toLowerCase()];
  if (bundled) return bundled;
  if (!clean || GENERIC.test(clean)) return "var(--font-inter), system-ui, sans-serif";
  return `"${clean}", var(--font-inter), system-ui, sans-serif`;
}

/** The first quoted family in a stack, if it's a web font the app doesn't bundle. */
export function webFontFamily(stack: string): string | null {
  const match = stack.match(/^"([^"]+)"/);
  return match && !BUNDLED[match[1]!.toLowerCase()] ? match[1]! : null;
}

/**
 * Ops that put a design on a system: brand colours, logo, fonts and type
 * scale on every artboard, and the system id. One undo step in the editor.
 */
export function applySystemOps(design: CanvasDesign, system: DesignSystem): CanvasOp[] {
  const ops: CanvasOp[] = [
    { op: "setDesign", path: "systemId", value: system.id },
    ...(["primary", "secondary", "accent", "neutral"] as const)
      .filter((key) => design.brand.colors[key].toLowerCase() !== system.colors[key].toLowerCase())
      .map((key) => ({ op: "setDesign" as const, path: `brand.colors.${key}`, value: system.colors[key] })),
  ];
  if (system.logoSvg || system.logoSrc) {
    ops.push({ op: "setDesign", path: "brand.logoSvg", value: system.logoSvg }, { op: "setDesign", path: "brand.logoSrc", value: system.logoSrc });
  }
  const font = { heading: fontStack(system.type.heading), body: fontStack(system.type.body) };
  for (const page of design.pages) {
    for (const artboard of page.artboards) {
      if (JSON.stringify(artboard.scene.font) !== JSON.stringify(font)) ops.push({ op: "setScene", artboardId: artboard.id, path: "font", value: font });
      if (artboard.scene.typeScale !== system.type.scale) ops.push({ op: "setScene", artboardId: artboard.id, path: "typeScale", value: system.type.scale });
    }
  }
  return ops;
}

/** A component's node with fresh ids, ready to insert. */
export function instantiateComponent(node: SceneNode): SceneNode {
  const copy = { ...node, id: createId(node.type) } as SceneNode;
  if (copy.type === "frame") copy.children = copy.children.map(instantiateComponent);
  return copy;
}

/** What the agent should know about the system (kept short; it rides on every request). */
export function systemBrief(system: DesignSystem): string {
  const lines = [
    `Design system "${system.name}": fonts ${system.type.heading} / ${system.type.body}; headline style ${system.type.headlineStyle}; padding token ${system.spacing.pad}, gap ${system.spacing.gap}, radius ${system.spacing.radius}.`,
  ];
  if (system.colors.extra.length) lines.push(`Extra colours (use colorHex only where they fit): ${system.colors.extra.map((color) => `${color.name} ${color.hex}`).join(", ")}.`);
  if (system.voice.tone) lines.push(`Voice: ${system.voice.tone}`);
  if (system.voice.do.length) lines.push(`Do: ${system.voice.do.join("; ")}`);
  if (system.voice.dont.length) lines.push(`Don't: ${system.voice.dont.join("; ")}`);
  if (system.components.length) {
    lines.push("Components (insert a copy with fresh ids when one fits):");
    for (const component of system.components.slice(0, 20)) lines.push(`- ${component.name}${component.description ? ` — ${component.description}` : ""}: ${JSON.stringify(component.node)}`);
  }
  return lines.join("\n");
}

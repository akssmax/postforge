import type { SceneNode } from "@/lib/scene/schema";
import { ICON_CATALOG } from "@/lib/social-tool/icons/catalog";
import { PATTERN_OPTIONS } from "@/lib/social-tool/presets";

/**
 * Declarative property fields per node type. The inspector renders these,
 * and the agent's tweaks reuse the same kinds, so one control set edits both.
 */
export type FieldOption = { id: string; label: string };

export type NodeField =
  | { kind: "textarea"; path: string; label: string }
  | { kind: "text"; path: string; label: string; placeholder?: string }
  | { kind: "select"; path: string; label: string; options: FieldOption[]; optional?: boolean }
  | { kind: "segment"; path: string; label: string; options: FieldOption[]; optional?: boolean }
  | { kind: "slider"; path: string; label: string; min: number; max: number; step: number; optional?: boolean; fallback: number };

const opts = (...ids: string[]): FieldOption[] => ids.map((id) => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1) }));

export const COLOR_OPTIONS: FieldOption[] = [
  { id: "brand.primary", label: "Brand primary" },
  { id: "brand.secondary", label: "Brand secondary" },
  { id: "brand.accent", label: "Brand accent" },
  { id: "brand.neutral", label: "Brand neutral" },
  { id: "text", label: "Text" },
  { id: "text.muted", label: "Muted text" },
  { id: "text.onAccent", label: "Text on accent" },
  { id: "surface", label: "Surface" },
  { id: "none", label: "None" },
];

export const SPACE_OPTIONS: FieldOption[] = ["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"].map((id) => ({ id, label: id }));
const ALIGN = opts("start", "center", "end");
const SIZES = opts("sm", "md", "lg");

const SIZING: NodeField[] = [
  { kind: "slider", path: "grow", label: "Grow", min: 0, max: 4, step: 0.25, optional: true, fallback: 0 },
  { kind: "slider", path: "basis", label: "Basis", min: 0, max: 1, step: 0.05, optional: true, fallback: 0 },
];

export const MOTION_PRESETS: FieldOption[] = [{ id: "none", label: "None" }, ...opts("fade", "rise", "scale", "slide", "reveal")];

export function fieldsFor(node: SceneNode): NodeField[] {
  switch (node.type) {
    case "text":
      return [
        { kind: "textarea", path: "text", label: "Text" },
        { kind: "select", path: "style", label: "Style", options: opts("display", "headline", "title", "body", "label", "caption") },
        { kind: "select", path: "role", label: "Role", options: opts("headline", "subheading", "body", "caption", "cta", "contact", "name", "title") },
        { kind: "segment", path: "align", label: "Align", options: ALIGN, optional: true },
        { kind: "select", path: "color", label: "Colour", options: COLOR_OPTIONS, optional: true },
        { kind: "text", path: "colorHex", label: "Custom colour", placeholder: "#1f3a5f" },
        { kind: "slider", path: "maxLines", label: "Max lines", min: 1, max: 12, step: 1, optional: true, fallback: 12 },
        ...SIZING,
      ];
    case "button":
      return [
        { kind: "text", path: "text", label: "Label" },
        { kind: "segment", path: "variant", label: "Variant", options: opts("solid", "outline") },
        { kind: "segment", path: "align", label: "Align", options: ALIGN, optional: true },
      ];
    case "visual":
      return [
        { kind: "select", path: "role", label: "Role", options: opts("hero", "supporting", "background", "badge", "inline") },
        { kind: "segment", path: "fit", label: "Fit", options: opts("contain", "cover") },
        { kind: "select", path: "radius", label: "Radius", options: SPACE_OPTIONS, optional: true },
        { kind: "slider", path: "aspect", label: "Aspect", min: 0.25, max: 4, step: 0.05, optional: true, fallback: 1 },
        ...SIZING,
      ];
    case "logo":
      return [
        { kind: "segment", path: "size", label: "Size", options: SIZES },
        { kind: "segment", path: "align", label: "Align", options: ALIGN, optional: true },
      ];
    case "icon":
      return [
        { kind: "select", path: "name", label: "Icon", options: ICON_CATALOG.map((entry) => ({ id: entry.name, label: entry.label })) },
        { kind: "segment", path: "size", label: "Size", options: SIZES },
        { kind: "select", path: "color", label: "Colour", options: COLOR_OPTIONS, optional: true },
        { kind: "segment", path: "align", label: "Align", options: ALIGN, optional: true },
      ];
    case "shape":
      return [
        { kind: "segment", path: "shape", label: "Shape", options: opts("bar", "dot", "rule") },
        { kind: "select", path: "color", label: "Colour", options: COLOR_OPTIONS },
      ];
    case "pattern":
      return [
        { kind: "select", path: "patternId", label: "Pattern", options: PATTERN_OPTIONS.filter((p) => p.id !== "none").map((p) => ({ id: p.id, label: p.label })) },
        { kind: "slider", path: "opacity", label: "Opacity", min: 0, max: 1, step: 0.05, fallback: 0.25 },
        { kind: "slider", path: "scale", label: "Scale", min: 0.25, max: 4, step: 0.05, fallback: 1 },
        ...SIZING,
      ];
    case "shader":
      return [
        { kind: "select", path: "preset", label: "Preset", options: opts("mesh-gradient", "aurora", "waves", "grain") },
        { kind: "select", path: "colors.0", label: "Colour 1", options: COLOR_OPTIONS },
        { kind: "select", path: "colors.1", label: "Colour 2", options: COLOR_OPTIONS },
        { kind: "slider", path: "speed", label: "Speed", min: 0, max: 4, step: 0.1, fallback: 1 },
        { kind: "slider", path: "intensity", label: "Intensity", min: 0, max: 1, step: 0.05, fallback: 0.6 },
        ...SIZING,
      ];
    case "frame":
      return [
        { kind: "segment", path: "layout", label: "Layout", options: opts("row", "column", "grid") },
        ...(node.layout === "grid" ? [{ kind: "slider", path: "columns", label: "Columns", min: 1, max: 6, step: 1, optional: true, fallback: 2 } as NodeField] : []),
        { kind: "select", path: "gap", label: "Gap", options: SPACE_OPTIONS, optional: true },
        { kind: "select", path: "pad", label: "Padding", options: SPACE_OPTIONS, optional: true },
        { kind: "select", path: "align", label: "Align items", options: opts("start", "center", "end", "stretch"), optional: true },
        { kind: "select", path: "justify", label: "Justify", options: opts("start", "center", "end", "between"), optional: true },
        { kind: "select", path: "fill", label: "Fill", options: COLOR_OPTIONS, optional: true },
        { kind: "select", path: "radius", label: "Radius", options: SPACE_OPTIONS, optional: true },
        ...SIZING,
      ];
    case "spacer":
      return [{ kind: "slider", path: "grow", label: "Grow", min: 0, max: 10, step: 0.25, fallback: 1 }];
  }
}

export function readPath(target: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), target);
}

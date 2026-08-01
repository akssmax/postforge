import type { CanvasIconTransform } from "@/lib/social-tool/icons/types";
import { getIconCatalogEntry } from "@/lib/social-tool/icons/catalog";
import { createCanvasIconRecord } from "@/lib/social-tool/icons/instantiate";

export type IconPlacementPreset = "top-right-badge" | "footer-accent" | "cta-arrow";

export function iconTransformForPreset(
  preset: IconPlacementPreset,
): Partial<CanvasIconTransform> {
  switch (preset) {
    case "top-right-badge":
      return { x: 88, y: 10, scale: 1.1, rotateZ: 0 };
    case "footer-accent":
      return { x: 12, y: 92, scale: 0.95, rotateZ: 0 };
    case "cta-arrow":
      return { x: 78, y: 78, scale: 1.2, rotateZ: 0 };
    default:
      return {};
  }
}

export function suggestIconNameFromBrief(brief: string): string | null {
  const lower = brief.toLowerCase();
  if (/\b(launch|new|announce)\b/.test(lower)) return "Sparkles";
  if (/\b(built at|powered by)\b/.test(lower)) return "ArrowUpRight";
  if (/\b(growth|trend|metric)\b/.test(lower)) return "TrendingUp";
  if (/\b(team|hire|hiring)\b/.test(lower)) return "Users";
  if (/\b(tips|ideas|learn)\b/.test(lower)) return "Lightbulb";
  return null;
}

export function resolvePipelineCanvasIcons(input: {
  brief: string;
  brandAccent: string;
}): import("@/lib/social-tool/icons/types").CanvasIconRecord[] {
  const name = suggestIconNameFromBrief(input.brief);
  if (!name) return [];
  const entry = getIconCatalogEntry(name);
  if (!entry) return [];

  const icon = createCanvasIconRecord({
    iconName: name,
    label: entry.label,
    category: entry.category,
    color: input.brandAccent,
    transform: iconTransformForPreset("top-right-badge"),
  });
  return icon ? [icon] : [];
}

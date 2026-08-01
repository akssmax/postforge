import { getIconCatalogEntry } from "@/lib/social-tool/icons/catalog";
import { resolveLucideIcon } from "@/lib/social-tool/icons/lucideRegistry";
import type {
  CanvasIconRecord,
  CanvasIconTransform,
  IconCategory,
} from "@/lib/social-tool/icons/types";

export function isKnownLucideIcon(iconName: string): boolean {
  return Boolean(getIconCatalogEntry(iconName) && resolveLucideIcon(iconName));
}

export function createCanvasIconRecord(input: {
  iconName: string;
  label: string;
  category: IconCategory;
  color: string;
  transform?: Partial<CanvasIconTransform>;
}): CanvasIconRecord | null {
  if (!isKnownLucideIcon(input.iconName)) return null;

  return {
    id: `icon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    iconName: input.iconName,
    label: input.label,
    category: input.category,
    color: input.color,
    strokeWidth: 2,
    opacity: 1,
    zIndex: 8,
    transform: {
      x: 88,
      y: 12,
      scale: 1,
      rotateZ: 0,
      ...input.transform,
    },
    createdAt: Date.now(),
  };
}

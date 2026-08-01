export type IconCategory =
  | "arrows"
  | "business"
  | "communication"
  | "social"
  | "ui";

export const ICON_CATEGORIES: IconCategory[] = [
  "arrows",
  "business",
  "communication",
  "social",
  "ui",
];

export const ICON_CATEGORY_LABELS: Record<IconCategory, string> = {
  arrows: "Arrows",
  business: "Business",
  communication: "Communication",
  social: "Social",
  ui: "UI",
};

export type CanvasIconTransform = {
  x: number;
  y: number;
  scale: number;
  rotateZ: number;
};

export type CanvasIconRecord = {
  id: string;
  iconName: string;
  label: string;
  category: IconCategory;
  /** @deprecated Icons render from iconName via LucideIconGlyph. */
  svgMarkup?: string;
  transform: CanvasIconTransform;
  color: string;
  strokeWidth: number;
  opacity?: number;
  zIndex: number;
  locked?: boolean;
  createdAt: number;
};

export const MAX_CANVAS_ICONS = 5;

export const DEFAULT_ICON_TRANSFORM: CanvasIconTransform = {
  x: 88,
  y: 12,
  scale: 1,
  rotateZ: 0,
};

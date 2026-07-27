export type ShapeCategory =
  | "basic"
  | "lines"
  | "polygons"
  | "stars"
  | "arrows"
  | "flowchart"
  | "organic"
  | "frames";

export const SHAPE_CATEGORIES: ShapeCategory[] = [
  "basic",
  "lines",
  "polygons",
  "stars",
  "arrows",
  "flowchart",
  "organic",
  "frames",
];

export const SHAPE_CATEGORY_LABELS: Record<ShapeCategory, string> = {
  basic: "Basic shapes",
  lines: "Lines",
  polygons: "Polygons",
  stars: "Stars",
  arrows: "Arrows",
  flowchart: "Flowchart",
  organic: "Organic",
  frames: "Frames & accents",
};

export type CanvasShapeTransform = {
  /** Position as % of canvas width */
  x: number;
  /** Position as % of canvas height */
  y: number;
  scale: number;
  rotateZ: number;
  flipX?: boolean;
  flipY?: boolean;
};

export type CanvasShapeRecord = {
  id: string;
  libraryId: string;
  category: ShapeCategory;
  label: string;
  svgMarkup: string;
  transform: CanvasShapeTransform;
  fill?: string;
  stroke?: string;
  opacity?: number;
  /** 0–10; shapes with zIndex < 6 render behind layout content */
  zIndex: number;
  locked?: boolean;
  createdAt: number;
};

export const MAX_CANVAS_SHAPES = 3;

export const DEFAULT_SHAPE_TRANSFORM: CanvasShapeTransform = {
  x: 50,
  y: 50,
  scale: 1,
  rotateZ: 0,
};

export type ShapeBrandColors = {
  primary: string;
  accent: string;
};

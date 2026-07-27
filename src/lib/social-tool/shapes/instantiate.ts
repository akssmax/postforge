import { getShapeCatalogEntry } from "@/lib/social-tool/shapes/catalog";
import { createCanvasShapeId } from "@/lib/social-tool/shapes/storage";
import {
  DEFAULT_SHAPE_TRANSFORM,
  type CanvasShapeRecord,
  type CanvasShapeTransform,
  type ShapeBrandColors,
} from "@/lib/social-tool/shapes/types";

export type InstantiateShapeOptions = {
  transform?: Partial<CanvasShapeTransform>;
  fill?: string;
  stroke?: string;
  opacity?: number;
  zIndex?: number;
  id?: string;
};

export function instantiateShape(
  libraryId: string,
  brandColors: ShapeBrandColors,
  options?: InstantiateShapeOptions,
): CanvasShapeRecord | null {
  const entry = getShapeCatalogEntry(libraryId);
  if (!entry) return null;

  const transform: CanvasShapeTransform = {
    ...DEFAULT_SHAPE_TRANSFORM,
    scale: entry.defaultScale,
    ...options?.transform,
  };

  return {
    id: options?.id ?? createCanvasShapeId(),
    libraryId: entry.id,
    category: entry.category,
    label: entry.label,
    svgMarkup: entry.render(brandColors),
    transform,
    fill: options?.fill ?? brandColors.accent,
    opacity: options?.opacity ?? entry.defaultOpacity,
    zIndex: options?.zIndex ?? entry.defaultZIndex,
    createdAt: Date.now(),
  };
}

export function reRenderShapeSvg(
  shape: CanvasShapeRecord,
  brandColors: ShapeBrandColors,
): CanvasShapeRecord {
  const entry = getShapeCatalogEntry(shape.libraryId);
  if (!entry) return shape;
  return {
    ...shape,
    svgMarkup: entry.render({
      primary: brandColors.primary,
      accent: shape.fill ?? brandColors.accent,
    }),
  };
}

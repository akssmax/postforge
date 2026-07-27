import { MAX_CANVAS_SHAPES, type CanvasShapeRecord } from "@/lib/social-tool/shapes/types";

export function createCanvasShapeId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertCanvasShape(
  shapes: CanvasShapeRecord[],
  record: CanvasShapeRecord,
): CanvasShapeRecord[] {
  const index = shapes.findIndex((entry) => entry.id === record.id);
  if (index < 0) return [...shapes, record];
  const next = [...shapes];
  next[index] = record;
  return next;
}

export function removeCanvasShape(
  shapes: CanvasShapeRecord[],
  id: string,
): CanvasShapeRecord[] {
  return shapes.filter((shape) => shape.id !== id);
}

export function findCanvasShape(
  shapes: CanvasShapeRecord[],
  id: string | null | undefined,
): CanvasShapeRecord | undefined {
  if (!id) return undefined;
  return shapes.find((shape) => shape.id === id);
}

export function canAddCanvasShape(shapes: CanvasShapeRecord[] | undefined): boolean {
  return (shapes?.length ?? 0) < MAX_CANVAS_SHAPES;
}

export function enforceShapeLimit(shapes: CanvasShapeRecord[]): CanvasShapeRecord[] {
  return shapes.slice(0, MAX_CANVAS_SHAPES);
}

/** Merge shape patches — unions adds/updates; honors explicit removals (subset). */
export function mergeCanvasShapeArrays(
  previous: CanvasShapeRecord[],
  incoming: CanvasShapeRecord[],
): CanvasShapeRecord[] {
  if (incoming.length === 0 && previous.length > 0) {
    return [];
  }

  const prevIds = new Set(previous.map((shape) => shape.id));
  const isSubsetRemoval =
    incoming.length < previous.length &&
    incoming.every((shape) => prevIds.has(shape.id));

  if (isSubsetRemoval) {
    return enforceShapeLimit(incoming);
  }

  const byId = new Map(previous.map((shape) => [shape.id, shape]));
  for (const shape of incoming) {
    byId.set(shape.id, shape);
  }
  return enforceShapeLimit([...byId.values()]);
}

export function patchCanvasShape(
  shapes: CanvasShapeRecord[],
  id: string,
  patch: Partial<CanvasShapeRecord>,
): CanvasShapeRecord[] {
  const index = shapes.findIndex((shape) => shape.id === id);
  if (index < 0) return shapes;
  const next = [...shapes];
  next[index] = { ...next[index]!, ...patch, id };
  return next;
}

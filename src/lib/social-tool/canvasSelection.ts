import type { DesignBlockId } from "@/lib/brand/contrast";

/** Inspector target when an element is selected on the canvas */
export type CanvasSelectionId =
  | "copy"
  | "logo"
  | "featured"
  | "pattern"
  | "shape"
  | `copy:${string}`
  | `featured:${string}`
  | `shape:${string}`;

export const CANVAS_SELECTION_LABELS: Record<string, string> = {
  copy: "Content",
  logo: "Brand",
  featured: "Featured image",
  pattern: "Pattern",
  shape: "Shape",
};

export function canvasSelectionKind(
  id: CanvasSelectionId | null,
): "copy" | "logo" | "featured" | "pattern" | "shape" | null {
  if (!id) return null;
  if (id === "copy" || id.startsWith("copy:")) return "copy";
  if (id === "featured" || id.startsWith("featured:")) return "featured";
  if (id === "shape" || id.startsWith("shape:")) return "shape";
  if (id === "logo") return "logo";
  if (id === "pattern") return "pattern";
  return null;
}

/** Map contrast issue blocks to the closest inspector panel */
export function canvasSelectionFromContrastBlock(
  block: DesignBlockId,
): CanvasSelectionId {
  if (block === "logo") return "logo";
  if (block === "featured") return "featured";
  if (block === "pattern") return "pattern";
  return "copy";
}

/** True when the click target is an interactive canvas element (not stage background). */
export function isCanvasSelectableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("[data-canvas-select]") ||
      target.closest(".canvas-preview-toolbar") ||
      target.closest(".canvas-stage-chrome") ||
      target.closest(".social-featured-drag-handle") ||
      target.closest(".social-fi-chrome") ||
      target.closest(".canvas-shape") ||
      target.closest(".spacing-handle") ||
      target.closest(".canvas-property-pills") ||
      target.closest(".canvas-copy-editor") ||
      target.closest("[data-copy-field]"),
  );
}

export function featuredSlotIdFromSelection(
  selection: CanvasSelectionId | null,
): string | null {
  if (!selection) return null;
  if (selection.startsWith("featured:")) return selection.slice("featured:".length);
  if (selection === "featured") return "featured-primary";
  return null;
}

export function shapeIdFromSelection(
  selection: CanvasSelectionId | null,
): string | null {
  if (!selection) return null;
  if (selection.startsWith("shape:")) return selection.slice("shape:".length);
  if (selection === "shape") return null;
  return null;
}

import type { DesignBlockId } from "@/lib/brand/contrast";

/** Inspector target when an element is selected on the canvas */
export type CanvasSelectionId = "copy" | "logo" | "featured" | "pattern";

export const CANVAS_SELECTION_LABELS: Record<CanvasSelectionId, string> = {
  copy: "Content",
  logo: "Brand",
  featured: "Featured image",
  pattern: "Pattern",
};

/** Map contrast issue blocks to the closest inspector panel */
export function canvasSelectionFromContrastBlock(
  block: DesignBlockId,
): CanvasSelectionId {
  if (block === "logo") return "logo";
  return "copy";
}

/** True when the click target is an interactive canvas element (not stage background). */
export function isCanvasSelectableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("[data-canvas-select]") ||
      target.closest(".canvas-preview-toolbar") ||
      target.closest(".social-featured-drag-handle") ||
      target.closest(".social-fi-chrome") ||
      target.closest(".spacing-handle"),
  );
}

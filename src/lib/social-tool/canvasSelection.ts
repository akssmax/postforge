import type { DesignBlockId } from "@/lib/brand/contrast";

/** Inspector target when an element is selected on the canvas */
export type CanvasSelectionId =
  | "copy"
  | "logo"
  | "featured"
  | "pattern"
  | `copy:${string}`
  | `featured:${string}`;

export const CANVAS_SELECTION_LABELS: Record<string, string> = {
  copy: "Content",
  logo: "Brand",
  featured: "Featured image",
  pattern: "Pattern",
};

export function canvasSelectionKind(
  id: CanvasSelectionId | null,
): "copy" | "logo" | "featured" | "pattern" | null {
  if (!id) return null;
  if (id === "copy" || id.startsWith("copy:")) return "copy";
  if (id === "featured" || id.startsWith("featured:")) return "featured";
  if (id === "logo") return "logo";
  if (id === "pattern") return "pattern";
  return null;
}

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

export function featuredSlotIdFromSelection(
  selection: CanvasSelectionId | null,
): string | null {
  if (!selection) return null;
  if (selection.startsWith("featured:")) return selection.slice("featured:".length);
  if (selection === "featured") return "featured-primary";
  return null;
}

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

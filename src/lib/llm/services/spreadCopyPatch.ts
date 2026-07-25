import type { DesignSessionPersisted } from "@/lib/design/types";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { getPostLayout, type PostLayoutId } from "@/lib/social-tool/postLayouts";
import {
  catalogLayoutToDynamic,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";

/** True when a patch changes headline/subheading or the copy variant pool. */
export function patchAffectsCopy(patch: CanvasPatchResult): boolean {
  const doc = patch.document;
  if (!doc) return false;
  return (
    doc.copy !== undefined ||
    doc.textSlots !== undefined ||
    doc.copyVariants !== undefined
  );
}

/** Assign a distinct copyVariants entry per artboard when spreading multi-board copy edits. */
export function shouldSpreadCopyAcrossArtboards(
  patch: CanvasPatchResult,
  boardCount: number,
): boolean {
  if (boardCount <= 1 || !patch.success || !patchAffectsCopy(patch)) return false;
  const variants = patch.document?.copyVariants;
  return Boolean(variants && variants.length > 1);
}

export function spreadCopyPatchForArtboard(
  patch: CanvasPatchResult,
  session: DesignSessionPersisted,
  artboardIndex: number,
): CanvasPatchResult {
  if (!patch.success || !patch.document) return patch;

  const variants = patch.document.copyVariants;
  if (!variants || variants.length === 0) return patch;

  const variantIndex = artboardIndex % variants.length;
  const active = variants[variantIndex]!;
  const layout = catalogLayoutToDynamic(
    getPostLayout(session.document.layoutId as PostLayoutId),
  );
  const copy = {
    ...session.document.copy,
    heading: active.heading,
    subheading: active.subheading,
  };

  return {
    ...patch,
    document: {
      ...patch.document,
      copy,
      textSlots: textSlotsFromCopy(copy, layout),
      copyVariants: variants,
      copyVariantIndex: variantIndex,
      showContent: patch.document.showContent ?? true,
    },
  };
}

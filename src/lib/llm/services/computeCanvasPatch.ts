import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import type {
  selectVisualBlockToolSchema,
  updateBackgroundToolSchema,
  updateBrandToolSchema,
  updateCopyToolSchema,
  updateFeaturedToolSchema,
  updateLayoutToolSchema,
  updatePatternToolSchema,
  updateSpacingToolSchema,
  updateTypographyToolSchema,
  updateVisibilityToolSchema,
  addShapeToolSchema,
  updateShapeToolSchema,
  removeShapeToolSchema,
} from "@/lib/llm/schemas/canvasTools";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import type { z } from "zod";
import type { CopyVariant } from "@/lib/social-tool/presets";
import {
  catalogLayoutToDynamic,
  copyFromTextSlots,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import { getPostLayout, getLayoutStatePatch } from "@/lib/social-tool/postLayouts";
import { getSlotConstraint } from "@/lib/social-tool/slotLibrary";
import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import {
  SPACING_TOKEN_KEYS,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import { instantiateShape } from "@/lib/social-tool/shapes/instantiate";
import {
  canAddCanvasShape,
  mergeCanvasShapeArrays,
  patchCanvasShape,
  removeCanvasShape,
} from "@/lib/social-tool/shapes/storage";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { ProductPageId } from "@/lib/social-tool/presets";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { appendVisualBlocks, findVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import {
  patchFeaturedSlotsForTool,
  resolveToolFeaturedSlotId,
} from "@/lib/social-tool/featuredSlots";
import type { FeaturedSlotContent } from "@/lib/social-tool/dynamicLayout";

function snapshotFeaturedSlots(snapshot: DesignSnapshot): FeaturedSlotContent[] {
  return (snapshot.featured.slots ?? []).map((slot) => ({
    slotId: slot.slotId,
    mode: slot.mode,
    visible: slot.visible,
    activeBlockId: slot.activeBlockId ?? null,
  }));
}

function resolveFeaturedSlotId(
  snapshot: DesignSnapshot,
  requestedSlotId?: string | null,
): string {
  return resolveToolFeaturedSlotId({
    slots: snapshot.featured.slots,
    requestedSlotId,
    selection: snapshot.selection,
  });
}

function slotRoleForId(
  snapshot: DesignSnapshot,
  slotId: string,
): TextSlotRole | null {
  return snapshot.textSlots.find((slot) => slot.slotId === slotId)?.role ?? null;
}

export function computeUpdateCopyPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateCopyToolSchema>,
): CanvasPatchResult {
  const nextSlots = snapshot.textSlots.map((slot) => ({ ...slot }));
  const errors: string[] = [];

  for (const update of input.slots) {
    const index = nextSlots.findIndex((slot) => slot.slotId === update.slotId);
    if (index < 0) {
      errors.push(`Unknown slot: ${update.slotId}`);
      continue;
    }
    const role = slotRoleForId(snapshot, update.slotId) ?? nextSlots[index].role;
    const constraint = getSlotConstraint(role);
    if (update.text.length > constraint.maxCharacters) {
      errors.push(
        `${update.slotId} exceeds ${constraint.maxCharacters} characters`,
      );
    }
    nextSlots[index] = { ...nextSlots[index], text: update.text };
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join("; ") };
  }

  const layout = catalogLayoutToDynamic(getPostLayout(snapshot.layoutId as PostLayoutId));
  const copy = copyFromTextSlots(nextSlots, layout, snapshot.copy);

  return {
    success: true,
    message: "Copy updated",
    document: {
      textSlots: nextSlots,
      copy,
      showContent: true,
    },
  };
}

export function computeRefreshCopyVariantsPatch(
  snapshot: DesignSnapshot,
  variants: CopyVariant[],
  variantIndex = 0,
): CanvasPatchResult {
  if (variants.length === 0) {
    return { success: false, error: "No copy variants generated" };
  }

  const index = Math.min(Math.max(variantIndex, 0), variants.length - 1);
  const active = variants[index]!;
  const layout = catalogLayoutToDynamic(getPostLayout(snapshot.layoutId as PostLayoutId));
  const copy = {
    ...snapshot.copy,
    heading: active.heading,
    subheading: active.subheading,
  };
  const textSlots = textSlotsFromCopy(copy, layout);

  return {
    success: true,
    message: "Copy variants refreshed",
    document: {
      copy,
      textSlots,
      copyVariants: variants,
      copyVariantIndex: index,
      showContent: true,
    },
  };
}

export function computeUpdateBackgroundPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateBackgroundToolSchema>,
): CanvasPatchResult {
  const patch: CanvasPatchResult = { success: true, message: "Background updated" };

  if (input.presetId) {
    const valid = snapshot.brand.backgroundPresets.some((p) => p.id === input.presetId);
    if (!valid) {
      return {
        success: false,
        error: `Unknown background preset: ${input.presetId}`,
      };
    }
    patch.brand = { activeBackgroundPresetId: input.presetId };
  }

  if (input.showBackground !== undefined) {
    patch.document = {
      ...patch.document,
      showBackground: input.showBackground,
    };
  }

  return patch;
}

export function computeUpdatePatternPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updatePatternToolSchema>,
): CanvasPatchResult {
  if (input.patternRef && !snapshot.allowedPatternRefs.includes(input.patternRef)) {
    return { success: false, error: `Unknown pattern: ${input.patternRef}` };
  }

  return {
    success: true,
    message: input.showPattern ? "Pattern updated" : "Pattern removed",
    document: {
      showPattern: input.showPattern,
      pattern: input.patternRef ?? snapshot.pattern.ref,
      patternOpacity: input.patternOpacity ?? snapshot.pattern.opacity,
      patternScale: input.patternScale ?? snapshot.pattern.scale,
      patternAnimated: input.patternAnimated ?? snapshot.pattern.animated,
    },
  };
}

function snapshotVisualBlocks(snapshot: DesignSnapshot): VisualBlockRecord[] {
  return (snapshot.featured.visualBlocks ?? []).map((block) => ({
    id: block.id,
    label: block.label,
    kind: block.kind,
    svgMarkup: block.svgMarkup ?? "",
    createdAt: Date.now(),
    theme: block.theme,
  }));
}

function buildComposedFeaturedPatch(
  snapshot: DesignSnapshot,
  visualBlocks: VisualBlockRecord[],
  activeBlockId: string | null,
  requestedSlotId?: string | null,
): CanvasPatchResult {
  const slotId = resolveFeaturedSlotId(snapshot, requestedSlotId);
  const featuredSlots = patchFeaturedSlotsForTool(
    snapshotFeaturedSlots(snapshot),
    slotId,
    {
      mode: "composed",
      visible: true,
      activeBlockId,
    },
  );
  return {
    success: true,
    message: "Visual block updated",
    document: {
      showFeaturedImage: true,
      featuredSlots,
    },
    featured: {
      mode: "composed",
      activeBlockId,
      visualBlocks,
      slots: featuredSlots,
    },
  };
}

export function computeSelectVisualBlockPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof selectVisualBlockToolSchema>,
): CanvasPatchResult {
  const block = findVisualBlock(snapshotVisualBlocks(snapshot), input.blockId);
  if (!block) {
    return { success: false, error: `Unknown visual block: ${input.blockId}` };
  }
  return buildComposedFeaturedPatch(
    snapshot,
    snapshotVisualBlocks(snapshot),
    block.id,
    input.slotId,
  );
}

export function computeGeneratedVisualBlocksPatch(
  snapshot: DesignSnapshot,
  blocks: VisualBlockRecord[],
  requestedSlotId?: string | null,
): CanvasPatchResult {
  const visualBlocks = appendVisualBlocks(snapshotVisualBlocks(snapshot), blocks);
  const activeBlockId = blocks[0]?.id ?? visualBlocks[0]?.id ?? null;
  return buildComposedFeaturedPatch(
    snapshot,
    visualBlocks,
    activeBlockId,
    requestedSlotId,
  );
}

export function computeModifiedVisualBlockPatch(
  snapshot: DesignSnapshot,
  block: VisualBlockRecord,
  requestedSlotId?: string | null,
): CanvasPatchResult {
  const visualBlocks = snapshotVisualBlocks(snapshot).map((entry) =>
    entry.id === block.id ? block : entry,
  );
  return buildComposedFeaturedPatch(
    snapshot,
    visualBlocks,
    block.id,
    requestedSlotId,
  );
}

export function computeUpdateFeaturedPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateFeaturedToolSchema>,
): CanvasPatchResult {
  if (input.mode === "image" && !snapshot.featured.hasUploadedImage) {
    return {
      success: false,
      message: "Upload a featured image first",
      clientAction: "open_featured_upload",
    };
  }

  const slotId = resolveFeaturedSlotId(snapshot, input.slotId);
  const nextMode = input.mode ?? snapshot.featured.mode;
  const productPage = (input.productPage ?? snapshot.featured.productPage) as ProductPageId;
  const visible = input.showFeaturedImage ?? snapshot.featured.visible;
  const featuredSlots = patchFeaturedSlotsForTool(
    snapshotFeaturedSlots(snapshot),
    slotId,
    {
      mode: nextMode,
      productPage: input.mode === "placeholder" ? undefined : productPage,
      visible,
    },
  );

  return {
    success: true,
    message: "Featured block updated",
    document: {
      showFeaturedImage: visible,
      featuredSlots,
    },
    featured: {
      mode: nextMode as "genui" | "image" | "placeholder" | "composed",
      productPage,
      slots: featuredSlots,
    },
  };
}

export function computeUpdateLayoutPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateLayoutToolSchema>,
): CanvasPatchResult {
  if (!snapshot.allowedLayouts.includes(input.layoutId)) {
    return { success: false, error: `Unknown layout: ${input.layoutId}` };
  }

  const layout = getPostLayout(input.layoutId);
  const patch = getLayoutStatePatch(layout);
  const dynamicLayout = catalogLayoutToDynamic(layout);
  const copy = input.preserveCopy
    ? copyFromTextSlots(snapshot.textSlots, dynamicLayout, snapshot.copy)
    : snapshot.copy;
  const textSlots = input.preserveCopy
    ? snapshot.textSlots
    : textSlotsFromCopy(copy, dynamicLayout);

  return {
    success: true,
    message: `Layout changed to ${layout.name}`,
    document: {
      layoutId: input.layoutId,
      layoutRef: { source: "catalog", id: input.layoutId },
      logoPlacement: patch.logoPlacement,
      logoAlign: patch.logoAlign,
      textAlign: patch.textAlign,
      copy,
      textSlots,
    },
  };
}

export function computeUpdateBrandPatch(
  input: z.infer<typeof updateBrandToolSchema>,
): CanvasPatchResult {
  const document: Record<string, unknown> = {};
  if (input.showBrand !== undefined) document.showBrand = input.showBrand;
  if (input.logoScale !== undefined) document.logoScale = input.logoScale;
  if (input.logoPlacement !== undefined) document.logoPlacement = input.logoPlacement;
  if (input.logoAlign !== undefined) document.logoAlign = input.logoAlign;

  return {
    success: true,
    message: "Brand controls updated",
    document: document as CanvasPatchResult["document"],
  };
}

export function computeUpdateTypographyPatch(
  input: z.infer<typeof updateTypographyToolSchema>,
): CanvasPatchResult {
  const document: Record<string, unknown> = {};
  if (input.textAlign !== undefined) document.textAlign = input.textAlign;
  if (input.headingFont !== undefined) document.headingFont = input.headingFont;
  if (input.subFont !== undefined) document.subFont = input.subFont;
  if (input.typeScale !== undefined) document.typeScale = input.typeScale;

  return {
    success: true,
    message: "Typography updated",
    document: document as CanvasPatchResult["document"],
  };
}

export function computeUpdateVisibilityPatch(
  input: z.infer<typeof updateVisibilityToolSchema>,
): CanvasPatchResult {
  const document: Record<string, unknown> = {};
  if (input.showContent !== undefined) document.showContent = input.showContent;
  if (input.showBrand !== undefined) document.showBrand = input.showBrand;
  if (input.showFeaturedImage !== undefined) {
    document.showFeaturedImage = input.showFeaturedImage;
  }
  if (input.showPattern !== undefined) document.showPattern = input.showPattern;
  if (input.showBackground !== undefined) document.showBackground = input.showBackground;

  return {
    success: true,
    message: "Visibility updated",
    document: document as CanvasPatchResult["document"],
  };
}

export function computeUpdateSpacingPatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateSpacingToolSchema>,
): CanvasPatchResult {
  const next: PostLayoutSpacing = { ...snapshot.layoutSpacing };

  for (const key of SPACING_TOKEN_KEYS) {
    const value = input[key];
    if (value !== undefined) {
      next[key] = value;
    }
  }
  if (input.splitTextColumnShare !== undefined) {
    next.splitTextColumnShare = input.splitTextColumnShare;
  }

  return {
    success: true,
    message: "Spacing updated",
    document: { layoutSpacing: next },
  };
}

export function computeAddShapePatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof addShapeToolSchema>,
): CanvasPatchResult {
  const shapes = snapshot.canvasShapes ?? [];
  if (!canAddCanvasShape(shapes)) {
    return { success: false, error: "Maximum of 3 canvas shapes reached" };
  }
  const shape = instantiateShape(input.libraryId, {
    primary: snapshot.brand.primary ?? "#1E293B",
    accent: snapshot.brand.accent ?? "#7C9A92",
  });
  if (!shape) {
    return { success: false, error: `Unknown shape library id: ${input.libraryId}` };
  }
  return {
    success: true,
    message: "Shape added",
    document: { canvasShapes: [...shapes, shape] },
  };
}

export function computeUpdateShapePatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof updateShapeToolSchema>,
): CanvasPatchResult {
  const shapes = snapshot.canvasShapes ?? [];
  if (!shapes.some((shape) => shape.id === input.shapeId)) {
    return { success: false, error: "Shape not found" };
  }
  const existing = shapes.find((shape) => shape.id === input.shapeId)!;
  const next = patchCanvasShape(shapes, input.shapeId, {
    ...(input.transform
      ? { transform: { ...existing.transform, ...input.transform } }
      : {}),
    ...(input.fill !== undefined ? { fill: input.fill } : {}),
    ...(input.stroke !== undefined ? { stroke: input.stroke } : {}),
    ...(input.opacity !== undefined ? { opacity: input.opacity } : {}),
    ...(input.zIndex !== undefined ? { zIndex: input.zIndex } : {}),
  });
  return {
    success: true,
    message: "Shape updated",
    document: { canvasShapes: next },
  };
}

export function computeRemoveShapePatch(
  snapshot: DesignSnapshot,
  input: z.infer<typeof removeShapeToolSchema>,
): CanvasPatchResult {
  const shapes = snapshot.canvasShapes ?? [];
  if (!shapes.some((shape) => shape.id === input.shapeId)) {
    return { success: false, error: "Shape not found" };
  }
  return {
    success: true,
    message: "Shape removed",
    document: { canvasShapes: removeCanvasShape(shapes, input.shapeId) },
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T | undefined): Partial<T> | undefined {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

function mergeArtboardTargets(
  patches: CanvasPatchResult[],
): CanvasPatchResult["targetArtboards"] {
  const targets = patches
    .map((p) => p.targetArtboards)
    .filter((t): t is NonNullable<typeof t> => t != null);
  if (targets.length === 0) return "active";
  if (targets.some((t) => t === "all")) return "all";
  const indices = new Set<number>();
  let hasActive = false;
  for (const t of targets) {
    if (t === "active") {
      hasActive = true;
      continue;
    }
    if (Array.isArray(t)) {
      for (const n of t) indices.add(n);
    }
  }
  if (indices.size > 0) return [...indices].sort((a, b) => a - b);
  return hasActive ? "active" : "active";
}

export function mergeCanvasPatches(patches: CanvasPatchResult[]): CanvasPatchResult {
  const merged: CanvasPatchResult = {
    success: true,
    message: patches.map((p) => p.message).filter(Boolean).join(" · "),
    targetArtboards: mergeArtboardTargets(patches),
  };

  let mergedShapes: import("@/lib/social-tool/shapes/types").CanvasShapeRecord[] | undefined;

  for (const patch of patches) {
    if (!patch.success) return patch;

    if (patch.document?.canvasShapes) {
      mergedShapes = mergedShapes
        ? mergeCanvasShapeArrays(mergedShapes, patch.document.canvasShapes)
        : patch.document.canvasShapes;
    }

    if (patch.document) {
      const { canvasShapes: _shapes, ...restDocument } = patch.document;
      merged.document = {
        ...(merged.document ?? {}),
        ...omitUndefined(restDocument),
      } as CanvasPatchResult["document"];
    }
    if (patch.brand) {
      merged.brand = {
        ...(merged.brand ?? {}),
        ...omitUndefined(patch.brand),
      } as CanvasPatchResult["brand"];
    }
    if (patch.featured) {
      merged.featured = {
        ...(merged.featured ?? {}),
        ...omitUndefined(patch.featured),
      } as CanvasPatchResult["featured"];
    }
    if (patch.clientAction) merged.clientAction = patch.clientAction;
  }

  if (mergedShapes) {
    merged.document = {
      ...(merged.document ?? {}),
      canvasShapes: mergedShapes,
    };
  }

  return merged;
}

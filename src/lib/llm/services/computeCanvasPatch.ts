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
} from "@/lib/llm/schemas/canvasTools";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import type { z } from "zod";
import {
  catalogLayoutToDynamic,
  copyFromTextSlots,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import { getPostLayout, getLayoutStatePatch } from "@/lib/social-tool/postLayouts";
import { getSlotConstraint } from "@/lib/social-tool/slotLibrary";
import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { ProductPageId } from "@/lib/social-tool/presets";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { appendVisualBlocks, findVisualBlock } from "@/lib/social-tool/visualBlocks/storage";

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
): CanvasPatchResult {
  return {
    success: true,
    message: "Visual block updated",
    document: {
      showFeaturedImage: true,
      featuredSlots: [
        {
          slotId: "featured-primary",
          mode: "composed",
          visible: true,
        },
      ],
    },
    featured: {
      mode: "composed",
      activeBlockId,
      visualBlocks,
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
  return buildComposedFeaturedPatch(snapshot, snapshotVisualBlocks(snapshot), block.id);
}

export function computeGeneratedVisualBlocksPatch(
  snapshot: DesignSnapshot,
  blocks: VisualBlockRecord[],
): CanvasPatchResult {
  const visualBlocks = appendVisualBlocks(snapshotVisualBlocks(snapshot), blocks);
  const activeBlockId = blocks[0]?.id ?? visualBlocks[0]?.id ?? null;
  return buildComposedFeaturedPatch(snapshot, visualBlocks, activeBlockId);
}

export function computeModifiedVisualBlockPatch(
  snapshot: DesignSnapshot,
  block: VisualBlockRecord,
): CanvasPatchResult {
  const visualBlocks = snapshotVisualBlocks(snapshot).map((entry) =>
    entry.id === block.id ? block : entry,
  );
  return buildComposedFeaturedPatch(snapshot, visualBlocks, block.id);
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

  const slotId = input.slotId ?? "featured-primary";
  const nextFeaturedSlots = [
    {
      slotId,
      mode: input.mode ?? snapshot.featured.mode,
      productPage: input.productPage ?? snapshot.featured.productPage,
      visible: input.showFeaturedImage ?? snapshot.featured.visible,
    },
  ];

  const productPage = (input.productPage ?? snapshot.featured.productPage) as ProductPageId;

  return {
    success: true,
    message: "Featured block updated",
    document: {
      showFeaturedImage: input.showFeaturedImage ?? snapshot.featured.visible,
      featuredSlots: nextFeaturedSlots.map((slot) => ({
        ...slot,
        productPage: input.mode === "placeholder" ? undefined : productPage,
      })),
    },
    featured: {
      mode: (input.mode ?? snapshot.featured.mode) as "genui" | "image" | "placeholder",
      productPage,
      slots: nextFeaturedSlots.map((slot) => ({
        slotId: slot.slotId,
        mode: (input.mode ?? snapshot.featured.mode) as "genui" | "image" | "placeholder",
        productPage: input.mode === "placeholder" ? undefined : productPage,
        visible: slot.visible,
      })),
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

  for (const key of Object.keys(input) as (keyof typeof input)[]) {
    const value = input[key];
    if (value !== undefined && key in next) {
      next[key as keyof PostLayoutSpacing] = value as PostLayoutSpacing[keyof PostLayoutSpacing];
    }
  }

  return {
    success: true,
    message: "Spacing updated",
    document: { layoutSpacing: next },
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T | undefined): Partial<T> | undefined {
  if (!value) return undefined;
  const entries = Object.entries(value).filter(([, entry]) => entry !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<T>) : undefined;
}

export function mergeCanvasPatches(patches: CanvasPatchResult[]): CanvasPatchResult {
  const merged: CanvasPatchResult = {
    success: true,
    message: patches.map((p) => p.message).filter(Boolean).join(" · "),
  };

  for (const patch of patches) {
    if (!patch.success) return patch;

    if (patch.document) {
      merged.document = {
        ...(merged.document ?? {}),
        ...omitUndefined(patch.document),
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

  return merged;
}

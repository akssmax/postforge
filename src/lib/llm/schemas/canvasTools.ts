import { z } from "zod";
import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { DesignDocument } from "@/lib/design/types";
import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import type { BrandKitPersisted } from "@/lib/brand/types";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";

/** Which artboards a canvas tool should update (1-based indices match the UI pills). */
export type ArtboardTarget = "active" | "all" | number[];

export const artboardTargetValueSchema = z.union([
  z.literal("active"),
  z.literal("all"),
  z.array(z.number().int().min(1).max(7)).min(1).max(7),
]);

const ARTBOARD_TARGET_DESCRIPTION =
  "Artboards to update: 'active' (default), 'all', or 1-based indices like [1,3]. Use 'all' for shared brand/background/pattern changes. For copy rewrites across multiple artboards, prefer refreshCopyVariants with 'all' — each board gets a different variant from the pool.";

export function withArtboardTargetSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) {
  return schema.extend({
    targetArtboards: artboardTargetValueSchema
      .optional()
      .describe(ARTBOARD_TARGET_DESCRIPTION),
  });
}

export type CanvasPatchResult = {
  success: boolean;
  message?: string;
  clientAction?: "open_featured_upload";
  document?: Partial<DesignDocument>;
  brand?: Partial<BrandKitPersisted>;
  featured?: Partial<FeaturedBlockPersisted>;
  /** Defaults to active artboard when omitted. */
  targetArtboards?: ArtboardTarget;
  error?: string;
};

export function omitInvalidFeaturedSlotId<T extends { slotId?: string }>(
  input: T,
  snapshot: DesignSnapshot,
): T {
  const slotId = input.slotId?.trim();
  if (!slotId) return input;
  const slots = snapshot.featured.slots ?? [];
  if (slots.some((slot) => slot.slotId === slotId)) return input;
  const { slotId: _removed, ...rest } = input;
  return rest as T;
}

export function attachArtboardTarget<T extends { targetArtboards?: ArtboardTarget }>(
  patch: CanvasPatchResult,
  input: T,
): CanvasPatchResult {
  if (!patch.success) return patch;
  return {
    ...patch,
    targetArtboards: input.targetArtboards ?? "active",
  };
}

const layoutIds = POST_LAYOUTS.map((l) => l.id) as [PostLayoutId, ...PostLayoutId[]];

export const updateCopyToolSchema = z.object({
  slots: z
    .array(
      z.object({
        slotId: z.string().min(1),
        text: z.string(),
      }),
    )
    .min(1),
});

export const refreshCopyVariantsToolSchema = z.object({
  instruction: z.string().optional(),
});

export const updateBackgroundToolSchema = z.object({
  presetId: z.string().optional(),
  showBackground: z.boolean().optional(),
});

export const updatePatternToolSchema = z.object({
  showPattern: z.boolean(),
  patternRef: z.string().optional(),
  patternOpacity: z.number().min(0.05).max(1).optional(),
  patternScale: z.number().min(0.5).max(4).optional(),
  patternAnimated: z.boolean().optional(),
});

const featuredSlotIdSchema = z
  .string()
  .optional()
  .describe(
    "Existing featured slot id from the snapshot (e.g. featured-primary). Omit to use selection, an empty slot, or featured-primary. Never invent new ids.",
  );

export const generateVisualBlockToolSchema = z.object({
  theme: z.string().optional(),
  brief: z.string().optional(),
  count: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .describe("How many candidate blocks to create. Default 1; only raise when the user asks for options."),
  slotId: featuredSlotIdSchema,
  source: z.enum(["library", "generate"]).optional(),
  libraryIds: z.array(z.string()).optional(),
  intent: z
    .object({
      primaryIntent: z.string().optional(),
      audience: z.string().optional(),
      goal: z.string().optional(),
      visualPriority: z.string().optional(),
      proofStrategy: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      themes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const modifyVisualBlockToolSchema = z.object({
  blockId: z.string().optional(),
  instruction: z.string().min(1),
  slotId: featuredSlotIdSchema,
});

export const selectVisualBlockToolSchema = z.object({
  blockId: z
    .string()
    .describe(
      "Visual block id from the snapshot, an existing block's libraryId, or a library pattern id from the catalog.",
    ),
  slotId: featuredSlotIdSchema,
});

export const updateFeaturedToolSchema = z.object({
  showFeaturedImage: z.boolean().optional(),
  mode: z.enum(["genui", "image", "placeholder", "composed"]).optional(),
  productPage: z
    .enum([
      "leads",
      "pipeline",
      "scheduler",
      "stats",
      "pricing",
      "activity",
      "profile",
      "form-card",
    ])
    .optional(),
  slotId: featuredSlotIdSchema,
});

export const updateLayoutToolSchema = z.object({
  layoutId: z.enum(layoutIds),
  preserveCopy: z.boolean().default(true),
});

export const updateBrandToolSchema = z.object({
  showBrand: z.boolean().optional(),
  logoScale: z.number().min(0.5).max(2).optional(),
  logoPlacement: z.enum(["top", "footer"]).optional(),
  logoAlign: z.enum(["left", "center", "right"]).optional(),
});

export const updateTypographyToolSchema = z.object({
  textAlign: z.enum(["left", "center", "right"]).optional(),
  headingFont: z.string().optional(),
  subFont: z.string().optional(),
  typeScale: z.number().min(0.7).max(1.6).optional(),
});

export const updateVisibilityToolSchema = z.object({
  showContent: z.boolean().optional(),
  showBrand: z.boolean().optional(),
  showFeaturedImage: z.boolean().optional(),
  showPattern: z.boolean().optional(),
  showBackground: z.boolean().optional(),
});

export const spacingTokenSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(16),
  z.literal(20),
  z.literal(24),
]);

export const updateSpacingToolSchema = z.object({
  layoutPad: spacingTokenSchema.optional(),
  textZonePadBottom: spacingTokenSchema.optional(),
  logoCopyGap: spacingTokenSchema.optional(),
  copyBlockGap: spacingTokenSchema.optional(),
  splitColumnGap: spacingTokenSchema.optional(),
  featuredSlotGap: spacingTokenSchema.optional(),
  footerPad: spacingTokenSchema.optional(),
  footerBlockGap: spacingTokenSchema.optional(),
  splitTextColumnShare: z.number().min(0.32).max(0.52).optional(),
});

const canvasShapeTransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  rotateZ: z.number(),
  flipX: z.boolean().optional(),
  flipY: z.boolean().optional(),
});

const canvasShapeSchema = z.object({
  id: z.string(),
  libraryId: z.string(),
  category: z.enum([
    "basic",
    "lines",
    "polygons",
    "stars",
    "arrows",
    "flowchart",
    "organic",
    "frames",
  ]),
  label: z.string(),
  svgMarkup: z.string(),
  transform: canvasShapeTransformSchema,
  fill: z.string().optional(),
  stroke: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  zIndex: z.number().int().min(0).max(10),
  locked: z.boolean().optional(),
  createdAt: z.number(),
});

export const addShapeToolSchema = z.object({
  libraryId: z.string(),
});

export const updateShapeToolSchema = z.object({
  shapeId: z.string(),
  transform: canvasShapeTransformSchema.partial().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  zIndex: z.number().int().min(0).max(10).optional(),
});

export const removeShapeToolSchema = z.object({
  shapeId: z.string(),
});

export type CanvasToolName =
  | "updateCopy"
  | "refreshCopyVariants"
  | "updateBackground"
  | "updatePattern"
  | "updateFeatured"
  | "generateVisualBlock"
  | "modifyVisualBlock"
  | "selectVisualBlock"
  | "updateLayout"
  | "updateBrand"
  | "updateTypography"
  | "updateVisibility"
  | "updateSpacing"
  | "addShape"
  | "updateShape"
  | "removeShape";

export const CANVAS_TOOL_NAMES = [
  "updateCopy",
  "refreshCopyVariants",
  "updateBackground",
  "updatePattern",
  "updateFeatured",
  "generateVisualBlock",
  "modifyVisualBlock",
  "selectVisualBlock",
  "updateLayout",
  "updateBrand",
  "updateTypography",
  "updateVisibility",
  "updateSpacing",
  "addShape",
  "updateShape",
  "removeShape",
] as const satisfies readonly CanvasToolName[];

export const CANVAS_TOOL_PART_TYPES = CANVAS_TOOL_NAMES.map(
  (name) => `tool-${name}` as const,
);

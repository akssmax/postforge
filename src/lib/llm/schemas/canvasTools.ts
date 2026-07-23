import { z } from "zod";
import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { DesignDocument } from "@/lib/design/types";
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
  "Artboards to update: 'active' (default), 'all', or 1-based indices like [1,3]. Use 'all' for shared brand/background/pattern changes; use active or specific indices for copy/layout unique to one option.";

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

export const generateVisualBlockToolSchema = z.object({
  theme: z.string().optional(),
  brief: z.string().optional(),
  count: z.number().min(1).max(3).optional(),
  slotId: z.string().optional(),
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
  slotId: z.string().optional(),
});

export const selectVisualBlockToolSchema = z.object({
  blockId: z.string(),
  slotId: z.string().optional(),
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
  slotId: z.string().optional(),
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
  footerPad: spacingTokenSchema.optional(),
  footerBlockGap: spacingTokenSchema.optional(),
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
  | "updateSpacing";

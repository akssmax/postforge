import { z } from "zod";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";
import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { ProductPageId } from "@/lib/social-tool/presets";
import { normalizeProductPage } from "@/lib/social-tool/presets";

const catalogIds = POST_LAYOUTS.map((l) => l.id) as [string, ...string[]];

const productPageSchema = z
  .string()
  .transform((value) => normalizeProductPage(value) as ProductPageId);

export const textSlotRoleSchema = z.enum([
  "headline",
  "subheading",
  "body",
  "caption",
]);

export const slotDefinitionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["logo", "text", "featured"]),
  zone: z.enum(["textColumn", "featuredColumn", "stackMain", "footer"]),
  order: z.number().int().min(0),
  textRole: textSlotRoleSchema.optional(),
  flexGrow: z.number().positive().optional(),
});

export const dynamicLayoutSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["catalog", "generated"]).default("generated"),
  name: z.string().min(1),
  composition: z.enum(["stack", "split"]).default("stack"),
  stack: z.enum(["text-first", "featured-first"]).default("text-first"),
  textSide: z.enum(["left", "right"]).optional(),
  textZoneRatio: z.number().min(0.15).max(0.65).default(0.38),
  textZoneMax: z.number().positive().optional(),
  textColumnRatio: z.number().min(0.3).max(0.6).optional(),
  textColumnMax: z.number().positive().optional(),
  textVerticalAlign: z.enum(["start", "center"]).default("start"),
  logoPlacement: z.enum(["top", "footer"]).default("top"),
  logoAlign: z.enum(["left", "center", "right"]).default("left"),
  textAlign: z.enum(["left", "center", "right"]).default("left"),
  featuredRadius: z
    .enum(["top-left", "top-right", "bottom-left", "bottom-right", "none"])
    .default("none"),
  extrasPlacement: z.enum(["main", "footer", "hidden"]).default("main"),
  slots: z.array(slotDefinitionSchema).min(1),
});

export const textSlotContentSchema = z.object({
  slotId: z.string(),
  text: z.string(),
  role: textSlotRoleSchema,
});

export const featuredSlotContentSchema = z.object({
  slotId: z.string(),
  mode: z.enum(["genui", "image", "placeholder", "composed"]).default("genui"),
  productPage: productPageSchema.optional(),
  visible: z.boolean().default(true),
  transform: z
    .object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      rotateX: z.number(),
      rotateY: z.number(),
      rotateZ: z.number(),
      scale: z.number(),
      perspective: z.number(),
    })
    .optional(),
});

export const layoutRefSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("catalog"),
    id: z.enum(catalogIds),
  }),
  z.object({
    source: z.literal("generated"),
    layout: dynamicLayoutSchema,
  }),
]);

export const designPlanSchema = z.object({
  rationale: z.string(),
  layoutRef: layoutRefSchema,
  textSlots: z.array(textSlotContentSchema).min(1),
  featuredSlots: z.array(featuredSlotContentSchema).default([]),
  showContent: z.boolean().default(true),
  showBrand: z.boolean().default(true),
  showFeaturedImage: z.boolean().default(true),
  showPattern: z.boolean().default(false),
  showBackground: z.boolean().default(true),
  patternRef: z.string().optional(),
  backgroundPresetId: z.string().optional(),
  patternOpacity: z.number().min(0.05).max(1).optional(),
  patternScale: z.number().min(0.5).max(4).optional(),
  patternAnimated: z.boolean().optional(),
});

export type DesignPlan = z.infer<typeof designPlanSchema>;

export const updateDesignInputSchema = designPlanSchema;

export const DEFAULT_FEATURED_TRANSFORM_SCHEMA = DEFAULT_FEATURED_TRANSFORM;

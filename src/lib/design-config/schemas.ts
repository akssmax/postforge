import { z } from "zod";

export const slotNeedSchema = z.enum([
  "logo",
  "headline",
  "subheading",
  "body",
  "caption",
  "cta",
  "product_image",
  "badge",
  "offer_badge",
  "quote",
  "metric",
  "customer_logo",
]);

export const densitySchema = z.enum(["low", "medium", "high"]);
export const readingPatternSchema = z.enum(["F", "Z", "center"]);
export const densityClassSchema = z.enum(["visualFirst", "balanced", "copyHeavy"]);
export const visualWeightSchema = z.enum(["light", "medium", "heavy"]);

export const campaignRulesSchema = z.object({
  campaign: z.string().min(1),
  label: z.string().min(1),
  designSystem: z.string().min(1).default("default"),
  headline: z
    .object({
      maxWords: z.number().int().positive(),
      emphasis: z.string().optional(),
    })
    .optional(),
  subheading: z
    .object({
      optional: z.boolean().default(true),
      maxWords: z.number().int().positive().optional(),
    })
    .optional(),
  offerBadge: z.object({ required: z.boolean() }).optional(),
  badge: z.object({ required: z.boolean().optional(), optional: z.boolean().optional() }).optional(),
  cta: z
    .object({
      required: z.boolean().optional(),
      optional: z.boolean().optional(),
      type: z.string().optional(),
    })
    .optional(),
  featured: z.object({ required: z.boolean().optional() }).optional(),
  image: z.object({ optional: z.boolean().optional() }).optional(),
  customerLogo: z.object({ required: z.boolean() }).optional(),
  quote: z.object({ required: z.boolean() }).optional(),
  metric: z.object({ required: z.boolean() }).optional(),
  copy: z
    .object({
      density: densitySchema,
      maxTotalWords: z.number().int().positive().optional(),
    })
    .optional(),
  spacing: z.enum(["compact", "relaxed", "default"]).default("default"),
  patterns: z.array(z.string()).default([]),
  requiredSlots: z.array(slotNeedSchema).default([]),
  bannedSlots: z.array(slotNeedSchema).default([]),
  defaultPattern: z.string().optional(),
  defaultRecipes: z.array(z.string()).default([]),
});

export type CampaignRules = z.infer<typeof campaignRulesSchema>;

export const patternConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  flow: z.array(z.string()).default([]),
  recipes: z.array(z.string()).min(1),
  campaigns: z.array(z.string()).default([]),
});

export type PatternConfig = z.infer<typeof patternConfigSchema>;

export const recipeConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  pattern: z.string().min(1),
  slots: z.array(slotNeedSchema).min(1),
  attention: z.string().min(1),
  proof: z.string().min(1),
  density: densitySchema,
  readingPattern: readingPatternSchema.default("F"),
  campaigns: z.array(z.string()).default([]),
  preferredLayouts: z.array(z.string()).default([]),
});

export type RecipeConfig = z.infer<typeof recipeConfigSchema>;

export const layoutMetaConfigSchema = z.object({
  id: z.string().min(1),
  platforms: z.array(z.string()).default(["all"]),
  campaigns: z.array(z.string()).default([]),
  recipes: z.array(z.string()).default([]),
  visualPriority: z.enum(["high", "medium", "low"]).default("medium"),
  contentDensity: densitySchema,
  readingPattern: readingPatternSchema,
  visualWeight: visualWeightSchema,
  densityClass: densityClassSchema,
  supports: z.array(slotNeedSchema).default([]),
  score: z.record(z.string(), z.number()).default({}),
});

export type LayoutMetaConfig = z.infer<typeof layoutMetaConfigSchema>;

export const designSystemConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  campaigns: z.array(z.string()).default([]),
  layouts: z.array(z.string()).min(1),
  spacingPreset: z.string().default("default"),
  typographyPreset: z.string().default("default"),
  badgeStyles: z.array(z.string()).default(["default"]),
  ctaStyles: z.array(z.string()).default(["default"]),
  patterns: z.array(z.string()).default(["grid", "dots", "topography"]),
  illustrationStyles: z.array(z.string()).default(["default"]),
  decorationLevels: z.array(z.string()).default(["minimal", "offer"]),
  colorMoods: z.array(z.string()).default(["neutral", "enterprise", "cool"]),
});

export type DesignSystemConfig = z.infer<typeof designSystemConfigSchema>;

export const formatOverlaySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  platforms: z.array(z.string()).default([]),
  formats: z.array(z.enum(["ad", "post"])).default([]),
  copyBudget: z.object({
    headlineWords: z.number().int().positive(),
    subheadingWords: z.number().int().positive(),
    ctaWords: z.number().int().positive(),
    maxTotalWords: z.number().int().positive(),
  }),
  slotLimits: z.record(z.string(), z.number()).default({}),
  layoutPolicy: z.enum(["visual_first", "copy_first", "auto_by_density"]),
  featuredPolicy: z.enum(["library", "placeholder", "genui", "image", "hidden"]),
  patternPolicy: z.enum(["layout_based", "always", "never"]),
  backgroundPolicy: z.enum(["catalog_pick", "intent_matched"]),
  visualBalance: z.object({
    minFeaturedShare: z.number(),
    maxCopyWordShare: z.number(),
    passThreshold: z.number(),
  }),
  requiredSlots: z.array(z.string()).default(["headline"]),
  bannedSlots: z.array(z.string()).default([]),
  maxCopyRetries: z.number().int().nonnegative().default(1),
});

export type FormatOverlay = z.infer<typeof formatOverlaySchema>;

export const visualsStrategySchema = z.object({
  featured: z.record(z.string(), z.string()).default({}),
  pattern: z.record(z.string(), z.string()).default({}),
  decoration: z.record(z.string(), z.string()).default({}),
  color: z.record(z.string(), z.string()).default({}),
});

export type VisualsStrategyConfig = z.infer<typeof visualsStrategySchema>;

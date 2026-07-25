import { z } from "zod";
import type { PlatformId } from "@/lib/social-tool/presets";

export const campaignTypeSchema = z.enum([
  "announcement",
  "advertisement",
  "thought_leadership",
  "event",
  "product_launch",
]);

export const campaignGoalSchema = z.enum([
  "awareness",
  "engagement",
  "book_demo",
  "signup",
  "download",
]);

export const campaignToneSchema = z.enum([
  "enterprise",
  "friendly",
  "bold",
  "minimal",
]);

export const contentDensitySchema = z.enum(["low", "medium", "high"]);

export const visualPrioritySchema = z.enum([
  "copy",
  "product",
  "brand",
  "balanced",
]);

export const proofStrategySchema = z.enum([
  "product_ui",
  "stats",
  "social_proof",
  "none",
]);

export const featuredVisualKindSchema = z.enum(["ui", "illustration", "3d"]);

export const campaignIntentSchema = z.object({
  platform: z.string(),
  campaignType: campaignTypeSchema,
  primaryIntent: z.string().min(1),
  secondaryIntent: z.string().optional(),
  audience: z.string().min(1),
  goal: campaignGoalSchema,
  tone: campaignToneSchema,
  contentDensity: contentDensitySchema,
  visualPriority: visualPrioritySchema,
  proofStrategy: proofStrategySchema.default("none"),
  /** Whether the featured slot should use a HeroUI UI card or a library illustration. */
  featuredVisualKind: featuredVisualKindSchema,
  ctaRequired: z.boolean().default(false),
  keywords: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  format: z.enum(["ad", "post"]).optional(),
});

export type CampaignIntent = z.infer<typeof campaignIntentSchema>;

export type CampaignIntentInput = Omit<CampaignIntent, "platform"> & {
  platform: PlatformId;
};

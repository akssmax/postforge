import { z } from "zod";
import type { PlatformId } from "@/lib/social-tool/presets";
import {
  campaignGoalSchema,
  campaignIntentSchema,
  campaignToneSchema,
  contentDensitySchema,
  featuredVisualKindSchema,
  type CampaignIntent,
} from "@/lib/llm/schemas/campaignIntent";

export const v2CampaignTypeSchema = z.enum([
  "promotion",
  "announcement",
  "product_launch",
  "feature_release",
  "event",
  "webinar",
  "hiring",
  "case_study",
  "thought_leadership",
  "advertisement",
]);

export const communicationPatternSchema = z.enum([
  "offer",
  "problem_solution",
  "social_proof",
  "statistic",
  "comparison",
  "announcement_hero",
  "narrative",
]);

export const funnelStageSchema = z.enum([
  "awareness",
  "consideration",
  "conversion",
]);

export const audienceAwarenessSchema = z.enum([
  "unaware",
  "problem_aware",
  "solution_aware",
  "product_aware",
]);

export const headlineStyleSchema = z.enum([
  "bold",
  "benefit",
  "question",
  "stat",
  "narrative",
]);

export const readingPatternSchema = z.enum(["F", "Z", "center"]);

export const visualFocusSchema = z.enum([
  "product_ui",
  "product_photo",
  "illustration",
  "people",
  "brand",
  "metric",
]);

export const visualProofSchema = z.enum([
  "screenshot",
  "badge",
  "logos",
  "stat",
  "quote",
  "none",
]);

export const decorationLevelSchema = z.enum([
  "minimal",
  "offer",
  "mesh",
  "brand",
]);

export const colorMoodSchema = z.enum([
  "warm",
  "cool",
  "neutral",
  "bold",
  "enterprise",
]);

export const ctaTypeSchema = z.enum([
  "book_demo",
  "signup",
  "learn_more",
  "download",
  "register",
  "apply",
  "shop",
  "none",
]);

export const campaignPlanSchema = z.object({
  campaign: z.object({
    type: v2CampaignTypeSchema,
    objective: campaignGoalSchema,
    funnel: funnelStageSchema,
  }),
  audience: z.object({
    role: z.string().min(1),
    awareness: audienceAwarenessSchema,
  }),
  communication: z.object({
    pattern: communicationPatternSchema,
    headlineStyle: headlineStyleSchema,
    contentDensity: contentDensitySchema,
    readingPattern: readingPatternSchema,
    recipeId: z.string().optional(),
  }),
  visual: z.object({
    focus: visualFocusSchema,
    proof: visualProofSchema,
    featuredKind: featuredVisualKindSchema,
    decorationLevel: decorationLevelSchema,
    colorMood: colorMoodSchema,
  }),
  cta: z.object({
    type: ctaTypeSchema,
    required: z.boolean(),
  }),
  brand: z.object({
    tone: campaignToneSchema,
  }),
  platform: z.string(),
  format: z.enum(["ad", "post"]).optional(),
  keywords: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  primaryMessage: z.string().min(1),
});

export type CampaignPlan = z.infer<typeof campaignPlanSchema>;
export type V2CampaignType = z.infer<typeof v2CampaignTypeSchema>;
export type CommunicationPattern = z.infer<typeof communicationPatternSchema>;

/** Map v2 campaign types onto legacy CampaignIntent.campaignType for adapters. */
const LEGACY_CAMPAIGN_TYPE: Record<
  V2CampaignType,
  CampaignIntent["campaignType"]
> = {
  promotion: "advertisement",
  announcement: "announcement",
  product_launch: "product_launch",
  feature_release: "product_launch",
  event: "event",
  webinar: "event",
  hiring: "announcement",
  case_study: "thought_leadership",
  thought_leadership: "thought_leadership",
  advertisement: "advertisement",
};

const LEGACY_TO_V2: Record<CampaignIntent["campaignType"], V2CampaignType> = {
  announcement: "announcement",
  advertisement: "advertisement",
  thought_leadership: "thought_leadership",
  event: "event",
  product_launch: "product_launch",
};

function proofFromIntent(
  intent: CampaignIntent,
): CampaignPlan["visual"]["proof"] {
  if (intent.proofStrategy === "product_ui") return "screenshot";
  if (intent.proofStrategy === "stats") return "stat";
  if (intent.proofStrategy === "social_proof") return "logos";
  return "none";
}

function focusFromIntent(
  intent: CampaignIntent,
): CampaignPlan["visual"]["focus"] {
  if (intent.featuredVisualKind === "illustration") return "illustration";
  if (intent.visualPriority === "product") return "product_ui";
  if (intent.visualPriority === "brand") return "brand";
  if (intent.proofStrategy === "stats") return "metric";
  return "product_ui";
}

function patternFromIntent(
  intent: CampaignIntent,
): CommunicationPattern {
  const primary = intent.primaryIntent.toLowerCase();
  if (primary.includes("competitive") || primary.includes("replace") || primary.includes("vs")) {
    return "comparison";
  }
  if (intent.proofStrategy === "stats") return "statistic";
  if (intent.proofStrategy === "social_proof") return "social_proof";
  if (intent.campaignType === "advertisement") return "offer";
  if (intent.campaignType === "thought_leadership") return "narrative";
  if (intent.campaignType === "announcement" || intent.campaignType === "product_launch") {
    return "announcement_hero";
  }
  return "problem_solution";
}

function ctaTypeFromGoal(goal: CampaignIntent["goal"]): CampaignPlan["cta"]["type"] {
  if (goal === "book_demo") return "book_demo";
  if (goal === "signup") return "signup";
  if (goal === "download") return "download";
  if (goal === "engagement") return "learn_more";
  return intentCtaOrNone(goal);
}

function intentCtaOrNone(goal: CampaignIntent["goal"]): CampaignPlan["cta"]["type"] {
  if (goal === "awareness") return "learn_more";
  return "none";
}

/** Bridge: CampaignPlan → legacy CampaignIntent for leftover consumers. */
export function campaignPlanToIntent(plan: CampaignPlan): CampaignIntent {
  const proofStrategy =
    plan.visual.proof === "screenshot"
      ? "product_ui"
      : plan.visual.proof === "stat"
        ? "stats"
        : plan.visual.proof === "logos" || plan.visual.proof === "quote"
          ? "social_proof"
          : "none";

  const visualPriority =
    plan.visual.focus === "product_ui" || plan.visual.focus === "product_photo"
      ? "product"
      : plan.visual.focus === "brand"
        ? "brand"
        : plan.communication.contentDensity === "high"
          ? "copy"
          : "balanced";

  return campaignIntentSchema.parse({
    platform: plan.platform,
    campaignType: LEGACY_CAMPAIGN_TYPE[plan.campaign.type],
    primaryIntent: plan.primaryMessage,
    audience: plan.audience.role,
    goal: plan.campaign.objective,
    tone: plan.brand.tone,
    contentDensity: plan.communication.contentDensity,
    visualPriority,
    proofStrategy,
    featuredVisualKind: plan.visual.featuredKind,
    ctaRequired: plan.cta.required,
    keywords: plan.keywords,
    themes: plan.themes,
    format: plan.format,
  });
}

/** Bridge: legacy CampaignIntent → CampaignPlan. */
export function intentToCampaignPlan(intent: CampaignIntent): CampaignPlan {
  return campaignPlanSchema.parse({
    campaign: {
      type: LEGACY_TO_V2[intent.campaignType],
      objective: intent.goal,
      funnel:
        intent.goal === "book_demo" || intent.goal === "signup" || intent.goal === "download"
          ? "conversion"
          : intent.goal === "engagement"
            ? "consideration"
            : "awareness",
    },
    audience: {
      role: intent.audience,
      awareness:
        intent.primaryIntent.toLowerCase().includes("competitive")
          ? "solution_aware"
          : "problem_aware",
    },
    communication: {
      pattern: patternFromIntent(intent),
      headlineStyle: intent.tone === "bold" ? "bold" : "benefit",
      contentDensity: intent.contentDensity,
      readingPattern:
        intent.contentDensity === "low"
          ? "center"
          : intent.visualPriority === "product"
            ? "Z"
            : "F",
    },
    visual: {
      focus: focusFromIntent(intent),
      proof: proofFromIntent(intent),
      featuredKind: intent.featuredVisualKind,
      decorationLevel:
        intent.campaignType === "advertisement" ? "offer" : "minimal",
      colorMood: intent.tone === "enterprise" ? "enterprise" : "neutral",
    },
    cta: {
      type: intent.ctaRequired ? ctaTypeFromGoal(intent.goal) : "none",
      required: intent.ctaRequired,
    },
    brand: { tone: intent.tone },
    platform: intent.platform,
    format: intent.format,
    keywords: intent.keywords,
    themes: intent.themes,
    primaryMessage: intent.primaryIntent,
  });
}

export type CampaignPlanInput = Omit<CampaignPlan, "platform"> & {
  platform: PlatformId;
};

import {
  campaignPlanSchema,
  type CampaignPlan,
  type CommunicationPattern,
  type V2CampaignType,
} from "@/lib/llm/schemas/campaignPlan";
import { detectFormatFromBrief, extractThemesFromBrief } from "@/lib/llm/rules";
import { inferFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { PlatformId } from "@/lib/social-tool/presets";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "with", "our", "your",
  "we", "is", "are", "this", "that", "it", "at", "from", "by", "as", "be", "will", "new",
]);

function normalizeBrief(brief: string): string {
  return brief.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function inferCampaignType(brief: string): V2CampaignType {
  const lower = normalizeBrief(brief);
  if (lower.includes("case study") || lower.includes("customer story") || lower.includes("testimonial")) {
    return "case_study";
  }
  if (lower.includes("hiring") || lower.includes("we're hiring") || lower.includes("job opening")) {
    return "hiring";
  }
  if (lower.includes("webinar")) return "webinar";
  if (lower.includes("event") || lower.includes("conference")) return "event";
  if (lower.includes("feature") && (lower.includes("release") || lower.includes("shipped") || lower.includes("new feature"))) {
    return "feature_release";
  }
  if (lower.includes("launch") || lower.includes("introducing") || lower.includes("new product")) {
    return "product_launch";
  }
  if (
    lower.includes("% off") ||
    lower.includes("discount") ||
    lower.includes("promo") ||
    lower.includes(" sale") ||
    lower.includes("offer")
  ) {
    return "promotion";
  }
  if (lower.includes("ad ") || lower.includes("advert") || lower.includes("sponsored")) {
    return "advertisement";
  }
  if (
    lower.includes("thought") ||
    lower.includes("insight") ||
    lower.includes("opinion") ||
    lower.includes("quote") ||
    (/\d+%/.test(lower) && (lower.includes("team") || lower.includes("faster") || lower.includes("share")))
  ) {
    return "thought_leadership";
  }
  return "announcement";
}

function inferPattern(brief: string, campaignType: V2CampaignType): CommunicationPattern {
  const lower = normalizeBrief(brief);

  // Offers / promos beat generic "%" metric detection
  if (
    campaignType === "promotion" ||
    lower.includes("% off") ||
    lower.includes("discount") ||
    lower.includes("promo") ||
    (lower.includes("sale") && lower.includes("off"))
  ) {
    return "offer";
  }

  if (
    lower.includes("replacing") ||
    lower.includes("replace") ||
    lower.includes("instead of") ||
    lower.includes("vs ") ||
    lower.includes("versus") ||
    lower.includes("vs.")
  ) {
    return "comparison";
  }

  if (campaignType === "case_study") {
    return lower.includes("trusted by") || lower.includes("logo")
      ? "social_proof"
      : lower.includes("stat") || lower.includes("metric") || /\d+%/.test(lower)
        ? "statistic"
        : "social_proof";
  }

  if (
    (lower.includes("stat") || lower.includes("metric") || /\d+%/.test(lower)) &&
    campaignType !== "advertisement"
  ) {
    return "statistic";
  }

  if (lower.includes("customer") || lower.includes("trusted by") || lower.includes("testimonial")) {
    return "social_proof";
  }
  if (lower.includes("problem") || lower.includes("pain") || lower.includes("solution")) {
    return "problem_solution";
  }
  if (campaignType === "advertisement") return "offer";
  if (campaignType === "thought_leadership") return "narrative";
  if (
    campaignType === "announcement" ||
    campaignType === "event" ||
    campaignType === "webinar" ||
    campaignType === "hiring"
  ) {
    return "announcement_hero";
  }
  if (campaignType === "product_launch" || campaignType === "feature_release") {
    return "problem_solution";
  }
  return "announcement_hero";
}

function inferRecipeId(
  pattern: CommunicationPattern,
  campaignType: V2CampaignType,
  brief: string,
): string | undefined {
  const lower = normalizeBrief(brief);
  if (pattern === "offer") {
    return lower.includes("discount") || lower.includes("% off") ? "discount_focus" : "offer_hero";
  }
  if (pattern === "comparison") return "comparison_switch";
  if (pattern === "problem_solution") return "problem_solution_flow";
  if (pattern === "social_proof") return "social_proof_strip";
  if (pattern === "statistic") return "statistic_hero";
  if (pattern === "narrative") return "narrative_statement";
  if (pattern === "announcement_hero") {
    if (campaignType === "event" || campaignType === "webinar") return "event_footer_recipe";
    if (campaignType === "hiring") return "announcement_center";
    if (lower.includes("product") || lower.includes("screenshot")) return "announcement_hero_layout";
    return "announcement_center";
  }
  return undefined;
}

function inferAudienceRole(brief: string): string {
  const lower = normalizeBrief(brief);
  if (lower.includes("enterprise") || lower.includes("sales team") || lower.includes("b2b")) {
    return "enterprise_sales";
  }
  if (lower.includes("developer") || lower.includes("engineer")) return "developers";
  if (lower.includes("marketer") || lower.includes("marketing")) return "marketers";
  if (lower.includes("founder") || lower.includes("startup")) return "founders";
  return "general_business";
}

function inferGoal(brief: string): CampaignPlan["campaign"]["objective"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("demo") || lower.includes("book a call") || lower.includes("schedule")) {
    return "book_demo";
  }
  if (lower.includes("sign up") || lower.includes("signup") || lower.includes("register")) {
    return "signup";
  }
  if (lower.includes("download") || lower.includes("whitepaper") || lower.includes("ebook")) {
    return "download";
  }
  if (lower.includes("engage") || lower.includes("comment") || lower.includes("share")) {
    return "engagement";
  }
  return "awareness";
}

function inferTone(brief: string): CampaignPlan["brand"]["tone"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("minimal") || lower.includes("clean") || lower.includes("simple")) {
    return "minimal";
  }
  if (lower.includes("bold") || lower.includes("disrupt") || lower.includes("game changer")) {
    return "bold";
  }
  if (lower.includes("friendly") || lower.includes("casual") || lower.includes("fun")) {
    return "friendly";
  }
  return "enterprise";
}

function inferDensity(brief: string): CampaignPlan["communication"]["contentDensity"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("text only") || lower.includes("headline only") || lower.includes("minimal copy")) {
    return "low";
  }
  if (lower.includes("detailed") || lower.includes("long copy") || lower.includes("bullet")) {
    return "high";
  }
  return "medium";
}

function inferCtaType(
  goal: CampaignPlan["campaign"]["objective"],
  campaignType: V2CampaignType,
): CampaignPlan["cta"]["type"] {
  if (campaignType === "hiring") return "apply";
  if (campaignType === "event" || campaignType === "webinar") return "register";
  if (goal === "book_demo") return "book_demo";
  if (goal === "signup") return "signup";
  if (goal === "download") return "download";
  if (campaignType === "case_study") return "learn_more";
  if (campaignType === "promotion") return "shop";
  if (goal === "awareness") return "learn_more";
  return "none";
}

/** Offline / fallback Creative Planner — brief → CampaignPlan. */
export function campaignPlanFromBrief(
  brief: string,
  platformId: PlatformId,
  themeAngle?: string,
): CampaignPlan {
  const format = detectFormatFromBrief(brief);
  let campaignType = inferCampaignType(brief);
  if (format === "ad") campaignType = "advertisement";

  const goal = inferGoal(brief);
  const pattern = inferPattern(brief, campaignType);
  const recipeId = inferRecipeId(pattern, campaignType, brief);
  const tone = inferTone(brief);
  const density = inferDensity(brief);
  const ctaType = inferCtaType(goal, campaignType);
  const ctaRequired =
    format === "ad" ||
    goal === "book_demo" ||
    goal === "signup" ||
    goal === "download" ||
    campaignType === "promotion" ||
    campaignType === "advertisement" ||
    campaignType === "event" ||
    campaignType === "webinar" ||
    campaignType === "hiring" ||
    normalizeBrief(brief).includes("cta");

  const featuredKind = inferFeaturedVisualKind(brief, {
    campaignType:
      campaignType === "promotion"
        ? "advertisement"
        : campaignType === "feature_release"
          ? "product_launch"
          : campaignType === "webinar"
            ? "event"
            : campaignType === "hiring" || campaignType === "case_study"
              ? "announcement"
              : campaignType,
    primaryIntent: pattern,
    proofStrategy:
      pattern === "statistic"
        ? "stats"
        : pattern === "social_proof"
          ? "social_proof"
          : pattern === "comparison" || pattern === "problem_solution"
            ? "product_ui"
            : "none",
  });

  const primaryMessage = themeAngle
    ? `${campaignType.replace(/_/g, " ")} — ${themeAngle}`
    : `${campaignType.replace(/_/g, " ")}: ${brief.slice(0, 120)}`;

  return campaignPlanSchema.parse({
    campaign: {
      type: campaignType,
      objective: goal,
      funnel:
        goal === "book_demo" || goal === "signup" || goal === "download"
          ? "conversion"
          : goal === "engagement"
            ? "consideration"
            : "awareness",
    },
    audience: {
      role: inferAudienceRole(brief),
      awareness:
        pattern === "comparison" || pattern === "offer"
          ? "solution_aware"
          : pattern === "problem_solution"
            ? "problem_aware"
            : "product_aware",
    },
    communication: {
      pattern,
      headlineStyle: tone === "bold" ? "bold" : pattern === "statistic" ? "stat" : "benefit",
      contentDensity: density,
      readingPattern:
        pattern === "comparison" || pattern === "problem_solution"
          ? "Z"
          : pattern === "announcement_hero" || pattern === "statistic"
            ? "center"
            : "F",
      recipeId,
    },
    visual: {
      focus:
        featuredKind === "illustration"
          ? "illustration"
          : featuredKind === "3d"
            ? "brand"
          : pattern === "statistic"
            ? "metric"
            : "product_ui",
      proof:
        pattern === "statistic"
          ? "stat"
          : pattern === "social_proof"
            ? "logos"
            : pattern === "offer"
              ? "badge"
              : featuredKind === "ui"
                ? "screenshot"
                : "none",
      featuredKind,
      decorationLevel:
        campaignType === "promotion" || campaignType === "advertisement" ? "offer" : "minimal",
      colorMood:
        tone === "enterprise"
          ? "enterprise"
          : campaignType === "promotion"
            ? "warm"
            : "neutral",
    },
    cta: {
      type: ctaRequired ? ctaType : "none",
      required: ctaRequired,
    },
    brand: { tone },
    platform: platformId,
    format,
    keywords: tokenize(brief),
    themes: extractThemesFromBrief(brief),
    primaryMessage,
  });
}

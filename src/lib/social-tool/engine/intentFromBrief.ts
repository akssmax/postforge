import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import { detectFormatFromBrief, extractThemesFromBrief } from "@/lib/llm/rules";
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

function inferCampaignType(brief: string): CampaignIntent["campaignType"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("webinar") || lower.includes("event") || lower.includes("conference")) {
    return "event";
  }
  if (lower.includes("launch") || lower.includes("introducing") || lower.includes("new product")) {
    return "product_launch";
  }
  if (lower.includes("ad ") || lower.includes("advert") || lower.includes("promote")) {
    return "advertisement";
  }
  if (
    lower.includes("thought") ||
    lower.includes("insight") ||
    lower.includes("opinion") ||
    lower.includes("quote")
  ) {
    return "thought_leadership";
  }
  return "announcement";
}

function inferPrimaryIntent(brief: string, campaignType: CampaignIntent["campaignType"]): string {
  const lower = normalizeBrief(brief);
  if (lower.includes("replace") || lower.includes("instead of") || lower.includes("vs ")) {
    return "competitive_replacement";
  }
  if (campaignType === "product_launch") return "product_launch";
  if (campaignType === "event") return "event_promotion";
  if (campaignType === "thought_leadership") return "thought_leadership";
  if (campaignType === "advertisement") return "advertisement";
  return "announcement";
}

function inferAudience(brief: string): string {
  const lower = normalizeBrief(brief);
  if (lower.includes("enterprise") || lower.includes("sales team") || lower.includes("b2b")) {
    return "enterprise_sales";
  }
  if (lower.includes("developer") || lower.includes("engineer")) return "developers";
  if (lower.includes("marketer") || lower.includes("marketing")) return "marketers";
  if (lower.includes("founder") || lower.includes("startup")) return "founders";
  return "general_business";
}

function inferGoal(brief: string): CampaignIntent["goal"] {
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

function inferTone(brief: string): CampaignIntent["tone"] {
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

function inferContentDensity(brief: string): CampaignIntent["contentDensity"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("text only") || lower.includes("quote") || lower.includes("headline only")) {
    return "low";
  }
  if (lower.includes("detailed") || lower.includes("long copy") || lower.includes("bullet")) {
    return "high";
  }
  return "medium";
}

function inferVisualPriority(brief: string): CampaignIntent["visualPriority"] {
  const lower = normalizeBrief(brief);
  if (
    lower.includes("screenshot") ||
    lower.includes("product") ||
    lower.includes("ui") ||
    lower.includes("demo")
  ) {
    return "product";
  }
  if (lower.includes("brand") || lower.includes("logo") || lower.includes("launch")) {
    return "brand";
  }
  if (lower.includes("headline") || lower.includes("copy") || lower.includes("thought")) {
    return "copy";
  }
  return "balanced";
}

function inferProofStrategy(brief: string): CampaignIntent["proofStrategy"] {
  const lower = normalizeBrief(brief);
  if (lower.includes("stat") || lower.includes("metric") || lower.includes("%")) return "stats";
  if (lower.includes("customer") || lower.includes("testimonial") || lower.includes("review")) {
    return "social_proof";
  }
  if (
    lower.includes("screenshot") ||
    lower.includes("product") ||
    lower.includes("ui") ||
    lower.includes("app")
  ) {
    return "product_ui";
  }
  return "none";
}

export function intentFromBrief(brief: string, platformId: PlatformId): CampaignIntent {
  const campaignType = inferCampaignType(brief);
  const format = detectFormatFromBrief(brief);
  return {
    platform: platformId,
    campaignType: format === "ad" ? "advertisement" : campaignType,
    primaryIntent: inferPrimaryIntent(brief, campaignType),
    audience: inferAudience(brief),
    goal: inferGoal(brief),
    tone: inferTone(brief),
    contentDensity: inferContentDensity(brief),
    visualPriority: inferVisualPriority(brief),
    proofStrategy: inferProofStrategy(brief),
    ctaRequired:
      format === "ad" ||
      inferGoal(brief) === "book_demo" ||
      inferGoal(brief) === "signup" ||
      normalizeBrief(brief).includes("cta"),
    keywords: tokenize(brief),
    themes: extractThemesFromBrief(brief),
    format,
  };
}

import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";

export type FeaturedVisualKind = "ui" | "illustration";

const UI_SIGNALS =
  /\b(product|saas|ui|ux|app|dashboard|crm|demo|feature|platform|software|metric|metrics|stat|stats|roi|kpi|pricing|automation|pipeline|integration|api|widget|screenshot|interface|workflow|book demo|signup|trial)\b/i;

const ILLUSTRATION_SIGNALS =
  /\b(illustration|story|narrative|brand story|culture|team|people|celebration|celebrate|festival|diwali|holiday|food|craving|emotion|emotional|friendly|consumer|lifestyle|mascot|scene|creative|awareness|delight|playful|hero image|storytelling|community|values|mission|vision)\b/i;

export function inferFeaturedVisualKind(
  brief: string,
  intent?: Partial<CampaignIntent>,
): FeaturedVisualKind {
  if (intent?.featuredVisualKind) return intent.featuredVisualKind;

  const haystack = [
    brief,
    intent?.primaryIntent,
    intent?.audience,
    ...(intent?.keywords ?? []),
    ...(intent?.themes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let uiScore = 0;
  let illustrationScore = 0;

  if (UI_SIGNALS.test(haystack)) uiScore += 3;
  if (ILLUSTRATION_SIGNALS.test(haystack)) illustrationScore += 3;

  if (intent?.proofStrategy === "product_ui" || intent?.proofStrategy === "stats") {
    uiScore += 4;
  }
  if (intent?.proofStrategy === "social_proof") illustrationScore += 2;

  if (intent?.visualPriority === "product") uiScore += 4;
  if (intent?.visualPriority === "brand" || intent?.visualPriority === "copy") {
    illustrationScore += 3;
  }

  if (intent?.goal === "book_demo" || intent?.goal === "signup" || intent?.goal === "download") {
    uiScore += 2;
  }
  if (intent?.goal === "awareness" || intent?.goal === "engagement") {
    illustrationScore += 2;
  }

  if (
    intent?.campaignType === "event" ||
    intent?.campaignType === "thought_leadership" ||
    intent?.tone === "friendly"
  ) {
    illustrationScore += 1;
  }
  if (intent?.campaignType === "product_launch") uiScore += 2;

  return illustrationScore > uiScore ? "illustration" : "ui";
}

export function featuredVisualKindLabel(kind: FeaturedVisualKind): string {
  return kind === "ui" ? "UI block" : "Illustration";
}

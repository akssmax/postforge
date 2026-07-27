import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";

export type FeaturedVisualKind = "ui" | "illustration" | "3d";

const FEATURED_KINDS = new Set<FeaturedVisualKind>(["ui", "illustration", "3d"]);

export function isFeaturedVisualKind(
  kind: string | undefined | null,
): kind is FeaturedVisualKind {
  return Boolean(kind && FEATURED_KINDS.has(kind as FeaturedVisualKind));
}

export type FeaturedVisualKindContext = Partial<CampaignIntent> & {
  artifactCategory?: ArtifactCategoryId | null;
};

const UI_SIGNALS =
  /\b(product launch|saas|ui|ux|app|dashboard|crm|demo|feature release|platform|software|metric|metrics|stat|stats|roi|kpi|pricing|automation|pipeline|integration|api|widget|screenshot|interface|workflow|book demo|signup|trial)\b/i;

const ILLUSTRATION_SIGNALS =
  /\b(illustration|story|narrative|brand story|culture|team|people|celebration|celebrate|festival|diwali|holiday|food|craving|emotion|emotional|friendly|consumer|lifestyle|mascot|scene|creative|awareness|delight|playful|hero image|storytelling|community|values|mission|vision|brand refresh|brand evolution|brand guidelines|logo reveal|rebrand|identity|palette|announcement|introducing)\b/i;

const BRAND_CATEGORY_SIGNALS =
  /\b(brand|logo|palette|guidelines|refresh|rebrand|evolution|identity|mark|announcement graphic)\b/i;

const THREED_SIGNALS =
  /\b(3d|three[- ]?d|thiings|clay icon|isometric icon|3d icon|3d element|3d asset)\b/i;

export function inferFeaturedVisualKind(
  brief: string,
  intent?: FeaturedVisualKindContext,
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

  if (intent?.artifactCategory === "branding") return "illustration";
  if (
    intent?.artifactCategory === "events" ||
    intent?.artifactCategory === "personal" ||
    intent?.artifactCategory === "editorial"
  ) {
    if (!UI_SIGNALS.test(haystack)) return "illustration";
  }

  let uiScore = 0;
  let illustrationScore = 1;
  let threeDScore = 0;

  if (UI_SIGNALS.test(haystack)) uiScore += 3;
  if (ILLUSTRATION_SIGNALS.test(haystack)) illustrationScore += 3;
  if (BRAND_CATEGORY_SIGNALS.test(haystack)) illustrationScore += 4;
  if (THREED_SIGNALS.test(haystack)) threeDScore += 5;

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
    intent?.campaignType === "announcement" ||
    intent?.tone === "friendly"
  ) {
    illustrationScore += 2;
  }
  if (intent?.campaignType === "product_launch") uiScore += 2;

  if (threeDScore > uiScore && threeDScore > illustrationScore) return "3d";
  return illustrationScore >= uiScore ? "illustration" : "ui";
}

export function featuredVisualKindLabel(kind: FeaturedVisualKind): string {
  switch (kind) {
    case "ui":
      return "UI block";
    case "illustration":
      return "Illustration";
    case "3d":
      return "3D element";
  }
}

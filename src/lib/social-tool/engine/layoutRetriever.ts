import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import {
  getLayoutRetrievalMeta,
  layoutSupportsIntent,
  type LayoutRetrievalMeta,
} from "@/lib/social-tool/engine/layoutRetrievalMeta";
import {
  getApprovedShuffleLayouts,
  loadLayoutReviews,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";
import { getPostLayout, POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

export type LayoutCandidate = {
  layout: PostLayout;
  meta: LayoutRetrievalMeta;
  score: number;
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "with", "our", "your",
  "we", "is", "are", "this", "that", "it", "at", "from", "by", "as", "be", "will", "new",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreLayoutForIntent(
  layout: PostLayout,
  meta: LayoutRetrievalMeta,
  intent: CampaignIntent,
  keywords: string[],
  rulesProfile?: DesignRulesProfile,
  brief?: string,
): number {
  let score = 0;

  if (layoutSupportsIntent(meta, intent.primaryIntent)) score += 12;
  if (meta.contentDensity === intent.contentDensity) score += 6;

  if (intent.visualPriority === "product" && meta.visualWeight === "heavy") score += 5;
  if (intent.visualPriority === "copy" && meta.visualWeight === "light") score += 5;
  if (intent.visualPriority === "brand" && layout.tags.includes("brand")) score += 4;

  if (intent.ctaRequired && meta.supportedSlots.includes("cta")) score += 4;
  if (intent.proofStrategy === "product_ui" && meta.supportedSlots.includes("product_image")) {
    score += 5;
  }

  if (layout.bestFor !== "all" && layout.bestFor.includes(intent.platform as PlatformId)) {
    score += 4;
  }

  if (rulesProfile) {
    score += scoreDensityRouting(meta, rulesProfile, brief);
  }

  const haystack = [
    ...layout.promptHints,
    ...layout.tags,
    layout.name,
    layout.summary,
    intent.primaryIntent,
    intent.audience,
    ...intent.keywords,
  ]
    .join(" ")
    .toLowerCase();

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 2;
  }

  for (const keyword of intent.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 3;
  }

  return score;
}

function scoreDensityRouting(
  meta: LayoutRetrievalMeta,
  rulesProfile: DesignRulesProfile,
  brief?: string,
): number {
  let delta = 0;
  const lower = (brief ?? "").toLowerCase();
  const longForm =
    lower.includes("long-form") ||
    lower.includes("long form") ||
    lower.includes("detailed copy");

  const policy = rulesProfile.layoutPolicy;
  const lowBudget = rulesProfile.copyBudget.maxTotalWords <= 40;

  if (policy === "visual_first" || (policy === "auto_by_density" && lowBudget)) {
    if (meta.densityClass === "visualFirst") delta += 10;
    if (meta.densityClass === "balanced") delta += 4;
    if (meta.densityClass === "copyHeavy" && !longForm) delta -= 8;
  }

  if (policy === "copy_first") {
    if (meta.densityClass === "copyHeavy") delta += 6;
    if (meta.densityClass === "visualFirst") delta -= 4;
  }

  const intentLower = lower;
  if (intentLower.includes("salesforce") || intentLower.includes("replacement")) {
    if (meta.densityClass === "visualFirst" || meta.densityClass === "balanced") delta += 5;
  }
  if (intentLower.includes("launch") || intentLower.includes("product")) {
    if (meta.densityClass === "visualFirst") delta += 3;
  }

  return delta;
}

function densityRationale(meta: LayoutRetrievalMeta): string {
  return `density=${meta.densityClass}`;
}

function requiredSlots(intent: CampaignIntent): string[] {
  const slots = ["headline", "logo"];
  if (intent.proofStrategy === "product_ui") slots.push("product_image");
  if (intent.ctaRequired) slots.push("cta");
  return slots;
}

function layoutMeetsRequirements(meta: LayoutRetrievalMeta, intent: CampaignIntent): boolean {
  return requiredSlots(intent).every((slot) => meta.supportedSlots.includes(slot as never));
}

export function retrieveLayouts(
  intent: CampaignIntent,
  platformId: PlatformId,
  record: LayoutReviewRecord = loadLayoutReviews(),
  limit = 6,
  rulesProfile?: DesignRulesProfile,
  brief?: string,
): LayoutCandidate[] {
  const pool = getApprovedShuffleLayouts(record, platformId);
  const keywords = tokenize(intent.keywords.join(" "));

  const scored = pool
    .map((layout) => {
      const meta = getLayoutRetrievalMeta(layout);
      if (!layoutMeetsRequirements(meta, intent) && !layoutSupportsIntent(meta, intent.primaryIntent)) {
        return null;
      }
      return {
        layout,
        meta,
        score: scoreLayoutForIntent(layout, meta, intent, keywords, rulesProfile, brief),
      };
    })
    .filter((entry): entry is LayoutCandidate => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const fallback = getPostLayout(
      platformId === "instagram-square" || platformId === "instagram-story"
        ? "visual-first"
        : "classic-hero",
    );
    return [
      {
        layout: fallback,
        meta: getLayoutRetrievalMeta(fallback),
        score: 0,
      },
    ];
  }

  return scored.slice(0, limit);
}

export function formatCandidatesForPrompt(candidates: LayoutCandidate[]): string {
  return candidates
    .map(
      ({ layout, meta, score }) =>
        `- ${layout.id}: ${layout.name} — ${layout.summary}. Intents: ${meta.supportedIntents.join(", ")}. ${densityRationale(meta)}. Score: ${score}`,
    )
    .join("\n");
}

export function getLayoutById(id: PostLayoutId): PostLayout {
  return POST_LAYOUTS.find((layout) => layout.id === id) ?? getPostLayout("classic-hero");
}

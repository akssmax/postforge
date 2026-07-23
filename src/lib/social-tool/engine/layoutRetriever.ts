import {
  intentToCampaignPlan,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { DesignSystemConfig, RecipeConfig } from "@/lib/design-config/registry";
import { designSystemAllowsLayout } from "@/lib/social-tool/engine/designSystemRetriever";
import {
  getLayoutRetrievalMeta,
  layoutSupportsCampaign,
  type LayoutRetrievalMeta,
  type SlotNeed,
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

function mapRecipeSlot(slot: string): SlotNeed | null {
  if (slot === "product") return "product_image";
  if (
    slot === "logo" ||
    slot === "headline" ||
    slot === "subheading" ||
    slot === "body" ||
    slot === "caption" ||
    slot === "cta" ||
    slot === "product_image" ||
    slot === "badge" ||
    slot === "offer_badge" ||
    slot === "quote" ||
    slot === "metric" ||
    slot === "customer_logo"
  ) {
    return slot;
  }
  return null;
}

function requiredSlotsFromPlan(
  plan: CampaignPlan,
  recipe?: RecipeConfig,
): SlotNeed[] {
  const slots = new Set<SlotNeed>(["headline", "logo"]);
  if (plan.cta.required) slots.add("cta");
  if (
    plan.visual.proof === "screenshot" ||
    plan.visual.focus === "product_ui" ||
    plan.visual.focus === "product_photo"
  ) {
    slots.add("product_image");
  }
  if (recipe) {
    for (const slot of recipe.slots) {
      const mapped = mapRecipeSlot(slot);
      // Soft requirements from recipe — layout should support core visual/text slots
      if (mapped === "headline" || mapped === "cta" || mapped === "product_image") {
        slots.add(mapped);
      }
    }
  }
  return [...slots];
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

  return delta;
}

function scoreLayoutForPlan(
  layout: PostLayout,
  meta: LayoutRetrievalMeta,
  plan: CampaignPlan,
  keywords: string[],
  rulesProfile?: DesignRulesProfile,
  brief?: string,
  recipe?: RecipeConfig,
  system?: DesignSystemConfig,
): number {
  let score = 0;

  const campaignScore = meta.campaignScores[plan.campaign.type];
  if (typeof campaignScore === "number") {
    score += Math.round(campaignScore * 40);
  } else if (layoutSupportsCampaign(meta, plan.campaign.type)) {
    score += 12;
  }

  if (meta.contentDensity === plan.communication.contentDensity) score += 6;
  if (meta.readingPattern === plan.communication.readingPattern) score += 5;

  if (recipe) {
    if (meta.recipes.includes(recipe.id)) score += 18;
    if (recipe.preferredLayouts.includes(layout.id)) score += 14;
    if (recipe.density === meta.contentDensity) score += 4;
  }

  if (system && designSystemAllowsLayout(system, layout.id)) score += 8;

  if (
    (plan.visual.focus === "product_ui" || plan.visual.focus === "product_photo") &&
    meta.visualWeight === "heavy"
  ) {
    score += 5;
  }
  if (plan.communication.contentDensity === "high" && meta.visualWeight === "light") {
    score += 5;
  }
  if (plan.visual.focus === "brand" && layout.tags.includes("brand")) score += 4;

  if (plan.cta.required && meta.supportedSlots.includes("cta")) score += 4;
  if (
    plan.visual.proof === "screenshot" &&
    meta.supportedSlots.includes("product_image")
  ) {
    score += 5;
  }

  if (layout.bestFor !== "all" && layout.bestFor.includes(plan.platform as PlatformId)) {
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
    plan.primaryMessage,
    plan.audience.role,
    ...plan.keywords,
  ]
    .join(" ")
    .toLowerCase();

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) score += 2;
  }

  for (const keyword of plan.keywords) {
    if (haystack.includes(keyword.toLowerCase())) score += 3;
  }

  return score;
}

function layoutMeetsRequirements(
  meta: LayoutRetrievalMeta,
  plan: CampaignPlan,
  recipe?: RecipeConfig,
): boolean {
  const required = requiredSlotsFromPlan(plan, recipe);
  const softOk = required.every((slot) => {
    if (slot === "badge" || slot === "offer_badge" || slot === "quote" || slot === "metric" || slot === "customer_logo") {
      return true; // adapted via recipe notes / extras
    }
    return meta.supportedSlots.includes(slot);
  });
  return softOk || layoutSupportsCampaign(meta, plan.campaign.type);
}

export function retrieveLayouts(
  plan: CampaignPlan,
  platformId: PlatformId,
  record: LayoutReviewRecord = loadLayoutReviews(),
  limit = 6,
  rulesProfile?: DesignRulesProfile,
  brief?: string,
  recipe?: RecipeConfig,
  system?: DesignSystemConfig,
): LayoutCandidate[] {
  const pool = getApprovedShuffleLayouts(record, platformId).filter((layout) =>
    system ? designSystemAllowsLayout(system, layout.id) : true,
  );
  const effectivePool = pool.length > 0
    ? pool
    : getApprovedShuffleLayouts(record, platformId);

  const keywords = tokenize(plan.keywords.join(" "));

  const scored = effectivePool
    .map((layout) => {
      const meta = getLayoutRetrievalMeta(layout);
      if (!layoutMeetsRequirements(meta, plan, recipe)) {
        return null;
      }
      return {
        layout,
        meta,
        score: scoreLayoutForPlan(
          layout,
          meta,
          plan,
          keywords,
          rulesProfile,
          brief,
          recipe,
          system,
        ),
      };
    })
    .filter((entry): entry is LayoutCandidate => entry !== null)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const preferred = recipe?.preferredLayouts[0] as PostLayoutId | undefined;
    const fallback = getPostLayout(
      preferred && POST_LAYOUTS.some((l) => l.id === preferred)
        ? preferred
        : platformId === "instagram-square" || platformId === "instagram-story"
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

/** @deprecated Legacy signature — converts intent via CampaignPlan adapter. */
export function retrieveLayoutsForIntent(
  intent: CampaignIntent,
  platformId: PlatformId,
  record?: LayoutReviewRecord,
  limit?: number,
  rulesProfile?: DesignRulesProfile,
  brief?: string,
): LayoutCandidate[] {
  return retrieveLayouts(
    intentToCampaignPlan(intent),
    platformId,
    record,
    limit,
    rulesProfile,
    brief,
  );
}

export function formatCandidatesForPrompt(candidates: LayoutCandidate[]): string {
  return candidates
    .map(
      ({ layout, meta, score }) =>
        `- ${layout.id}: ${layout.name} — ${layout.summary}. Campaigns: ${meta.campaigns.join(", ") || meta.supportedIntents.join(", ")}. density=${meta.densityClass}. Score: ${score}`,
    )
    .join("\n");
}

export function getLayoutById(id: PostLayoutId): PostLayout {
  return POST_LAYOUTS.find((layout) => layout.id === id) ?? getPostLayout("classic-hero");
}

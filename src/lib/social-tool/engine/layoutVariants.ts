import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import { intentToCampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { RecipeConfig } from "@/lib/design-config/registry";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";

export type LayoutVariantFlags = {
  addAnnouncementBadge: boolean;
  emphasizeCta: boolean;
  statsFirst: boolean;
  addOfferBadge: boolean;
  requireMetric: boolean;
  requireQuote: boolean;
  requireCustomerLogo: boolean;
};

export type RecipeAdaptation = {
  layoutId: PostLayoutId;
  flags: LayoutVariantFlags;
  variantNotes: string[];
  requiredSoftSlots: string[];
};

function asPlan(intentOrPlan: CampaignIntent | CampaignPlan): CampaignPlan {
  if ("campaign" in intentOrPlan && typeof intentOrPlan.campaign === "object") {
    return intentOrPlan as CampaignPlan;
  }
  return intentToCampaignPlan(intentOrPlan as CampaignIntent);
}

export function resolveLayoutVariants(
  plan: CampaignPlan,
  recipe?: RecipeConfig,
): LayoutVariantFlags {
  const slots = new Set(recipe?.slots ?? []);
  return {
    addAnnouncementBadge:
      slots.has("badge") ||
      plan.campaign.type === "announcement" ||
      plan.campaign.type === "product_launch",
    emphasizeCta:
      plan.cta.required ||
      slots.has("cta") ||
      plan.campaign.objective === "book_demo" ||
      plan.campaign.objective === "signup",
    statsFirst:
      slots.has("metric") ||
      plan.communication.pattern === "statistic" ||
      plan.visual.proof === "stat",
    addOfferBadge: slots.has("offer_badge") || plan.communication.pattern === "offer",
    requireMetric: slots.has("metric"),
    requireQuote: slots.has("quote"),
    requireCustomerLogo: slots.has("customer_logo"),
  };
}

/** @deprecated Prefer resolveLayoutVariants(plan). */
export function resolveLayoutVariantsFromIntent(intent: CampaignIntent): LayoutVariantFlags {
  return resolveLayoutVariants(intentToCampaignPlan(intent));
}

/**
 * Apply recipe-driven adaptation — no geometry invention.
 */
export function applyRecipeAdaptation(
  layoutId: PostLayoutId,
  plan: CampaignPlan,
  recipe: RecipeConfig,
  rulesProfile?: DesignRulesProfile,
): RecipeAdaptation {
  const flags = resolveLayoutVariants(plan, recipe);
  const notes: string[] = [];
  const requiredSoftSlots: string[] = [];

  notes.push(`Recipe: ${recipe.name} (${recipe.pattern}) — attention=${recipe.attention}`);

  if (rulesProfile?.featuredPolicy === "library") {
    notes.push("Library profile — featured visual from UI block or illustration");
  } else if (rulesProfile?.featuredPolicy === "placeholder") {
    notes.push("Ad profile — featured placeholder, footer CTA");
  }

  if (flags.emphasizeCta) {
    notes.push("CTA required — emphasize extras/footer CTA");
    requiredSoftSlots.push("cta");
  }
  if (flags.addAnnouncementBadge) {
    notes.push("Announcement badge via caption/extras");
    requiredSoftSlots.push("badge");
  }
  if (flags.addOfferBadge) {
    notes.push("Offer badge required for promotion pattern");
    requiredSoftSlots.push("offer_badge");
  }
  if (flags.statsFirst || flags.requireMetric) {
    notes.push("Metric/stat emphasis via extras");
    requiredSoftSlots.push("metric");
  }
  if (flags.requireQuote) {
    notes.push("Customer quote required");
    requiredSoftSlots.push("quote");
  }
  if (flags.requireCustomerLogo) {
    notes.push("Customer logo required");
    requiredSoftSlots.push("customer_logo");
  }

  if (layoutId === "copy-statement" && flags.emphasizeCta) {
    notes.push("CTA emphasis — footer extras enabled");
  }
  if (layoutId === "centered-announcement" && flags.addAnnouncementBadge) {
    notes.push("Announcement badge slot implied via caption extras");
  }
  if (layoutId === "professional-left" && flags.statsFirst) {
    notes.push("Stats-first emphasis via extras block");
  }

  return { layoutId, flags, variantNotes: notes, requiredSoftSlots };
}

export function applyLayoutVariants(
  layoutId: PostLayoutId,
  intentOrPlan: CampaignIntent | CampaignPlan,
  rulesProfile?: DesignRulesProfile,
  recipe?: RecipeConfig,
): { layoutId: PostLayoutId; variantNotes: string[] } {
  const plan = asPlan(intentOrPlan);

  if (recipe) {
    const adapted = applyRecipeAdaptation(layoutId, plan, recipe, rulesProfile);
    return { layoutId: adapted.layoutId, variantNotes: adapted.variantNotes };
  }

  const flags = resolveLayoutVariants(plan);
  const notes: string[] = [];
  if (flags.emphasizeCta) notes.push("CTA emphasis");
  if (flags.addAnnouncementBadge) notes.push("Announcement badge");
  if (flags.addOfferBadge) notes.push("Offer badge");
  return { layoutId, variantNotes: notes };
}

export function variantNotesForLayout(
  layout: PostLayout,
  intentOrPlan: CampaignIntent | CampaignPlan,
  rulesProfile?: DesignRulesProfile,
  recipe?: RecipeConfig,
): string[] {
  return applyLayoutVariants(layout.id, intentOrPlan, rulesProfile, recipe).variantNotes;
}

export function isAdVisualProfile(rulesProfile?: DesignRulesProfile): boolean {
  return (
    rulesProfile?.featuredPolicy === "placeholder" ||
    rulesProfile?.featuredPolicy === "library"
  );
}

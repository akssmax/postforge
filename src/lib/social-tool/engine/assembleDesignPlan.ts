import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignPlan } from "@/lib/llm/schemas/designPlan";
import type { SlotDraft } from "@/lib/llm/schemas/slotDraft";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { CopyVariant } from "@/lib/social-tool/presets";
import { variantNotesForLayout } from "@/lib/social-tool/engine/layoutVariants";
import type { VisualPolicy } from "@/lib/social-tool/engine/visualPolicy";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";
import { normalizeProductPage } from "@/lib/social-tool/presets";
import type { ProductPageId } from "@/lib/social-tool/presets";

function inferProductPage(intent: CampaignIntent, brief: string): ProductPageId {
  const lower = brief.toLowerCase();
  if (lower.includes("pricing") || lower.includes("plan")) return "pricing";
  if (lower.includes("pipeline") || lower.includes("deal")) return "pipeline";
  if (lower.includes("schedule") || lower.includes("calendar")) return "scheduler";
  if (lower.includes("stat") || lower.includes("dashboard")) return "stats";
  if (lower.includes("form") || lower.includes("signup")) return "form-card";
  if (intent.goal === "book_demo") return "scheduler";
  return "leads";
}

export function assembleDesignPlan(input: {
  intent: CampaignIntent;
  layout: PostLayout;
  layoutId: PostLayoutId;
  rationale: string;
  slotDraft: SlotDraft;
  visual: VisualPolicy;
  brief: string;
  rulesProfile?: DesignRulesProfile;
  theme?: string;
  copyVariants?: CopyVariant[];
  copyVariantIndex?: number;
}): DesignPlan {
  const dynamicLayout = catalogLayoutToDynamic(input.layout);
  const variantNotes = variantNotesForLayout(
    input.layout,
    input.intent,
    input.rulesProfile,
  );
  const featuredPolicy = input.rulesProfile?.featuredPolicy ?? "library";
  const productPage = inferProductPage(input.intent, input.brief);

  let featuredSlots = input.slotDraft.featuredSlots;
  let showFeaturedImage = input.slotDraft.showFeaturedImage;

  if (featuredPolicy === "library") {
    showFeaturedImage = true;
    featuredSlots = [
      {
        slotId: "featured-primary",
        mode: "composed",
        visible: true,
      },
    ];
  } else if (featuredPolicy === "placeholder") {
    showFeaturedImage = true;
    featuredSlots = [
      {
        slotId: "featured-primary",
        mode: "placeholder",
        visible: true,
      },
    ];
  } else if (featuredPolicy === "hidden") {
    showFeaturedImage = false;
    featuredSlots = input.slotDraft.featuredSlots.map((slot) => ({
      ...slot,
      visible: false,
    }));
  } else if (featuredSlots.length === 0) {
    featuredSlots = [
      {
        slotId: "featured-primary",
        mode: "genui" as const,
        productPage,
        visible: showFeaturedImage,
      },
    ];
  } else {
    featuredSlots = featuredSlots.map((slot) => ({
      ...slot,
      productPage: slot.productPage
        ? normalizeProductPage(slot.productPage)
        : productPage,
    }));
  }

  const rationale = [
    input.rationale,
    input.visual.reason,
    input.rulesProfile ? `Rules: ${input.rulesProfile.label}` : "",
    input.theme ? `Theme: ${input.theme}` : "",
    ...variantNotes,
    `Intent: ${input.intent.primaryIntent} · Goal: ${input.intent.goal} · Featured: ${input.intent.featuredVisualKind}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    rationale,
    layoutRef: { source: "catalog", id: input.layoutId },
    textSlots: input.slotDraft.textSlots,
    featuredSlots,
    showContent: input.slotDraft.showContent,
    showBrand: input.slotDraft.showBrand,
    showFeaturedImage,
    showPattern: input.visual.showPattern,
    showBackground: input.visual.showBackground,
    patternOpacity: input.visual.patternOpacity,
    patternScale: input.visual.patternScale,
    patternAnimated: input.visual.patternAnimated,
    patternRef: input.visual.patternRef,
    backgroundPresetId: input.visual.backgroundPresetId,
    copyVariants: input.copyVariants,
    copyVariantIndex: input.copyVariantIndex ?? 0,
  };
}

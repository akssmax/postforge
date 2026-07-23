import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";

export type LayoutVariantFlags = {
  addAnnouncementBadge: boolean;
  emphasizeCta: boolean;
  statsFirst: boolean;
};

export function resolveLayoutVariants(intent: CampaignIntent): LayoutVariantFlags {
  return {
    addAnnouncementBadge:
      intent.campaignType === "announcement" || intent.campaignType === "product_launch",
    emphasizeCta: intent.ctaRequired || intent.goal === "book_demo" || intent.goal === "signup",
    statsFirst: intent.proofStrategy === "stats",
  };
}

export function applyLayoutVariants(
  layoutId: PostLayoutId,
  intent: CampaignIntent,
  rulesProfile?: DesignRulesProfile,
): { layoutId: PostLayoutId; variantNotes: string[] } {
  const flags = resolveLayoutVariants(intent);
  const notes: string[] = [];

  if (rulesProfile?.featuredPolicy === "library") {
    notes.push("Library profile — featured visual from UI block or illustration");
  } else if (rulesProfile?.featuredPolicy === "placeholder") {
    notes.push("Ad profile — featured placeholder, footer CTA");
  }

  if (flags.emphasizeCta && layoutId === "copy-statement") {
    notes.push("CTA emphasis — footer extras enabled");
  }
  if (flags.addAnnouncementBadge && layoutId === "centered-announcement") {
    notes.push("Announcement badge slot implied via caption extras");
  }
  if (flags.statsFirst && layoutId === "professional-left") {
    notes.push("Stats-first emphasis via extras block");
  }

  return { layoutId, variantNotes: notes };
}

export function variantNotesForLayout(
  layout: PostLayout,
  intent: CampaignIntent,
  rulesProfile?: DesignRulesProfile,
): string[] {
  return applyLayoutVariants(layout.id, intent, rulesProfile).variantNotes;
}

export function isAdVisualProfile(rulesProfile?: DesignRulesProfile): boolean {
  return (
    rulesProfile?.featuredPolicy === "placeholder" ||
    rulesProfile?.featuredPolicy === "library"
  );
}

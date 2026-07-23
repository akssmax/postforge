import type { DesignRulesProfile } from "@/lib/llm/rules/types";

export const linkedinAdRulesProfile: DesignRulesProfile = {
  id: "linkedin-ad",
  label: "LinkedIn Ad",
  copyBudget: {
    headlineWords: 8,
    subheadingWords: 15,
    ctaWords: 6,
    maxTotalWords: 35,
  },
  slotLimits: {
    headline: 42,
    subheading: 90,
    caption: 40,
    body: 0,
  },
  layoutPolicy: "auto_by_density",
  featuredPolicy: "library",
  patternPolicy: "layout_based",
  backgroundPolicy: "catalog_pick",
  visualBalance: {
    minFeaturedShare: 0.4,
    maxCopyWordShare: 0.35,
    passThreshold: 85,
  },
  requiredSlots: ["headline", "subheading"],
  bannedSlots: ["body"],
  maxCopyRetries: 2,
};

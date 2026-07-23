import type { DesignRulesProfile } from "@/lib/llm/rules/types";

export const linkedinPostRulesProfile: DesignRulesProfile = {
  id: "linkedin-post",
  label: "LinkedIn Post",
  copyBudget: {
    headlineWords: 10,
    subheadingWords: 20,
    ctaWords: 8,
    maxTotalWords: 50,
  },
  slotLimits: {
    headline: 56,
    subheading: 120,
    body: 180,
    caption: 48,
  },
  layoutPolicy: "auto_by_density",
  featuredPolicy: "library",
  patternPolicy: "layout_based",
  backgroundPolicy: "catalog_pick",
  visualBalance: {
    minFeaturedShare: 0.35,
    maxCopyWordShare: 0.4,
    passThreshold: 80,
  },
  requiredSlots: ["headline"],
  bannedSlots: [],
  maxCopyRetries: 1,
};

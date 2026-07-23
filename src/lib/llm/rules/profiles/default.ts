import type { DesignRulesProfile } from "@/lib/llm/rules/types";

export const defaultRulesProfile: DesignRulesProfile = {
  id: "default",
  label: "Default",
  copyBudget: {
    headlineWords: 12,
    subheadingWords: 24,
    ctaWords: 8,
    maxTotalWords: 60,
  },
  slotLimits: {
    headline: 72,
    subheading: 140,
    body: 220,
    caption: 48,
  },
  layoutPolicy: "auto_by_density",
  featuredPolicy: "library",
  patternPolicy: "layout_based",
  backgroundPolicy: "catalog_pick",
  visualBalance: {
    minFeaturedShare: 0.3,
    maxCopyWordShare: 0.45,
    passThreshold: 80,
  },
  requiredSlots: ["headline"],
  bannedSlots: [],
  maxCopyRetries: 1,
};

import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";

export type LayoutPolicy = "visual_first" | "copy_first" | "auto_by_density";
export type FeaturedPolicy = "library" | "placeholder" | "genui" | "image" | "hidden";
export type PatternPolicy = "layout_based" | "always" | "never";
export type BackgroundPolicy = "catalog_pick" | "intent_matched";

export type CopyBudget = {
  headlineWords: number;
  subheadingWords: number;
  ctaWords: number;
  maxTotalWords: number;
};

export type SlotLimits = Partial<Record<TextSlotRole, number>>;

export type VisualBalanceRules = {
  minFeaturedShare: number;
  maxCopyWordShare: number;
  passThreshold: number;
};

export type DesignRulesProfile = {
  id: string;
  label: string;
  copyBudget: CopyBudget;
  slotLimits: SlotLimits;
  layoutPolicy: LayoutPolicy;
  featuredPolicy: FeaturedPolicy;
  patternPolicy: PatternPolicy;
  backgroundPolicy: BackgroundPolicy;
  visualBalance: VisualBalanceRules;
  requiredSlots: TextSlotRole[];
  bannedSlots: TextSlotRole[];
  maxCopyRetries: number;
};

export type DesignRulesIntent = {
  campaignType: string;
  platform: string;
  format?: "ad" | "post";
};

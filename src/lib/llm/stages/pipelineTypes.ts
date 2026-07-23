import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignPlan } from "@/lib/llm/schemas/designPlan";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { DesignScore } from "@/lib/social-tool/engine/scoringEngine";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

export type PipelineResult = {
  intent: CampaignIntent;
  layoutId: PostLayoutId;
  rationale: string;
  planInput: DesignPlan;
  validatedPlan: ValidatedDesignPlan;
  summary: string;
  score: DesignScore;
  rulesProfile: DesignRulesProfile;
  theme?: string;
  copyRetries?: number;
};

export type DesignVariant = {
  theme: string;
  planInput: DesignPlan;
  validatedPlan: ValidatedDesignPlan;
  score: DesignScore;
  summary: string;
  layoutId: PostLayoutId;
  rationale: string;
};

export type PipelineVariantsResult = {
  intent: CampaignIntent;
  rulesProfile: DesignRulesProfile;
  variants: DesignVariant[];
  summary: string;
};

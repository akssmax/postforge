import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignPlan } from "@/lib/llm/schemas/designPlan";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { DesignScore } from "@/lib/social-tool/engine/scoringEngine";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

export type PipelineTrace = {
  campaignType: string;
  pattern: string;
  recipeId: string;
  designSystemId: string;
  layoutId: PostLayoutId;
  visualReason: string;
  scoreTotal: number;
  repairSteps: string[];
};

export type PipelineResult = {
  /** @deprecated Prefer campaignPlan */
  intent: CampaignIntent;
  campaignPlan: CampaignPlan;
  layoutId: PostLayoutId;
  rationale: string;
  planInput: DesignPlan;
  validatedPlan: ValidatedDesignPlan;
  summary: string;
  score: DesignScore;
  rulesProfile: DesignRulesProfile;
  theme?: string;
  copyRetries?: number;
  recipeId?: string;
  designSystemId?: string;
  visualStrategy?: string;
  pipelineTrace?: PipelineTrace;
};

export type DesignVariant = {
  theme: string;
  planInput: DesignPlan;
  validatedPlan: ValidatedDesignPlan;
  score: DesignScore;
  summary: string;
  layoutId: PostLayoutId;
  rationale: string;
  campaignPlan?: CampaignPlan;
  recipeId?: string;
  designSystemId?: string;
};

export type PipelineVariantsResult = {
  /** @deprecated Prefer campaignPlan */
  intent: CampaignIntent;
  campaignPlan: CampaignPlan;
  rulesProfile: DesignRulesProfile;
  variants: DesignVariant[];
  summary: string;
};

import type { DesignPlanApplyOptions } from "@/lib/llm/services/applyDesignPlan";
import type { PipelineResult } from "@/lib/llm/stages/pipelineTypes";

/**
 * Visual decisions the campaign plan already made. Forwarded with the plan so the
 * client's featured-visual pick uses them instead of re-guessing from the copy.
 */
export function visualContextFromPipeline(
  result: Pick<PipelineResult, "campaignPlan" | "recipeId" | "designSystemId" | "pipelineTrace">,
): Pick<DesignPlanApplyOptions, "featuredVisualKind" | "decorationLevel" | "visualSemantic"> {
  const plan = result.campaignPlan;
  return {
    featuredVisualKind: plan.visual.featuredKind,
    decorationLevel: plan.visual.decorationLevel,
    visualSemantic: {
      campaignType: plan.campaign.type,
      recipeId: result.recipeId ?? result.pipelineTrace?.recipeId,
      patternId: result.pipelineTrace?.pattern ?? plan.communication.pattern,
      designSystemId: result.designSystemId ?? result.pipelineTrace?.designSystemId,
      contentDensity: plan.communication.contentDensity,
      readingPattern: plan.communication.readingPattern,
      colorMood: plan.visual.colorMood,
      brandTone: plan.brand.tone,
      proof: plan.visual.proof,
      keywords: [...new Set([...(plan.keywords ?? []), ...(plan.themes ?? [])])].slice(0, 12),
    },
  };
}

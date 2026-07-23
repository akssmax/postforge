import {
  campaignPlanToIntent,
} from "@/lib/llm/schemas/campaignPlan";
import type { PipelineResult } from "@/lib/llm/stages/pipelineTypes";
import { resolveDesignRulesForPlan } from "@/lib/llm/rules";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";
import { applyRecipeAdaptation } from "@/lib/social-tool/engine/layoutVariants";
import { retrieveLayouts, getLayoutById } from "@/lib/social-tool/engine/layoutRetriever";
import { scoreDesign } from "@/lib/social-tool/engine/scoringEngine";
import { resolveVisualStrategy } from "@/lib/social-tool/engine/visual/resolveVisualStrategy";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import {
  buildCopyVariantPool,
  primaryCopyFromTextSlots,
  writeCopyVariantsOffline,
} from "@/lib/llm/stages/copyVariantWriter";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import { validateDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

/** Client-safe offline pipeline — no LLM imports. */
export function runDesignPipelineOffline(input: {
  userMessage: string;
  platformId: PlatformId;
}): PipelineResult | null {
  const userMessage = input.userMessage.trim();
  if (!userMessage) return null;

  const plan = campaignPlanFromBrief(userMessage, input.platformId);
  const rulesProfile = resolveDesignRulesForPlan(plan, userMessage);
  const system = retrieveDesignSystem(plan);
  const { recipe, pattern, rationale: recipeRationale } = resolveRecipe(plan, system);

  const candidates = retrieveLayouts(
    plan,
    input.platformId,
    undefined,
    6,
    rulesProfile,
    userMessage,
    recipe,
    system,
  );
  const rankedId = candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId);
  const adapted = applyRecipeAdaptation(rankedId, plan, recipe, rulesProfile);
  const layoutId = adapted.layoutId;
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);
  const visual = resolveVisualStrategy({
    plan,
    layout,
    system,
    rulesProfile,
    brief: userMessage,
    recipe,
  });
  const slotDraft = writeSlotsOffline({
    userMessage,
    platformId: input.platformId,
    dynamicLayout,
    rulesProfile,
  });

  const primaryCopy = primaryCopyFromTextSlots(slotDraft.textSlots);
  const copyVariants = buildCopyVariantPool(
    primaryCopy,
    writeCopyVariantsOffline({ userMessage, rulesProfile }),
    rulesProfile,
  );

  const rationale = [
    `${layout.name} matched ${recipe.name} / ${plan.communication.pattern}.`,
    recipeRationale,
    ...adapted.variantNotes,
  ].join(" · ");

  const planInput = assembleDesignPlan({
    intent: plan,
    layout,
    layoutId,
    rationale,
    slotDraft,
    visual,
    brief: userMessage,
    rulesProfile,
    copyVariants,
    copyVariantIndex: 0,
    recipe,
  });

  const validated = validateDesignPlan(planInput, input.platformId, rulesProfile);
  if (!validated.ok) return null;

  const score = scoreDesign(validated.plan, plan, rulesProfile);
  const intent = campaignPlanToIntent(plan);

  return {
    intent,
    campaignPlan: plan,
    layoutId,
    rationale,
    planInput,
    validatedPlan: validated.plan,
    summary: `Offline pipeline planned a ${plan.campaign.type.replace(/_/g, " ")} with ${pattern.label} → ${recipe.name}, chose ${layout.name}.`,
    score,
    rulesProfile,
    recipeId: recipe.id,
    designSystemId: system.id,
    visualStrategy: visual.reason,
    pipelineTrace: {
      campaignType: plan.campaign.type,
      pattern: pattern.id,
      recipeId: recipe.id,
      designSystemId: system.id,
      layoutId,
      visualReason: visual.reason,
      scoreTotal: score.total,
      repairSteps: [],
    },
  };
}

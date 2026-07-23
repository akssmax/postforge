import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { PipelineResult } from "@/lib/llm/stages/pipelineTypes";
import { resolveDesignRulesForBrief } from "@/lib/llm/rules";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { intentFromBrief } from "@/lib/social-tool/engine/intentFromBrief";
import { applyLayoutVariants } from "@/lib/social-tool/engine/layoutVariants";
import { retrieveLayouts } from "@/lib/social-tool/engine/layoutRetriever";
import { scoreDesign } from "@/lib/social-tool/engine/scoringEngine";
import { applyVisualPolicy } from "@/lib/social-tool/engine/visualPolicy";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import {
  buildCopyVariantPool,
  primaryCopyFromTextSlots,
  writeCopyVariantsOffline,
} from "@/lib/llm/stages/copyVariantWriter";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import { getLayoutById } from "@/lib/social-tool/engine/layoutRetriever";
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

  const intent: CampaignIntent = intentFromBrief(userMessage, input.platformId);
  const rulesProfile = resolveDesignRulesForBrief(intent, userMessage);
  const candidates = retrieveLayouts(intent, input.platformId, undefined, 6, rulesProfile, userMessage);
  const layoutId =
    applyLayoutVariants(candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId), intent, rulesProfile)
      .layoutId;
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);
  const visual = applyVisualPolicy(intent, layout, userMessage, rulesProfile);
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

  const rationale = `${layout.name} matched ${intent.primaryIntent}.`;
  const planInput = assembleDesignPlan({
    intent,
    layout,
    layoutId,
    rationale,
    slotDraft,
    visual,
    brief: userMessage,
    rulesProfile,
    copyVariants,
    copyVariantIndex: 0,
  });

  const validated = validateDesignPlan(planInput, input.platformId, rulesProfile);
  if (!validated.ok) return null;

  const score = scoreDesign(validated.plan, intent, rulesProfile);

  return {
    intent,
    layoutId,
    rationale,
    planInput,
    validatedPlan: validated.plan,
    summary: `Offline pipeline chose ${layout.name} for ${intent.primaryIntent}.`,
    score,
    rulesProfile,
  };
}

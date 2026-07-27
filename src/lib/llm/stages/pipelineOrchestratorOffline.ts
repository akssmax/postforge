import {
  campaignPlanToIntent,
} from "@/lib/llm/schemas/campaignPlan";
import type { PipelineResult } from "@/lib/llm/stages/pipelineTypes";
import { resolveDesignRulesForPlan } from "@/lib/llm/rules";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
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
import { validateDesignPlan, repairPlanForArtifactConstraints } from "@/lib/llm/services/layoutValidator";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import {
  canvasSpecFromArtifact,
  filterLayoutCandidatesForArtifact,
  loadArtifactPlugin,
  mergeArtifactIntoRulesProfile,
  resolveArtifactId,
  resolvePlatformForDesign,
  resolveRecipeForArtifact,
  resolveRenderer,
  pickBundleForArtifact,
} from "@/lib/design-engine";
import { resolvePipelineBrandContext } from "@/lib/brand/starterPalettes";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";

/** Client-safe offline pipeline — no LLM imports. */
export function runDesignPipelineOffline(input: {
  userMessage: string;
  platformId: PlatformId;
  artifactCategory?: ArtifactCategoryId | null;
  backgroundCatalog?: { id: string; label?: string }[];
  hasLogo?: boolean;
  assumedBrandColors?: import("@/lib/brand/types").BrandColors;
}): PipelineResult | null {
  const userMessage = input.userMessage.trim();
  if (!userMessage) return null;

  const preliminaryPlan = campaignPlanFromBrief(userMessage, input.platformId);
  const artifactId = resolveArtifactId({
    brief: userMessage,
    platformId: input.platformId,
    artifactId: preliminaryPlan.artifactId,
    artifactCategory: input.artifactCategory,
  });
  const artifact = loadArtifactPlugin(artifactId);
  const platformResolution = resolvePlatformForDesign({
    brief: userMessage,
    artifact,
    fallbackPlatformId: input.platformId,
  });
  const platformId = platformResolution.platformId;

  const plan = {
    ...campaignPlanFromBrief(userMessage, platformId),
    artifactId,
    platform: platformId,
  };
  const rulesProfile = resolveDesignRulesForPlan(plan, userMessage);
  const effectiveRules = mergeArtifactIntoRulesProfile(rulesProfile, artifact, plan);
  const system = retrieveDesignSystem(plan);
  const { recipe, pattern, rationale: recipeRationale } = resolveRecipeForArtifact(
    plan,
    system,
    artifact,
  );

  let candidates = retrieveLayouts(
    plan,
    platformId,
    undefined,
    6,
    effectiveRules,
    userMessage,
    recipe,
    system,
  );
  candidates = filterLayoutCandidatesForArtifact(candidates, artifact);
  const rankedId = candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId);
  const adapted = applyRecipeAdaptation(rankedId, plan, recipe, effectiveRules);
  const layoutId = adapted.layoutId;
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);
  const brandContext =
    input.hasLogo === false || !input.backgroundCatalog?.length
      ? resolvePipelineBrandContext({
          brief: userMessage,
          platformId: input.platformId,
          hasLogo: input.hasLogo ?? false,
          backgroundCatalog: input.backgroundCatalog,
          seed: userMessage,
        })
      : null;
  const backgroundCatalog =
    brandContext?.backgroundCatalog ??
    (input.backgroundCatalog?.length
      ? input.backgroundCatalog
      : [{ id: "default", label: "Postforge default" }]);
  const visual = resolveVisualStrategy({
    plan,
    layout,
    system,
    rulesProfile: effectiveRules,
    brief: userMessage,
    recipe,
    backgroundCatalog,
    artifact,
  });
  const bundle = pickBundleForArtifact(artifact, recipe.bundles?.[0]);
  const slotDraft = writeSlotsOffline({
    userMessage,
    platformId,
    dynamicLayout,
    rulesProfile: effectiveRules,
    artifact,
  });

  const primaryCopy = primaryCopyFromTextSlots(slotDraft.textSlots);
  const copyVariants = buildCopyVariantPool(
    primaryCopy,
    writeCopyVariantsOffline({ userMessage, rulesProfile: effectiveRules }),
    effectiveRules,
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
    rulesProfile: effectiveRules,
    copyVariants,
    copyVariantIndex: 0,
    recipe,
  });

  const validated = validateDesignPlan(planInput, platformId, effectiveRules);
  if (!validated.ok) return null;

  const artifactAdjusted = repairPlanForArtifactConstraints(validated.plan, artifact);
  const score = scoreDesign(artifactAdjusted, plan, effectiveRules);
  const intent = campaignPlanToIntent(plan);
  const canvasSpec = canvasSpecFromArtifact(artifact);
  const rendererId = resolveRenderer(artifact.capabilities, artifact.renderer);

  return {
    intent,
    campaignPlan: plan,
    artifactId,
    artifactCategory: artifact.category,
    canvasSpec,
    rendererId,
    platformId,
    platformReason: platformResolution.reason,
    layoutId,
    rationale,
    planInput,
    validatedPlan: artifactAdjusted,
    summary: `Offline pipeline planned a ${plan.campaign.type.replace(/_/g, " ")} with ${pattern.label} → ${recipe.name}, chose ${layout.name}.`,
    score,
    rulesProfile: effectiveRules,
    recipeId: recipe.id,
    designSystemId: system.id,
    visualStrategy: visual.reason,
    bundleId: bundle?.id,
    pipelineTrace: {
      campaignType: plan.campaign.type,
      artifactId,
      platformId,
      platformReason: platformResolution.reason,
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

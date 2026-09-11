import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { designPlanSchema } from "@/lib/llm/schemas/designPlan";
import type { OpenRouterChatModelId } from "@/lib/llm/models";
import { resolveBriefContext } from "./briefContext";
import {
  extractThemesFromBrief,
  resolveDesignRulesForPlan,
} from "@/lib/llm/rules";
import { planCampaign } from "@/lib/llm/stages/creativePlanner";
import { rankLayout } from "@/lib/llm/stages/layoutRanker";
import { writeSlotsWithRetries } from "@/lib/llm/stages/slotWriter";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import {
  primaryCopyFromTextSlots,
} from "@/lib/llm/stages/copyVariantWriter";
import type {
  DesignVariant,
  PipelineResult,
  PipelineTrace,
  PipelineVariantsResult,
} from "@/lib/llm/stages/pipelineTypes";
import { validateDesignPlan, repairPlanForArtifactConstraints } from "@/lib/llm/services/layoutValidator";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { applyRecipeAdaptation } from "@/lib/social-tool/engine/layoutVariants";
import {
  getLayoutById,
  retrieveLayouts,
  type LayoutCandidate,
} from "@/lib/social-tool/engine/layoutRetriever";
import { scoreDesign } from "@/lib/social-tool/engine/scoringEngine";
import { resolveVisualStrategy } from "@/lib/social-tool/engine/visual/resolveVisualStrategy";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import {
  canvasSpecFromArtifact,
  filterLayoutCandidatesForArtifact,
  loadArtifactPlugin,
  mergeArtifactIntoRulesProfile,
  resolveArtifactId,
  resolveRecipeForArtifact,
  resolveRenderer,
  resolvePlatformForDesign,
  pickBundleForArtifact,
} from "@/lib/design-engine";
import { resolveStockPhotoForArtifact } from "@/lib/llm/stages/stockPhotoResolver";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import { layoutFeaturedZoneMode } from "@/lib/social-tool/postLayouts";
import {
  campaignPlanToIntent,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { UIMessage } from "ai";

export type PipelineInput = {
  modelId?: OpenRouterChatModelId;
  variantIndex?: number;
  userMessage: string;
  messages: UIMessage[];
  platformId: PlatformId;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  backgroundCatalog?: { id: string; label?: string }[];
  recentBackgroundPresetIds?: string[];
  offline?: boolean;
  themeAngle?: string;
  artifactId?: string | null;
  artifactCategory?: ArtifactCategoryId | null;
};

export type { PipelineResult, PipelineVariantsResult, DesignVariant } from "@/lib/llm/stages/pipelineTypes";

export function getLatestUserMessage(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

function buildSummary(input: {
  plan: CampaignPlan;
  layoutName: string;
  rationale: string;
  score: { total: number };
  theme?: string;
  rulesLabel: string;
  recipeName?: string;
  systemLabel?: string;
}): string {
  return [
    input.theme ? `Theme **${input.theme}** — ` : "",
    `I planned this as a **${input.plan.campaign.type.replace(/_/g, " ")}** (${input.rulesLabel}) for ${input.plan.audience.role.replace(/_/g, " ")}, using the **${input.plan.communication.pattern.replace(/_/g, " ")}** pattern`,
    input.recipeName ? ` / **${input.recipeName}** recipe` : "",
    input.systemLabel ? ` in the **${input.systemLabel}** system` : "",
    `. Chose **${input.layoutName}** — ${input.rationale}`,
    ` Structural checks: ${input.score.total}/100.`,
  ].join("");
}

function pickVisualFallbackLayout(candidates: LayoutCandidate[]): PostLayoutId {
  const visual = candidates.find(
    (c) =>
      c.meta.densityClass === "visualFirst" || c.meta.densityClass === "balanced",
  );
  return visual?.layout.id ?? candidates[0]?.layout.id ?? "balanced-split";
}

async function runPipelineAttempt(input: {
  modelId?: OpenRouterChatModelId;
  variantIndex?: number;
  userMessage: string;
  messages: UIMessage[];
  platformId: PlatformId;
  brandSummary?: PipelineInput["brandSummary"];
  backgroundCatalog?: PipelineInput["backgroundCatalog"];
  recentBackgroundPresetIds?: string[];
  offline?: boolean;
  themeAngle?: string;
  plan: CampaignPlan;
  artifactId: string;
  platformReason?: string;
  rulesProfile: ReturnType<typeof resolveDesignRulesForPlan>;
  layoutRetry?: boolean;
  repairSteps?: string[];
}): Promise<PipelineResult> {
  const repairSteps = [...(input.repairSteps ?? [])];
  const artifact = loadArtifactPlugin(input.artifactId);
  const effectiveRules = mergeArtifactIntoRulesProfile(
    input.rulesProfile,
    artifact,
    input.plan,
  );
  const system = retrieveDesignSystem(input.plan);
  const { recipe, pattern, rationale: recipeRationale } = resolveRecipeForArtifact(
    input.plan,
    system,
    artifact,
  );

  let candidates = retrieveLayouts(
    input.plan,
    input.platformId,
    undefined,
    1000,
    effectiveRules,
    input.userMessage,
    recipe,
    system,
    artifact,
  );
  candidates = filterLayoutCandidatesForArtifact(candidates, artifact).slice(0, 6);
  if (!candidates.length) throw new Error("No compatible layout for this artifact and platform.");
  if (input.variantIndex != null) {
    const available = [...candidates];
    const directions = ["copyHeavy", "visualFirst", "balanced"];
    const distinct = directions.map(density => {
      const index = Math.max(0, available.findIndex(candidate => candidate.meta.densityClass === density));
      return available.splice(index, 1)[0];
    }).filter((candidate): candidate is LayoutCandidate => !!candidate);
    candidates = [distinct[input.variantIndex % distinct.length]];
  }

  let ranked = input.offline
    ? {
        layoutId: candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId),
        rationale: `${candidates[0]?.layout.name ?? "Classic Hero"} matched ${recipe.name} / ${input.plan.communication.pattern}.`,
      }
    : await rankLayout(
        input.plan,
        candidates,
        input.userMessage,
        effectiveRules,
        recipe,
        { id: artifact.id, label: artifact.label, category: artifact.category },
        input.modelId,
      );

  if (input.layoutRetry) {
    ranked = {
      layoutId: pickVisualFallbackLayout(candidates),
      rationale: "Switched to a visual-first layout for better balance.",
    };
    repairSteps.push("layout_swap_visual_first");
  }

  const adapted = applyRecipeAdaptation(
    ranked.layoutId,
    input.plan,
    recipe,
    effectiveRules,
  );
  const layoutId = candidates.some(c => c.layout.id === adapted.layoutId)
    ? adapted.layoutId : ranked.layoutId;
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);

  const visual = resolveVisualStrategy({
    plan: input.plan,
    layout,
    system,
    rulesProfile: effectiveRules,
    brief: input.userMessage,
    recipe,
    backgroundCatalog: input.backgroundCatalog,
    recentBackgroundPresetIds: input.recentBackgroundPresetIds,
    artifact,
    variationIndex: input.variantIndex,
  });

  const bundle = pickBundleForArtifact(artifact, recipe.bundles?.[0]);

  const stockPhotoPromise = resolveStockPhotoForArtifact({
    artifact,
    brief: input.userMessage,
    platformId: input.platformId,
    featuredZoneMode: layoutFeaturedZoneMode(layout),
    allowTextPrimaryPhoto:
      layoutFeaturedZoneMode(layout) === "corner" ||
      layoutFeaturedZoneMode(layout) === "portrait-strip",
    offline: input.offline,
  }).catch(() => null);

  const slotResult = input.offline
    ? {
        draft: writeSlotsOffline({
          userMessage: input.userMessage,
          platformId: input.platformId,
          dynamicLayout,
          rulesProfile: effectiveRules,
          artifact,
        }),
        retries: 0,
        validationReasons: [] as string[],
      }
    : await writeSlotsWithRetries({
        modelId: input.modelId,
        intent: input.plan,
        layout,
        dynamicLayout,
        userMessage: input.userMessage,
        platformId: input.platformId,
        brandSummary: input.brandSummary,
        rulesProfile: effectiveRules,
        themeAngle: input.themeAngle,
        recipe,
        artifact,
      });

  const primaryCopy = primaryCopyFromTextSlots(slotResult.draft.textSlots);
  // Deliver primary copy first; the chat service fills the optional pool later.
  const copyVariants = [primaryCopy];
  const stockPhoto = await stockPhotoPromise;
  repairSteps.push(...slotResult.validationReasons.map(reason => `copy_validation: ${reason}`));

  const rationale = [ranked.rationale, recipeRationale, ...adapted.variantNotes]
    .filter(Boolean)
    .join(" · ");

  let planInput = assembleDesignPlan({
    intent: input.plan,
    layout,
    layoutId,
    rationale,
    slotDraft: slotResult.draft,
    visual,
    brief: input.userMessage,
    rulesProfile: effectiveRules,
    theme: input.themeAngle,
    copyVariants,
    copyVariantIndex: 0,
    recipe,
    brandAccent: input.brandSummary?.accent,
  });

  let validated = validateDesignPlan(planInput, input.platformId, effectiveRules);
  if (!validated.ok) {
    const offlineDraft = writeSlotsOffline({
      userMessage: input.userMessage,
      platformId: input.platformId,
      dynamicLayout,
      rulesProfile: effectiveRules,
      artifact,
    });
    planInput = assembleDesignPlan({
      intent: input.plan,
      layout,
      layoutId,
      rationale,
      slotDraft: offlineDraft,
      visual,
      brief: input.userMessage,
      rulesProfile: effectiveRules,
      theme: input.themeAngle,
      copyVariants,
      copyVariantIndex: 0,
      recipe,
      brandAccent: input.brandSummary?.accent,
    });
    validated = validateDesignPlan(planInput, input.platformId, effectiveRules);
  }
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const artifactAdjusted = repairPlanForArtifactConstraints(validated.plan, artifact);
  const score = scoreDesign(artifactAdjusted, input.plan, effectiveRules);
  const intent = campaignPlanToIntent(input.plan);

  const pipelineTrace: PipelineTrace = {
    campaignType: input.plan.campaign.type,
    artifactId: input.artifactId,
    platformId: input.platformId,
    platformReason: input.platformReason,
    pattern: pattern.id,
    recipeId: recipe.id,
    designSystemId: system.id,
    layoutId,
    visualReason: visual.reason,
    stockPhotoId: stockPhoto?.id,
    scoreTotal: score.total,
    repairSteps,
  };

  const canvasSpec = canvasSpecFromArtifact(artifact);
  const rendererId = resolveRenderer(artifact.capabilities, artifact.renderer);

  return {
    intent,
    campaignPlan: { ...input.plan, artifactId: input.artifactId, platform: input.platformId },
    artifactId: input.artifactId,
    artifactCategory: artifact.category,
    canvasSpec,
    rendererId,
    stockPhoto,
    platformId: input.platformId,
    platformReason: input.platformReason,
    layoutId,
    rationale,
    planInput,
    validatedPlan: artifactAdjusted,
    summary: buildSummary({
      plan: input.plan,
      layoutName: layout.name,
      rationale: ranked.rationale,
      score,
      theme: input.themeAngle,
      rulesLabel: input.rulesProfile.label,
      recipeName: recipe.name,
      systemLabel: system.label,
    }),
    score,
    rulesProfile: effectiveRules,
    theme: input.themeAngle,
    copyRetries: slotResult.retries,
    recipeId: recipe.id,
    designSystemId: system.id,
    visualStrategy: visual.reason,
    bundleId: bundle?.id,
    pipelineTrace,
  };
}

export async function runDesignPipeline(input: PipelineInput): Promise<PipelineResult> {
  const userMessage = resolveBriefContext(input.userMessage || getLatestUserMessage(input.messages), input.messages);

  let plan = input.offline
    ? campaignPlanFromBrief(userMessage, input.platformId, input.themeAngle)
    : await planCampaign({ ...input, userMessage });
  const resolvedBrief = plan.resolvedBrief ?? userMessage;
  const artifactId = resolveArtifactId({
    brief: resolvedBrief,
    artifactId: input.artifactId,
    artifactCategory: input.artifactCategory,
    platformId: input.platformId,
  });
  const artifact = loadArtifactPlugin(artifactId);
  const platformResolution = resolvePlatformForDesign({ brief: resolvedBrief, artifact, fallbackPlatformId: input.platformId });
  const platformId = platformResolution.platformId;

  plan = { ...plan, artifactId, platform: platformId };

  const rulesProfile = resolveDesignRulesForPlan(plan, resolvedBrief);

  let result = await runPipelineAttempt({
    ...input,
    platformId,
    platformReason: platformResolution.reason,
    userMessage: resolvedBrief,
    plan,
    artifactId,
    rulesProfile,
  });

  result = finalizePipelineResult(result);
  // One bounded layout retry, shared by singles and variants. Keep the better result.
  if (!result.score.visualBalancePassed && getLayoutRetrievalMeta(getLayoutById(result.layoutId)).densityClass === "copyHeavy") {
    try {
      const retry = finalizePipelineResult(await runPipelineAttempt({
        ...input, variantIndex: undefined, userMessage: resolvedBrief, platformId,
        platformReason: platformResolution.reason, plan, artifactId, rulesProfile,
        layoutRetry: true, repairSteps: ["layout_retry"],
      }));
      if (retry.score.hardFailures.length < result.score.hardFailures.length ||
          (retry.score.hardFailures.length === result.score.hardFailures.length && retry.score.total > result.score.total)) result = retry;
    } catch {
      // A failed optional repair must not discard a usable draft.
      result.pipelineTrace?.repairSteps.push("layout_retry_failed");
    }
  }
  return result;
}

export async function runDesignPipelineVariants(
  input: PipelineInput,
): Promise<PipelineVariantsResult> {
  const userMessage = resolveBriefContext(input.userMessage || getLatestUserMessage(input.messages), input.messages);
  const themes = extractThemesFromBrief(userMessage).slice(0, 3);

  const angles = themes.length ? themes : ["Message first", "Visual first", "Balanced"];
  const settled = await Promise.allSettled(angles.map(async (theme, variantIndex): Promise<DesignVariant> => {
    const result = await runDesignPipeline({
      ...input,
      userMessage,
      messages: [], // context was resolved above
      themeAngle: theme,
      variantIndex,
    });
    return { ...result, theme };
  }));
  const variants = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  if (!variants.length) throw new Error("No design variants could be generated.");
  const first = variants[0];
  return {
    intent: first.intent,
    campaignPlan: first.campaignPlan,
    rulesProfile: first.rulesProfile,
    variants,
    summary: `Generated ${variants.length} design variants from your brief.${variants.length < angles.length ? " Some variants could not be generated; the successful designs are ready." : ""}`,
  };
}

/** One canonical plan is used for application, reporting and scoring. */
export function finalizePipelineResult(result: PipelineResult): PipelineResult {
  const rules = result.rulesProfile;
  const artifact = loadArtifactPlugin(result.artifactId);
  const steps = [...(result.pipelineTrace?.repairSteps ?? [])];
  // Copy rewrites happen before assembly. Do not cut already validated copy here.
  const adjusted = repairPlanForArtifactConstraints(result.validatedPlan, artifact);
  const revalidated = validateDesignPlan(adjusted, result.platformId, rules);
  if (!revalidated.ok) throw new Error(revalidated.error);
  const validatedPlan = revalidated.plan;
  const score = scoreDesign(validatedPlan, result.campaignPlan, rules);
  const primary = primaryCopyFromTextSlots(validatedPlan.textSlots);
  validatedPlan.copyVariants = [primary];
  validatedPlan.copyVariantIndex = 0;
  const summary = `${result.rationale} Structural checks: ${score.total}/100.${score.visualBalancePassed ? "" : " This draft needs review: " + score.checks.filter(check => !check.passed).map(check => check.label).join(", ") + "."}`;
  return {
    ...result,
    planInput: designPlanSchema.parse(validatedPlan),
    validatedPlan,
    score,
    summary,
    pipelineTrace: result.pipelineTrace ? { ...result.pipelineTrace, scoreTotal: score.total, repairSteps: steps } : undefined,
  };
}

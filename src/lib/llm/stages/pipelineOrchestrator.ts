import {
  extractThemesFromBrief,
  resolveDesignRulesForPlan,
} from "@/lib/llm/rules";
import { planCampaign } from "@/lib/llm/stages/creativePlanner";
import { rankLayout } from "@/lib/llm/stages/layoutRanker";
import { writeSlotsWithRetries } from "@/lib/llm/stages/slotWriter";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import {
  buildCopyVariantPool,
  primaryCopyFromTextSlots,
  writeCopyVariants,
  writeCopyVariantsOffline,
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
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { scoreDesign, repairPlanCopyForBalance, repairPlanDropOptionalSlots } from "@/lib/social-tool/engine/scoringEngine";
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
import {
  campaignPlanToIntent,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { UIMessage } from "ai";

export type PipelineInput = {
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
    ` Design quality score: ${input.score.total}/100.`,
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
    6,
    effectiveRules,
    input.userMessage,
    recipe,
    system,
  );
  candidates = filterLayoutCandidatesForArtifact(candidates, artifact);

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
  const layoutId = adapted.layoutId;
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
  });

  const bundle = pickBundleForArtifact(artifact, recipe.bundles?.[0]);

  const stockPhoto = await resolveStockPhotoForArtifact({
    artifact,
    brief: input.userMessage,
    offline: input.offline,
  });

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
  const alternativeVariants = input.offline
    ? writeCopyVariantsOffline({
        userMessage: input.userMessage,
        rulesProfile: effectiveRules,
      })
    : await writeCopyVariants({
        intent: input.plan,
        userMessage: input.userMessage,
        platformId: input.platformId,
        brandSummary: input.brandSummary,
        rulesProfile: effectiveRules,
        themeAngle: input.themeAngle,
        excludePrimary: primaryCopy,
      });
  const copyVariants = buildCopyVariantPool(
    primaryCopy,
    alternativeVariants,
    effectiveRules,
  );

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
  const userMessage = input.userMessage || getLatestUserMessage(input.messages);

  const preliminaryPlan = campaignPlanFromBrief(
    userMessage,
    input.platformId,
    input.themeAngle,
  );
  const artifactId = resolveArtifactId({
    brief: userMessage,
    artifactId: input.artifactId ?? preliminaryPlan.artifactId,
    artifactCategory: input.artifactCategory,
    platformId: input.platformId,
  });
  const artifact = loadArtifactPlugin(artifactId);
  const platformResolution = resolvePlatformForDesign({
    brief: userMessage,
    artifact,
    fallbackPlatformId: input.platformId,
  });
  const platformId = platformResolution.platformId;

  let plan = input.offline
    ? campaignPlanFromBrief(userMessage, platformId, input.themeAngle)
    : await planCampaign({
        userMessage,
        messages: input.messages,
        platformId,
        themeAngle: input.themeAngle,
      });

  plan = { ...plan, artifactId, platform: platformId };

  const rulesProfile = resolveDesignRulesForPlan(plan, userMessage);

  let result = await runPipelineAttempt({
    ...input,
    platformId,
    platformReason: platformResolution.reason,
    userMessage,
    plan,
    artifactId,
    rulesProfile,
  });

  if (!result.score.visualBalancePassed) {
    let repairedPlan = repairPlanCopyForBalance(result.validatedPlan, rulesProfile);
    let repairedScore = scoreDesign(repairedPlan, plan, rulesProfile);
    const steps = ["copy_truncate"];

    if (!repairedScore.visualBalancePassed) {
      repairedPlan = repairPlanDropOptionalSlots(repairedPlan, rulesProfile);
      repairedScore = scoreDesign(repairedPlan, plan, rulesProfile);
      steps.push("drop_optional_slots");
    }

    if (repairedScore.visualBalancePassed) {
      result = {
        ...result,
        validatedPlan: repairedPlan,
        score: repairedScore,
        pipelineTrace: result.pipelineTrace
          ? {
              ...result.pipelineTrace,
              scoreTotal: repairedScore.total,
              repairSteps: [...(result.pipelineTrace.repairSteps ?? []), ...steps],
            }
          : result.pipelineTrace,
      };
    } else {
      const meta = getLayoutRetrievalMeta(getLayoutById(result.layoutId));
      if (meta.densityClass === "copyHeavy") {
        result = await runPipelineAttempt({
          ...input,
          platformId,
          platformReason: platformResolution.reason,
          userMessage,
          plan,
          artifactId,
          rulesProfile,
          layoutRetry: true,
          repairSteps: [...steps, "layout_retry"],
        });
      }
    }
  }

  return result;
}

export async function runDesignPipelineVariants(
  input: PipelineInput,
): Promise<PipelineVariantsResult> {
  const userMessage = input.userMessage || getLatestUserMessage(input.messages);
  const themes = extractThemesFromBrief(userMessage).slice(0, 3);

  const basePlan = input.offline
    ? campaignPlanFromBrief(userMessage, input.platformId)
    : await planCampaign({
        userMessage,
        messages: input.messages,
        platformId: input.platformId,
      });

  const artifactId = resolveArtifactId({
    brief: userMessage,
    artifactId: input.artifactId ?? basePlan.artifactId,
    artifactCategory: input.artifactCategory,
    platformId: input.platformId,
  });
  const artifact = loadArtifactPlugin(artifactId);
  const platformResolution = resolvePlatformForDesign({
    brief: userMessage,
    artifact,
    fallbackPlatformId: input.platformId,
  });
  const platformId = platformResolution.platformId;

  const planWithArtifact = { ...basePlan, artifactId, platform: platformId };

  const rulesProfile = resolveDesignRulesForPlan(planWithArtifact, userMessage);
  const angles = themes.length > 0 ? themes : [undefined];

  // Run themed variants in parallel — sequential attempts were a common cause of
  // FUNCTION_INVOCATION_TIMEOUT on /api/brief/chat (3× full pipeline wall-clock).
  const variants = await Promise.all(
    angles.map(async (theme): Promise<DesignVariant> => {
      const plan = theme
        ? {
            ...planWithArtifact,
            primaryMessage: `${planWithArtifact.primaryMessage} — ${theme}`,
            themes: [...new Set([...planWithArtifact.themes, theme])],
          }
        : planWithArtifact;

      let result = await runPipelineAttempt({
        ...input,
        platformId,
        platformReason: platformResolution.reason,
        userMessage,
        plan,
        artifactId,
        rulesProfile,
        themeAngle: theme,
      });

      if (!result.score.visualBalancePassed) {
        const meta = getLayoutRetrievalMeta(getLayoutById(result.layoutId));
        if (meta.densityClass === "copyHeavy") {
          result = await runPipelineAttempt({
            ...input,
            platformId,
            platformReason: platformResolution.reason,
            userMessage,
            plan,
            artifactId,
            rulesProfile,
            themeAngle: theme,
            layoutRetry: true,
          });
        }
      }

      return {
        theme: theme ?? "default",
        planInput: result.planInput,
        validatedPlan: result.validatedPlan,
        score: result.score,
        summary: result.summary,
        layoutId: result.layoutId,
        rationale: result.rationale,
        campaignPlan: result.campaignPlan,
        recipeId: result.recipeId,
        designSystemId: result.designSystemId,
      };
    }),
  );

  return {
    intent: campaignPlanToIntent(planWithArtifact),
    campaignPlan: planWithArtifact,
    rulesProfile,
    variants,
    summary: `Generated ${variants.length} design variants from your brief.`,
  };
}

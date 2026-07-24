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
import { validateDesignPlan } from "@/lib/llm/services/layoutValidator";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";
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
  rulesProfile: ReturnType<typeof resolveDesignRulesForPlan>;
  layoutRetry?: boolean;
  repairSteps?: string[];
}): Promise<PipelineResult> {
  const repairSteps = [...(input.repairSteps ?? [])];
  const system = retrieveDesignSystem(input.plan);
  const { recipe, pattern, rationale: recipeRationale } = resolveRecipe(
    input.plan,
    system,
  );

  const candidates = retrieveLayouts(
    input.plan,
    input.platformId,
    undefined,
    6,
    input.rulesProfile,
    input.userMessage,
    recipe,
    system,
  );

  let ranked = input.offline
    ? {
        layoutId: candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId),
        rationale: `${candidates[0]?.layout.name ?? "Classic Hero"} matched ${recipe.name} / ${input.plan.communication.pattern}.`,
      }
    : await rankLayout(
        input.plan,
        candidates,
        input.userMessage,
        input.rulesProfile,
        recipe,
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
    input.rulesProfile,
  );
  const layoutId = adapted.layoutId;
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);

  const visual = resolveVisualStrategy({
    plan: input.plan,
    layout,
    system,
    rulesProfile: input.rulesProfile,
    brief: input.userMessage,
    recipe,
    backgroundCatalog: input.backgroundCatalog,
    recentBackgroundPresetIds: input.recentBackgroundPresetIds,
  });

  const slotResult = input.offline
    ? {
        draft: writeSlotsOffline({
          userMessage: input.userMessage,
          platformId: input.platformId,
          dynamicLayout,
          rulesProfile: input.rulesProfile,
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
        rulesProfile: input.rulesProfile,
        themeAngle: input.themeAngle,
        recipe,
      });

  const primaryCopy = primaryCopyFromTextSlots(slotResult.draft.textSlots);
  const alternativeVariants = input.offline
    ? writeCopyVariantsOffline({
        userMessage: input.userMessage,
        rulesProfile: input.rulesProfile,
      })
    : await writeCopyVariants({
        intent: input.plan,
        userMessage: input.userMessage,
        platformId: input.platformId,
        brandSummary: input.brandSummary,
        rulesProfile: input.rulesProfile,
        themeAngle: input.themeAngle,
        excludePrimary: primaryCopy,
      });
  const copyVariants = buildCopyVariantPool(
    primaryCopy,
    alternativeVariants,
    input.rulesProfile,
  );

  const rationale = [ranked.rationale, recipeRationale, ...adapted.variantNotes]
    .filter(Boolean)
    .join(" · ");

  const planInput = assembleDesignPlan({
    intent: input.plan,
    layout,
    layoutId,
    rationale,
    slotDraft: slotResult.draft,
    visual,
    brief: input.userMessage,
    rulesProfile: input.rulesProfile,
    theme: input.themeAngle,
    copyVariants,
    copyVariantIndex: 0,
    recipe,
  });

  const validated = validateDesignPlan(planInput, input.platformId, input.rulesProfile);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const score = scoreDesign(validated.plan, input.plan, input.rulesProfile);
  const intent = campaignPlanToIntent(input.plan);

  const pipelineTrace: PipelineTrace = {
    campaignType: input.plan.campaign.type,
    pattern: pattern.id,
    recipeId: recipe.id,
    designSystemId: system.id,
    layoutId,
    visualReason: visual.reason,
    scoreTotal: score.total,
    repairSteps,
  };

  return {
    intent,
    campaignPlan: input.plan,
    layoutId,
    rationale,
    planInput,
    validatedPlan: validated.plan,
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
    rulesProfile: input.rulesProfile,
    theme: input.themeAngle,
    copyRetries: slotResult.retries,
    recipeId: recipe.id,
    designSystemId: system.id,
    visualStrategy: visual.reason,
    pipelineTrace,
  };
}

export async function runDesignPipeline(input: PipelineInput): Promise<PipelineResult> {
  const userMessage = input.userMessage || getLatestUserMessage(input.messages);

  const plan = input.offline
    ? campaignPlanFromBrief(userMessage, input.platformId, input.themeAngle)
    : await planCampaign({
        userMessage,
        messages: input.messages,
        platformId: input.platformId,
        themeAngle: input.themeAngle,
      });

  const rulesProfile = resolveDesignRulesForPlan(plan, userMessage);

  let result = await runPipelineAttempt({
    ...input,
    userMessage,
    plan,
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
          userMessage,
          plan,
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

  const rulesProfile = resolveDesignRulesForPlan(basePlan, userMessage);
  const angles = themes.length > 0 ? themes : [undefined];

  // Run themed variants in parallel — sequential attempts were a common cause of
  // FUNCTION_INVOCATION_TIMEOUT on /api/brief/chat (3× full pipeline wall-clock).
  const variants = await Promise.all(
    angles.map(async (theme): Promise<DesignVariant> => {
      const plan = theme
        ? {
            ...basePlan,
            primaryMessage: `${basePlan.primaryMessage} — ${theme}`,
            themes: [...new Set([...basePlan.themes, theme])],
          }
        : basePlan;

      let result = await runPipelineAttempt({
        ...input,
        userMessage,
        plan,
        rulesProfile,
        themeAngle: theme,
      });

      if (!result.score.visualBalancePassed) {
        const meta = getLayoutRetrievalMeta(getLayoutById(result.layoutId));
        if (meta.densityClass === "copyHeavy") {
          result = await runPipelineAttempt({
            ...input,
            userMessage,
            plan,
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
    intent: campaignPlanToIntent(basePlan),
    campaignPlan: basePlan,
    rulesProfile,
    variants,
    summary: `Generated ${variants.length} design variants from your brief.`,
  };
}

import type { UIMessage } from "ai";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignPlan } from "@/lib/llm/schemas/designPlan";
import {
  extractThemesFromBrief,
  resolveDesignRulesForBrief,
  rulesProfilePrompt,
} from "@/lib/llm/rules";
import { analyzeIntent } from "@/lib/llm/stages/intentAnalyzer";
import { rankLayout } from "@/lib/llm/stages/layoutRanker";
import { writeSlotsWithRetries } from "@/lib/llm/stages/slotWriter";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import type {
  DesignVariant,
  PipelineResult,
  PipelineVariantsResult,
} from "@/lib/llm/stages/pipelineTypes";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import { validateDesignPlan } from "@/lib/llm/services/layoutValidator";
import { assembleDesignPlan } from "@/lib/social-tool/engine/assembleDesignPlan";
import { intentFromBrief } from "@/lib/social-tool/engine/intentFromBrief";
import { applyLayoutVariants } from "@/lib/social-tool/engine/layoutVariants";
import {
  getLayoutById,
  retrieveLayouts,
  type LayoutCandidate,
} from "@/lib/social-tool/engine/layoutRetriever";
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { scoreDesign } from "@/lib/social-tool/engine/scoringEngine";
import { applyVisualPolicy } from "@/lib/social-tool/engine/visualPolicy";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

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
  intent: CampaignIntent;
  layoutName: string;
  rationale: string;
  score: { total: number };
  theme?: string;
  rulesLabel: string;
}): string {
  return [
    input.theme
      ? `Theme **${input.theme}** — `
      : "",
    `I analyzed your brief as a ${input.intent.campaignType.replace("_", " ")} (${input.rulesLabel}) aimed at ${input.intent.audience.replace("_", " ")}.`,
    `I chose **${input.layoutName}** — ${input.rationale}`,
    `Design quality score: ${input.score.total}/100.`,
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
  intent: CampaignIntent;
  rulesProfile: ReturnType<typeof resolveDesignRulesForBrief>;
  layoutRetry?: boolean;
}): Promise<PipelineResult> {
  const candidates = retrieveLayouts(
    input.intent,
    input.platformId,
    undefined,
    6,
    input.rulesProfile,
    input.userMessage,
  );

  let ranked = input.offline
    ? {
        layoutId: candidates[0]?.layout.id ?? ("classic-hero" as PostLayoutId),
        rationale: `${candidates[0]?.layout.name ?? "Classic Hero"} matched ${input.intent.primaryIntent}.`,
      }
    : await rankLayout(input.intent, candidates, input.userMessage, input.rulesProfile);

  if (input.layoutRetry) {
    ranked = {
      layoutId: pickVisualFallbackLayout(candidates),
      rationale: "Switched to a visual-first layout for better balance.",
    };
  }

  const { layoutId } = applyLayoutVariants(ranked.layoutId, input.intent, input.rulesProfile);
  const layout = getLayoutById(layoutId);
  const dynamicLayout = catalogLayoutToDynamic(layout);
  const visual = applyVisualPolicy(
    input.intent,
    layout,
    input.userMessage,
    input.rulesProfile,
    input.backgroundCatalog,
    input.recentBackgroundPresetIds,
  );

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
        intent: input.intent,
        layout,
        dynamicLayout,
        userMessage: input.userMessage,
        platformId: input.platformId,
        brandSummary: input.brandSummary,
        rulesProfile: input.rulesProfile,
        themeAngle: input.themeAngle,
      });

  const planInput = assembleDesignPlan({
    intent: input.intent,
    layout,
    layoutId,
    rationale: ranked.rationale,
    slotDraft: slotResult.draft,
    visual,
    brief: input.userMessage,
    rulesProfile: input.rulesProfile,
    theme: input.themeAngle,
  });

  const validated = validateDesignPlan(planInput, input.platformId, input.rulesProfile);
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const score = scoreDesign(validated.plan, input.intent, input.rulesProfile);

  return {
    intent: input.intent,
    layoutId,
    rationale: ranked.rationale,
    planInput,
    validatedPlan: validated.plan,
    summary: buildSummary({
      intent: input.intent,
      layoutName: layout.name,
      rationale: ranked.rationale,
      score,
      theme: input.themeAngle,
      rulesLabel: input.rulesProfile.label,
    }),
    score,
    rulesProfile: input.rulesProfile,
    theme: input.themeAngle,
    copyRetries: slotResult.retries,
  };
}

export async function runDesignPipeline(input: PipelineInput): Promise<PipelineResult> {
  const userMessage = input.userMessage || getLatestUserMessage(input.messages);

  const intent = input.offline
    ? intentFromBrief(userMessage, input.platformId)
    : await analyzeIntent({
        userMessage,
        messages: input.messages,
        platformId: input.platformId,
      });

  const rulesProfile = resolveDesignRulesForBrief(intent, userMessage);

  let result = await runPipelineAttempt({
    ...input,
    userMessage,
    intent,
    rulesProfile,
  });

  if (!result.score.visualBalancePassed) {
    if ((result.copyRetries ?? 0) < rulesProfile.maxCopyRetries) {
      result = await runPipelineAttempt({
        ...input,
        userMessage,
        intent,
        rulesProfile,
      });
    }

    if (!result.score.visualBalancePassed) {
      const meta = getLayoutRetrievalMeta(getLayoutById(result.layoutId));
      if (meta.densityClass === "copyHeavy") {
        result = await runPipelineAttempt({
          ...input,
          userMessage,
          intent,
          rulesProfile,
          layoutRetry: true,
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
  const themes = extractThemesFromBrief(userMessage);

  const intent = input.offline
    ? intentFromBrief(userMessage, input.platformId)
    : await analyzeIntent({
        userMessage,
        messages: input.messages,
        platformId: input.platformId,
      });

  const rulesProfile = resolveDesignRulesForBrief(intent, userMessage);
  const themeList = themes.length > 0 ? themes : [intent.primaryIntent];

  const variants: DesignVariant[] = [];
  for (const theme of themeList.slice(0, 3)) {
    const themedIntent: CampaignIntent = {
      ...intent,
      primaryIntent: theme,
      keywords: [...new Set([...intent.keywords, theme])],
    };

    const result = await runPipelineAttempt({
      ...input,
      userMessage,
      intent: themedIntent,
      rulesProfile,
      themeAngle: theme,
    });

    if (!result.score.visualBalancePassed) {
      const retried = await runPipelineAttempt({
        ...input,
        userMessage,
        intent: themedIntent,
        rulesProfile,
        themeAngle: theme,
        layoutRetry: true,
      });
      variants.push({
        theme,
        planInput: retried.planInput,
        validatedPlan: retried.validatedPlan,
        score: retried.score,
        summary: retried.summary,
        layoutId: retried.layoutId,
        rationale: retried.rationale,
      });
      continue;
    }

    variants.push({
      theme,
      planInput: result.planInput,
      validatedPlan: result.validatedPlan,
      score: result.score,
      summary: result.summary,
      layoutId: result.layoutId,
      rationale: result.rationale,
    });
  }

  return {
    intent,
    rulesProfile,
    variants,
    summary: `Generated ${variants.length} variant${variants.length === 1 ? "" : "s"} using ${rulesProfile.label} rules.`,
  };
}

export function rulesPromptForPipeline(rulesProfile: ReturnType<typeof resolveDesignRulesForBrief>): string {
  return rulesProfilePrompt(rulesProfile);
}

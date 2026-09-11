import { writeCopyVariants, buildCopyVariantPool, primaryCopyFromTextSlots } from "@/lib/llm/stages/copyVariantWriter";
import { resolveBriefContext } from "@/lib/llm/stages/briefContext";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  getLlmApiKey,
  getLlmConfigurationError,
} from "@/lib/llm/mistral";
import { designSnapshotSchema } from "@/lib/llm/schemas/designSnapshot";
import { shouldGenerateVariants } from "@/lib/llm/rules";
import {
  finalizePipelineResult,
  getLatestUserMessage,
  runDesignPipeline,
  runDesignPipelineVariants,
} from "@/lib/llm/stages/pipelineOrchestrator";
import { runDesignPipelineOffline } from "@/lib/llm/stages/pipelineOrchestratorOffline";
import { toBriefChatClientError } from "@/lib/llm/streamErrors";
import { routeFollowUp } from "@/lib/llm/stages/followUpRouter";
import {
  handleCanvasAgentRequest,
  handleClarifyRequest,
} from "@/lib/llm/services/canvasAgentService";
import type { PlatformId } from "@/lib/social-tool/presets";
import { resolvePipelineBrandContext } from "@/lib/brand/starterPalettes";
import { isOpenRouterChatModelId, type OpenRouterChatModelId } from "@/lib/llm/models";

export type BriefChatRequestBody = {
  messages: UIMessage[];
  platformId: PlatformId;
  artifactCategory?: import("@/lib/design-config/schemas").ArtifactCategoryId;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  designSnapshot?: z.infer<typeof designSnapshotSchema>;
  modelId?: OpenRouterChatModelId;
};

export async function handleBriefChatRequest(body: BriefChatRequestBody) {
  if (!getLlmApiKey()) {
    return new Response(JSON.stringify({ error: getLlmConfigurationError() }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, platformId, artifactCategory, brandSummary, designSnapshot } = body;
  const userMessage = getLatestUserMessage(messages);

  if (designSnapshot) {
    const parsedSnapshot = designSnapshotSchema.safeParse(designSnapshot);
    if (parsedSnapshot.success && parsedSnapshot.data.onboardingPhase === "ready") {
      const route = await routeFollowUp(userMessage, parsedSnapshot.data, body.modelId);

      if (route.mode === "clarify") {
        return handleClarifyRequest(route.question);
      }

      if (route.mode === "edit") {
        return handleCanvasAgentRequest({
          messages,
          modelId: body.modelId,
          snapshot: parsedSnapshot.data,
        });
      }
    }
  }

  const hasLogo = designSnapshot?.brand.hasLogo ?? false;
  const brandContext = resolvePipelineBrandContext({
    brief: userMessage,
    platformId,
    hasLogo,
    sessionColors:
      designSnapshot?.brand.primary &&
      designSnapshot?.brand.secondary &&
      designSnapshot?.brand.accent
        ? {
            primary: designSnapshot.brand.primary,
            secondary: designSnapshot.brand.secondary,
            accent: designSnapshot.brand.accent,
          }
        : undefined,
    backgroundCatalog:
      designSnapshot?.brand.backgroundPresets.map((preset) => ({
        id: preset.id,
        label: preset.label,
      })) ?? [],
    seed: userMessage,
  });
  const backgroundCatalog = brandContext.backgroundCatalog;

  const recentBackgroundPresetIds = designSnapshot?.brand.activeBackgroundPresetId
    ? [designSnapshot.brand.activeBackgroundPresetId]
    : [];

  const useVariants = shouldGenerateVariants(userMessage);


  // Open the SSE response immediately so proxies/Vercel see first bytes while the
  // multi-stage pipeline runs (wall-clock still counts toward maxDuration).
  const stream = createUIMessageStream({
    onError: toBriefChatClientError,
    execute: async ({ writer }) => {
      writer.write({ type: "start" });
      const deliver = (toolName: string, output: unknown, summary: string) => {
        const toolCallId = crypto.randomUUID();
        writer.write({ type: "tool-input-available", toolCallId, toolName, input: {} });
        writer.write({ type: "tool-output-available", toolCallId, output });
        const id = crypto.randomUUID();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: summary });
        writer.write({ type: "text-end", id });
      };
      const applyOptions = (result: import("@/lib/llm/stages/pipelineTypes").PipelineResult) => ({
        artifactId: result.artifactId,
        artifactCategory: result.artifactCategory,
        canvasSpec: result.canvasSpec,
        rendererId: result.rendererId,
        stockPhoto: result.stockPhoto,
        platformId: result.platformId,
        platformReason: result.platformReason,
        bundleId: result.bundleId,
        assumedBrandColors: hasLogo ? undefined : brandContext.brandColors,
      });
      if (useVariants) {
        let variantsResult;
        try {
          variantsResult = await runDesignPipelineVariants({
            userMessage,
            modelId: body.modelId,
            messages,
            platformId,
            artifactCategory,
            brandSummary,
            backgroundCatalog,
            recentBackgroundPresetIds,
          });
        } catch (err) {
          console.error("[brief-chat] variant pipeline failed, trying offline", err);
          const offline = runDesignPipelineOffline({
            userMessage: resolveBriefContext(userMessage, messages),
            platformId,
            artifactCategory,
            backgroundCatalog,
            hasLogo,
          });
          if (!offline) throw err;
          variantsResult = {
            intent: offline.intent,
            campaignPlan: offline.campaignPlan,
            rulesProfile: offline.rulesProfile,
            summary: offline.summary,
            variants: [{ ...finalizePipelineResult(offline), theme: offline.theme ?? "Default" }],
          };
        }

        const variants = variantsResult.variants.map(variant => ({
          theme: variant.theme,
          layoutId: variant.layoutId,
          rationale: variant.rationale,
          summary: variant.summary,
          score: variant.score.total,
          plan: variant.validatedPlan,
          applyOptions: applyOptions(variant),
        }));
        deliver("updateDesignVariants", { success: true, variants, summary: variantsResult.summary },
          `${variantsResult.summary} Choose a variant to apply it.`);
        writer.write({ type: "finish", finishReason: "stop" });
        return;
      }

      let pipeline;
      try {
        pipeline = await runDesignPipeline({
          userMessage,
          modelId: body.modelId,
          messages,
          platformId,
          artifactCategory,
          brandSummary,
          backgroundCatalog,
          recentBackgroundPresetIds,
        });
      } catch (err) {
        console.error("[brief-chat] pipeline failed, trying offline", err);
        const offline = runDesignPipelineOffline({
          userMessage: resolveBriefContext(userMessage, messages),
          platformId,
          artifactCategory,
          backgroundCatalog,
          hasLogo,
        });
        if (!offline) throw err;
        pipeline = offline;
      }

      pipeline = finalizePipelineResult(pipeline);
      deliver("updateDesign", {
        success: true,
        plan: pipeline.validatedPlan,
        score: pipeline.score.total,
        quality: pipeline.score,
        rulesProfileId: pipeline.rulesProfile.id,
        ...applyOptions(pipeline),
      }, pipeline.summary);
      // The canvas is already available. A failed optional pool never invalidates it.
      try {
        const primary = primaryCopyFromTextSlots(pipeline.validatedPlan.textSlots);
        const alternatives = await writeCopyVariants({
          modelId: body.modelId,
          userMessage: resolveBriefContext(userMessage, messages),
          platformId: pipeline.platformId,
          intent: pipeline.campaignPlan,
          rulesProfile: pipeline.rulesProfile,
          brandSummary,
          excludePrimary: primary,
        });
        const pool = buildCopyVariantPool(primary, alternatives, pipeline.rulesProfile);
        if (pool.length > 1) {
          const toolCallId = crypto.randomUUID();
          writer.write({ type: "tool-input-available", toolCallId, toolName: "refreshCopyVariants", input: {} });
          writer.write({ type: "tool-output-available", toolCallId, output: {
            success: true,
            targetArtboards: [designSnapshot?.artboards?.activeIndex ?? 1],
            document: { copyVariants: pool },
          } });
        }
      } catch {
        console.warn("[pipeline:alternatives] Optional copy pool unavailable");
      }
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export const briefChatBodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  platformId: z.string(),
  artifactCategory: z.string().optional(),
  brandSummary: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  designSnapshot: designSnapshotSchema.optional(),
  modelId: z
    .string()
    .optional()
    .refine((value) => value === undefined || isOpenRouterChatModelId(value), {
      message: "Unsupported AI model.",
    }),
});

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import {
  createMistralModel,
  getMistralApiKey,
  LLM_STREAM_TIMEOUT_MS,
} from "@/lib/llm/mistral";
import { designPlanSchema } from "@/lib/llm/schemas/designPlan";
import { designSnapshotSchema } from "@/lib/llm/schemas/designSnapshot";
import { shouldGenerateVariants } from "@/lib/llm/rules";
import {
  getLatestUserMessage,
  runDesignPipeline,
  runDesignPipelineVariants,
} from "@/lib/llm/stages/pipelineOrchestrator";
import { routeFollowUp } from "@/lib/llm/stages/followUpRouter";
import {
  handleCanvasAgentRequest,
  handleClarifyRequest,
} from "@/lib/llm/services/canvasAgentService";
import { validateDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { PlatformId } from "@/lib/social-tool/presets";

const designVariantResultSchema = z.object({
  theme: z.string(),
  layoutId: z.string(),
  rationale: z.string(),
  summary: z.string(),
  score: z.number(),
  plan: z.custom<unknown>(),
});

export type BriefChatRequestBody = {
  messages: UIMessage[];
  platformId: PlatformId;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  designSnapshot?: z.infer<typeof designSnapshotSchema>;
};

export async function handleBriefChatRequest(body: BriefChatRequestBody) {
  if (!getMistralApiKey()) {
    return new Response(JSON.stringify({ error: "MISTRAL_API_KEY is not configured." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, platformId, brandSummary, designSnapshot } = body;
  const userMessage = getLatestUserMessage(messages);

  if (designSnapshot) {
    const parsedSnapshot = designSnapshotSchema.safeParse(designSnapshot);
    if (parsedSnapshot.success && parsedSnapshot.data.onboardingPhase === "ready") {
      const route = await routeFollowUp(userMessage, parsedSnapshot.data);

      if (route.mode === "clarify") {
        return handleClarifyRequest(route.question);
      }

      if (route.mode === "edit") {
        return handleCanvasAgentRequest({
          messages,
          snapshot: parsedSnapshot.data,
        });
      }
    }
  }

  const backgroundCatalog =
    designSnapshot?.brand.backgroundPresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
    })) ?? [];

  const recentBackgroundPresetIds = designSnapshot?.brand.activeBackgroundPresetId
    ? [designSnapshot.brand.activeBackgroundPresetId]
    : [];

  const useVariants = shouldGenerateVariants(userMessage);
  const model = createMistralModel();

  // Open the SSE response immediately so proxies/Vercel see first bytes while the
  // multi-stage pipeline runs (wall-clock still counts toward maxDuration).
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (useVariants) {
        const variantsResult = await runDesignPipelineVariants({
          userMessage,
          messages,
          platformId,
          brandSummary,
          backgroundCatalog,
          recentBackgroundPresetIds,
        });

        const validatedVariants = variantsResult.variants
          .map((variant) => {
            const validated = validateDesignPlan(
              variant.planInput,
              platformId,
              variantsResult.rulesProfile,
            );
            if (!validated.ok) return null;
            return {
              theme: variant.theme,
              layoutId: variant.layoutId,
              rationale: variant.rationale,
              summary: variant.summary,
              score: variant.score.total,
              plan: validated.plan,
            };
          })
          .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

        const result = streamText({
          model,
          temperature: 0.3,
          timeout: LLM_STREAM_TIMEOUT_MS,
          // Allow a text step after the forced tool call (default stopWhen is 1 step).
          stopWhen: isStepCount(3),
          prepareStep: ({ stepNumber }) => {
            if (stepNumber === 0) {
              return {
                toolChoice: {
                  type: "tool" as const,
                  toolName: "updateDesignVariants" as const,
                },
              };
            }
            return { toolChoice: "none" as const };
          },
          system: [
            "You are Postforge's creative brief assistant.",
            "The pipeline generated multiple themed variants.",
            "Call updateDesignVariants to apply them.",
            "Then reply in 1-2 short sentences that the user can pick a variant below.",
            "Always end with conversational text — never finish on tool calls alone.",
            variantsResult.summary,
          ].join("\n"),
          messages: await convertToModelMessages(messages),
          tools: {
            updateDesignVariants: tool({
              description: "Return themed design variants for the user to pick.",
              inputSchema: z.object({
                variants: z.array(designVariantResultSchema).min(1).max(3),
                summary: z.string(),
              }),
              execute: async () => ({
                success: true as const,
                variants: validatedVariants,
                summary: variantsResult.summary,
                rulesProfileId: variantsResult.rulesProfile.id,
              }),
            }),
          },
          toolChoice: "auto",
        });

        writer.merge(result.toUIMessageStream());
        return;
      }

      const pipeline = await runDesignPipeline({
        userMessage,
        messages,
        platformId,
        brandSummary,
        backgroundCatalog,
        recentBackgroundPresetIds,
      });

      const result = streamText({
        model,
        temperature: 0.3,
        timeout: LLM_STREAM_TIMEOUT_MS,
        // Allow a text step after the forced tool call (default stopWhen is 1 step).
        stopWhen: isStepCount(3),
        prepareStep: ({ stepNumber }) => {
          if (stepNumber === 0) {
            return {
              toolChoice: { type: "tool" as const, toolName: "updateDesign" as const },
            };
          }
          return { toolChoice: "none" as const };
        },
        system: [
          "You are Postforge's creative brief assistant.",
          "The design pipeline has already chosen layout, copy, visual treatment, and a visuals-library block for the featured slot.",
          "Call updateDesign to apply the plan.",
          "Then explain the choices briefly in 2-4 sentences in natural language.",
          "Always end with conversational text — never finish on tool calls alone.",
          "Do not invent coordinates, layout geometry, alternate layouts, or custom AI visuals.",
          "",
          "Pipeline summary:",
          pipeline.summary,
          "",
          "Rules profile:",
          pipeline.rulesProfile.label,
          "",
          "Campaign plan:",
          JSON.stringify(pipeline.campaignPlan),
          "",
          "Trace:",
          JSON.stringify(pipeline.pipelineTrace),
          "",
          "Layout:",
          pipeline.layoutId,
        ].join("\n"),
        messages: await convertToModelMessages(messages),
        tools: {
          updateDesign: tool({
            description: "Apply the pipeline-generated design plan to the canvas.",
            inputSchema: designPlanSchema,
            execute: async () => {
              const validated = validateDesignPlan(
                pipeline.planInput,
                platformId,
                pipeline.rulesProfile,
              );
              if (!validated.ok) {
                return { success: false as const, error: validated.error };
              }
              return {
                success: true as const,
                plan: validated.plan,
                score: pipeline.score.total,
                rulesProfileId: pipeline.rulesProfile.id,
              };
            },
          }),
        },
        toolChoice: "auto",
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export const briefChatBodySchema = z.object({
  messages: z.array(z.custom<UIMessage>()),
  platformId: z.string(),
  brandSummary: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  designSnapshot: designSnapshotSchema.optional(),
});

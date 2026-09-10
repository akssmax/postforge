import { createMistral } from "@ai-sdk/mistral";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  DEFAULT_OPENROUTER_MODEL,
  OPENROUTER_FALLBACK_MODELS,
  type OpenRouterChatModelId,
} from "@/lib/llm/models";

export function getMistralApiKey(): string | undefined {
  return process.env.MISTRAL_API_KEY?.trim() || undefined;
}

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY?.trim() || undefined;
}

export function getLlmApiKey(): string | undefined {
  return getOpenRouterApiKey() ?? getMistralApiKey();
}

export function getLlmConfigurationError(): string {
  return "Configure OPENROUTER_API_KEY or MISTRAL_API_KEY to enable the AI assistant.";
}

/**
 * OpenRouter is preferred when configured, while Mistral remains a compatible
 * fallback for existing deployments. Both providers implement the AI SDK model
 * interface used by chat streaming, tool calls, and structured generation.
 */
export function createLlmModel(selectedModel?: OpenRouterChatModelId) {
  const openRouterApiKey = getOpenRouterApiKey();
  if (openRouterApiKey) {
    const openRouter = createOpenRouter({ apiKey: openRouterApiKey });
    const modelId =
      selectedModel ??
      (process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL);
    return openRouter(modelId);
  }

  const mistralApiKey = getMistralApiKey();
  if (!mistralApiKey) {
    throw new Error(getLlmConfigurationError());
  }
  const mistral = createMistral({ apiKey: mistralApiKey });
  const modelId = process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest";
  return mistral(modelId);
}

/** OpenRouter tries these zero-cost models in order if the selected model is unavailable. */
export function getLlmProviderOptions(selectedModel?: OpenRouterChatModelId) {
  if (!getOpenRouterApiKey()) return undefined;
  const primary =
    selectedModel ??
    (process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL);
  return {
    openrouter: {
      // OpenRouter accepts a primary model plus at most two fallback models.
      models: [
        primary,
        ...OPENROUTER_FALLBACK_MODELS.filter((model) => model !== primary).slice(0, 2),
      ],
    },
  };
}

/**
 * Per-stage generateObject budget. Stages already fall back offline on failure;
 * a hung provider call must not burn the whole Vercel function wall-clock.
 * generateObject omits `timeout` from its options — use abortSignal instead.
 */
export const LLM_STAGE_TIMEOUT_MS = 45_000;

/** Short classifier calls (follow-up router). */
export const LLM_CLASSIFY_TIMEOUT_MS = 12_000;

/** AI SVG compose/modify — larger structured output. */
export const LLM_VISUAL_TIMEOUT_MS = 45_000;

/** Final streamed chat / canvas agent reply after pipeline work. */
export const LLM_STREAM_TIMEOUT_MS = 90_000;

export function llmAbortSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

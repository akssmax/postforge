import { createMistral } from "@ai-sdk/mistral";

export function getMistralApiKey(): string | undefined {
  return process.env.MISTRAL_API_KEY?.trim() || undefined;
}

export function createMistralModel() {
  const apiKey = getMistralApiKey();
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is not configured.");
  }
  const mistral = createMistral({ apiKey });
  const modelId = process.env.MISTRAL_MODEL?.trim() || "mistral-small-latest";
  return mistral(modelId);
}

/**
 * Per-stage generateObject budget. Stages already fall back offline on failure;
 * a hung Mistral call must not burn the whole Vercel function wall-clock.
 * generateObject omits `timeout` from its options — use abortSignal instead.
 */
export const LLM_STAGE_TIMEOUT_MS = 25_000;

/** Short classifier calls (follow-up router). */
export const LLM_CLASSIFY_TIMEOUT_MS = 12_000;

/** AI SVG compose/modify — larger structured output. */
export const LLM_VISUAL_TIMEOUT_MS = 45_000;

/** Final streamed chat / canvas agent reply after pipeline work. */
export const LLM_STREAM_TIMEOUT_MS = 90_000;

export function llmAbortSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms);
}

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

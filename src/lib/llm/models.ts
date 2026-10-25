/** Free on OpenRouter for input and output, reads images, calls tools, ~1M context. */
export const DEFAULT_OPENROUTER_MODEL = "nvidia/nemotron-3.5-super-vl:free";

export const OPENROUTER_CHAT_MODELS = [
  { id: DEFAULT_OPENROUTER_MODEL, label: "NVIDIA Nemotron 3.5 Super VL", description: "Default · free · reads images" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "NVIDIA Nemotron 3 Super", description: "Free · text only" },
  { id: "google/gemma-4-31b-it:free", label: "Google Gemma 4 31B", description: "Free · reads images" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Google Gemma 4 26B", description: "Fallback" },
  { id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro", description: "Fallback" },
  { id: "nex-agi/nex-n2.5-mini:free", label: "Nex N2.5 Mini", description: "Fallback" },
] as const;

export type OpenRouterChatModelId = (typeof OPENROUTER_CHAT_MODELS)[number]["id"];
// OpenRouter permits only two fallback slots. Keep one provider family from each
// requested fallback group, rather than exhausting both slots on Google routes.
// Both read images and call tools; openrouter/free routes to any free model with
// the features a request needs, so a retired free model never breaks requests.
export const OPENROUTER_FALLBACK_MODELS = [
  "google/gemma-4-31b-it:free",
  "openrouter/free",
] as const;

/** Models the design agent can use: free, with image input and tool calling. */
export const VISION_MODEL_IDS: readonly string[] = [DEFAULT_OPENROUTER_MODEL, "google/gemma-4-31b-it:free", "openrouter/free"];
export const LLM_MODEL_STORAGE_KEY = "postforge:llm:model";

export function isOpenRouterChatModelId(value: unknown): value is OpenRouterChatModelId {
  return typeof value === "string" && OPENROUTER_CHAT_MODELS.some((model) => model.id === value);
}

export function getStoredLlmModel(): OpenRouterChatModelId {
  if (typeof window === "undefined") return DEFAULT_OPENROUTER_MODEL;
  const stored = localStorage.getItem(LLM_MODEL_STORAGE_KEY);
  return isOpenRouterChatModelId(stored) ? stored : DEFAULT_OPENROUTER_MODEL;
}

export function saveStoredLlmModel(modelId: OpenRouterChatModelId) {
  localStorage.setItem(LLM_MODEL_STORAGE_KEY, modelId);
}

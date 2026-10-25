/**
 * Which AI provider requests use, and the person's own API key if they gave
 * one. Kept in this browser only and sent with each AI request; the server
 * uses it for that request and never stores it.
 */
export type AiProvider = "default" | "openrouter" | "anthropic";
export type AiSettings = { provider: AiProvider; apiKey: string; model: string };

export const AI_SETTINGS_KEY = "postforge:ai-settings";
export const AI_HEADERS = { provider: "x-postforge-ai-provider", key: "x-postforge-ai-key", model: "x-postforge-ai-model" } as const;

export const DEFAULT_AI_SETTINGS: AiSettings = { provider: "default", apiKey: "", model: "" };

export function loadAiSettings(): AiSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) ?? "null") as Partial<AiSettings> | null;
    if (!raw || !["default", "openrouter", "anthropic"].includes(String(raw.provider))) return DEFAULT_AI_SETTINGS;
    return { provider: raw.provider as AiProvider, apiKey: String(raw.apiKey ?? ""), model: String(raw.model ?? "") };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(settings: AiSettings) {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage blocked: settings last for this page only
  }
}

/** Headers carrying the person's provider choice and key (empty for the default). */
export function aiRequestHeaders(settings: AiSettings = loadAiSettings()): Record<string, string> {
  if (settings.provider === "default" || !settings.apiKey.trim()) return {};
  return {
    [AI_HEADERS.provider]: settings.provider,
    [AI_HEADERS.key]: settings.apiKey.trim(),
    ...(settings.model.trim() ? { [AI_HEADERS.model]: settings.model.trim() } : {}),
  };
}

/** Rough shape check so a pasted key for the wrong provider is caught early. */
export function keyLooksValid(provider: AiProvider, key: string): boolean {
  const trimmed = key.trim();
  if (provider === "openrouter") return /^sk-or-[\w-]{10,}$/.test(trimmed);
  if (provider === "anthropic") return /^sk-ant-[\w-]{10,}$/.test(trimmed);
  return true;
}

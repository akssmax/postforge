import "server-only";
import { runDesignAgent, type AgentEvent, type AgentProvider, type AgentRequest } from "@/lib/agent/run";
import { runDesignAgentOpenRouter } from "@/lib/agent/run-openrouter";
import type { VisualFinder } from "@/lib/agent/workspace";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODELS } from "@/lib/llm/models";
import { AI_HEADERS } from "@/lib/llm/aiSettings";

/**
 * Pick the provider for a request: the person's own key from Settings
 * (OpenRouter or Anthropic), otherwise the server's OpenRouter key with a free
 * vision model. Returns null when neither is available.
 */
export function agentProviderFor(headers: Headers): AgentProvider | null {
  const kind = headers.get(AI_HEADERS.provider);
  const key = headers.get(AI_HEADERS.key)?.trim();
  const model = headers.get(AI_HEADERS.model)?.trim().slice(0, 120) || "";
  if (key && kind === "anthropic") return { kind: "anthropic", apiKey: key, model };
  if (key && kind === "openrouter") return { kind: "openrouter", apiKey: key, model: model || DEFAULT_OPENROUTER_MODEL, fallbacks: model ? [] : [...OPENROUTER_FALLBACK_MODELS] };
  const serverKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!serverKey) return null;
  const configured = process.env.DESIGN_AGENT_OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  return { kind: "openrouter", apiKey: serverKey, model: configured, fallbacks: [...OPENROUTER_FALLBACK_MODELS] };
}

/** True when the person pays with their own key (no sign-in needed then). */
export const usesOwnKey = (headers: Headers) => !!headers.get(AI_HEADERS.key)?.trim() && !!headers.get(AI_HEADERS.provider);

export function runAgent(request: AgentRequest, provider: AgentProvider, emit: (event: AgentEvent) => void, options: { findVisual?: VisualFinder; signal?: AbortSignal } = {}) {
  return provider.kind === "anthropic"
    ? runDesignAgent(request, emit, { apiKey: provider.apiKey, model: provider.model || undefined, ...options })
    : runDesignAgentOpenRouter(request, emit, { apiKey: provider.apiKey, model: provider.model, fallbacks: provider.fallbacks, ...options });
}

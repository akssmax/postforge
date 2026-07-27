/** Safe, user-facing brief-chat error text (also logged server-side). */
export function toBriefChatClientError(error: unknown): string {
  console.error("[brief-chat]", error);

  if (error == null) {
    return "Something went wrong generating your design. Please try again.";
  }

  if (typeof error === "string") {
    return sanitizeBriefChatMessage(error);
  }

  if (error instanceof Error) {
    return sanitizeBriefChatMessage(error.message);
  }

  try {
    return sanitizeBriefChatMessage(JSON.stringify(error));
  } catch {
    return "Something went wrong generating your design. Please try again.";
  }
}

function sanitizeBriefChatMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return "Something went wrong generating your design. Please try again.";
  }

  const lower = trimmed.toLowerCase();

  if (
    lower.includes("aborterror") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("function_invocation_timeout")
  ) {
    return "The design assistant timed out. Try a shorter brief or retry in a moment.";
  }

  if (lower.includes("429") || lower.includes("rate limit")) {
    return "The AI service is busy. Wait a few seconds and try again.";
  }

  if (lower.includes("503") || lower.includes("mistral_api_key")) {
    return "LLM unavailable — your next message will use the offline generator.";
  }

  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Network error — check your connection and try again.";
  }

  if (trimmed.length <= 180) {
    return trimmed;
  }

  return "Something went wrong generating your design. Please try again.";
}

/** Whether the client should route the next submit through offline generation. */
export function isBriefChatOfflineError(error: Error | undefined): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("mistral_api_key is not configured") ||
    msg.includes("llm unavailable") ||
    msg.includes("offline generator") ||
    msg.includes("failed to fetch") ||
    msg.includes("network error") ||
    msg.includes("network request failed")
  );
}

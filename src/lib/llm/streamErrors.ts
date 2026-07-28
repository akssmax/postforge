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

function extractJsonErrorField(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    /* not JSON */
  }
  return null;
}

function statusCodeFromError(error: Error): number | null {
  const record = error as Error & { statusCode?: unknown; status?: unknown };
  if (typeof record.statusCode === "number") return record.statusCode;
  if (typeof record.status === "number") return record.status;
  return null;
}

/** Resolve a useChat error into user-facing brief-chat copy. */
export function formatBriefChatError(error: Error | undefined): string | null {
  if (!error) return null;

  if (isBriefChatOfflineError(error)) {
    return "LLM unavailable — your next message will use the offline generator.";
  }

  const jsonField = extractJsonErrorField(error.message);
  if (jsonField) {
    return sanitizeBriefChatMessage(jsonField);
  }

  const genericMasked =
    error.message.trim() === "An error occurred." ||
    error.message.trim() === "An error occurred";

  let message = genericMasked
    ? "The design assistant hit an error while generating. Try again or use a shorter brief."
    : sanitizeBriefChatMessage(error.message);

  const statusCode = statusCodeFromError(error);
  if (
    statusCode &&
    statusCode >= 400 &&
    !message.includes(String(statusCode)) &&
    message.length < 200
  ) {
    message = `${message} (HTTP ${statusCode})`;
  }

  return message;
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

  if (lower.includes("invalid input") || lower.includes("validation")) {
    return trimmed.length <= 280 ? trimmed : `${trimmed.slice(0, 277)}…`;
  }

  if (trimmed.length <= 280) {
    return trimmed;
  }

  return `${trimmed.slice(0, 277)}…`;
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

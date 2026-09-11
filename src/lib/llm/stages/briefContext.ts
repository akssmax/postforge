import type { UIMessage } from "ai";

/** Keep user requirements only; generated assistant copy is not a source of facts. */
export function resolveBriefContext(latest: string, messages: UIMessage[]): string {
  const prior = messages.filter(message => message.role === "user")
    .map(message => message.parts.filter(part => part.type === "text").map(part => part.text).join("\n").trim())
    .filter(Boolean);
  if (prior.at(-1) === latest.trim()) prior.pop();
  // An explicit reset discards the old campaign, ordinary regeneration retains it.
  if (/\b(forget (?:the |all )?(?:previous|earlier)|ignore (?:the )?previous brief|unrelated (?:post|design)|new campaign)\b/i.test(latest)) return latest;
  const resetIndex = prior.findLastIndex(text => /\b(forget (?:the |all )?(?:previous|earlier)|ignore (?:the )?previous brief|unrelated (?:post|design)|new campaign)\b/i.test(text));
  const history = prior.slice(Math.max(0, resetIndex));
  if (!history.length) return latest;
  return [
    "Current request (takes precedence over earlier requirements):", latest,
    "Earlier user requirements, oldest first (retain unless superseded above):",
    ...history.map((text, i) => `${i + 1}. ${text}`),
  ].join("\n\n");
}

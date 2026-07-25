import type { VisualBlockGenerateInput, VisualBlockKind } from "@/lib/social-tool/visualBlocks/types";
import type { VisualLibraryPattern } from "./catalog";

/** Tags that identify the asset pack/style — not brief intent. */
const META_TAGS = new Set([
  "storyset",
  "rafiki",
  "bro",
  "amico",
  "pana",
  "cuate",
  "undraw",
  "open-doodles",
  "thiings",
  "3d",
  "icon",
]);

const STOP_TOKENS = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "that",
  "this",
  "from",
  "into",
  "about",
  "post",
  "design",
  "create",
  "make",
  "linkedin",
  "superleap",
]);

export type VisualPickIntent = {
  primaryIntent?: string;
  audience?: string;
  goal?: string;
  visualPriority?: string;
  proofStrategy?: string;
  featuredVisualKind?: "ui" | "illustration" | "3d";
  keywords?: string[];
  themes?: string[];
};

export function resolvePreferredVisualKind(
  input: VisualBlockGenerateInput,
): "ui" | "illustration" | "3d" | undefined {
  return input.preferredKind ?? input.intent?.featuredVisualKind;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 2 && !STOP_TOKENS.has(token));
}

export function buildVisualPickIntentFromText(
  ...parts: Array<string | undefined | null>
): VisualPickIntent {
  const haystack = parts.filter(Boolean).join(" ");
  const keywords = [...new Set(tokenize(haystack))];
  return { keywords };
}

function buildMatchHaystack(input: VisualBlockGenerateInput): string {
  return [
    input.headline,
    input.subheading,
    input.theme,
    input.brief,
    input.intent?.primaryIntent,
    input.intent?.audience,
    input.intent?.goal,
    ...(input.intent?.keywords ?? []),
    ...(input.intent?.themes ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function kindIntentBonus(
  kind: VisualBlockKind,
  intent: VisualPickIntent | undefined,
): number {
  if (!intent) return 0;
  let bonus = 0;

  if (intent.proofStrategy === "product_ui" && kind === "ui") bonus += 10;
  if (intent.proofStrategy === "stats" && kind === "diagram") bonus += 10;
  if (intent.proofStrategy === "social_proof" && kind === "illustration") bonus += 6;
  if (intent.proofStrategy === "social_proof" && kind === "3d") bonus += 4;

  if (intent.visualPriority === "product" && kind === "ui") bonus += 8;
  if (intent.visualPriority === "brand" && kind === "illustration") bonus += 8;
  if (intent.visualPriority === "brand" && kind === "3d") bonus += 5;
  if (intent.visualPriority === "copy" && kind === "illustration") bonus += 3;
  if (intent.visualPriority === "balanced") {
    if (kind === "illustration") bonus += 2;
    if (kind === "3d") bonus += 2;
    if (kind === "ui") bonus += 2;
  }

  if (intent.goal === "book_demo" && kind === "ui") bonus += 4;
  if (intent.goal === "signup" && kind === "ui") bonus += 3;
  if (intent.goal === "awareness" && kind === "illustration") bonus += 3;
  if (intent.goal === "awareness" && kind === "3d") bonus += 2;

  return bonus;
}

export function scoreVisualPattern(
  pattern: VisualLibraryPattern,
  input: VisualBlockGenerateInput,
): number {
  const haystack = buildMatchHaystack(input);
  const tokens = tokenize(haystack);
  let score = kindIntentBonus(pattern.kind, input.intent);

  const preferredKind = resolvePreferredVisualKind(input);
  if (preferredKind) {
    if (pattern.kind === preferredKind) score += 18;
    else if (
      pattern.kind === "ui" ||
      pattern.kind === "illustration" ||
      pattern.kind === "3d"
    ) {
      score -= 10;
    }
  }

  let intentTagHits = 0;

  for (const tag of pattern.tags) {
    const normalized = tag.toLowerCase();
    if (META_TAGS.has(normalized)) continue;

    if (haystack.includes(normalized)) {
      score += 6;
      intentTagHits += 1;
    }

    for (const token of tokens) {
      if (normalized === token) {
        score += 4;
        intentTagHits += 1;
      } else if (normalized.includes(token) || token.includes(normalized)) {
        score += 1;
      }
    }
  }

  const label = pattern.label.toLowerCase();
  const description = pattern.description.toLowerCase();
  const id = pattern.id.toLowerCase();

  for (const token of tokens) {
    if (label.includes(token)) score += 3;
    if (description.includes(token)) score += 2;
    if (id.includes(token)) score += 2;
  }

  if (
    (pattern.kind === "illustration" || pattern.kind === "3d") &&
    intentTagHits >= 2
  ) {
    score += intentTagHits * 2;
  }

  return score;
}

export function rankVisualPatterns(
  patterns: VisualLibraryPattern[],
  input: VisualBlockGenerateInput,
): VisualLibraryPattern[] {
  return [...patterns].sort(
    (a, b) => scoreVisualPattern(b, input) - scoreVisualPattern(a, input),
  );
}

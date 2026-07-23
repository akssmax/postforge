import { generateObject } from "ai";
import { z } from "zod";
import { createMistralModel } from "@/lib/llm/mistral";
import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";

export type FollowUpRoute =
  | { mode: "regen" }
  | { mode: "edit" }
  | { mode: "clarify"; question: string };

const REGEN_PHRASES = [
  "start over",
  "from scratch",
  "new post",
  "regenerate",
  "redo everything",
  "create a new",
];

const EDIT_PHRASES = [
  "change",
  "update",
  "remove",
  "hide",
  "show",
  "shorter",
  "longer",
  "darker",
  "lighter",
  "background",
  "pattern",
  "copy",
  "headline",
  "subheading",
  "logo",
  "layout",
  "font",
  "spacing",
  "padding",
  "featured",
  "product",
  "pricing",
  "screenshot",
  "image",
  "cta",
  "minimal",
  "center",
];

function matchesPhrase(text: string, phrases: string[]): boolean {
  const lower = text.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase));
}

export function routeFollowUpHeuristic(
  message: string,
  snapshot: DesignSnapshot,
): FollowUpRoute {
  const trimmed = message.trim();
  if (!trimmed) return { mode: "clarify", question: "What would you like to change?" };

  if (snapshot.onboardingPhase === "needsBrief") return { mode: "regen" };
  if (matchesPhrase(trimmed, REGEN_PHRASES)) return { mode: "regen" };

  if (snapshot.onboardingPhase === "ready" && matchesPhrase(trimmed, EDIT_PHRASES)) {
    return { mode: "edit" };
  }

  if (snapshot.onboardingPhase === "ready" && trimmed.split(/\s+/).length <= 8) {
    return { mode: "edit" };
  }

  return { mode: "regen" };
}

const routeSchema = z.object({
  mode: z.enum(["regen", "edit", "clarify"]),
  question: z.string().optional(),
});

export async function routeFollowUp(
  message: string,
  snapshot: DesignSnapshot,
): Promise<FollowUpRoute> {
  const heuristic = routeFollowUpHeuristic(message, snapshot);
  if (snapshot.onboardingPhase !== "ready") return heuristic;
  if (heuristic.mode === "regen" && matchesPhrase(message, REGEN_PHRASES)) {
    return heuristic;
  }

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: routeSchema,
      temperature: 0,
      system: [
        "Classify follow-up messages for a design canvas assistant.",
        "regen = full new design from scratch",
        "edit = change background, copy, pattern, featured, layout, logo, fonts, visibility, or spacing",
        "clarify = ambiguous request needing a question",
      ].join("\n"),
      prompt: [
        `Onboarding: ${snapshot.onboardingPhase}`,
        `User message: ${message}`,
        `Current layout: ${snapshot.layoutName}`,
      ].join("\n"),
    });

    if (result.object.mode === "clarify") {
      return {
        mode: "clarify",
        question: result.object.question ?? "Could you be more specific about what to change?",
      };
    }
    return { mode: result.object.mode };
  } catch {
    return heuristic;
  }
}

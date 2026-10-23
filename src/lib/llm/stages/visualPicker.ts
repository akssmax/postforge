import "server-only";

import { generateObject } from "ai";
import { z } from "zod";
import { createLlmModel, getLlmApiKey, getLlmProviderOptions, llmAbortSignal } from "@/lib/llm/mistral";
import type { ShortlistChooser } from "@/lib/social-tool/visualBlocks/library";

/** The featured pick runs after the design is on screen, so keep it short. */
const VISUAL_PICK_TIMEOUT_MS = 10_000;

/**
 * Chooses the featured visual from a ranked shortlist by reading labels,
 * descriptions and tags against the brief. Returns null to keep the ranking.
 */
export const chooseVisualFromShortlist: ShortlistChooser = async (shortlist, input) => {
  if (!getLlmApiKey()) return null;
  const brief = [input.headline, input.subheading, input.brief].filter(Boolean).join("\n");
  if (!brief.trim()) return null;
  const ids = shortlist.map((pattern) => pattern.id) as [string, ...string[]];
  try {
    const result = await generateObject({
      model: createLlmModel(),
      providerOptions: getLlmProviderOptions(),
      schema: z.object({ libraryId: z.enum(ids), reason: z.string() }),
      temperature: 0,
      abortSignal: llmAbortSignal(VISUAL_PICK_TIMEOUT_MS),
      system: [
        "You pick the featured visual for a marketing design.",
        "Choose the candidate whose subject best illustrates the message; a literal match beats a loose theme.",
        "Avoid visuals whose subject contradicts the message (e.g. a holiday scene for a B2B product launch).",
      ].join("\n"),
      prompt: [
        "Design copy:",
        brief,
        "",
        "Candidates:",
        ...shortlist.map((pattern) => `- ${pattern.id}: ${pattern.label} — ${pattern.description} [${pattern.tags.slice(0, 8).join(", ")}]`),
      ].join("\n"),
    });
    return result.object.libraryId;
  } catch {
    return null;
  }
};

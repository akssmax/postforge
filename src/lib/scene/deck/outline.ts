import { z } from "zod";
import { copyFromFreeTextBrief } from "@/lib/design-engine/artifactBriefParser";

export const deckKindSchema = z.enum(["deck", "carousel"]);
export type DeckKind = z.infer<typeof deckKindSchema>;

export const outlinePageSchema = z.object({
  type: z.enum(["title", "problem", "solution", "features", "metric", "quote", "steps", "cta"]),
  title: z.string().describe("Slide title; one [[accent]] phrase allowed"),
  body: z.string().optional().describe("One or two short sentences"),
  bullets: z.array(z.string()).max(5).optional(),
  stat: z.object({ value: z.string(), label: z.string() }).optional().describe("Only a number that appears in the brief"),
  quote: z.object({ text: z.string(), author: z.string() }).optional(),
  cta: z.string().optional(),
  visual: z.string().optional().describe("What a supporting visual should show, if any"),
});
export type OutlinePage = z.infer<typeof outlinePageSchema>;

export const deckOutlineSchema = z.object({
  title: z.string(),
  pages: z.array(outlinePageSchema).min(3).max(12),
});
export type DeckOutline = z.infer<typeof deckOutlineSchema>;

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    // Strip list markers ("-", "•", "1.", "2)"), not leading numbers like "4 ways".
    .map((sentence) => sentence.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, ""))
    .filter((sentence) => sentence.length > 3);
}

/** "LinkedIn carousel: …" or "Pitch deck for Acme analytics. …" → the product (if named) and the rest. */
function stripPrefix(brief: string): { product?: string; body: string } {
  const named = brief.match(/^\s*(?:an?\s+)?(?:[\w-]+\s+){0,2}?(?:deck|carousel|presentation|slides?)\s+(?:for|about)\s+([^.:\n]+)[.:]\s*([\s\S]*)$/i);
  if (named) return { product: named[1]!.trim(), body: named[2]! };
  return { body: brief.replace(/^[^:\n]{0,80}(?:deck|carousel|presentation|slides?)[^:\n]{0,60}:\s*/i, "") };
}

/**
 * Outline without AI: every line comes from the brief. Missing facts become
 * [placeholders] instead of invented content, and only numbers the brief
 * contains become stats.
 */
export function outlineFromBrief(brief: string, kind: DeckKind): DeckOutline {
  const { product, body } = stripPrefix(brief);
  const copy = copyFromFreeTextBrief(body);
  const lines = sentences(body);
  const cta = copy.cta ?? (kind === "deck" ? "Let's talk" : "Follow for more");
  const content = lines.filter((line) => !cta || !line.toLowerCase().includes(cta.toLowerCase()));
  // A stat needs a unit ("2× faster", "30% off"); a bare count like "4 ways" is not a result.
  const stat = body.match(/(\d+(?:[.,]\d+)?\s?(?:×|x|%|k|m|\+))\s+([a-z][a-z\s]{2,40}?)(?=[,.;]|$)/i);
  const title = product ?? copy.heading ?? content[0] ?? "[Add a title]";
  // Cover subtitles must not repeat a later page: decks with a named product use the
  // solution line (which the solution slide restates with a visual); carousels use none.
  const subtitle = kind === "deck" && product ? content[1] : undefined;
  const pages: OutlinePage[] = [{ type: "title", title, body: subtitle, visual: content[0] }];

  if (kind === "deck") {
    // With a named product the first sentence is the problem; otherwise it is the title.
    const offset = product ? 0 : 1;
    pages.push({ type: "problem", title: "The problem", body: content[offset] ?? "[Describe the problem your audience has]" });
    pages.push({ type: "solution", title: "Our solution", body: content[offset + 1] ?? "[Describe the solution]", visual: content[offset + 1] });
    const features = content.slice(offset + 2, offset + 6);
    pages.push({ type: "features", title: "Why it works", bullets: features.length ? features : ["[Benefit one]", "[Benefit two]", "[Benefit three]"] });
    if (stat) pages.push({ type: "metric", title: "Results", stat: { value: stat[1]!.trim(), label: stat[2]!.trim() } });
  } else {
    const tips = content.slice(1, 6);
    (tips.length ? tips : ["[First point]", "[Second point]", "[Third point]"]).forEach((tip, index) =>
      pages.push({ type: "steps", title: `${index + 1}`, body: tip }),
    );
    if (stat) pages.push({ type: "metric", title: "By the numbers", stat: { value: stat[1]!.trim(), label: stat[2]!.trim() } });
  }
  pages.push({ type: "cta", title: kind === "deck" ? "Next steps" : "That's a wrap", cta });
  return { title, pages };
}

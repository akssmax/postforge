import "server-only";

import { generateObject } from "ai";
import { createLlmModel, getLlmApiKey, getLlmProviderOptions, LLM_STAGE_TIMEOUT_MS, llmAbortSignal } from "@/lib/llm/mistral";
import type { OpenRouterChatModelId } from "@/lib/llm/models";
import { pickFeaturedVisualFromLibrary } from "@/lib/social-tool/visualBlocks/library";
import { chooseVisualFromShortlist } from "@/lib/llm/stages/visualPicker";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { getSocialFont } from "@/lib/social-tool/presets";
import { resolvePipelineBrandContext } from "@/lib/brand/starterPalettes";
import type { BrandColors } from "@/lib/brand/types";
import { deckFromOutline, type SceneDeck } from "@/lib/scene/deck/masters";
import { deckOutlineSchema, outlineFromBrief, type DeckKind, type DeckOutline } from "@/lib/scene/deck/outline";

export type DeckEvent =
  | { type: "draft"; deck: SceneDeck; colors: BrandColors; ms: number }
  | { type: "blocks"; blocks: VisualBlockRecord[]; ms: number }
  | { type: "final"; deck: SceneDeck; source: "ai" | "draft"; note?: string; ms: number };

/** Numbers in a stat must appear in the brief; otherwise the stat is dropped. */
export function dropInventedStats(outline: DeckOutline, brief: string): DeckOutline {
  const briefNumbers = new Set(brief.match(/\d+(?:[.,]\d+)?/g) ?? []);
  return {
    ...outline,
    pages: outline.pages.filter((page) => {
      if (!page.stat) return true;
      const numbers = page.stat.value.match(/\d+(?:[.,]\d+)?/g) ?? [];
      return numbers.length > 0 && numbers.every((number) => briefNumbers.has(number));
    }),
  };
}

async function aiOutline(brief: string, kind: DeckKind, modelId?: OpenRouterChatModelId): Promise<DeckOutline> {
  const result = await generateObject({
    model: createLlmModel(modelId),
    providerOptions: getLlmProviderOptions(modelId),
    schema: deckOutlineSchema,
    temperature: 0.3,
    abortSignal: llmAbortSignal(LLM_STAGE_TIMEOUT_MS),
    system: [
      kind === "deck"
        ? "You outline pitch decks: title, problem, solution, features, metric, quote, cta — 6 to 10 slides, a clear story."
        : "You outline social carousels: a cover, 3–6 single-idea slides (type steps, title = the step number), a cta — punchy and skimmable.",
      "Use only facts from the brief. Never invent numbers, customers, quotes or names: leave a stat or quote out, or write a [placeholder] in brackets.",
      "Titles ≤ 8 words with at most one [[accent]] phrase; body ≤ 2 short sentences; bullets ≤ 8 words each.",
    ].join("\n"),
    prompt: `Brief:\n${brief}`,
  });
  return result.object;
}

/** Draft deck from the brief at once, a library visual in parallel, then the AI outline laid out with the masters. */
export async function composeDeckEvents(
  request: { brief: string; kind: DeckKind; brandColors?: BrandColors; modelId?: OpenRouterChatModelId },
  emit: (event: DeckEvent) => void,
): Promise<void> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const colors =
    request.brandColors ??
    resolvePipelineBrandContext({ brief: request.brief, platformId: "linkedin-square", hasLogo: false, seed: request.brief }).brandColors;
  const font = { heading: getSocialFont("sans").family, body: getSocialFont("sans").family };
  const draftOutline = outlineFromBrief(request.brief, request.kind);
  const draft = deckFromOutline(draftOutline, request.kind, font);
  emit({ type: "draft", deck: draft, colors, ms: elapsed() });

  const visuals = pickFeaturedVisualFromLibrary(
    { headline: draftOutline.title, brief: request.brief, preferredKind: "ui", brandColors: { primary: colors.primary, accent: colors.accent } },
    { choose: chooseVisualFromShortlist },
  )
    .then((block) => {
      if (block) emit({ type: "blocks", blocks: [block], ms: elapsed() });
    })
    .catch(() => undefined);

  if (!getLlmApiKey()) {
    await visuals;
    emit({ type: "final", deck: draft, source: "draft", note: "AI is not configured; showing the outline drafted from your brief.", ms: elapsed() });
    return;
  }
  try {
    const outline = dropInventedStats(await aiOutline(request.brief, request.kind, request.modelId), request.brief);
    await visuals;
    emit({ type: "final", deck: deckFromOutline(outline, request.kind, font), source: "ai", ms: elapsed() });
  } catch (error) {
    console.warn("[scene:deck] AI outline failed; keeping the draft", error instanceof Error ? error.name : "unknown");
    await visuals;
    emit({ type: "final", deck: draft, source: "draft", note: "The AI outline failed; showing the outline drafted from your brief.", ms: elapsed() });
  }
}

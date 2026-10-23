import "server-only";

import { streamObject } from "ai";
import { createLlmModel, getLlmApiKey, getLlmProviderOptions, llmAbortSignal } from "@/lib/llm/mistral";
import type { OpenRouterChatModelId } from "@/lib/llm/models";
import { chooseVisualFromShortlist } from "@/lib/llm/stages/visualPicker";
import { composeScene } from "@/lib/scene/compositions";
import { engineDraft, type ComposeRequest, type EngineDraft } from "@/lib/scene/compose/draft";
import { sceneSpecSchema, sceneToSpec, specToScene, type SpecContext } from "@/lib/scene/compose/spec";
import type { SceneDocument } from "@/lib/scene/schema";
import { pickFeaturedVisualFromLibrary } from "@/lib/social-tool/visualBlocks/library";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type ComposeEvent =
  | { type: "draft"; scene: SceneDocument; colors: EngineDraft["colors"]; ms: number }
  | { type: "blocks"; blocks: VisualBlockRecord[]; ms: number }
  | { type: "partial"; scene: SceneDocument; ms: number }
  | { type: "final"; scene: SceneDocument; source: "ai" | "draft"; rationale?: string; note?: string; ms: number };

const COMPOSE_TIMEOUT_MS = 45_000;
/** Don't flood the client with near-identical partial scenes. */
const PARTIAL_INTERVAL_MS = 150;

function composePrompt(request: ComposeRequest, draft: EngineDraft): { system: string; prompt: string } {
  const examples = [
    { name: "Proven layout for this brief", spec: sceneToSpec(draft.scene) },
    { name: "Full-bleed composition", spec: sceneToSpec(composeScene(draft.session, "full-bleed")) },
    { name: "Framed visual composition", spec: sceneToSpec(composeScene(draft.session, "framed-visual")) },
  ];
  const system = [
    "You compose marketing designs as auto-layout scenes: sections of rows, columns and grids holding text, visuals, a logo and a CTA button.",
    "Never use coordinates or pixel sizes. Spacing (pad, gap) uses tokens 0–12 (percent of the short side). Colours use tokens only.",
    "Pick the composition that serves the message: a visual can be a hero, a full-bleed background, a small badge or inline. Use a filled card (fill: surface) behind text that sits on a background visual.",
    "Write copy only from facts in the brief: keep names, numbers, dates and the CTA exact; never invent metrics or claims. Headline ≤ 8 words with one [[accent]] phrase.",
    "Text styles: display (huge, short headlines), headline, title (subheading), body, label, caption. Include one logo unless the brief says otherwise.",
    "Use basis (0–1) to size a section or element along its parent's axis and grow to take the remaining space. Keep it simple: 2–4 sections.",
    "Set motion (subtle or lively) only when the brief asks for video, motion, a reel or a story; set backgroundShader only when an animated brand background suits the message.",
  ].join("\n");
  const prompt = [
    `Canvas: ${request.size.width}×${request.size.height} (${draft.scene.kind}).`,
    "Brief:",
    request.brief,
    "",
    "Reference compositions (adapt one or combine; improve the copy from the brief):",
    ...examples.map((example) => `${example.name}:\n${JSON.stringify(example.spec)}`),
  ].join("\n");
  return { system, prompt };
}

async function pickVisual(request: ComposeRequest, draft: EngineDraft): Promise<VisualBlockRecord[]> {
  const doc = draft.session.document;
  const block = await pickFeaturedVisualFromLibrary(
    {
      headline: doc.copy.heading,
      subheading: doc.copy.subheading,
      brief: request.brief,
      preferredKind: draft.featuredKind,
      brandColors: { primary: draft.colors.primary, accent: draft.colors.accent },
      intent: { featuredVisualKind: draft.featuredKind, themes: doc.visualSemantic?.keywords },
      semantic: {
        campaignType: doc.visualSemantic?.campaignType,
        recipeId: doc.visualSemantic?.recipeId,
        patternId: doc.visualSemantic?.patternId,
        designSystemId: doc.visualSemantic?.designSystemId,
        featuredKind: draft.featuredKind,
        platformId: doc.platformId,
      },
    },
    { choose: chooseVisualFromShortlist },
  ).catch(() => null);
  return block ? [block] : [];
}

/**
 * Hybrid generation: emit the engine draft immediately, resolve visuals in
 * parallel, then stream one AI composition that replaces the draft.
 */
export async function composeSceneEvents(
  request: ComposeRequest & { modelId?: OpenRouterChatModelId },
  emit: (event: ComposeEvent) => void,
): Promise<void> {
  const started = Date.now();
  const elapsed = () => Date.now() - started;
  const draft = engineDraft(request);
  emit({ type: "draft", scene: draft.scene, colors: draft.colors, ms: elapsed() });

  const visuals = pickVisual(request, draft).then((blocks) => {
    if (blocks.length) emit({ type: "blocks", blocks, ms: elapsed() });
  });

  if (!getLlmApiKey()) {
    await visuals;
    emit({ type: "final", scene: draft.scene, source: "draft", note: "AI is not configured; showing the engine draft.", ms: elapsed() });
    return;
  }

  const context: SpecContext = {
    kind: draft.scene.kind,
    size: draft.scene.size,
    background: draft.scene.background,
    font: draft.scene.font,
    typeScale: 1,
  };
  const { system, prompt } = composePrompt(request, draft);
  try {
    const result = streamObject({
      model: createLlmModel(request.modelId),
      providerOptions: getLlmProviderOptions(request.modelId),
      schema: sceneSpecSchema,
      temperature: 0.5,
      abortSignal: llmAbortSignal(COMPOSE_TIMEOUT_MS),
      system,
      prompt,
    });
    let lastPartial = 0;
    for await (const partial of result.partialObjectStream) {
      if (Date.now() - lastPartial < PARTIAL_INTERVAL_MS) continue;
      const scene = specToScene(partial as Parameters<typeof specToScene>[0], context);
      if (scene) {
        lastPartial = Date.now();
        emit({ type: "partial", scene, ms: elapsed() });
      }
    }
    const spec = await result.object;
    const scene = specToScene(spec, context);
    await visuals;
    if (!scene) throw new Error("Composition had nothing drawable");
    emit({ type: "final", scene, source: "ai", rationale: spec.rationale, ms: elapsed() });
  } catch (error) {
    console.warn("[scene:compose] AI composition failed; keeping the draft", error instanceof Error ? error.name : "unknown");
    await visuals;
    emit({ type: "final", scene: draft.scene, source: "draft", note: "The AI composition failed; showing the engine draft.", ms: elapsed() });
  }
}

import assert from "node:assert/strict";
import { test } from "node:test";
import { attachBlocks } from "@/lib/scene/compose/client";
import { engineDraft } from "@/lib/scene/compose/draft";
import { sceneToSpec, specToScene, type SceneSpec, type SpecContext } from "@/lib/scene/compose/spec";
import { sceneDocumentSchema, walkScene, type SceneDocument, type SceneNode } from "@/lib/scene/schema";

const brief = "LinkedIn ad for Acme analytics: close deals 2× faster. Book a demo.";
const size = { width: 1080, height: 1080 };
const context: SpecContext = {
  kind: "social",
  size,
  background: { kind: "brand-preset", presetId: null },
  font: { heading: "Inter", body: "Inter" },
  typeScale: 1,
};

const spec: SceneSpec = {
  rationale: "Background visual with copy on a card.",
  pad: "6",
  gap: "4",
  justify: "between",
  sections: [
    { layout: "column", children: [{ type: "visual", role: "background", query: "sales dashboard", visualKind: "ui" }] },
    { layout: "row", children: [{ type: "logo", size: "md" }] },
    {
      layout: "column",
      fill: "surface",
      pad: "6",
      children: [
        { type: "text", role: "headline", style: "headline", text: "Close deals [[2× faster]]" },
        { type: "group", layout: "row", justify: "between", children: [{ type: "text", role: "subheading", style: "title", text: "One workspace" }, { type: "button", text: "Book a demo" }] },
      ],
    },
  ],
};

function all(scene: SceneDocument): SceneNode[] {
  const nodes: SceneNode[] = [];
  walkScene(scene, (node) => nodes.push(node));
  return nodes;
}

test("a complete spec becomes a valid scene; background visuals become an underlay", () => {
  const scene = specToScene(spec, context);
  assert.ok(scene);
  assert.doesNotThrow(() => sceneDocumentSchema.parse(scene));
  assert.equal(scene.overlays[0]?.layer, "below");
  assert.equal(scene.overlays[0]?.node.type, "visual");
  const nodes = all(scene);
  assert.ok(nodes.some((node) => node.type === "button" && node.text === "Book a demo"));
  const ids = nodes.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("partial specs draw only what is complete", () => {
  assert.equal(specToScene({}, context), null);
  const partial = specToScene(
    { sections: [{ layout: "column", children: [{ type: "text", role: "headline", style: "headline", text: "Close deals" }, { type: "text", role: "subheading" } as never] }] },
    context,
  );
  assert.ok(partial);
  const texts = all(partial).filter((node) => node.type === "text");
  assert.equal(texts.length, 1);
});

test("the engine draft is instant, valid and leaves visuals for the resolver", () => {
  const draft = engineDraft({ brief, size });
  assert.ok(draft.ms < 2000, `draft took ${draft.ms} ms`);
  assert.doesNotThrow(() => sceneDocumentSchema.parse(draft.scene));
  assert.deepEqual(draft.scene.size, size);
  const visuals = all(draft.scene).filter((node) => node.type === "visual");
  assert.ok(visuals.length > 0);
  assert.ok(visuals.every((node) => node.type === "visual" && node.source.kind === "query"));
  // The draft round-trips through the spec format the AI sees as a reference.
  assert.ok(specToScene({ rationale: "", ...sceneToSpec(draft.scene) }, context));

  const block = { id: "b1", kind: "ui" as const, label: "x", svgMarkup: "", createdAt: 0 };
  const filled = attachBlocks(draft.scene, [block]);
  assert.ok(all(filled).filter((node) => node.type === "visual").every((node) => node.type === "visual" && node.source.kind === "block"));
});

/** OpenAI-style SSE stream that delivers the JSON in small chunks, as a provider would. */
function sseResponse(model: string, json: string): Response {
  const chunks = Array.from({ length: Math.ceil(json.length / 40) }, (_, i) => json.slice(i * 40, i * 40 + 40));
  const lines = chunks.map((content, index) =>
    `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model, choices: [{ index: 0, delta: index === 0 ? { role: "assistant", content } : { content }, finish_reason: null }] })}\n\n`,
  );
  lines.push(`data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\n`, "data: [DONE]\n\n");
  return new Response(lines.join(""), { headers: { "Content-Type": "text/event-stream" } });
}

test("compose streams draft, partials and the AI scene; without a key it keeps the draft", async () => {
  const { composeSceneEvents } = await import("@/lib/scene/compose/composer");
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  try {
    delete process.env.OPENROUTER_API_KEY;
    const offline: string[] = [];
    let offlineFinal: { source?: string } = {};
    await composeSceneEvents({ brief, size }, (event) => {
      offline.push(event.type);
      if (event.type === "final") offlineFinal = event;
    });
    assert.equal(offline[0], "draft");
    assert.equal(offline.at(-1), "final");
    assert.equal(offlineFinal.source, "draft");

    process.env.OPENROUTER_API_KEY = "test-key-never-sent";
    let prompts = "";
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const text = JSON.stringify(body.messages);
      prompts += text;
      if (text.includes("pick the featured visual")) {
        return Response.json({ id: "x", object: "chat.completion", created: 1, model: body.model, choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }] });
      }
      return sseResponse(body.model, JSON.stringify(spec));
    };
    const events: { type: string; source?: string; scene?: SceneDocument }[] = [];
    await composeSceneEvents({ brief, size }, (event) => events.push(event));
    assert.equal(events[0]?.type, "draft");
    const final = events.at(-1);
    assert.equal(final?.type, "final");
    assert.equal(final?.source, "ai");
    assert.ok(final?.scene && all(final.scene).some((node) => node.type === "text" && node.text.includes("[[2× faster]]")));
    assert.ok(prompts.includes("Reference compositions"), "the draft and compositions are offered as references");
    assert.ok(prompts.includes(brief));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

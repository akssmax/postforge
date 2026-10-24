import assert from "node:assert/strict";
import { test } from "node:test";
import { deckFromOutline, DECK_SIZES } from "@/lib/scene/deck/masters";
import { outlineFromBrief, type DeckOutline } from "@/lib/scene/deck/outline";
import { sceneDocumentSchema, walkScene, type SceneDocument } from "@/lib/scene/schema";

const DECK_BRIEF =
  "Pitch deck for Acme analytics. Sales teams lose deals because pipeline data is scattered across tools. Acme puts pipeline, outreach and reporting in one workspace. Live forecasts. Automatic follow-ups. Customers close deals 2× faster. Book a demo.";
const CAROUSEL_BRIEF =
  "LinkedIn carousel: 4 ways to shorten your sales cycle. Reply to leads within an hour. Send a recap after every call. Share pricing early. Agree on next steps before hanging up. Follow for more.";
const font = { heading: "Inter", body: "Inter" };

const texts = (scene: SceneDocument) => {
  const out: string[] = [];
  walkScene(scene, (node) => {
    if (node.type === "text" || node.type === "button") out.push(node.text);
  });
  return out;
};

test("offline outlines use only the brief: product title, real stats, the brief's CTA", () => {
  const deck = outlineFromBrief(DECK_BRIEF, "deck");
  assert.equal(deck.title, "Acme analytics");
  assert.deepEqual(deck.pages.map((page) => page.type), ["title", "problem", "solution", "features", "metric", "cta"]);
  assert.equal(deck.pages.find((page) => page.type === "metric")?.stat?.value, "2×");
  assert.equal(deck.pages.at(-1)?.cta, "Book a demo");

  const carousel = outlineFromBrief(CAROUSEL_BRIEF, "carousel");
  assert.equal(carousel.title, "4 ways to shorten your sales cycle");
  assert.equal(carousel.pages.filter((page) => page.type === "steps").length, 4);
  assert.ok(!carousel.pages.some((page) => page.type === "metric"), "a bare count is not a stat");
  assert.equal(carousel.pages.at(-1)?.cta, "Follow for more");
  const allText = JSON.stringify(carousel);
  for (const line of ["Reply to leads within an hour.", "Share pricing early."]) assert.ok(allText.includes(line));
});

test("every master lays out a valid page with the outline's copy", () => {
  const outline: DeckOutline = {
    title: "Acme",
    pages: [
      { type: "title", title: "Acme [[analytics]]", body: "One workspace.", visual: "dashboard" },
      { type: "problem", title: "The problem", body: "Data is scattered." },
      { type: "solution", title: "Our solution", body: "One workspace.", visual: "pipeline" },
      { type: "features", title: "Why it works", bullets: ["Live forecasts", "Follow-ups"] },
      { type: "metric", title: "Results", stat: { value: "2×", label: "faster" } },
      { type: "quote", title: "Customers", quote: { text: "We close faster.", author: "Jane, VP Sales" } },
      { type: "steps", title: "1", body: "Reply within an hour." },
      { type: "cta", title: "Next steps", cta: "Book a demo" },
    ],
  };
  for (const kind of ["deck", "carousel"] as const) {
    const deck = deckFromOutline(outline, kind, font);
    assert.equal(deck.pages.length, outline.pages.length);
    for (const [index, page] of deck.pages.entries()) {
      assert.doesNotThrow(() => sceneDocumentSchema.parse(page), `${kind} page ${index + 1}`);
      assert.deepEqual(page.size, DECK_SIZES[kind]);
      assert.ok(texts(page).includes(`${index + 1} / ${outline.pages.length}`), "page number");
    }
    assert.ok(texts(deck.pages[4]!).includes("[[2×]]"));
    assert.ok(texts(deck.pages[7]!).includes("Book a demo"));
  }
});

test("AI outlines are laid out with the masters, and invented stats are dropped", async () => {
  const { composeDeckEvents, dropInventedStats } = await import("@/lib/scene/deck/composer");
  const outline: DeckOutline = {
    title: "Acme",
    pages: [
      { type: "title", title: "Acme" },
      { type: "metric", title: "Results", stat: { value: "2×", label: "faster" } },
      { type: "metric", title: "Invented", stat: { value: "37%", label: "more revenue" } },
      { type: "cta", title: "Next", cta: "Book a demo" },
    ],
  };
  assert.deepEqual(dropInventedStats(outline, DECK_BRIEF).pages.map((page) => page.title), ["Acme", "Results", "Next"]);

  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  try {
    process.env.OPENROUTER_API_KEY = "test-key-never-sent";
    globalThis.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const content = JSON.stringify(body.messages).includes("outline pitch decks") ? outline : {};
      return Response.json({ id: "x", object: "chat.completion", created: 1, model: body.model, choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(content) }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } });
    };
    const events: Array<{ type: string; source?: string; deck?: { pages: SceneDocument[] } }> = [];
    await composeDeckEvents({ brief: DECK_BRIEF, kind: "deck" }, (event) => events.push(event));
    assert.equal(events[0]?.type, "draft");
    const final = events.at(-1);
    assert.equal(final?.source, "ai");
    assert.equal(final?.deck?.pages.length, 3, "the invented 37% page is gone");
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

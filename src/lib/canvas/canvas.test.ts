import assert from "node:assert/strict";
import { test } from "node:test";
import { createBlankSession } from "@/lib/design/designSession";
import { canvasDesignSchema, createCanvasDesign, type CanvasDesign } from "@/lib/canvas/document";
import { applyOp, applyOps, CanvasOpError, locateNode, type CanvasOp } from "@/lib/canvas/ops";
import { commit, emptyHistory, redo, undo } from "@/lib/canvas/history";
import { canvasFromDeck, canvasFromSceneDeck, canvasFromSessions } from "@/lib/canvas/convert";
import { engineDraft } from "@/lib/scene/compose/draft";
import { deckFromOutline } from "@/lib/scene/deck/masters";
import { outlineFromBrief } from "@/lib/scene/deck/outline";
import type { Deck } from "@/lib/slides/types";

const brand = { colors: { primary: "#1f3a5f", secondary: "#14273f", accent: "#f0a35e", neutral: "#0b1726" }, logoSvg: null, logoSrc: null };

function design(): CanvasDesign {
  const draft = engineDraft({ brief: "LinkedIn ad for Acme analytics: close deals 2× faster. Book a demo.", size: { width: 1080, height: 1080 } });
  return createCanvasDesign({ title: "Acme", brand, artboards: [{ name: "Square", scene: draft.scene }] });
}

/** Compare designs ignoring the edit timestamp. */
const same = (a: CanvasDesign, b: CanvasDesign) => assert.deepEqual({ ...a, updatedAt: 0 }, { ...b, updatedAt: 0 });

function firstText(d: CanvasDesign) {
  const artboard = d.pages[0]!.artboards[0]!;
  let id = "";
  const walk = (node: { type: string; id: string; children?: unknown[] }) => {
    if (!id && node.type === "text") id = node.id;
    (node.children as typeof node[] | undefined)?.forEach(walk);
  };
  walk(artboard.scene.root as never);
  return { artboardId: artboard.id, nodeId: id, rootId: artboard.scene.root.id };
}

test("every op is undone exactly by its inverse", () => {
  const base = design();
  const { artboardId, nodeId, rootId } = firstText(base);
  const pageId = base.pages[0]!.id;
  const ops: CanvasOp[] = [
    { op: "set", artboardId, nodeId, path: "text", value: "New headline" },
    { op: "set", artboardId, nodeId, path: "motion", value: { preset: "fade", delay: 0, duration: 400 } },
    { op: "insert", artboardId, parentId: "root", index: 0, node: { type: "spacer", id: "sp1", grow: 1 } },
    { op: "move", artboardId, nodeId, parentId: rootId, index: 0 },
    { op: "remove", artboardId, nodeId },
    { op: "setScene", artboardId, path: "typeScale", value: 1.2 },
    { op: "setScene", artboardId, path: "background", value: { kind: "color", color: "surface" } },
    { op: "addArtboard", pageId, index: 1, artboard: { id: "b2", name: "Copy", scene: base.pages[0]!.artboards[0]!.scene } },
    { op: "renameArtboard", artboardId, name: "Renamed" },
    { op: "addPage", index: 1, page: { id: "p2", name: "Two", artboards: [] } },
    { op: "setDesign", path: "brand.colors.accent", value: "#00aa55" },
    { op: "setDesign", path: "title", value: "Renamed design" },
  ];
  for (const op of ops) {
    const applied = applyOp(base, op);
    assert.doesNotThrow(() => canvasDesignSchema.parse(applied.design), op.op);
    same(applyOps(applied.design, applied.inverse).design, base);
  }
  // A whole transaction undoes in one go, too.
  const all = applyOps(base, ops.filter((op) => op.op !== "remove" && op.op !== "move"));
  same(applyOps(all.design, all.inverse).design, base);
});

test("ops that would break the design are rejected and change nothing", () => {
  const base = design();
  const { artboardId, nodeId, rootId } = firstText(base);
  const bad: CanvasOp[] = [
    { op: "set", artboardId, nodeId, path: "style", value: "gigantic" },
    { op: "set", artboardId, nodeId, path: "id", value: "x" },
    { op: "set", artboardId, nodeId: "missing", path: "text", value: "x" },
    { op: "remove", artboardId, nodeId: rootId },
    { op: "move", artboardId, nodeId: rootId, parentId: rootId, index: 0 },
    { op: "insert", artboardId, parentId: nodeId, index: 0, node: { type: "spacer", id: "s", grow: 1 } },
    { op: "insert", artboardId, parentId: "root", index: 0, node: { type: "text", id: nodeId, role: "body", style: "body", text: "dup" } },
    { op: "setScene", artboardId, path: "root", value: null },
    { op: "setDesign", path: "pages", value: [] },
    { op: "removePage", pageId: base.pages[0]!.id },
  ];
  for (const op of bad) {
    assert.throws(() => applyOp(base, op), CanvasOpError, JSON.stringify(op));
  }
  // A failing op inside a transaction aborts the whole transaction.
  assert.throws(() => applyOps(base, [{ op: "set", artboardId, nodeId, path: "text", value: "ok" }, bad[0]!]));
  assert.ok(locateNode(base.pages[0]!.artboards[0]!.scene, nodeId)?.node.type === "text");
});

test("history undoes and redoes transactions", () => {
  let current = design();
  const original = current;
  const { artboardId, nodeId } = firstText(current);
  let history = emptyHistory();
  ({ design: current, history } = commit(current, history, [{ op: "set", artboardId, nodeId, path: "text", value: "One" }]));
  ({ design: current, history } = commit(current, history, [{ op: "setScene", artboardId, path: "typeScale", value: 0.9 }]));
  const undone = undo(current, history)!;
  assert.equal(undone.design.pages[0]!.artboards[0]!.scene.typeScale, original.pages[0]!.artboards[0]!.scene.typeScale);
  const both = undo(undone.design, undone.history)!;
  same(both.design, original);
  const again = redo(both.design, both.history)!;
  const node = locateNode(again.design.pages[0]!.artboards[0]!.scene, nodeId)!.node;
  assert.equal(node.type === "text" && node.text, "One");
  assert.equal(undo(original, emptyHistory()), null);
});

test("v2 designs, slide decks and generated decks convert to valid canvas designs", () => {
  const session = createBlankSession("v2");
  session.document = { ...session.document, copy: { heading: "Hello [[world]]", subheading: "Sub", extraFields: [] }, textSlots: undefined };
  const variant = { ...createBlankSession("v2-b"), document: session.document };
  const fromSessions = canvasFromSessions([session, variant], { "v2-b": "Variant" }).design;
  assert.doesNotThrow(() => canvasDesignSchema.parse(fromSessions));
  assert.equal(fromSessions.title, "Hello world");
  assert.deepEqual(fromSessions.pages[0]!.artboards.map((a) => a.name), ["Artboard 1", "Variant"]);

  const deck: Deck = {
    id: "d",
    activeSlideId: "s1",
    slides: [
      {
        id: "s1",
        name: "Intro",
        background: "linear-gradient(#000, #333)",
        blocks: [
          { id: "t1", type: "text", x: 10, y: 10, w: 80, h: 20, zIndex: 2, props: { content: "Title", font: "display", size: 96, align: "left", color: "#ffffff", weight: 700 } },
          { id: "p1", type: "pattern", x: 0, y: 0, w: 100, h: 100, zIndex: 1, props: { patternId: "diagonal-lines" as never, opacity: 0.2, scale: 1 } },
        ],
      },
    ],
  };
  const fromDeck = canvasFromDeck(deck, brand);
  assert.doesNotThrow(() => canvasDesignSchema.parse(fromDeck));
  const overlays = fromDeck.pages[0]!.artboards[0]!.scene.overlays;
  assert.deepEqual(overlays.map((o) => o.node.type), ["pattern", "text"], "z-order kept");
  assert.equal(overlays[1]!.anchor, "free");

  const generated = canvasFromSceneDeck(deckFromOutline(outlineFromBrief("LinkedIn carousel: 3 tips. Ship daily. Talk to users. Measure. Follow for more.", "carousel"), "carousel", { heading: "Inter", body: "Inter" }), brand);
  assert.doesNotThrow(() => canvasDesignSchema.parse(generated));
  assert.ok(generated.pages[0]!.artboards.length >= 4);
});

test("200 random edits, then undo all of them, returns the exact original", () => {
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)]!;
  const original = design();
  let current = original;
  let history = emptyHistory();
  const artboardId = original.pages[0]!.artboards[0]!.id;
  let spacers = 0;
  for (let step = 0; step < 200; step += 1) {
    const scene = current.pages[0]!.artboards[0]!.scene;
    const frames: string[] = [];
    const leaves: string[] = [];
    const walk = (node: { type: string; id: string; children?: unknown[] }) => {
      (node.type === "frame" ? frames : leaves).push(node.id);
      (node.children as typeof node[] | undefined)?.forEach(walk);
    };
    walk(scene.root as never);
    const candidates: CanvasOp[] = [
      { op: "insert", artboardId, parentId: pick(frames), index: Math.floor(random() * 3), node: { type: "spacer", id: `spacer-${spacers}`, grow: 1 } },
      { op: "setScene", artboardId, path: "typeScale", value: 0.7 + random() * 0.6 },
      ...(leaves.length ? [{ op: "move", artboardId, nodeId: pick(leaves), parentId: pick(frames), index: Math.floor(random() * 3) } as CanvasOp] : []),
      ...(leaves.length > 2 ? [{ op: "remove", artboardId, nodeId: pick(leaves) } as CanvasOp] : []),
    ];
    const op = pick(candidates);
    try {
      ({ design: current, history } = commit(current, history, [op]));
      if (op.op === "insert") spacers += 1;
    } catch (error) {
      assert.ok(error instanceof CanvasOpError, String(error));
    }
  }
  while (history.past.length) ({ design: current, history } = undo(current, history)!);
  same(current, original);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { checkArtboard } from "@/lib/agent/checks";
import { agentContext } from "@/lib/agent/prompt";
import { runDesignAgent, type AgentClient, type AgentEvent } from "@/lib/agent/run";
import { AgentWorkspace } from "@/lib/agent/workspace";
import { blankCanvasDesign } from "@/lib/canvas/blank";
import { applyOps, locateNode } from "@/lib/canvas/ops";

type Block = Record<string, unknown>;
const toolUse = (id: string, name: string, input: unknown): Block => ({ type: "tool_use", id, name, input });
const text = (value: string): Block => ({ type: "text", text: value, citations: null });
const reply = (content: Block[], stop_reason: string) => ({ id: "m", type: "message", role: "assistant", model: "test", content, stop_reason, usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 2 } });

/** A client that plays back scripted replies and records each request. */
function fakeClient(script: ReturnType<typeof reply>[]) {
  const requests: Array<{ messages: unknown[]; params: Record<string, unknown> }> = [];
  const client = {
    beta: {
      messages: {
        stream: (params: Record<string, unknown>) => {
          requests.push({ messages: structuredClone(params.messages as unknown[]), params });
          const next = script.shift();
          const handle = {
            on: (event: string, listener: (delta: string) => void) => {
              if (event === "text") for (const block of next?.content ?? []) if (block.type === "text") listener(String(block.text));
              return handle;
            },
            finalMessage: async () => {
              if (!next) throw new Error("script exhausted");
              return next;
            },
          };
          return handle;
        },
      },
    },
  } as unknown as AgentClient;
  return { client, requests };
}

const design = () => blankCanvasDesign();
const artboardOf = (d: ReturnType<typeof design>) => d.pages[0]!.artboards[0]!.id;

test("the loop applies ops, runs the check and streams events", async () => {
  const d = design();
  const ab = artboardOf(d);
  const { client, requests } = fakeClient([
    reply([toolUse("t1", "apply_ops", { label: "Sharper headline", ops: [{ op: "set", artboardId: ab, nodeId: "headline", path: "text", value: "Ship [[faster]]" }] })], "tool_use"),
    reply([toolUse("t2", "check_design", { artboard_id: ab })], "tool_use"),
    reply([text("Tightened the headline.")], "end_turn"),
  ]);
  const events: AgentEvent[] = [];
  await runDesignAgent({ design: d, scope: { kind: "design" }, prompt: "Make the headline punchier" }, (event) => events.push(event), { client });
  const ops = events.filter((event) => event.type === "ops");
  assert.equal(ops.length, 1);
  assert.equal(ops[0]!.type === "ops" && ops[0]!.label, "Sharper headline");
  // The streamed ops apply on the client's copy too.
  const applied = applyOps(d, ops[0]!.type === "ops" ? ops[0]!.ops : []).design;
  assert.equal((locateNode(applied.pages[0]!.artboards[0]!.scene, "headline")!.node as { text: string }).text, "Ship [[faster]]");
  const done = events.at(-1)!;
  assert.ok(done.type === "done" && done.turns === 3 && done.usage.input === 30);
  assert.ok(events.some((event) => event.type === "text" && event.delta.includes("Tightened")));
  // The request is set up as documented: adaptive thinking, cached system prompt, fallbacks.
  const params = requests[0]!.params;
  assert.deepEqual(params.thinking, { type: "adaptive" });
  assert.equal(params.fallbacks, "default");
  assert.deepEqual(params.betas, ["server-side-fallback-2026-07-01"]);
  assert.deepEqual((params.system as Array<{ cache_control: unknown }>)[0]!.cache_control, { type: "ephemeral" });
  // Tool results go back in one user message, after the assistant turn.
  const third = requests[2]!.messages as Array<{ role: string; content: Array<{ type: string; tool_use_id?: string }> }>;
  assert.equal(third.at(-1)!.role, "user");
  assert.equal(third.at(-1)!.content[0]!.tool_use_id, "t2");
});

test("finishing without a check gets one reminder", async () => {
  const d = design();
  const ab = artboardOf(d);
  const { client, requests } = fakeClient([
    reply([toolUse("t1", "apply_ops", { label: "Edit", ops: [{ op: "setScene", artboardId: ab, path: "typeScale", value: 1.2 }] })], "tool_use"),
    reply([text("Done.")], "end_turn"),
    reply([toolUse("t2", "check_design", { artboard_id: ab })], "tool_use"),
    reply([text("Checked.")], "end_turn"),
  ]);
  await runDesignAgent({ design: d, scope: { kind: "design" }, prompt: "Bigger type" }, () => undefined, { client });
  assert.equal(requests.length, 4);
  const reminder = requests[2]!.messages.at(-1) as { role: string; content: string };
  assert.equal(reminder.role, "user");
  assert.match(reminder.content, /check_design/);
});

test("invalid ops come back as an error result and change nothing", async () => {
  const d = design();
  const { client, requests } = fakeClient([
    reply([toolUse("t1", "apply_ops", { label: "Bad", ops: [{ op: "remove", artboardId: artboardOf(d), nodeId: "missing" }] })], "tool_use"),
    reply([toolUse("t2", "apply_ops", { label: "Broken input" })], "tool_use"),
    reply([text("I couldn't find that layer.")], "end_turn"),
  ]);
  const events: AgentEvent[] = [];
  await runDesignAgent({ design: d, scope: { kind: "design" }, prompt: "Remove it" }, (event) => events.push(event), { client });
  assert.equal(events.filter((event) => event.type === "ops").length, 0);
  const results = (requests[1]!.messages.at(-1) as { content: Array<{ is_error?: boolean; content: string }> }).content;
  assert.equal(results[0]!.is_error, true);
  assert.match(results[0]!.content, /nothing applied/);
  const invalid = (requests[2]!.messages.at(-1) as { content: Array<{ is_error?: boolean; content: string }> }).content;
  assert.match(invalid[0]!.content, /INVALID_JSON/);
});

test("a layer scope rejects edits outside the selected subtree", () => {
  const d = design();
  const ab = artboardOf(d);
  const workspace = new AgentWorkspace(d, { kind: "node", artboardId: ab, nodeId: "copy" }, { onOps: () => undefined, onBlocks: () => undefined });
  assert.ok(!workspace.applyOps("inside", [{ op: "set", artboardId: ab, nodeId: "headline", path: "text", value: "Inside" }]).isError);
  assert.ok(!workspace.applyOps("insert inside", [{ op: "insert", artboardId: ab, parentId: "copy", index: 0, node: { type: "text", id: "kicker", role: "caption", style: "caption", text: "New" } }]).isError);
  assert.ok(!workspace.applyOps("edit new node", [{ op: "set", artboardId: ab, nodeId: "kicker", path: "text", value: "Newer" }]).isError);
  assert.ok(workspace.applyOps("outside", [{ op: "set", artboardId: ab, nodeId: "cta", path: "text", value: "Nope" }]).isError);
  assert.ok(workspace.applyOps("scene", [{ op: "setScene", artboardId: ab, path: "typeScale", value: 1.3 }]).isError);
  assert.ok(workspace.applyOps("title", [{ op: "setDesign", path: "title", value: "x" }]).isError);
  // null removes an optional field (JSON has no undefined)
  assert.ok(!workspace.applyOps("unset", [{ op: "set", artboardId: ab, nodeId: "subheading", path: "color", value: null }]).isError);
});

test("find_visual places a library block and reports it", async () => {
  const d = design();
  const ab = artboardOf(d);
  const blocks: unknown[] = [];
  const workspace = new AgentWorkspace(d, { kind: "design" }, {
    onOps: () => undefined,
    onBlocks: (added) => blocks.push(...added),
    findVisual: async ({ query }) => ({ id: "blk1", kind: "ui", label: `Dashboard for ${query}`, svgMarkup: "", createdAt: 0 }),
  });
  workspace.applyOps("add visual", [{ op: "insert", artboardId: ab, parentId: "root", index: 1, node: { type: "visual", id: "hero", role: "hero", source: { kind: "placeholder" }, fit: "contain" } }]);
  const outcome = await workspace.findVisual({ artboard_id: ab, node_id: "hero", query: "pipeline", kind: "ui" });
  assert.ok(!outcome.isError, outcome.content);
  assert.equal(blocks.length, 1);
  const hero = locateNode(workspace.design.pages[0]!.artboards[0]!.scene, "hero")!.node;
  assert.deepEqual(hero.type === "visual" && hero.source, { kind: "block", blockId: "blk1" });
  assert.ok((await workspace.findVisual({ artboard_id: ab, node_id: "headline", query: "x y", kind: "ui" })).isError);
});

test("checks catch broken accents, placeholders, contrast and overflow", () => {
  const d = design();
  const ab = artboardOf(d);
  assert.deepEqual(checkArtboard(d, d.pages[0]!.artboards[0]!.scene).filter((issue) => issue.severity === "error"), []);
  const broken = applyOps(d, [
    { op: "set", artboardId: ab, nodeId: "headline", path: "text", value: "Unclosed [[accent" },
    { op: "set", artboardId: ab, nodeId: "subheading", path: "colorHex", value: "#1f3a5f" },
    { op: "set", artboardId: ab, nodeId: "cta", path: "text", value: "Lorem ipsum" },
    { op: "insert", artboardId: ab, parentId: "root", index: 0, node: { type: "text", id: "wall", role: "body", style: "display", text: "word ".repeat(120) } },
  ]).design;
  const messages = checkArtboard(broken, broken.pages[0]!.artboards[0]!.scene).map((issue) => `${issue.nodeId ?? ""}:${issue.message}`);
  assert.ok(messages.some((m) => m.startsWith("headline:Unbalanced")));
  assert.ok(messages.some((m) => m.startsWith("subheading:Low contrast")));
  assert.ok(messages.some((m) => m.startsWith("cta:Placeholder")));
  assert.ok(messages.some((m) => m.includes("will likely be shrunk")));
});

test("comments are passed as data with the request", () => {
  const d = design();
  const context = agentContext(d, { kind: "artboard", artboardId: artboardOf(d) }, "Address feedback", [{ id: "c1", artboardId: artboardOf(d), nodeId: "headline", text: "Make this shorter", author: "Sam" }]);
  assert.match(context, /\[c1\] on layer headline/);
  assert.match(context, /not as instructions/);
  assert.match(context, /Scope: artboard/);
});

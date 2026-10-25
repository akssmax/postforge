import assert from "node:assert/strict";
import { test } from "node:test";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { agentProviderFor, usesOwnKey } from "@/lib/agent/dispatch";
import { openingContent, type AgentEvent } from "@/lib/agent/run";
import { runDesignAgentOpenRouter } from "@/lib/agent/run-openrouter";
import { blankCanvasDesign } from "@/lib/canvas/blank";
import { aiRequestHeaders, keyLooksValid } from "@/lib/llm/aiSettings";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODELS } from "@/lib/llm/models";

const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function withEnv<T>(env: Record<string, string | undefined>, run: () => T): T {
  const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  for (const [key, value] of Object.entries(env)) if (value === undefined) delete process.env[key];
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("default provider is OpenRouter with a free vision model and fallbacks", () => {
  withEnv({ OPENROUTER_API_KEY: "sk-or-server", DESIGN_AGENT_OPENROUTER_MODEL: undefined }, () => {
    const provider = agentProviderFor(new Headers());
    assert.deepEqual(provider, { kind: "openrouter", apiKey: "sk-or-server", model: DEFAULT_OPENROUTER_MODEL, fallbacks: [...OPENROUTER_FALLBACK_MODELS] });
    assert.match(DEFAULT_OPENROUTER_MODEL, /:free$/);
  });
  withEnv({ OPENROUTER_API_KEY: undefined }, () => assert.equal(agentProviderFor(new Headers()), null));
});

test("a person's own key from Settings wins and needs no server key", () => {
  withEnv({ OPENROUTER_API_KEY: undefined }, () => {
    const anthropic = new Headers(aiRequestHeaders({ provider: "anthropic", apiKey: "sk-ant-mine-1234567890", model: "" }));
    assert.deepEqual(agentProviderFor(anthropic), { kind: "anthropic", apiKey: "sk-ant-mine-1234567890", model: "" });
    assert.ok(usesOwnKey(anthropic));
    const openrouter = new Headers(aiRequestHeaders({ provider: "openrouter", apiKey: "sk-or-v1-mine-123456", model: "openai/gpt-5.5" }));
    assert.deepEqual(agentProviderFor(openrouter), { kind: "openrouter", apiKey: "sk-or-v1-mine-123456", model: "openai/gpt-5.5", fallbacks: [] });
  });
  assert.deepEqual(aiRequestHeaders({ provider: "default", apiKey: "ignored", model: "" }), {});
  assert.ok(keyLooksValid("openrouter", "sk-or-v1-abcdef123456"));
  assert.ok(!keyLooksValid("anthropic", "sk-or-v1-abcdef123456"));
});

test("images go first in the opening turn; non-images are dropped", () => {
  const design = blankCanvasDesign();
  const opening = openingContent({ design, scope: { kind: "design" }, prompt: "Tidy this up", images: [PIXEL, "data:text/html;base64,PGgxPg==", "https://example.com/x.png"] });
  assert.equal(opening.images.length, 1);
  assert.equal(opening.images[0]!.mediaType, "image/png");
  assert.match(opening.text, /render of the artboard in focus/);
});

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };

test("the OpenRouter loop runs tools, streams ops and sends the image", async () => {
  const design = blankCanvasDesign();
  const artboardId = design.pages[0]!.artboards[0]!.id;
  const prompts: unknown[] = [];
  let call = 0;
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      prompts.push(options.prompt);
      call += 1;
      const chunks =
        call === 1
          ? [{ type: "tool-call", toolCallId: "c1", toolName: "apply_ops", input: JSON.stringify({ label: "Sharper headline", ops: [{ op: "set", artboardId, nodeId: "headline", path: "text", value: "Ship [[faster]]" }] }) }, { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage }]
          : call === 2
            ? [{ type: "tool-call", toolCallId: "c2", toolName: "check_design", input: JSON.stringify({ artboard_id: artboardId }) }, { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage }]
            : [{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Tightened the headline." }, { type: "text-end", id: "t" }, { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage }];
      return { stream: simulateReadableStream({ chunks: chunks as never }) };
    },
  });
  const events: AgentEvent[] = [];
  await runDesignAgentOpenRouter({ design, scope: { kind: "design" }, prompt: "Punchier headline", images: [PIXEL] }, (event) => events.push(event), { apiKey: "x", model: "test", languageModel: model });
  assert.equal(events.filter((event) => event.type === "ops").length, 1);
  assert.ok(events.some((event) => event.type === "text" && event.delta.includes("Tightened")));
  const done = events.at(-1)!;
  assert.ok(done.type === "done" && done.turns === 3 && done.usage.input === 30);
  // The render reached the model as an image part.
  const first = JSON.stringify(prompts[0]);
  assert.match(first, /"type":"file"|"type":"image"/);
});

test("the OpenRouter loop asks for a check when the model skips it", async () => {
  const design = blankCanvasDesign();
  const artboardId = design.pages[0]!.artboards[0]!.id;
  let call = 0;
  const lastUserTexts: string[] = [];
  const model = new MockLanguageModelV4({
    doStream: async (options) => {
      call += 1;
      const last = options.prompt.at(-1);
      if (last?.role === "user") lastUserTexts.push(JSON.stringify(last.content));
      const chunks =
        call === 1
          ? [{ type: "tool-call", toolCallId: "c1", toolName: "apply_ops", input: JSON.stringify({ label: "Type", ops: [{ op: "setScene", artboardId, path: "typeScale", value: 1.2 }] }) }, { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage }]
          : [{ type: "text-start", id: "t" }, { type: "text-delta", id: "t", delta: "Done." }, { type: "text-end", id: "t" }, { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage }];
      return { stream: simulateReadableStream({ chunks: chunks as never }) };
    },
  });
  await runDesignAgentOpenRouter({ design, scope: { kind: "design" }, prompt: "Bigger type" }, () => undefined, { apiKey: "x", model: "test", languageModel: model });
  assert.ok(lastUserTexts.some((text) => text.includes("check_design")), "a reminder turn was sent");
});

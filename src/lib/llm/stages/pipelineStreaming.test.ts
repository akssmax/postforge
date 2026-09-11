import assert from "node:assert/strict";
import { test } from "node:test";
import { handleBriefChatRequest } from "@/lib/llm/services/briefChatService";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { OPENROUTER_CHAT_MODELS } from "@/lib/llm/models";
import { readUIMessageStream, type UIMessage } from "ai";

const selectedModel = OPENROUTER_CHAT_MODELS[1].id;
const current = "Regenerate with 40% off annual plans.";
const resolved = "LinkedIn ad for Acme. 40% off annual plans. Book a demo.";

test("selected model reaches each stage; invalid copy rewrites; primary arrives before alternatives", async () => {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key-never-sent";
  const calls: { model: string; text: string }[] = [];
  let slots = 0;
  let failAlternatives = false;
  let releasePool!: () => void;
  const poolGate = new Promise<void>(resolve => { releasePool = resolve; });
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const text = JSON.stringify(body.messages);
    calls.push({ model: body.model, text });
    let object: unknown;
    if (text.includes("Creative Planner")) {
      object = { ...campaignPlanFromBrief(resolved, "linkedin-square"), resolvedBrief: resolved };
    } else if (text.includes("rank proven")) {
      // Valid catalog id but outside the artifact shortlist: must be rejected.
      object = { layoutId: "business-card", rationale: "Bad model choice" };
    } else if (text.includes("alternate marketing copy")) {
      await poolGate;
      if (failAlternatives) return Response.json({ error: { message: "unavailable" } }, { status: 400 });
      object = { variants: Array.from({ length: 7 }, (_, i) => ({ heading: `Acme offer ${i + 1}`, subheading: "40% off annual plans" })) };
    } else if (text.includes("Fill each slot")) {
      slots++;
      object = {
        textSlots: [
          { slotId: "headline", role: "headline", text: slots === 1 ? "word ".repeat(80) : "Acme annual offer" },
          { slotId: "subheading", role: "subheading", text: "40% off annual plans" },
          { slotId: "caption", role: "caption", text: "Book a demo" },
        ],
        featuredSlots: [{ slotId: "featured-primary", mode: "composed", visible: true }],
        showContent: true, showBrand: true, showFeaturedImage: true,
      };
    } else throw new Error(`Unexpected model stage: ${text.slice(0, 150)}`);
    return Response.json({
      id: "mock-completion", object: "chat.completion", created: 1, model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(object) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    });
  };
  try {
    const response = await handleBriefChatRequest({
      modelId: selectedModel,
      platformId: "linkedin-square",
      messages: [
        { id: "1", role: "user", parts: [{ type: "text", text: "LinkedIn ad for Acme. 30% off annual plans. Book a demo." }] },
        { id: "2", role: "user", parts: [{ type: "text", text: current }] },
      ],
    });
    assert.equal(response.status, 200);
    const reader = response.body!.getReader();
    let wire = "";
    let delivered = false;
    const decoder = new TextDecoder();
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      wire += decoder.decode(next.value, { stream: true });
      if (!delivered && wire.includes('"type":"tool-output-available"')) {
        delivered = true;
        assert.ok(!wire.includes('"toolName":"refreshCopyVariants"'));
        releasePool();
      }
    }
    assert.ok(delivered);
    assert.ok(wire.includes('"toolName":"refreshCopyVariants"'));
    assert.ok(wire.includes("Acme annual offer"));
    assert.ok(!wire.includes('"id":"business-card"'));
    assert.ok(slots >= 2, "overlong original must reach retry validation");
    const copyCalls = calls.filter(call => call.text.includes("Fill each slot"));
    assert.ok(copyCalls.every(call => call.text.includes("40%") && !call.text.includes("30%")));
    assert.ok(copyCalls[1].text.includes("Previous draft"));
    assert.ok(calls.every(call => call.model === selectedModel));
    assert.ok(calls.every(call => !call.text.includes("Call updateDesign")), "no delivery-only LLM call");

    // Validate protocol with the SDK parser, including tool output and deferred patch.
    const chunks = wire.split("\n").filter(line => line.startsWith("data: ") && !line.includes("[DONE]"))
      .map(line => JSON.parse(line.slice(6)));
    let final: UIMessage | undefined;
    for await (const message of readUIMessageStream({ stream: new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(chunk)); controller.close(); } }) })) final = message;
    assert.ok(final?.parts.some(part => part.type === "tool-updateDesign" && part.state === "output-available"));
    assert.ok(final?.parts.some(part => part.type === "tool-refreshCopyVariants" && part.state === "output-available"));
    assert.ok(wire.includes('"targetArtboards":[1]'), "deferred pool stays on its originating artboard");
    failAlternatives = true;
    const fallback = await handleBriefChatRequest({ modelId: selectedModel, platformId: "linkedin-square", messages: [{ id: "3", role: "user", parts: [{ type: "text", text: resolved }] }] });
    const fallbackWire = await fallback.text();
    assert.ok(fallbackWire.includes('"toolName":"updateDesign"'));
    assert.ok(!fallbackWire.includes('"toolName":"refreshCopyVariants"'));
    assert.ok(fallbackWire.includes('"finishReason":"stop"'));
    assert.ok(!fallbackWire.includes('"type":"error"'));

  } finally {
    releasePool();
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
});

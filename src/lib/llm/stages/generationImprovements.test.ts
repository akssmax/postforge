import assert from "node:assert/strict";
import { test } from "node:test";
import type { UIMessage } from "ai";
import { extractThemesFromBrief, shouldGenerateVariants } from "@/lib/llm/rules";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { scoreVisualPattern } from "@/lib/social-tool/visualBlocks/library/scoring";
import type { VisualLibraryPattern } from "@/lib/social-tool/visualBlocks/library/catalog";
import { extractDesignPlanApplyOptionsFromMessage } from "@/lib/llm/extractDesignPlan";
import { runDesignPipeline, runDesignPipelineVariants } from "./pipelineOrchestrator";
import { visualContextFromPipeline } from "./visualContext";

const brief = "LinkedIn ad for Acme analytics. 40% off annual plans. Book a demo.";

test("platform and format choices with 'or' do not trigger variants; explicit angles do", () => {
  assert.equal(shouldGenerateVariants("Create a LinkedIn or Instagram post for Acme analytics"), false);
  assert.equal(shouldGenerateVariants("Acme launch — square or portrait"), false);
  assert.equal(shouldGenerateVariants("Promo for teams and/or agencies"), false);
  assert.deepEqual(extractThemesFromBrief("Acme launch post — speed or reliability"), ["speed", "reliability"]);
  assert.deepEqual(extractThemesFromBrief("Acme launch. Themes: speed, trust, savings"), ["speed", "trust", "savings"]);
  assert.equal(shouldGenerateVariants("Make three variants for the Acme launch"), true);
});

test("visual tags match whole words only", () => {
  const pattern = {
    id: "illustration-ai-helper",
    kind: "illustration",
    label: "Assistant",
    description: "Helper character",
    tags: ["ai"],
  } as unknown as VisualLibraryPattern;
  const email = scoreVisualPattern(pattern, { brief: "email campaign said hello" });
  const ai = scoreVisualPattern(pattern, { brief: "AI copilot for sales" });
  assert.ok(ai > email, `whole-word "AI" (${ai}) must outrank substring in "email" (${email})`);
});

test("campaign plan visual decisions reach the client apply options", async () => {
  const result = await runDesignPipeline({ userMessage: brief, platformId: "linkedin-square", messages: [], offline: true });
  const context = visualContextFromPipeline(result);
  assert.equal(context.featuredVisualKind, result.campaignPlan.visual.featuredKind);
  assert.equal(context.visualSemantic?.campaignType, result.campaignPlan.campaign.type);
  const message: UIMessage = {
    id: "m", role: "assistant",
    parts: [{ type: "tool-updateDesign", toolCallId: "1", state: "output-available", input: {}, output: { success: true, plan: result.validatedPlan, ...context } }],
  };
  const options = extractDesignPlanApplyOptionsFromMessage(message);
  assert.equal(options?.featuredVisualKind, context.featuredVisualKind);
  assert.deepEqual(options?.visualSemantic, context.visualSemantic);
});

test("pipeline trace records stage timings", async () => {
  const result = await runDesignPipeline({ userMessage: brief, platformId: "linkedin-square", messages: [], offline: true });
  const timings = result.pipelineTrace?.timings ?? {};
  for (const stage of ["planner", "slots", "total"]) assert.equal(typeof timings[stage], "number", stage);
  assert.deepEqual(result.pipelineTrace?.fallbacks, []);
});

type MockStage = "planner" | "ranker" | "slots";

async function withMockedModel<T>(handler: (stage: MockStage) => unknown, run: (calls: MockStage[]) => Promise<T>): Promise<T> {
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = "test-key-never-sent";
  const calls: MockStage[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const text = JSON.stringify(body.messages);
    const stage: MockStage = text.includes("Creative Planner") ? "planner" : text.includes("rank proven") ? "ranker" : "slots";
    calls.push(stage);
    const object = handler(stage);
    if (object instanceof Response) return object;
    return Response.json({
      id: "mock", object: "chat.completion", created: 1, model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(object) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
  };
  try {
    return await run(calls);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = oldKey;
  }
}

const slotsObject = {
  textSlots: [
    { slotId: "headline", role: "headline", text: "Acme analytics, 40% off" },
    { slotId: "subheading", role: "subheading", text: "Annual plans this month" },
    { slotId: "caption", role: "caption", text: "Book a demo" },
  ],
  featuredSlots: [{ slotId: "featured-primary", mode: "composed", visible: true }],
  showContent: true, showBrand: true, showFeaturedImage: true,
};

test("variants plan the campaign once and fan out", async () => {
  await withMockedModel(
    (stage) => stage === "planner"
      ? { ...campaignPlanFromBrief(brief, "linkedin-square"), resolvedBrief: brief }
      : stage === "ranker" ? { layoutId: "classic-hero", rationale: "fits" } : slotsObject,
    async (calls) => {
      const result = await runDesignPipelineVariants({ userMessage: `${brief} Themes: speed, trust, savings`, platformId: "linkedin-square", messages: [] });
      assert.equal(result.variants.length, 3);
      assert.equal(calls.filter(stage => stage === "planner").length, 1);
      assert.equal(new Set(result.variants.map(variant => variant.campaignPlan.campaign.type)).size, 1);
    },
  );
});

test("a failed copy stage is flagged and explained instead of silently using templates", async () => {
  await withMockedModel(
    (stage) => stage === "planner"
      ? { ...campaignPlanFromBrief(brief, "linkedin-square"), resolvedBrief: brief }
      : stage === "ranker" ? { layoutId: "classic-hero", rationale: "fits" }
      : Response.json({ error: { message: "unavailable" } }, { status: 400 }),
    async () => {
      const result = await runDesignPipeline({ userMessage: brief, platformId: "linkedin-square", messages: [] });
      assert.ok(result.pipelineTrace?.fallbacks?.includes("slots_offline"));
      assert.match(result.summary, /template copy/);
    },
  );
});

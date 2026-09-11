import assert from "node:assert/strict";
import { test } from "node:test";
import type { UIMessage } from "ai";
import { resolveBriefContext } from "./briefContext";
import { runDesignPipeline, runDesignPipelineVariants, finalizePipelineResult } from "./pipelineOrchestrator";
import { runDesignPipelineOffline } from "./pipelineOrchestratorOffline";
import { validateSlotDraft } from "./slotWriter";
import { loadArtifactPlugin } from "@/lib/design-engine/artifactRegistry";
import { artifactConstraintFailures } from "@/lib/llm/services/layoutValidator";
import { filterLayoutCandidatesForArtifact } from "@/lib/design-engine/layoutEngine";
import { scoreDesign } from "@/lib/social-tool/engine/scoringEngine";
import { buildCopyVariantPool } from "./copyVariantWriter";
import { extractDesignPlanFromMessage, extractDesignPlanApplyOptionsFromMessage, extractDesignVariantsFromMessage } from "@/lib/llm/extractDesignPlan";

const brief = "Create a LinkedIn ad for Acme analytics. Book a demo.";
const input = { userMessage: brief, platformId: "linkedin-square" as const, messages: [], offline: true };
const user = (text: string): UIMessage => ({ id: text, role: "user", parts: [{ type: "text", text }] });

test("regeneration retains user facts, applies reset boundaries, and excludes assistant claims", () => {
  const context = resolveBriefContext("Regenerate with 40% off", [user("Acme summer promotion, 30% off."), { id: "a", role: "assistant", parts: [{ type: "text", text: "Invented 99% claim" }] }, user("Regenerate with 40% off")]);
  assert.ok(context.includes("Acme summer"));
  assert.ok(context.startsWith("Current request"));
  assert.ok(context.includes("40%"));
  assert.ok(!context.includes("99%"));
  assert.equal(resolveBriefContext("New campaign: hiring designers", [user(brief)]), "New campaign: hiring designers");
});

test("canonical final plan preserves repairs and synchronizes primary pool and score", async () => {
  const result = await runDesignPipeline(input);
  const repaired = { ...result.validatedPlan, showFeaturedImage: false, featuredSlots: result.validatedPlan.featuredSlots.map(slot => ({ ...slot, visible: false })) };
  const final = finalizePipelineResult({ ...result, validatedPlan: repaired });
  assert.equal(final.validatedPlan.showFeaturedImage, false);
  assert.equal(final.planInput.showFeaturedImage, false);
  assert.equal(final.score.total, scoreDesign(final.validatedPlan, final.campaignPlan, final.rulesProfile).total);
  assert.equal(final.validatedPlan.copyVariants?.[0].heading, final.validatedPlan.copy.heading);
  assert.match(final.summary, /Structural checks/);
});

test("missing artifact content is reported and cannot be averaged into a passing score", async () => {
  const result = await runDesignPipeline({ ...input, userMessage: "Business card for Jane Doe. Contact jane@example.com", artifactId: "business_card" });
  const missing = { ...result.validatedPlan, textSlots: result.validatedPlan.textSlots.map(slot => ({ ...slot, text: "" })) };
  const failures = artifactConstraintFailures(missing, loadArtifactPlugin("business_card"));
  assert.ok(failures.includes("Missing required contact"));
  assert.equal(scoreDesign(missing, result.campaignPlan, result.rulesProfile).visualBalancePassed, false);
});

test("overlong copy and broken markup require rewrite; alternative pool never cuts canonical copy", async () => {
  const result = await runDesignPipeline(input);
  const draft = { textSlots: [{ slotId: "headline", role: "headline" as const, text: "[[" + "word ".repeat(100) }], featuredSlots: [], showContent: true, showBrand: true, showFeaturedImage: false };
  const validation = validateSlotDraft(draft, result.rulesProfile);
  assert.equal(validation.ok, false);
  if (!validation.ok) assert.ok(validation.reasons.some(reason => reason.includes("markup")));
  const primary = { heading: "Preserve this exact supplied heading", subheading: "Acme details" };
  const pool = buildCopyVariantPool(primary, [{ heading: "word ".repeat(100), subheading: "" }], result.rulesProfile);
  assert.deepEqual(pool, [primary]);
});

test("variants retain all application metadata and diversify eligible layouts", async () => {
  const result = await runDesignPipelineVariants(input);
  assert.equal(result.variants.length, 3);
  assert.ok(new Set(result.variants.map(variant => variant.layoutId)).size > 1);
  for (const variant of result.variants) {
    assert.ok(variant.artifactId);
    assert.ok(variant.platformId);
    assert.ok(variant.canvasSpec);
    assert.ok(variant.rendererId);
    assert.equal(variant.planInput.showFeaturedImage, variant.validatedPlan.showFeaturedImage);
  }
});

test("artifact filter never returns incompatible candidates through fallback", () => {
  assert.deepEqual(filterLayoutCandidatesForArtifact([], loadArtifactPlugin("business_card")), []);
});

test("resolved print platform and metadata survive existing chat extraction", async () => {
  const result = await runDesignPipeline({ ...input, userMessage: "Business card for Jane Doe, jane@example.com", artifactId: "business_card" });
  assert.equal(result.platformId, "business-card");
  const options = { platformId: result.platformId, artifactId: result.artifactId, canvasSpec: result.canvasSpec, rendererId: result.rendererId };
  const message: UIMessage = { id: "generated", role: "assistant", parts: [{ type: "tool-updateDesign", toolCallId: "1", state: "output-available", input: {}, output: { success: true, plan: result.validatedPlan, ...options } }] };
  assert.deepEqual(extractDesignPlanFromMessage(message), result.validatedPlan);
  assert.equal(extractDesignPlanApplyOptionsFromMessage(message)?.platformId, "business-card");
  const variants: UIMessage = { ...message, parts: [{ type: "tool-updateDesignVariants", toolCallId: "2", state: "output-available", input: {}, output: { success: true, variants: [{ theme: "one", plan: result.validatedPlan, applyOptions: options }] } }] };
  assert.equal(extractDesignVariantsFromMessage(variants)?.[0].applyOptions?.artifactId, "business_card");
});

test("legacy offline fallback still produces compatible print plans", () => {
  const result = runDesignPipelineOffline({ userMessage: "Business card for Jane Doe, jane@example.com", platformId: "linkedin-square" });
  assert.ok(result);
  assert.equal(result.platformId, "business-card");
});

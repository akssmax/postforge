import assert from "node:assert/strict";
import { test } from "node:test";
import { motionStyle, withMotion, withShaderBackground } from "@/lib/scene/motion";
import { specToScene, type SpecContext } from "@/lib/scene/compose/spec";
import { sceneDocumentSchema, walkScene, type SceneDocument, type SceneMotion } from "@/lib/scene/schema";

const context: SpecContext = {
  kind: "social",
  size: { width: 1080, height: 1080 },
  background: { kind: "brand-preset", presetId: null },
  font: { heading: "Inter", body: "Inter" },
  typeScale: 1,
};

function base(motion: "none" | "subtle" | "lively" = "none", backgroundShader: "none" | "aurora" = "none"): SceneDocument {
  const scene = specToScene(
    {
      rationale: "",
      motion,
      backgroundShader,
      sections: [
        { layout: "row", children: [{ type: "logo", size: "md" }] },
        { layout: "column", children: [{ type: "text", role: "headline", style: "headline", text: "Hello" }, { type: "visual", role: "hero", query: "x", visualKind: "ui" }, { type: "button", text: "Go" }] },
      ],
    },
    context,
  );
  assert.ok(scene);
  return scene;
}

const motions = (scene: SceneDocument) => {
  const out: SceneMotion[] = [];
  walkScene(scene, (node) => {
    const motion = (node as { motion?: SceneMotion }).motion;
    if (motion) out.push(motion);
  });
  return out;
};

test("motion frames are a pure function of time", () => {
  const motion: SceneMotion = { preset: "rise", delay: 200, duration: 600 };
  assert.deepEqual(motionStyle(motion, 0, 10), { opacity: 0, transform: "translateY(40px)" });
  assert.deepEqual(motionStyle(motion, 800, 10), { opacity: 1, transform: "translateY(0px)" });
  const mid = motionStyle(motion, 500, 10);
  assert.ok(typeof mid.opacity === "number" && mid.opacity > 0 && mid.opacity < 1);
  assert.deepEqual(motionStyle(motion, 500, 10), mid, "same time, same frame");
  assert.deepEqual(motionStyle(motion, undefined, 10), {}, "no clock: the finished still frame");
});

test("withMotion staggers elements in reading order and sets the duration", () => {
  const scene = withMotion(base(), "lively");
  assert.equal(scene.durationMs, 5000);
  const delays = motions(scene).map((motion) => motion.delay);
  assert.equal(delays.length, 4, "logo, headline, visual, button");
  assert.deepEqual([...delays].sort((a, b) => a - b), delays);
  assert.doesNotThrow(() => sceneDocumentSchema.parse(scene));
  const still = withMotion(scene, "none");
  assert.equal(still.durationMs, 0);
  assert.equal(motions(still).length, 0);
});

test("shader backgrounds sit under everything and can be removed", () => {
  const scene = withShaderBackground(base(), "aurora");
  assert.equal(scene.overlays[0]?.layer, "below");
  assert.equal(scene.overlays[0]?.node.type, "shader");
  assert.ok(scene.durationMs >= 4000, "a shader loop gives the video a length");
  assert.doesNotThrow(() => sceneDocumentSchema.parse(scene));
  assert.equal(withShaderBackground(scene, "none").overlays.filter((overlay) => overlay.node.type === "shader").length, 0);
});

test("the AI spec can choose motion and a shader background", () => {
  const scene = base("subtle", "aurora");
  assert.equal(scene.durationMs, 4000);
  assert.ok(motions(scene).length > 0);
  assert.ok(scene.overlays.some((overlay) => overlay.node.type === "shader" && overlay.node.preset === "aurora"));
});

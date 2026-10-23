import assert from "node:assert/strict";
import { test } from "node:test";
import { createBlankSession } from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { composeScene, SCENE_COMPOSITIONS } from "@/lib/scene/compositions";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import { sceneDocumentSchema, walkScene, type SceneDocument, type SceneNode } from "@/lib/scene/schema";
import { catalogLayoutRef } from "@/lib/social-tool/layoutAdapter";
import { POST_LAYOUTS, type PostLayoutId } from "@/lib/social-tool/postLayouts";

function design(layoutId: PostLayoutId, size = { width: 1080, height: 1080 }): DesignSessionPersisted {
  const base = createBlankSession(`scene-${layoutId}`);
  return {
    ...base,
    featured: {
      ...base.featured,
      mode: "composed",
      activeBlockId: "block-1",
      visualBlocks: [{ id: "block-1", libraryId: "dashboard-metrics", label: "Dashboard", kind: "ui", svgMarkup: "", createdAt: 0 }],
    },
    document: {
      ...base.document,
      layoutId,
      layoutRef: catalogLayoutRef(layoutId),
      textSlots: undefined,
      featuredSlots: undefined,
      showBrand: true,
      showContent: true,
      showFeaturedImage: true,
      canvasSpec: { ...size, unit: "px" },
      copy: {
        heading: "Close deals [[2× faster]]",
        subheading: "One workspace for pipeline and reporting.",
        extraFields: [{ id: "cta-primary", label: "CTA", value: "Book a demo" }],
      },
    },
  };
}

function nodes(scene: SceneDocument): SceneNode[] {
  const all: SceneNode[] = [];
  walkScene(scene, (node) => all.push(node));
  return all;
}

test("every catalog layout converts to a valid scene that keeps its content", () => {
  for (const layout of POST_LAYOUTS) {
    const scene = sceneFromDesign(design(layout.id));
    assert.doesNotThrow(() => sceneDocumentSchema.parse(scene), layout.id);
    const all = nodes(scene);
    const headline = all.find((node) => node.type === "text" && node.role === "headline");
    assert.ok(headline && headline.type === "text" && headline.text.includes("[[2× faster]]"), `${layout.id}: headline`);
    const visuals = all.filter((node) => node.type === "visual");
    assert.equal(visuals.length > 0, layout.includeFeaturedSlot !== false, `${layout.id}: featured visual`);
    if (visuals[0]?.type === "visual") assert.deepEqual(visuals[0].source, { kind: "block", blockId: "block-1" });
    const ids = all.map((node) => node.id);
    assert.equal(new Set(ids).size, ids.length, `${layout.id}: node ids are unique`);
  }
});

test("layout structure survives conversion: split side, logo placement, footer", () => {
  const split = sceneFromDesign(design("split-feature-right", { width: 1200, height: 627 }));
  const row = nodes(split).find((node) => node.type === "frame" && node.id === "split");
  assert.ok(row && row.type === "frame" && row.layout === "row");
  assert.deepEqual(row.children.map((child) => child.id), ["text-column", "visual-column"]);
  const left = sceneFromDesign(design("split-feature-left", { width: 1200, height: 627 }));
  const leftRow = nodes(left).find((node) => node.type === "frame" && node.id === "split");
  assert.ok(leftRow && leftRow.type === "frame");
  assert.deepEqual(leftRow.children.map((child) => child.id), ["visual-column", "text-column"]);

  const footerLogo = sceneFromDesign(design("logo-footer-bar"));
  const footer = footerLogo.root.children.find((node) => node.id === "footer");
  assert.ok(footer && footer.type === "frame" && footer.children.some((child) => child.type === "logo"));
});

test("hidden content, brand and visuals are left out of the scene", () => {
  const session = design("classic-hero");
  session.document = { ...session.document, showBrand: false, showFeaturedImage: false };
  const all = nodes(sceneFromDesign(session));
  assert.ok(!all.some((node) => node.type === "logo"));
  assert.ok(!all.some((node) => node.type === "visual"));
});

test("scene kind and size follow the canvas", () => {
  assert.equal(sceneFromDesign(design("classic-hero", { width: 1080, height: 1920 })).kind, "story");
  const square = sceneFromDesign(design("classic-hero"));
  assert.equal(square.kind, "social");
  assert.deepEqual(square.size, { width: 1080, height: 1080 });
});

test("compositions re-place the same content, including a CTA the layout dropped", () => {
  for (const composition of SCENE_COMPOSITIONS) {
    const scene = composeScene(design("classic-hero"), composition.id);
    assert.doesNotThrow(() => sceneDocumentSchema.parse(scene), composition.id);
    assert.deepEqual(scene.origin, { source: "composition", id: composition.id });
    const all = nodes(scene);
    assert.ok(all.some((node) => node.type === "text" && node.role === "headline"), `${composition.id}: headline`);
    assert.ok(all.some((node) => node.type === "visual"), `${composition.id}: visual`);
    assert.ok(all.some((node) => node.type === "button" && node.text === "Book a demo"), `${composition.id}: CTA`);
  }
  const fullBleed = composeScene(design("classic-hero"), "full-bleed");
  assert.equal(fullBleed.overlays[0]?.layer, "below", "the visual sits under the copy card");
});

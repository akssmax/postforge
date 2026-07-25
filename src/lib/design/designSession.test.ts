import { normalizeFeaturedPersisted } from "@/lib/social-tool/featuredBlock";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sampleBlock: VisualBlockRecord = {
  id: "visual-test-1",
  label: "Dashboard",
  kind: "ui",
  svgMarkup: "<svg viewBox='0 0 100 100'><rect width='100' height='100'/></svg>",
  createdAt: 1,
};

function testNormalizeFeaturedPersisted() {
  const restored = normalizeFeaturedPersisted({
    mode: "composed",
    productPage: "leads",
    image: null,
    activeBlockId: sampleBlock.id,
    visualBlocks: [sampleBlock],
  });
  assert(restored.mode === "composed", "composed mode should survive normalize");
  assert(restored.activeBlockId === sampleBlock.id, "activeBlockId should restore");
  assert(restored.visualBlocks?.length === 1, "visualBlocks should restore");
  assert(
    restored.visualBlocks?.[0]?.svgMarkup.includes("<svg"),
    "visual block svg should restore",
  );

  const legacy = normalizeFeaturedPersisted({
    mode: "composed",
    productPage: "leads",
    image: null,
  });
  assert(legacy.visualBlocks?.length === 0, "missing visualBlocks should default to []");
  assert(legacy.activeBlockId === null, "missing activeBlockId should default to null");
}

function run() {
  testNormalizeFeaturedPersisted();
  console.log("designSession.test.ts: all tests passed");
}

run();

import assert from "node:assert/strict";
import { test } from "node:test";
import { blankCanvasDesign, blankScene } from "@/lib/canvas/blank";
import { canvasDesignSchema } from "@/lib/canvas/document";
import { fieldsFor, readPath } from "@/lib/canvas/fields";
import { cloneWithNewIds, defaultNode, sceneDiffOps, sceneNodeIds, type InsertableType } from "@/lib/canvas/nodes";
import { applyOps, locateNode } from "@/lib/canvas/ops";
import { commit, commitMerged, emptyHistory, redo, undo } from "@/lib/canvas/history";
import { withMotion, withShaderBackground } from "@/lib/scene/motion";
import { resizeScene } from "@/lib/scene/sizes";

const TYPES: InsertableType[] = ["text", "button", "visual", "logo", "icon", "shape", "pattern", "frame", "spacer"];

test("the blank design is valid", () => {
  assert.doesNotThrow(() => canvasDesignSchema.parse(blankCanvasDesign()));
});

test("every insertable element is a valid node and every inspector field accepts its options", () => {
  let design = blankCanvasDesign();
  const artboardId = design.pages[0]!.artboards[0]!.id;
  for (const type of TYPES) {
    const node = defaultNode(type);
    design = applyOps(design, [{ op: "insert", artboardId, parentId: "root", index: 0, node }]).design;
    for (const field of fieldsFor(node)) {
      const values: unknown[] =
        field.kind === "select" || field.kind === "segment"
          ? [...field.options.map((option) => option.id), ...(field.optional ? [undefined] : [])]
          : field.kind === "slider"
            ? [field.min, field.max, ...(field.optional ? [undefined] : [])]
            : field.path === "colorHex"
              ? ["#123456", undefined]
              : ["Edited"];
      for (const value of values) {
        const next = applyOps(design, [{ op: "set", artboardId, nodeId: node.id, path: field.path, value }]).design;
        const located = locateNode(next.pages[0]!.artboards[0]!.scene, node.id);
        assert.deepEqual(readPath(located!.node, field.path), value, `${type}.${field.path} = ${String(value)}`);
      }
    }
  }
});

test("shader colour tuple stays a tuple when one entry changes", () => {
  let design = blankCanvasDesign();
  const artboard = design.pages[0]!.artboards[0]!;
  design = applyOps(design, sceneDiffOps(artboard.id, artboard.scene, withShaderBackground(artboard.scene, "aurora"))).design;
  design = applyOps(design, [{ op: "set", artboardId: artboard.id, nodeId: "background-shader", path: "colors.1", value: "brand.secondary" }]).design;
  const shader = locateNode(design.pages[0]!.artboards[0]!.scene, "background-shader")!.node;
  assert.ok(shader.type === "shader" && Array.isArray(shader.colors));
  assert.deepEqual(shader.type === "shader" ? shader.colors : null, ["brand.primary", "brand.secondary"]);
});

test("whole-scene helpers become undoable setScene diffs", () => {
  const design = blankCanvasDesign();
  const artboard = design.pages[0]!.artboards[0]!;
  const target = resizeScene(withMotion(artboard.scene, "lively"), { width: 1080, height: 1920 });
  const ops = sceneDiffOps(artboard.id, artboard.scene, target);
  assert.deepEqual(ops.map((op) => op.path).sort(), ["durationMs", "kind", "root", "size"]);
  const committed = commit(design, emptyHistory(), ops);
  assert.deepEqual(committed.design.pages[0]!.artboards[0]!.scene, target);
  const undone = undo(committed.design, committed.history)!;
  assert.deepEqual(undone.design.pages[0]!.artboards[0]!.scene, artboard.scene);
});

test("duplicated subtrees get fresh ids throughout", () => {
  const scene = blankScene();
  const copy = cloneWithNewIds(scene.root);
  const before = sceneNodeIds(scene);
  const after = sceneNodeIds({ ...scene, root: copy as typeof scene.root });
  assert.equal(after.size, before.size);
  for (const id of after) assert.ok(!before.has(id));
});

test("coalesced slider steps undo to the state before the drag", () => {
  let design = blankCanvasDesign();
  const artboardId = design.pages[0]!.artboards[0]!.id;
  const original = design;
  let history = emptyHistory();
  const first = commit(design, history, [{ op: "setScene", artboardId, path: "typeScale", value: 1.2 }]);
  design = first.design;
  history = first.history;
  for (const value of [1.3, 1.4, 1.5]) {
    const merged = commitMerged(design, history, [{ op: "setScene", artboardId, path: "typeScale", value }]);
    design = merged.design;
    history = merged.history;
  }
  assert.equal(history.past.length, 1);
  const undone = undo(design, history)!;
  assert.equal(undone.design.pages[0]!.artboards[0]!.scene.typeScale, original.pages[0]!.artboards[0]!.scene.typeScale);
  assert.equal(redo(undone.design, undone.history)!.design.pages[0]!.artboards[0]!.scene.typeScale, 1.5);
});

import { createId } from "@/lib/canvas/document";
import type { SceneDocument, SceneNode } from "@/lib/scene/schema";

export type InsertableType = "text" | "button" | "visual" | "logo" | "icon" | "shape" | "pattern" | "frame" | "spacer";

/** A sensible starting node for each element the editor can add. */
export function defaultNode(type: InsertableType): SceneNode {
  const id = createId(type);
  switch (type) {
    case "text":
      return { type, id, role: "body", style: "body", text: "New text" };
    case "button":
      return { type, id, role: "cta", text: "Learn more", variant: "solid" };
    case "visual":
      return { type, id, role: "supporting", source: { kind: "placeholder" }, fit: "contain", grow: 1 };
    case "logo":
      return { type, id, size: "md" };
    case "icon":
      return { type, id, name: "Sparkles", size: "md" };
    case "shape":
      return { type, id, shape: "bar", color: "brand.accent" };
    case "pattern":
      return { type, id, patternId: "monogram", opacity: 0.25, scale: 1, grow: 1 };
    case "frame":
      return { type, id, layout: "row", gap: "3", align: "center", children: [] };
    case "spacer":
      return { type, id, grow: 1 };
  }
}

/** Copy a node with fresh ids throughout (for duplicate and paste). */
export function cloneWithNewIds(node: SceneNode): SceneNode {
  const copy = { ...node, id: createId(node.type) } as SceneNode;
  if (copy.type === "frame") copy.children = copy.children.map(cloneWithNewIds);
  return copy;
}

const TYPE_LABELS: Record<SceneNode["type"], string> = {
  frame: "Frame",
  text: "Text",
  visual: "Visual",
  logo: "Logo",
  button: "Button",
  shape: "Shape",
  shader: "Shader",
  icon: "Icon",
  pattern: "Pattern",
  spacer: "Spacer",
};

/** Short human label for the layers tree. */
export function nodeLabel(node: SceneNode): string {
  if (node.type === "text" || node.type === "button") {
    const text = node.text.replace(/\[\[|\]\]/g, "").trim();
    return text ? (text.length > 32 ? `${text.slice(0, 31)}…` : text) : TYPE_LABELS[node.type];
  }
  if (node.type === "icon") return `Icon · ${node.name}`;
  if (node.type === "frame") return `${TYPE_LABELS.frame} · ${node.layout}`;
  if (node.type === "visual") return `Visual · ${node.role}`;
  return TYPE_LABELS[node.type];
}

export function nodeTypeLabel(type: SceneNode["type"]): string {
  return TYPE_LABELS[type];
}

/** Every node id in a scene, root and overlays included. */
export function sceneNodeIds(scene: SceneDocument): Set<string> {
  const ids = new Set<string>();
  const visit = (node: SceneNode) => {
    ids.add(node.id);
    if (node.type === "frame") node.children.forEach(visit);
  };
  visit(scene.root);
  scene.overlays.forEach((overlay) => visit(overlay.node));
  return ids;
}

const DIFFABLE_SCENE_KEYS = ["kind", "size", "background", "typeScale", "durationMs", "tweaks", "overlays", "root"] as const;

/**
 * Ops that turn one artboard scene into another, one `setScene` per changed
 * top-level field. Lets whole-scene helpers (motion, resize) stay undoable.
 */
export function sceneDiffOps(artboardId: string, before: SceneDocument, after: SceneDocument) {
  return DIFFABLE_SCENE_KEYS.filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => ({
    op: "setScene" as const,
    artboardId,
    path: key,
    value: after[key],
  }));
}

import { z } from "zod";
import {
  sceneDocumentSchema,
  sceneNodeSchema,
  type FrameNode,
  type SceneDocument,
  type SceneNode,
} from "@/lib/scene/schema";
import { artboardSchema, pageSchema, type CanvasDesign } from "@/lib/canvas/document";

/**
 * Every edit, from a person or the agent, is one of these operations on stable
 * ids. Applying an op returns the exact ops that undo it, so undo, sync,
 * version history and "what did the AI change" all share one mechanism.
 */
export const canvasOpSchema = z.discriminatedUnion("op", [
  /** Set a field on a node; `path` is dot-separated ("text", "motion.delay"). `value: undefined` removes it. */
  z.object({ op: z.literal("set"), artboardId: z.string(), nodeId: z.string(), path: z.string(), value: z.unknown() }),
  /** Insert a node into a frame (`parentId` is a frame id, "root" for the scene root). */
  z.object({ op: z.literal("insert"), artboardId: z.string(), parentId: z.string(), index: z.number().int().min(0), node: z.unknown() }),
  z.object({ op: z.literal("remove"), artboardId: z.string(), nodeId: z.string() }),
  z.object({ op: z.literal("move"), artboardId: z.string(), nodeId: z.string(), parentId: z.string(), index: z.number().int().min(0) }),
  /** Set a scene-level field: typeScale, background, size, overlays, tweaks, durationMs, font. */
  z.object({ op: z.literal("setScene"), artboardId: z.string(), path: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("addArtboard"), pageId: z.string(), index: z.number().int().min(0), artboard: z.unknown() }),
  z.object({ op: z.literal("removeArtboard"), artboardId: z.string() }),
  z.object({ op: z.literal("renameArtboard"), artboardId: z.string(), name: z.string().max(80) }),
  z.object({ op: z.literal("addPage"), index: z.number().int().min(0), page: z.unknown() }),
  z.object({ op: z.literal("removePage"), pageId: z.string() }),
  /** Design-level fields: "title", "brand.colors.accent", "systemId". */
  z.object({ op: z.literal("setDesign"), path: z.string(), value: z.unknown() }),
]);
export type CanvasOp = z.infer<typeof canvasOpSchema>;

export class CanvasOpError extends Error {}

const SCENE_PATHS = new Set(["typeScale", "background", "size", "overlays", "tweaks", "durationMs", "font", "kind"]);
const DESIGN_PATHS = /^(title|systemId|brand\.(colors\.(primary|secondary|accent|neutral)|logoSvg|logoSrc))$/;
const FORBIDDEN_NODE_PATHS = new Set(["id", "type", "children"]);

type Located = { node: SceneNode; parent: FrameNode | null; index: number; overlayIndex: number | null };

/** Find a node anywhere in a scene (main tree or overlays). */
export function locateNode(scene: SceneDocument, nodeId: string): Located | null {
  const search = (node: SceneNode, parent: FrameNode | null, index: number, overlayIndex: number | null): Located | null => {
    if (node.id === nodeId) return { node, parent, index, overlayIndex };
    if (node.type !== "frame") return null;
    for (const [childIndex, child] of node.children.entries()) {
      const found = search(child, node, childIndex, overlayIndex);
      if (found) return found;
    }
    return null;
  };
  const inRoot = search(scene.root, null, 0, null);
  if (inRoot) return inRoot;
  for (const [overlayIndex, overlay] of scene.overlays.entries()) {
    const found = search(overlay.node, null, 0, overlayIndex);
    if (found) return found;
  }
  return null;
}

function getPath(target: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), target);
}

function setPath<T extends object>(target: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = (input: unknown): Record<string, unknown> => ({ ...(input && typeof input === "object" ? (input as Record<string, unknown>) : {}) });
  const root = clone(target);
  let cursor = root;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      if (value === undefined) delete cursor[key];
      else cursor[key] = value;
      return;
    }
    cursor[key] = clone(cursor[key]);
    cursor = cursor[key] as Record<string, unknown>;
  });
  return root as T;
}

function validScene(scene: SceneDocument): SceneDocument {
  const parsed = sceneDocumentSchema.safeParse(scene);
  if (!parsed.success) throw new CanvasOpError(`The change would make the artboard invalid: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  return parsed.data;
}

function updateArtboardScene(design: CanvasDesign, artboardId: string, update: (scene: SceneDocument) => SceneDocument): CanvasDesign {
  let found = false;
  const pages = design.pages.map((page) => ({
    ...page,
    artboards: page.artboards.map((artboard) => {
      if (artboard.id !== artboardId) return artboard;
      found = true;
      return { ...artboard, scene: validScene(update(artboard.scene)) };
    }),
  }));
  if (!found) throw new CanvasOpError(`No artboard ${artboardId}`);
  return { ...design, pages };
}

/** Replace a node by id (main tree or overlay) through `replace`; `null` removes it. */
function mapNode(scene: SceneDocument, nodeId: string, replace: (node: SceneNode) => SceneNode | null): SceneDocument {
  const walk = (node: SceneNode): SceneNode | null => {
    if (node.id === nodeId) return replace(node);
    if (node.type !== "frame") return node;
    return { ...node, children: node.children.map(walk).filter((child): child is SceneNode => child !== null) };
  };
  const root = walk(scene.root);
  if (!root || root.type !== "frame") throw new CanvasOpError("The scene root can't be removed or replaced by a non-frame");
  const overlays = scene.overlays
    .map((overlay) => {
      const node = walk(overlay.node);
      return node ? { ...overlay, node } : null;
    })
    .filter((overlay): overlay is SceneDocument["overlays"][number] => overlay !== null);
  return { ...scene, root, overlays };
}

function insertInto(scene: SceneDocument, parentId: string, index: number, node: SceneNode): SceneDocument {
  const targetId = parentId === "root" ? scene.root.id : parentId;
  const parent = locateNode(scene, targetId);
  if (!parent || parent.node.type !== "frame") throw new CanvasOpError(`Parent ${parentId} is not a frame`);
  if (locateNode(scene, node.id)) throw new CanvasOpError(`A node with id ${node.id} already exists`);
  return mapNode(scene, targetId, (frame) => {
    const children = [...(frame as FrameNode).children];
    children.splice(Math.min(index, children.length), 0, node);
    return { ...(frame as FrameNode), children };
  });
}

export type AppliedOp = { design: CanvasDesign; inverse: CanvasOp[] };

/** Apply one op. Throws CanvasOpError (and changes nothing) when the op doesn't apply. */
export function applyOp(design: CanvasDesign, rawOp: CanvasOp): AppliedOp {
  const op = canvasOpSchema.parse(rawOp);
  const touched = (next: CanvasDesign): CanvasDesign => ({ ...next, updatedAt: Date.now() });
  switch (op.op) {
    case "set": {
      if (FORBIDDEN_NODE_PATHS.has(op.path.split(".")[0]!)) throw new CanvasOpError(`"${op.path}" can't be set; use insert/remove/move`);
      const scene = findScene(design, op.artboardId);
      const located = locateNode(scene, op.nodeId);
      if (!located) throw new CanvasOpError(`No node ${op.nodeId}`);
      const previous = getPath(located.node, op.path);
      const next = updateArtboardScene(design, op.artboardId, (current) => mapNode(current, op.nodeId, (node) => setPath(node, op.path, op.value)));
      return { design: touched(next), inverse: [{ ...op, value: previous }] };
    }
    case "insert": {
      const node = sceneNodeSchema.parse(op.node);
      const next = updateArtboardScene(design, op.artboardId, (scene) => insertInto(scene, op.parentId, op.index, node));
      return { design: touched(next), inverse: [{ op: "remove", artboardId: op.artboardId, nodeId: node.id }] };
    }
    case "remove": {
      const scene = findScene(design, op.artboardId);
      const located = locateNode(scene, op.nodeId);
      if (!located) throw new CanvasOpError(`No node ${op.nodeId}`);
      if (located.node.id === scene.root.id) throw new CanvasOpError("The scene root can't be removed");
      const next = updateArtboardScene(design, op.artboardId, (current) => mapNode(current, op.nodeId, () => null));
      // An overlay's own node takes its overlay with it; restore the overlay list as a whole.
      const inverse: CanvasOp[] =
        located.parent === null && located.overlayIndex !== null
          ? [{ op: "setScene", artboardId: op.artboardId, path: "overlays", value: scene.overlays }]
          : [{ op: "insert", artboardId: op.artboardId, parentId: located.parent!.id, index: located.index, node: located.node }];
      return { design: touched(next), inverse };
    }
    case "move": {
      const scene = findScene(design, op.artboardId);
      const located = locateNode(scene, op.nodeId);
      if (!located || !located.parent) throw new CanvasOpError(`Node ${op.nodeId} can't be moved`);
      const targetId = op.parentId === "root" ? scene.root.id : op.parentId;
      const target = locateNode(scene, targetId);
      if (!target || target.node.type !== "frame") throw new CanvasOpError(`Parent ${op.parentId} is not a frame`);
      if (target.node.id === op.nodeId || (located.node.type === "frame" && locateNode({ ...scene, root: located.node, overlays: [] }, targetId))) {
        throw new CanvasOpError("A frame can't move into itself");
      }
      const next = updateArtboardScene(design, op.artboardId, (current) => insertInto(mapNode(current, op.nodeId, () => null), targetId, op.index, located.node));
      return { design: touched(next), inverse: [{ op: "move", artboardId: op.artboardId, nodeId: op.nodeId, parentId: located.parent.id, index: located.index }] };
    }
    case "setScene": {
      if (!SCENE_PATHS.has(op.path.split(".")[0]!)) throw new CanvasOpError(`"${op.path}" is not a scene field`);
      const previous = getPath(findScene(design, op.artboardId), op.path);
      const next = updateArtboardScene(design, op.artboardId, (scene) => setPath(scene, op.path, op.value));
      return { design: touched(next), inverse: [{ ...op, value: previous }] };
    }
    case "addArtboard": {
      const artboard = artboardSchema.parse(op.artboard);
      if (design.pages.some((page) => page.artboards.some((existing) => existing.id === artboard.id))) throw new CanvasOpError(`Artboard ${artboard.id} exists`);
      const pages = design.pages.map((page) => {
        if (page.id !== op.pageId) return page;
        const artboards = [...page.artboards];
        artboards.splice(Math.min(op.index, artboards.length), 0, artboard);
        return { ...page, artboards };
      });
      if (!pages.some((page) => page.id === op.pageId)) throw new CanvasOpError(`No page ${op.pageId}`);
      return { design: touched({ ...design, pages }), inverse: [{ op: "removeArtboard", artboardId: artboard.id }] };
    }
    case "removeArtboard": {
      for (const page of design.pages) {
        const index = page.artboards.findIndex((artboard) => artboard.id === op.artboardId);
        if (index < 0) continue;
        const pages = design.pages.map((entry) => (entry.id === page.id ? { ...entry, artboards: entry.artboards.filter((artboard) => artboard.id !== op.artboardId) } : entry));
        return { design: touched({ ...design, pages }), inverse: [{ op: "addArtboard", pageId: page.id, index, artboard: page.artboards[index] }] };
      }
      throw new CanvasOpError(`No artboard ${op.artboardId}`);
    }
    case "renameArtboard": {
      for (const page of design.pages) {
        const artboard = page.artboards.find((entry) => entry.id === op.artboardId);
        if (!artboard) continue;
        const pages = design.pages.map((entry) => ({ ...entry, artboards: entry.artboards.map((board) => (board.id === op.artboardId ? { ...board, name: op.name } : board)) }));
        return { design: touched({ ...design, pages }), inverse: [{ op: "renameArtboard", artboardId: op.artboardId, name: artboard.name }] };
      }
      throw new CanvasOpError(`No artboard ${op.artboardId}`);
    }
    case "addPage": {
      const page = pageSchema.parse(op.page);
      const pages = [...design.pages];
      pages.splice(Math.min(op.index, pages.length), 0, page);
      return { design: touched({ ...design, pages }), inverse: [{ op: "removePage", pageId: page.id }] };
    }
    case "removePage": {
      const index = design.pages.findIndex((page) => page.id === op.pageId);
      if (index < 0) throw new CanvasOpError(`No page ${op.pageId}`);
      if (design.pages.length === 1) throw new CanvasOpError("A design needs at least one page");
      return { design: touched({ ...design, pages: design.pages.filter((page) => page.id !== op.pageId) }), inverse: [{ op: "addPage", index, page: design.pages[index] }] };
    }
    case "setDesign": {
      if (!DESIGN_PATHS.test(op.path)) throw new CanvasOpError(`"${op.path}" is not a design field`);
      const previous = getPath(design, op.path);
      return { design: touched(setPath(design, op.path, op.value)), inverse: [{ ...op, value: previous }] };
    }
  }
}

function findScene(design: CanvasDesign, artboardId: string): SceneDocument {
  for (const page of design.pages) {
    const artboard = page.artboards.find((entry) => entry.id === artboardId);
    if (artboard) return artboard.scene;
  }
  throw new CanvasOpError(`No artboard ${artboardId}`);
}

/**
 * Apply ops as one transaction: all or nothing. Returns the inverse ops in the
 * order that undoes the whole transaction.
 */
export function applyOps(design: CanvasDesign, ops: CanvasOp[]): AppliedOp {
  let current = design;
  const inverses: CanvasOp[][] = [];
  for (const op of ops) {
    const applied = applyOp(current, op);
    current = applied.design;
    inverses.push(applied.inverse);
  }
  return { design: current, inverse: inverses.reverse().flat() };
}

import { z } from "zod";
import { checkArtboard, type DesignIssue } from "@/lib/agent/checks";
import { findArtboard, type CanvasDesign } from "@/lib/canvas/document";
import { applyOps, CanvasOpError, canvasOpSchema, locateNode, type CanvasOp } from "@/lib/canvas/ops";
import type { SceneNode } from "@/lib/scene/schema";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** What the agent may touch: the whole design, one artboard, or one layer's subtree. */
export type AgentScope = { kind: "design" } | { kind: "artboard"; artboardId: string } | { kind: "node"; artboardId: string; nodeId: string };

export type VisualFinder = (input: { query: string; kind: "ui" | "illustration" | "3d"; colors: CanvasDesign["brand"]["colors"] }) => Promise<VisualBlockRecord | null>;

export const applyOpsInput = z.object({ label: z.string().min(1).max(80), ops: z.array(z.unknown()).min(1).max(200) });
export const readArtboardInput = z.object({ artboard_id: z.string() });
export const findVisualInput = z.object({ artboard_id: z.string(), node_id: z.string(), query: z.string().min(2).max(200), kind: z.enum(["ui", "illustration", "3d"]) });
export const checkDesignInput = z.object({ artboard_id: z.string() });

export type ToolOutcome = { content: string; isError?: boolean };

function subtreeIds(node: SceneNode, into = new Set<string>()): Set<string> {
  into.add(node.id);
  if (node.type === "frame") node.children.forEach((child) => subtreeIds(child, into));
  return into;
}

/**
 * The agent's working copy. Every tool call is validated here against the
 * same op engine the editor uses, so whatever the agent emits will apply on
 * the client too. Accepted batches are reported through `onOps`.
 */
export class AgentWorkspace {
  design: CanvasDesign;
  readonly blocks: VisualBlockRecord[] = [];
  appliedBatches = 0;
  checkedSinceLastEdit = true;
  lastIssues: DesignIssue[] = [];

  constructor(
    design: CanvasDesign,
    readonly scope: AgentScope,
    private readonly hooks: { onOps: (ops: CanvasOp[], label: string) => void; onBlocks: (blocks: VisualBlockRecord[]) => void; findVisual?: VisualFinder },
  ) {
    this.design = design;
  }

  /** Reject edits outside the scope the user picked. */
  private assertInScope(op: CanvasOp) {
    const { scope } = this;
    if (scope.kind === "design") return;
    const designLevel = op.op === "addPage" || op.op === "removePage" || op.op === "replacePages" || op.op === "setDesign" || op.op === "addArtboard";
    if (designLevel) throw new CanvasOpError(`"${op.op}" is outside the selected ${scope.kind === "node" ? "layer" : "artboard"}`);
    if ("artboardId" in op && op.artboardId !== scope.artboardId) throw new CanvasOpError(`Only artboard ${scope.artboardId} may be changed`);
    if (scope.kind === "artboard") return;
    if (op.op === "setScene" || op.op === "removeArtboard" || op.op === "renameArtboard") throw new CanvasOpError("Only the selected layer may be changed");
    const artboard = findArtboard(this.design, scope.artboardId);
    const root = artboard ? locateNode(artboard.artboard.scene, scope.nodeId) : null;
    if (!root) throw new CanvasOpError("The selected layer no longer exists");
    const allowed = subtreeIds(root.node);
    const targets = op.op === "insert" ? [op.parentId] : op.op === "move" ? [op.nodeId, op.parentId] : "nodeId" in op ? [op.nodeId] : [];
    for (const id of targets) {
      // New nodes inserted earlier in this run count as inside the selection.
      if (!allowed.has(id)) throw new CanvasOpError(`Node ${id} is outside the selected layer ${scope.nodeId}`);
    }
  }

  applyOps(label: string, rawOps: unknown[]): ToolOutcome {
    try {
      const ops = rawOps.map((raw, index) => {
        const parsed = canvasOpSchema.safeParse(raw);
        if (!parsed.success) throw new CanvasOpError(`ops[${index}] is malformed: ${parsed.error.issues[0]?.message ?? "invalid"}`);
        // JSON has no undefined: a null value on "set" means remove the field.
        if (parsed.data.op === "set" && parsed.data.value === null) return { ...parsed.data, value: undefined };
        return parsed.data;
      });
      ops.forEach((op) => this.assertInScope(op));
      this.design = applyOps(this.design, ops).design;
      this.appliedBatches += 1;
      this.checkedSinceLastEdit = false;
      this.hooks.onOps(ops, label);
      return { content: `Applied ${ops.length} op${ops.length === 1 ? "" : "s"} (${label}).` };
    } catch (error) {
      // Nothing is applied when any op fails: the batch is all-or-nothing.
      return { content: `Rejected, nothing applied: ${error instanceof Error ? error.message : "invalid ops"}`, isError: true };
    }
  }

  readArtboard(artboardId: string): ToolOutcome {
    const found = findArtboard(this.design, artboardId);
    if (!found) return { content: `No artboard ${artboardId}`, isError: true };
    return { content: JSON.stringify({ id: found.artboard.id, name: found.artboard.name, scene: found.artboard.scene }) };
  }

  async findVisual(input: z.infer<typeof findVisualInput>): Promise<ToolOutcome> {
    if (!this.hooks.findVisual) return { content: "Visual search isn't available here.", isError: true };
    const found = findArtboard(this.design, input.artboard_id);
    const node = found ? locateNode(found.artboard.scene, input.node_id)?.node : null;
    if (!node || node.type !== "visual") return { content: `Node ${input.node_id} is not a visual node on ${input.artboard_id}`, isError: true };
    const block = await this.hooks.findVisual({ query: input.query, kind: input.kind, colors: this.design.brand.colors }).catch(() => null);
    if (!block) return { content: `No library visual matched "${input.query}". Try a broader query or another kind.`, isError: true };
    this.blocks.push(block);
    this.hooks.onBlocks([block]);
    const outcome = this.applyOps(`Visual: ${block.label}`.slice(0, 80), [{ op: "set", artboardId: input.artboard_id, nodeId: input.node_id, path: "source", value: { kind: "block", blockId: block.id } }]);
    return outcome.isError ? outcome : { content: `Placed "${block.label}" (${block.kind}) in ${input.node_id}.` };
  }

  check(artboardId: string): ToolOutcome {
    const found = findArtboard(this.design, artboardId);
    if (!found) return { content: `No artboard ${artboardId}`, isError: true };
    this.lastIssues = checkArtboard(this.design, found.artboard.scene);
    this.checkedSinceLastEdit = true;
    if (!this.lastIssues.length) return { content: "No issues found." };
    return { content: JSON.stringify({ issues: this.lastIssues }) };
  }
}

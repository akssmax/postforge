import type { CanvasDesign } from "@/lib/canvas/document";
import { applyOps, type CanvasOp } from "@/lib/canvas/ops";

/** One undoable step: the ops that were applied and the ops that undo them. */
export type Transaction = { ops: CanvasOp[]; inverse: CanvasOp[]; label?: string; at: number };

export type CanvasHistory = { past: Transaction[]; future: Transaction[] };

export const HISTORY_LIMIT = 200;

export const emptyHistory = (): CanvasHistory => ({ past: [], future: [] });

export function commit(design: CanvasDesign, history: CanvasHistory, ops: CanvasOp[], label?: string) {
  const applied = applyOps(design, ops);
  const transaction: Transaction = { ops, inverse: applied.inverse, label, at: Date.now() };
  return { design: applied.design, history: { past: [...history.past, transaction].slice(-HISTORY_LIMIT), future: [] }, transaction };
}

/**
 * Apply ops and fold them into the latest step (a slider drag): redo replays
 * both, undo restores the state before the first. Commits normally if empty.
 */
export function commitMerged(design: CanvasDesign, history: CanvasHistory, ops: CanvasOp[]) {
  const previous = history.past.at(-1);
  if (!previous) return commit(design, history, ops);
  const applied = applyOps(design, ops);
  const transaction: Transaction = { ...previous, ops: [...previous.ops, ...ops], inverse: [...applied.inverse, ...previous.inverse], at: Date.now() };
  return { design: applied.design, history: { past: [...history.past.slice(0, -1), transaction], future: [] }, transaction };
}

export function undo(design: CanvasDesign, history: CanvasHistory) {
  const last = history.past.at(-1);
  if (!last) return null;
  const applied = applyOps(design, last.inverse);
  return { design: applied.design, history: { past: history.past.slice(0, -1), future: [last, ...history.future] }, ops: last.inverse };
}

export function redo(design: CanvasDesign, history: CanvasHistory) {
  const next = history.future[0];
  if (!next) return null;
  const applied = applyOps(design, next.ops);
  return { design: applied.design, history: { past: [...history.past, { ...next, inverse: applied.inverse }], future: history.future.slice(1) }, ops: next.ops };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasDesign } from "@/lib/canvas/document";
import { findArtboard } from "@/lib/canvas/document";
import { commit, commitMerged, emptyHistory, redo as redoHistory, undo as undoHistory, type CanvasHistory } from "@/lib/canvas/history";
import { applyOps, CanvasOpError, type CanvasOp } from "@/lib/canvas/ops";
import { loadCanvasRecord, saveCanvasRecord, type CanvasRecord } from "@/lib/canvas/localStore";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type CanvasSelection = { artboardId: string; nodeId: string | null } | null;

type EditorState = {
  design: CanvasDesign;
  blocks: VisualBlockRecord[];
  history: CanvasHistory;
};

/** Slider drags within this window under one key become a single undo step. */
const COALESCE_MS = 1000;
const SAVE_DEBOUNCE_MS = 400;

export type DispatchOptions = { label?: string; coalesce?: string };

export type CanvasEditor = {
  status: "loading" | "ready" | "missing";
  design: CanvasDesign | null;
  blocks: VisualBlockRecord[];
  selection: CanvasSelection;
  setSelection: (selection: CanvasSelection) => void;
  /** Apply ops as one undoable step. Returns false (and shows nothing) if they don't apply. */
  dispatch: (ops: CanvasOp[], options?: DispatchOptions) => boolean;
  addBlocks: (blocks: VisualBlockRecord[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  lastError: string | null;
  /** Remote or agent ops: applied without entering local undo history. */
  applyExternal: (ops: CanvasOp[]) => boolean;
  /** Replace the whole document (e.g. after a server reload). */
  replace: (record: CanvasRecord) => void;
  /** Swap in a rebased document but keep undo history (after a sync conflict). */
  rebase: (design: CanvasDesign) => void;
};

export type CanvasEditorOptions = {
  /** Receives each applied op batch, local edits and undo/redo (for server sync). */
  onCommit?: (ops: CanvasOp[], design: CanvasDesign) => void;
  /** Called when the design isn't on this device (e.g. opened from a share link). */
  fallbackLoad?: () => Promise<CanvasRecord | null>;
  /** View-only while this returns true: dispatch, undo and redo are refused. */
  isReadOnly?: () => boolean;
};

/**
 * Editor state for one canvas design: every change is a transaction of ops,
 * undo/redo replays inverse ops, and the record is saved to IndexedDB.
 * `onCommit` receives each applied op batch (for server sync).
 */
export function useCanvasEditor(designId: string, options: CanvasEditorOptions = {}): CanvasEditor {
  const { onCommit, fallbackLoad, isReadOnly } = options;
  const [state, setState] = useState<EditorState | null>(null);
  const [status, setStatus] = useState<CanvasEditor["status"]>("loading");
  const [selection, setSelection] = useState<CanvasSelection>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastCoalesce = useRef<{ key: string; at: number } | null>(null);
  const onCommitRef = useRef(onCommit);
  const fallbackRef = useRef(fallbackLoad);
  const readOnlyRef = useRef(isReadOnly);
  const stateRef = useRef(state);
  useEffect(() => {
    onCommitRef.current = onCommit;
    fallbackRef.current = fallbackLoad;
    readOnlyRef.current = isReadOnly;
  }, [onCommit, fallbackLoad, isReadOnly]);

  useEffect(() => {
    let cancelled = false;
    void loadCanvasRecord(designId).then(async (local) => {
      const record = local ?? (await fallbackRef.current?.().catch(() => null)) ?? null;
      if (cancelled) return;
      if (!record) {
        setStatus("missing");
        return;
      }
      const loaded = { design: record.design, blocks: record.blocks, history: emptyHistory() };
      stateRef.current = loaded;
      setState(loaded);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [designId]);

  // Debounced local save after every change.
  const design = state?.design ?? null;
  const blocks = state?.blocks;
  useEffect(() => {
    if (!design || !blocks) return;
    const timer = setTimeout(() => void saveCanvasRecord({ design, blocks }), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [design, blocks]);

  const dispatch = useCallback((ops: CanvasOp[], options?: DispatchOptions) => {
    const current = stateRef.current;
    if (!current || ops.length === 0) return false;
    if (readOnlyRef.current?.()) {
      setLastError("This design is view-only.");
      return false;
    }
    try {
      const now = Date.now();
      const merge =
        options?.coalesce && lastCoalesce.current?.key === options.coalesce && now - lastCoalesce.current.at < COALESCE_MS;
      const committed = merge ? commitMerged(current.design, current.history, ops) : commit(current.design, current.history, ops, options?.label);
      const next: EditorState = { ...current, design: committed.design, history: committed.history };
      lastCoalesce.current = options?.coalesce ? { key: options.coalesce, at: now } : null;
      stateRef.current = next;
      setState(next);
      setLastError(null);
      onCommitRef.current?.(ops, next.design);
      return true;
    } catch (error) {
      setLastError(error instanceof CanvasOpError ? error.message : "That change couldn't be applied.");
      return false;
    }
  }, []);

  const applyExternal = useCallback((ops: CanvasOp[]) => {
    const current = stateRef.current;
    if (!current || ops.length === 0) return false;
    try {
      const applied = applyOps(current.design, ops);
      const next = { ...current, design: applied.design };
      stateRef.current = next;
      setState(next);
      return true;
    } catch {
      return false;
    }
  }, []);

  const step = useCallback((direction: "undo" | "redo") => {
    const current = stateRef.current;
    if (!current || readOnlyRef.current?.()) return;
    const result = direction === "undo" ? undoHistory(current.design, current.history) : redoHistory(current.design, current.history);
    if (!result) return;
    const next = { ...current, design: result.design, history: result.history };
    stateRef.current = next;
    setState(next);
    lastCoalesce.current = null;
    onCommitRef.current?.(result.ops, result.design);
    // Drop a selection whose artboard or node no longer exists.
    setSelection((selected) => (selected && !findArtboard(result.design, selected.artboardId) ? null : selected));
  }, []);

  const addBlocks = useCallback((added: VisualBlockRecord[]) => {
    setState((current) => {
      if (!current) return current;
      const known = new Set(current.blocks.map((block) => block.id));
      const next = { ...current, blocks: [...current.blocks, ...added.filter((block) => !known.has(block.id))] };
      stateRef.current = next;
      return next;
    });
  }, []);

  const replace = useCallback((record: CanvasRecord) => {
    const next = { design: record.design, blocks: record.blocks, history: emptyHistory() };
    stateRef.current = next;
    setState(next);
    setStatus("ready");
  }, []);

  const rebase = useCallback((design: CanvasDesign) => {
    const current = stateRef.current;
    if (!current) return;
    const next = { ...current, design };
    stateRef.current = next;
    setState(next);
  }, []);

  return {
    status,
    design: state?.design ?? null,
    blocks: state?.blocks ?? [],
    selection,
    setSelection,
    dispatch,
    addBlocks,
    undo: () => step("undo"),
    redo: () => step("redo"),
    canUndo: (state?.history.past.length ?? 0) > 0,
    canRedo: (state?.history.future.length ?? 0) > 0,
    lastError,
    applyExternal,
    replace,
    rebase,
  };
}

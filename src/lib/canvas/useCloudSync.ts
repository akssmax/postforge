"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { CanvasDesign } from "@/lib/canvas/document";
import { applyOp, type CanvasOp } from "@/lib/canvas/ops";
import { cloud, CloudError, CLIENT_ID, fetchCloudStatus, type CloudRole, type CloudStatus } from "@/lib/canvas/cloud";
import { loadSyncState, saveCanvasRecord, saveSyncState, type CanvasRecord, type CanvasSyncState } from "@/lib/canvas/localStore";
import type { CanvasEditor } from "@/lib/canvas/useCanvasEditor";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type SyncStatus = "local" | "syncing" | "synced" | "offline" | "conflict" | "error";

const FLUSH_DELAY_MS = 300;
const POLL_MS = 4000;
const RETRY_MS = 5000;

/** Apply ops one by one, skipping any that no longer fit (rebasing onto newer server state). */
export function applyLenient(design: CanvasDesign, ops: CanvasOp[]): { design: CanvasDesign; kept: CanvasOp[] } {
  let current = design;
  const kept: CanvasOp[] = [];
  for (const op of ops) {
    try {
      current = applyOp(current, op).design;
      kept.push(op);
    } catch {
      // Someone else removed or changed what this op targeted.
    }
  }
  return { design: current, kept };
}

/**
 * Keeps a canvas design in step with the server: local ops queue and push on
 * a base revision; a conflict refetches, re-applies unsent ops and retries;
 * other people's ops are pulled and applied without touching local undo.
 */
export function useCloudSync({
  designId,
  shareToken,
  editor,
  commitRef,
}: {
  designId: string;
  shareToken: string | null;
  editor: CanvasEditor;
  commitRef: MutableRefObject<((ops: CanvasOp[]) => void) | null>;
}) {
  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [sync, setSync] = useState<CanvasSyncState | null>(null);
  const [status, setStatus] = useState<SyncStatus>("local");
  const syncRef = useRef<CanvasSyncState | null>(null);
  const editorRef = useRef(editor);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const schedule = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), ms);
  }, []);

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  const persist = useCallback(
    (next: CanvasSyncState | null) => {
      syncRef.current = next;
      setSync(next);
      if (next) void saveSyncState(designId, next);
    },
    [designId],
  );

  /** Server copy plus unsent local ops. */
  const reloadFromServer = useCallback(async () => {
    const current = syncRef.current;
    const server = await cloud.get(designId, current?.shareToken ?? shareToken);
    const pending = current?.pending ?? [];
    if (pending.length) {
      const rebased = applyLenient(server.design, pending);
      editorRef.current.rebase(rebased.design);
      persist({ revision: server.revision, pending: rebased.kept, role: server.role, shareToken: current?.shareToken ?? shareToken });
    } else {
      editorRef.current.replace({ design: server.design, blocks: server.blocks });
      persist({ revision: server.revision, pending: [], role: server.role, shareToken: current?.shareToken ?? shareToken });
    }
  }, [designId, shareToken, persist]);

  const flush = useCallback(async () => {
    const current = syncRef.current;
    if (!current || inFlight.current || current.pending.length === 0) return;
    inFlight.current = true;
    setStatus("syncing");
    const batch = current.pending;
    try {
      const result = await cloud.push(designId, current.revision, batch, current.shareToken);
      const latest = syncRef.current ?? current;
      if (result.ok) {
        persist({ ...latest, revision: result.revision, pending: latest.pending.slice(batch.length) });
      } else {
        setStatus("conflict");
        await reloadFromServer();
      }
      setStatus("synced");
    } catch (error) {
      inFlight.current = false;
      if (error instanceof CloudError && error.status === 400) {
        // The server refused these ops: its copy is the truth, drop ours.
        persist({ ...(syncRef.current ?? current), pending: [] });
        await reloadFromServer().catch(() => undefined);
        setStatus("error");
        return;
      }
      if (error instanceof CloudError && (error.status === 401 || error.status === 403)) {
        setStatus("error");
        return;
      }
      setStatus("offline");
      schedule(RETRY_MS);
      return;
    }
    inFlight.current = false;
    if (syncRef.current?.pending.length) schedule(FLUSH_DELAY_MS);
  }, [designId, persist, reloadFromServer, schedule]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Queue every local commit (edits, undo, redo) while linked.
  useEffect(() => {
    commitRef.current = (ops) => {
      const current = syncRef.current;
      if (!current || current.role === "view" || current.role === "comment") return;
      persist({ ...current, pending: [...current.pending, ...ops] });
      setStatus("syncing");
      schedule(FLUSH_DELAY_MS);
    };
    return () => {
      commitRef.current = null;
    };
  }, [commitRef, persist, schedule]);

  // On open: learn whether cloud is available and whether this design is linked.
  const ready = editor.status === "ready";
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      const [statusInfo, stored] = await Promise.all([fetchCloudStatus(), loadSyncState(designId)]);
      if (cancelled) return;
      setCloudStatus(statusInfo);
      const linked = stored ?? (shareToken ? { revision: -1, pending: [], role: "view" as CloudRole, shareToken } : null);
      if (!statusInfo.enabled || !linked) return;
      syncRef.current = { ...linked, shareToken: shareToken ?? linked.shareToken ?? null };
      setSync(syncRef.current);
      try {
        await reloadFromServer();
        setStatus("synced");
        if (syncRef.current?.pending.length) void flush();
      } catch {
        setStatus("offline");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, designId, shareToken, reloadFromServer, flush]);

  // Pull other people's ops.
  const linked = !!sync;
  useEffect(() => {
    if (!linked) return;
    const interval = setInterval(async () => {
      const current = syncRef.current;
      if (!current || inFlight.current || current.pending.length || document.hidden) return;
      try {
        const { entries } = await cloud.pull(designId, current.revision, current.shareToken);
        if (!entries.length) return;
        let ok = true;
        for (const entry of entries) {
          if (entry.clientId !== CLIENT_ID && !editorRef.current.applyExternal(entry.ops)) ok = false;
        }
        if (!ok) await reloadFromServer();
        else persist({ ...(syncRef.current ?? current), revision: entries.at(-1)!.revision });
        setStatus("synced");
      } catch {
        setStatus("offline");
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [linked, designId, persist, reloadFromServer]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** Put a local-only design in the cloud. Returns the server id (differs only if the id was taken). */
  const upload = useCallback(async () => {
    const { design, blocks } = editorRef.current;
    if (!design) return null;
    const result = await cloud.upload(design, blocks);
    if (result.id !== design.id) {
      // Someone else owns this id: keep a copy under the new one.
      const copy: CanvasRecord = { design: { ...design, id: result.id }, blocks };
      await saveCanvasRecord(copy);
      await saveSyncState(result.id, { revision: result.revision, pending: [], role: "owner" });
      return result.id;
    }
    persist({ revision: result.revision, pending: [], role: "owner" });
    setStatus("synced");
    return result.id;
  }, [persist]);

  /** Library visuals the scenes reference travel with the design. */
  const syncBlocks = useCallback(
    (blocks: VisualBlockRecord[]) => {
      const current = syncRef.current;
      if (current && blocks.length && (current.role === "owner" || current.role === "edit")) void cloud.addBlocks(designId, blocks, current.shareToken).catch(() => undefined);
    },
    [designId],
  );

  return { cloudStatus, sync, status, role: sync?.role ?? null, linked, upload, syncBlocks, shareToken: sync?.shareToken ?? shareToken };
}

/** Load a design that isn't on this device from the server (share links, other devices). */
export async function loadFromCloud(designId: string, shareToken: string | null): Promise<CanvasRecord | null> {
  const statusInfo = await fetchCloudStatus();
  if (!statusInfo.enabled) return null;
  try {
    const server = await cloud.get(designId, shareToken);
    await saveSyncState(designId, { revision: server.revision, pending: [], role: server.role, shareToken });
    return { design: server.design, blocks: server.blocks };
  } catch {
    return null;
  }
}

"use client";

import { canvasDesignSchema, type CanvasDesign } from "@/lib/canvas/document";
import type { CanvasOp } from "@/lib/canvas/ops";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** A design plus the library visuals its scenes reference by block id. */
export type CanvasRecord = { design: CanvasDesign; blocks: VisualBlockRecord[] };

export type CanvasSummary = { id: string; title: string; updatedAt: number; artboards: number; revision: number };

const DB_NAME = "postforge-canvas";
const STORE = "designs";
const SYNC_STORE = "sync";

/** Cloud link for a design on this device: the server revision it matches and unsent ops. */
export type CanvasSyncState = { revision: number; pending: CanvasOp[]; role: "owner" | "edit" | "comment" | "view"; shareToken?: string | null };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      if (!request.result.objectStoreNames.contains(SYNC_STORE)) request.result.createObjectStore(SYNC_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>, storeName = STORE): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCanvasRecord(id: string): Promise<CanvasRecord | null> {
  const raw = await run<unknown>("readonly", (store) => store.get(id));
  if (!raw || typeof raw !== "object") return null;
  const record = raw as { design?: unknown; blocks?: VisualBlockRecord[] };
  const parsed = canvasDesignSchema.safeParse(record.design);
  return parsed.success ? { design: parsed.data, blocks: record.blocks ?? [] } : null;
}

export async function saveCanvasRecord(record: CanvasRecord): Promise<void> {
  await run("readwrite", (store) => store.put(record, record.design.id));
}

export async function deleteCanvasRecord(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
  await run("readwrite", (store) => store.delete(id), SYNC_STORE);
}

export async function loadSyncState(id: string): Promise<CanvasSyncState | null> {
  return ((await run<unknown>("readonly", (store) => store.get(id), SYNC_STORE)) as CanvasSyncState | undefined) ?? null;
}

export async function saveSyncState(id: string, state: CanvasSyncState): Promise<void> {
  await run("readwrite", (store) => store.put(state, id), SYNC_STORE);
}

export async function listCanvasSummaries(): Promise<CanvasSummary[]> {
  const all = await run<unknown[]>("readonly", (store) => store.getAll());
  return all
    .map((raw) => canvasDesignSchema.safeParse((raw as { design?: unknown })?.design))
    .filter((parsed) => parsed.success)
    .map(({ data }) => ({
      id: data!.id,
      title: data!.title,
      updatedAt: data!.updatedAt,
      revision: data!.revision,
      artboards: data!.pages.reduce((sum, page) => sum + page.artboards.length, 0),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

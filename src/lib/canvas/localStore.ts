"use client";

import { canvasDesignSchema, type CanvasDesign } from "@/lib/canvas/document";
import type { CanvasOp } from "@/lib/canvas/ops";
import { designSystemSchema, type DesignSystem } from "@/lib/design-systems/schema";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** A design plus the library visuals its scenes reference by block id. */
export type CanvasRecord = { design: CanvasDesign; blocks: VisualBlockRecord[] };

export type CanvasSummary = { id: string; title: string; updatedAt: number; artboards: number; revision: number };

const DB_NAME = "postforge-canvas";
const STORE = "designs";
const SYNC_STORE = "sync";
const SYSTEM_STORE = "systems";

/** Cloud link for a design on this device: the server revision it matches and unsent ops. */
export type CanvasSyncState = { revision: number; pending: CanvasOp[]; role: "owner" | "edit" | "comment" | "view"; shareToken?: string | null };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      if (!request.result.objectStoreNames.contains(SYNC_STORE)) request.result.createObjectStore(SYNC_STORE);
      if (!request.result.objectStoreNames.contains(SYSTEM_STORE)) request.result.createObjectStore(SYSTEM_STORE);
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

// ---------- design systems ----------

export async function listLocalSystems(): Promise<DesignSystem[]> {
  const all = await run<unknown[]>("readonly", (store) => store.getAll(), SYSTEM_STORE);
  return all
    .map((raw) => designSystemSchema.safeParse(raw))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data!)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadLocalSystem(id: string): Promise<DesignSystem | null> {
  const parsed = designSystemSchema.safeParse(await run<unknown>("readonly", (store) => store.get(id), SYSTEM_STORE));
  return parsed.success ? parsed.data : null;
}

export async function saveLocalSystem(system: DesignSystem): Promise<void> {
  await run("readwrite", (store) => store.put(system, system.id), SYSTEM_STORE);
}

export async function deleteLocalSystem(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id), SYSTEM_STORE);
}

const DEFAULT_SYSTEM_KEY = "postforge:default-system";

/** The system new designs start from on this device. */
export function getDefaultSystemId(): string | null {
  try {
    return localStorage.getItem(DEFAULT_SYSTEM_KEY);
  } catch {
    return null;
  }
}

export function setDefaultSystemId(id: string | null) {
  try {
    if (id) localStorage.setItem(DEFAULT_SYSTEM_KEY, id);
    else localStorage.removeItem(DEFAULT_SYSTEM_KEY);
  } catch {
    // storage unavailable (private mode): the default just isn't remembered
  }
}

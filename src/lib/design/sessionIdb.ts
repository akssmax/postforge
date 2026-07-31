import type { UIMessage } from "ai";
import type { DesignSessionPersisted } from "@/lib/design/types";

export const DESIGN_SESSION_IDB_NAME = "postforge-designs";
export const DESIGN_SESSION_IDB_STORE = "sessions";
export const DESIGN_CHAT_IDB_STORE = "chat";

const sessionCache = new Map<string, DesignSessionPersisted>();
const chatCache = new Map<string, UIMessage[]>();

let dbPromise: Promise<IDBDatabase> | null = null;

function openDesignDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DESIGN_SESSION_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DESIGN_SESSION_IDB_STORE)) {
        db.createObjectStore(DESIGN_SESSION_IDB_STORE);
      }
      if (!db.objectStoreNames.contains(DESIGN_CHAT_IDB_STORE)) {
        db.createObjectStore(DESIGN_CHAT_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openDesignDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openDesignDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(storeName: string, key: string): Promise<void> {
  const db = await openDesignDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function peekCachedSession(designId: string): DesignSessionPersisted | null {
  return sessionCache.get(designId) ?? null;
}

export function setCachedSession(session: DesignSessionPersisted): void {
  sessionCache.set(session.designId, session);
}

export function deleteCachedSession(designId: string): void {
  sessionCache.delete(designId);
  chatCache.delete(designId);
}

/** Persist session JSON without inline chat (chat lives in its own store). */
export async function writeSessionToIdb(
  session: DesignSessionPersisted,
): Promise<void> {
  const { briefChatMessages: _chat, ...body } = session;
  await idbPut(DESIGN_SESSION_IDB_STORE, session.designId, body);
  setCachedSession(session);
}

export async function readSessionFromIdb(
  designId: string,
): Promise<DesignSessionPersisted | null> {
  const cached = peekCachedSession(designId);
  if (cached) return cached;

  const raw = await idbGet<Omit<DesignSessionPersisted, "briefChatMessages">>(
    DESIGN_SESSION_IDB_STORE,
    designId,
  );
  if (!raw || typeof raw !== "object") return null;

  const chat = await readChatFromIdb(designId);
  const session: DesignSessionPersisted = {
    ...(raw as DesignSessionPersisted),
    designId,
    briefChatMessages: chat.length > 0 ? chat : undefined,
  };
  setCachedSession(session);
  return session;
}

export async function deleteSessionFromIdb(designId: string): Promise<void> {
  deleteCachedSession(designId);
  await Promise.all([
    idbDelete(DESIGN_SESSION_IDB_STORE, designId),
    idbDelete(DESIGN_CHAT_IDB_STORE, designId),
  ]);
}

export async function writeChatToIdb(
  designId: string,
  messages: UIMessage[],
): Promise<void> {
  chatCache.set(designId, messages);
  await idbPut(DESIGN_CHAT_IDB_STORE, designId, messages);
  const cached = peekCachedSession(designId);
  if (cached) {
    setCachedSession({ ...cached, briefChatMessages: messages });
  }
}

export async function readChatFromIdb(designId: string): Promise<UIMessage[]> {
  if (chatCache.has(designId)) return chatCache.get(designId)!;
  const raw = await idbGet<UIMessage[]>(DESIGN_CHAT_IDB_STORE, designId);
  const messages = Array.isArray(raw) ? raw : [];
  chatCache.set(designId, messages);
  return messages;
}

export async function preloadSessionsIntoCache(
  designIds: string[],
): Promise<DesignSessionPersisted[]> {
  return Promise.all(
    designIds.map(async (id) => (await readSessionFromIdb(id)) ?? null),
  ).then((sessions) =>
    sessions.filter((session): session is DesignSessionPersisted => session != null),
  );
}

import {
  BRAND_IDB_NAME,
  BRAND_IDB_STORE,
  BRAND_KIT_STORAGE_KEY,
  DEFAULT_BRAND_COLORS,
  type BrandKitPersisted,
  type BrandLogoRecord,
} from "@/lib/brand/types";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BRAND_IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BRAND_IDB_STORE)) {
        db.createObjectStore(BRAND_IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLogoBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BRAND_IDB_STORE, "readwrite");
    tx.objectStore(BRAND_IDB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadLogoBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(BRAND_IDB_STORE, "readonly");
    const req = tx.objectStore(BRAND_IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

export async function deleteLogoBlob(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BRAND_IDB_STORE, "readwrite");
    tx.objectStore(BRAND_IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function brandKitStorageKey(storageScope?: string): string {
  return storageScope ? `postforge:brand:${storageScope}` : BRAND_KIT_STORAGE_KEY;
}

export function loadBrandKitPersisted(storageScope?: string): BrandKitPersisted {
  if (typeof window === "undefined") {
    return defaultKit();
  }
  try {
    const raw = localStorage.getItem(brandKitStorageKey(storageScope));
    if (!raw) return defaultKit();
    const parsed = JSON.parse(raw) as BrandKitPersisted;
    return {
      logo: parsed.logo ?? null,
      colors: { ...DEFAULT_BRAND_COLORS, ...parsed.colors },
      activeBackgroundPresetId: parsed.activeBackgroundPresetId ?? null,
    };
  } catch {
    return defaultKit();
  }
}

export function saveBrandKitPersisted(
  kit: BrandKitPersisted,
  storageScope?: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(brandKitStorageKey(storageScope), JSON.stringify(kit));
}

export function defaultKit(): BrandKitPersisted {
  return {
    logo: null,
    colors: { ...DEFAULT_BRAND_COLORS },
    activeBackgroundPresetId: null,
  };
}

export function createLogoRecord(
  parsed: { kind: "svg"; svgMarkup: string } | { kind: "png"; blob: Blob },
  fileName: string,
  options?: { blobKey?: string },
): BrandLogoRecord {
  const id = `logo-${Date.now()}`;
  if (parsed.kind === "svg") {
    return {
      id,
      mime: "image/svg+xml",
      fileName,
      uploadedAt: Date.now(),
      svgMarkup: parsed.svgMarkup,
      svgMarkupOriginal: parsed.svgMarkup,
      usesExplicitColors: false,
    };
  }
  return {
    id,
    mime: "image/png",
    fileName,
    uploadedAt: Date.now(),
    blobKey: options?.blobKey ?? id,
  };
}

export async function resolveLogoSrc(
  logo: BrandLogoRecord | null,
): Promise<string | null> {
  if (!logo) return null;
  if (logo.mime === "image/svg+xml" && logo.svgMarkup) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo.svgMarkup)}`;
  }
  if (logo.blobKey) {
    const blob = await loadLogoBlob(logo.blobKey);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }
  return null;
}

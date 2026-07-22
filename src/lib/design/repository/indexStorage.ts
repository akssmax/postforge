import type { DesignSummary } from "./types";

export const DESIGN_INDEX_STORAGE_KEY = "postforge:design-index";

export function readDesignIndex(): DesignSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DESIGN_INDEX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DesignSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeDesignIndex(entries: DesignSummary[]): void {
  if (typeof window === "undefined") return;
  const sorted = [...entries].sort((a, b) => b.updatedAt - a.updatedAt);
  localStorage.setItem(DESIGN_INDEX_STORAGE_KEY, JSON.stringify(sorted));
}

export function upsertDesignIndexEntry(entry: DesignSummary): DesignSummary[] {
  const current = readDesignIndex();
  const next = current.filter((item) => item.id !== entry.id);
  next.push(entry);
  writeDesignIndex(next);
  return readDesignIndex();
}

export function removeDesignIndexEntry(id: string): DesignSummary[] {
  const next = readDesignIndex().filter((item) => item.id !== id);
  writeDesignIndex(next);
  return next;
}

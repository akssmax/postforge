import "server-only";

import fs from "node:fs";
import path from "node:path";
import { assetUrl } from "./assetUrl";

const textCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function localAssetPath(assetPath: string): string {
  return path.join(process.cwd(), "public", assetPath.replace(/^\//, ""));
}

async function fetchRemote(assetPath: string): Promise<string | null> {
  const url = assetUrl(assetPath);
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Load an asset's text contents, preferring a local `public/` copy when present
 * (local-first development) and falling back to the remote CDN (Vercel Blob).
 */
export async function loadAssetText(assetPath: string): Promise<string | null> {
  const cached = textCache.get(assetPath);
  if (cached !== undefined) return cached;

  const existing = inflight.get(assetPath);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    try {
      const local = localAssetPath(assetPath);
      if (fs.existsSync(local)) {
        return fs.readFileSync(local, "utf8");
      }
    } catch {
      // Ignore local read failures and fall through to remote.
    }
    return fetchRemote(assetPath);
  })();

  inflight.set(assetPath, task);
  try {
    const result = await task;
    textCache.set(assetPath, result);
    return result;
  } finally {
    inflight.delete(assetPath);
  }
}

/** Clear the in-memory asset cache (used by tests). */
export function clearAssetTextCache(): void {
  textCache.clear();
  inflight.clear();
}

import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  isAssetPattern,
  isIllustrationPattern,
  VISUAL_LIBRARY,
  type AssetLibraryEntry,
  type VisualLibraryPattern,
} from "./catalog";
import type { IllustrationLibraryEntry } from "./illustrations/manifest";

export function assetPublicPath(entry: AssetLibraryEntry): string {
  return path.join(process.cwd(), "public", entry.assetPath.replace(/^\//, ""));
}

/** True when the asset file is present in this deployment. */
export function isAssetDeployed(entry: AssetLibraryEntry): boolean {
  try {
    return fs.existsSync(assetPublicPath(entry));
  } catch {
    return false;
  }
}

/** @deprecated Prefer isAssetDeployed — kept for illustration-specific call sites. */
export function isIllustrationAssetDeployed(entry: IllustrationLibraryEntry): boolean {
  return isAssetDeployed(entry);
}

export function isDeployableVisualPattern(pattern: VisualLibraryPattern): boolean {
  if (!isAssetPattern(pattern)) return true;
  return isAssetDeployed(pattern);
}

let deployableLibraryCache: VisualLibraryPattern[] | null = null;

export function getDeployableVisualLibrary(): VisualLibraryPattern[] {
  if (deployableLibraryCache) return deployableLibraryCache;
  deployableLibraryCache = VISUAL_LIBRARY.filter(isDeployableVisualPattern);
  return deployableLibraryCache;
}

export function countDeployedIllustrationsBySource(): Record<
  IllustrationLibraryEntry["source"],
  number
> {
  const counts: Record<IllustrationLibraryEntry["source"], number> = {
    undraw: 0,
    "open-doodles": 0,
    storyset: 0,
  };
  for (const pattern of getDeployableVisualLibrary()) {
    if (!isIllustrationPattern(pattern)) continue;
    counts[pattern.source] += 1;
  }
  return counts;
}

export function countDeployedThreeDAssets(): number {
  return getDeployableVisualLibrary().filter((pattern) => pattern.kind === "3d").length;
}

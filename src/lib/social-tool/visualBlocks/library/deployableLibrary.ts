import fs from "node:fs";
import path from "node:path";
import {
  isAssetPattern,
  VISUAL_LIBRARY,
  type VisualLibraryPattern,
} from "./catalog";
import type { IllustrationLibraryEntry } from "./illustrations/manifest";

export function illustrationAssetPath(entry: IllustrationLibraryEntry): string {
  return path.join(process.cwd(), "public", entry.assetPath.replace(/^\//, ""));
}

/** True when the SVG file is present in this deployment (Storyset may be omitted in prod). */
export function isIllustrationAssetDeployed(entry: IllustrationLibraryEntry): boolean {
  try {
    return fs.existsSync(illustrationAssetPath(entry));
  } catch {
    return false;
  }
}

export function isDeployableVisualPattern(pattern: VisualLibraryPattern): boolean {
  if (!isAssetPattern(pattern)) return true;
  return isIllustrationAssetDeployed(pattern);
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
    if (!isAssetPattern(pattern)) continue;
    counts[pattern.source] += 1;
  }
  return counts;
}

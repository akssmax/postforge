import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");

/** Full local Storyset library (gitignored). Fetched via fetch-storyset-illustrations.mjs */
export const STORYSET_CACHE_DIR = path.join(
  ROOT,
  "data/storyset-cache/illustrations/storyset",
);

/** Production-deployed Storyset SVGs (git-tracked, copied in batches). */
export const STORYSET_DEPLOY_DIR = path.join(
  ROOT,
  "public/visuals/illustrations/storyset",
);

export const STORYSET_MANIFEST_PATH = path.join(
  ROOT,
  "src/lib/social-tool/visualBlocks/library/illustrations/storyset-manifest.json",
);

export function storysetAssetPath(slug) {
  return `/visuals/illustrations/storyset/${slug}.svg`;
}

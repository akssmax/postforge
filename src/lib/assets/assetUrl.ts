/**
 * Base URL for the deployed asset library (Vercel Blob).
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_ASSET_BASE_URL` when set.
 * 2. In production builds/deploys, the default Postforge Blob store.
 * 3. Otherwise (local dev / tests), repo-relative `/visuals/...` paths served
 *    from `public/`.
 *
 * Safe to import from both client and server code.
 */
const DEFAULT_ASSET_BASE_URL =
  "https://imtwb4ptnvpjtbea.public.blob.vercel-storage.com";

const RAW_BASE =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL?.trim() ||
  (process.env.NODE_ENV === "production" ? DEFAULT_ASSET_BASE_URL : "");

export const ASSET_BASE_URL = RAW_BASE.replace(/\/+$/, "");

const EXTERNAL_RE = /^(https?:)?\/\//i;

/**
 * Prefix a repo-relative asset path (e.g. `/visuals/...`) with the asset base
 * URL. Absolute URLs, data URIs and blob URIs are returned unchanged, so this
 * is safe to apply more than once.
 */
export function assetUrl(path: string): string {
  if (!path) return path;
  if (EXTERNAL_RE.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return ASSET_BASE_URL ? `${ASSET_BASE_URL}${normalized}` : normalized;
}

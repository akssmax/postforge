import {
  createDirectImageLoader,
  type ImageLoader,
} from "@figit/dom-to-figma";

const directLoader = createDirectImageLoader();

function isSameOrigin(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function proxyUrl(src: string): string {
  return `/api/export/figma-image?url=${encodeURIComponent(src)}`;
}

/** Loads images for Figma export — direct fetch for same-origin, proxy for remote. */
export const postforgeImageLoader: ImageLoader = async (request) => {
  const { src } = request;
  if (!src || src.startsWith("data:")) {
    return directLoader(request);
  }

  if (isSameOrigin(src)) {
    try {
      return await directLoader(request);
    } catch {
      /* fall through to proxy */
    }
  }

  try {
    const response = await fetch(proxyUrl(src));
    if (!response.ok) throw new Error(`Proxy failed: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type") ?? "image/png";
    return { bytes, mimeType };
  } catch {
    return directLoader(request);
  }
};

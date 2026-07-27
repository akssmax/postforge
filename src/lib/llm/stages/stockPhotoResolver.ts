import type { ArtifactDefinition } from "@/lib/design-config/schemas";

export type StockPhotoResult = {
  id: string;
  url: string;
  thumbUrl: string;
  photographer: string;
  attribution: string;
  downloadUrl: string;
};

type UnsplashPhoto = {
  id: string;
  urls: { regular: string; small: string };
  user: { name: string; links?: { html?: string } };
  links: { download_location?: string };
};

function buildAttribution(photo: UnsplashPhoto): string {
  const profile = photo.user.links?.html ?? "https://unsplash.com";
  return `Photo by ${photo.user.name} on Unsplash (${profile})`;
}

async function searchUnsplash(query: string): Promise<StockPhotoResult | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", "1");
  url.searchParams.set("orientation", "squarish");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
    next: { revalidate: 3600 },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  const photo = payload.results?.[0];
  if (!photo) return null;

  return {
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.small,
    photographer: photo.user.name,
    attribution: buildAttribution(photo),
    downloadUrl: photo.links.download_location ?? photo.urls.regular,
  };
}

export async function resolveStockPhotoForArtifact(input: {
  artifact: ArtifactDefinition;
  brief: string;
  offline?: boolean;
}): Promise<StockPhotoResult | null> {
  if (input.offline) return null;
  if (input.artifact.renderer === "print-doc") return null;
  if (input.artifact.capabilities.primaryContent === "text") return null;
  if (input.artifact.capabilities.primaryContent === "diagram") return null;

  const hints =
    input.artifact.unsplashHints?.trim() ||
    input.brief.split(/\s+/).slice(0, 6).join(" ");

  if (!hints) return null;

  try {
    return await searchUnsplash(hints);
  } catch {
    return null;
  }
}

export async function searchStockPhotos(
  query: string,
  limit = 12,
): Promise<StockPhotoResult[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(limit, 30)));

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  return (payload.results ?? []).map((photo) => ({
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.small,
    photographer: photo.user.name,
    attribution: buildAttribution(photo),
    downloadUrl: photo.links.download_location ?? photo.urls.regular,
  }));
}

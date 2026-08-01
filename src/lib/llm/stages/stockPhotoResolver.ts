import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import type { FeaturedZoneMode } from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

export type StockPhotoResult = {
  id: string;
  url: string;
  thumbUrl: string;
  photographer: string;
  attribution: string;
  downloadUrl: string;
};

export type StockPhotoSearchOptions = {
  limit?: number;
  page?: number;
  orientation?: "landscape" | "portrait" | "squarish";
  color?: string;
  orderBy?: "relevant" | "latest";
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

function mapPhoto(photo: UnsplashPhoto): StockPhotoResult {
  return {
    id: photo.id,
    url: photo.urls.regular,
    thumbUrl: photo.urls.small,
    photographer: photo.user.name,
    attribution: buildAttribution(photo),
    downloadUrl: photo.links.download_location ?? photo.urls.regular,
  };
}

function unsplashAccessKey(): string | null {
  return process.env.UNSPLASH_ACCESS_KEY ?? null;
}

export function buildStockSearchQuery(input: {
  brief: string;
  artifact?: ArtifactDefinition;
}): string {
  const fromArtifact = input.artifact?.unsplashHints?.trim();
  if (fromArtifact) return fromArtifact;
  const words = input.brief.split(/\s+/).filter(Boolean).slice(0, 8);
  return words.join(" ");
}

export function orientationForPlatformAndLayout(input: {
  platformId?: PlatformId;
  featuredZoneMode?: FeaturedZoneMode;
}): StockPhotoSearchOptions["orientation"] {
  if (input.featuredZoneMode === "portrait-strip") return "portrait";
  if (input.platformId === "instagram-story") return "portrait";
  if (input.platformId === "linkedin-landscape" || input.platformId === "twitter") {
    return "landscape";
  }
  return "squarish";
}

export async function searchStockPhotos(
  query: string,
  options: StockPhotoSearchOptions = {},
): Promise<StockPhotoResult[]> {
  const accessKey = unsplashAccessKey();
  if (!accessKey || !query.trim()) return [];

  const limit = Math.min(Math.max(options.limit ?? 12, 1), 30);
  const page = Math.max(options.page ?? 1, 1);

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("page", String(page));
  if (options.orientation) url.searchParams.set("orientation", options.orientation);
  if (options.color) url.searchParams.set("color", options.color);
  if (options.orderBy) url.searchParams.set("order_by", options.orderBy);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Client-ID ${accessKey}` },
    next: { revalidate: 300 },
  });

  if (!response.ok) return [];

  const payload = (await response.json()) as { results?: UnsplashPhoto[] };
  return (payload.results ?? []).map(mapPhoto);
}

export async function triggerUnsplashDownload(downloadUrl: string): Promise<boolean> {
  const accessKey = unsplashAccessKey();
  if (!accessKey || !downloadUrl.trim()) return false;

  try {
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function resolveStockPhotoForLayout(input: {
  brief: string;
  artifact?: ArtifactDefinition;
  platformId?: PlatformId;
  featuredZoneMode?: FeaturedZoneMode;
  offline?: boolean;
}): Promise<StockPhotoResult | null> {
  if (input.offline) return null;

  const query = buildStockSearchQuery({
    brief: input.brief,
    artifact: input.artifact,
  });
  if (!query) return null;

  const orientation = orientationForPlatformAndLayout({
    platformId: input.platformId,
    featuredZoneMode: input.featuredZoneMode,
  });

  const results = await searchStockPhotos(query, {
    limit: 1,
    page: 1,
    orientation,
  });
  return results[0] ?? null;
}

export async function resolveStockPhotoForArtifact(input: {
  artifact: ArtifactDefinition;
  brief: string;
  platformId?: PlatformId;
  featuredZoneMode?: FeaturedZoneMode;
  allowTextPrimaryPhoto?: boolean;
  offline?: boolean;
}): Promise<StockPhotoResult | null> {
  if (input.offline) return null;
  if (input.artifact.renderer === "print-doc") return null;
  if (
    !input.allowTextPrimaryPhoto &&
    (input.artifact.capabilities.primaryContent === "text" ||
      input.artifact.capabilities.primaryContent === "diagram")
  ) {
    return null;
  }

  return resolveStockPhotoForLayout({
    brief: input.brief,
    artifact: input.artifact,
    platformId: input.platformId,
    featuredZoneMode: input.featuredZoneMode,
    offline: input.offline,
  });
}

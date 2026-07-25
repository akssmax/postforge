import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import {
  deleteLogoBlob,
  loadLogoBlob,
  saveLogoBlob,
} from "@/lib/brand/storage";
import {
  normalizeProductPage,
  type ProductPageId,
} from "@/lib/social-tool/presets";

import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type FeaturedBlockMode = "image" | "genui" | "placeholder" | "composed";

export type FeaturedImageMime =
  | "image/svg+xml"
  | "image/png"
  | "image/jpeg"
  | "image/webp";

export type FeaturedImageRecord = {
  id: string;
  mime: FeaturedImageMime;
  fileName: string;
  uploadedAt: number;
  svgMarkup?: string;
  blobKey?: string;
};

export type FeaturedSlotPersisted = {
  slotId: string;
  mode: FeaturedBlockMode;
  productPage?: ProductPageId;
  activeBlockId?: string | null;
  transform?: import("@/components/social-tool/templates/ProductShotPost").FeaturedImageTransform;
  visible: boolean;
};

export type FeaturedBlockPersisted = {
  mode: FeaturedBlockMode;
  productPage: ProductPageId;
  image: FeaturedImageRecord | null;
  activeBlockId?: string | null;
  visualBlocks?: VisualBlockRecord[];
  slots?: FeaturedSlotPersisted[];
};

export const FEATURED_BLOCK_STORAGE_KEY = "postforge-featured-block";
export const MAX_FEATURED_IMAGE_BYTES = 5 * 1024 * 1024;

export type ParsedFeaturedImage =
  | { kind: "svg"; svgMarkup: string }
  | { kind: "raster"; blob: Blob; mime: FeaturedImageMime };

export async function parseFeaturedImageFile(
  file: File,
): Promise<ParsedFeaturedImage> {
  const name = file.name.toLowerCase();
  const isSvg = file.type === "image/svg+xml" || name.endsWith(".svg");
  const isPng = file.type === "image/png" || name.endsWith(".png");
  const isJpeg =
    file.type === "image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
  const isWebp = file.type === "image/webp" || name.endsWith(".webp");

  if (!isSvg && !isPng && !isJpeg && !isWebp) {
    throw new Error("Upload a PNG, JPG, WebP, or SVG image.");
  }
  if (file.size > MAX_FEATURED_IMAGE_BYTES) {
    throw new Error("Image must be under 5 MB.");
  }

  if (isSvg) {
    const text = await file.text();
    const svgMarkup = sanitizeSvgMarkup(text);
    if (!svgMarkup) {
      throw new Error("Could not parse this SVG. Try exporting a simpler file.");
    }
    return { kind: "svg", svgMarkup };
  }

  const mime: FeaturedImageMime = isPng
    ? "image/png"
    : isWebp
      ? "image/webp"
      : "image/jpeg";

  return { kind: "raster", blob: file, mime };
}

export function createFeaturedImageRecord(
  parsed: ParsedFeaturedImage,
  fileName: string,
  options?: { blobKey?: string },
): FeaturedImageRecord {
  const id = `featured-${Date.now()}`;
  if (parsed.kind === "svg") {
    return {
      id,
      mime: "image/svg+xml",
      fileName,
      uploadedAt: Date.now(),
      svgMarkup: parsed.svgMarkup,
    };
  }
  return {
    id,
    mime: parsed.mime,
    fileName,
    uploadedAt: Date.now(),
    blobKey: options?.blobKey ?? id,
  };
}

export function defaultFeaturedBlock(): FeaturedBlockPersisted {
  return {
    mode: "placeholder",
    productPage: "leads",
    image: null,
    activeBlockId: null,
    visualBlocks: [],
  };
}

/** Restore featured block fields stripped by older loaders or partial JSON. */
export function normalizeFeaturedPersisted(
  raw: Partial<FeaturedBlockPersisted> | undefined,
): FeaturedBlockPersisted {
  const defaults = defaultFeaturedBlock();
  if (!raw) return defaults;

  const mode: FeaturedBlockMode =
    raw.mode === "image" ||
    raw.mode === "composed" ||
    raw.mode === "placeholder" ||
    raw.mode === "genui"
      ? raw.mode
      : defaults.mode;

  return {
    mode,
    productPage: normalizeProductPage(raw.productPage ?? defaults.productPage),
    image: raw.image ?? null,
    activeBlockId: raw.activeBlockId ?? null,
    visualBlocks: Array.isArray(raw.visualBlocks) ? raw.visualBlocks : [],
    slots: raw.slots,
  };
}

export function featuredBlockStorageKey(storageScope?: string): string {
  return storageScope
    ? `postforge:featured:${storageScope}`
    : FEATURED_BLOCK_STORAGE_KEY;
}

export function loadFeaturedBlockPersisted(
  storageScope?: string,
): FeaturedBlockPersisted {
  if (typeof window === "undefined") return defaultFeaturedBlock();
  try {
    const raw = localStorage.getItem(featuredBlockStorageKey(storageScope));
    if (!raw) return defaultFeaturedBlock();
    return normalizeFeaturedPersisted(JSON.parse(raw) as FeaturedBlockPersisted);
  } catch {
    return defaultFeaturedBlock();
  }
}

export function saveFeaturedBlockPersisted(
  block: FeaturedBlockPersisted,
  storageScope?: string,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(featuredBlockStorageKey(storageScope), JSON.stringify(block));
}

export async function resolveFeaturedImageSrc(
  image: FeaturedImageRecord | null,
): Promise<string | null> {
  if (!image) return null;
  if (image.mime === "image/svg+xml" && image.svgMarkup) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(image.svgMarkup)}`;
  }
  if (image.blobKey) {
    const blob = await loadLogoBlob(image.blobKey);
    return blob ? URL.createObjectURL(blob) : null;
  }
  return null;
}

export async function loadFeaturedImageBlob(key: string): Promise<Blob | null> {
  return loadLogoBlob(key);
}

export async function saveFeaturedImageBlob(key: string, blob: Blob): Promise<void> {
  return saveLogoBlob(key, blob);
}

export async function deleteFeaturedImageBlob(key: string): Promise<void> {
  return deleteLogoBlob(key);
}

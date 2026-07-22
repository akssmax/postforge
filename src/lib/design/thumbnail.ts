import { deleteLogoBlob, loadLogoBlob, saveLogoBlob } from "@/lib/brand/storage";
import { capturePostPng } from "@/lib/social-tool/exportPost";
import { getPlatform } from "@/lib/social-tool/presets";

export const THUMBNAIL_CAPTURE_SCALE = 0.12;

export function thumbnailBlobKey(designId: string): string {
  return `${designId}:thumbnail`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function saveDesignThumbnail(
  designId: string,
  blob: Blob,
): Promise<void> {
  await saveLogoBlob(thumbnailBlobKey(designId), blob);
}

export async function loadDesignThumbnail(
  designId: string,
): Promise<Blob | null> {
  return loadLogoBlob(thumbnailBlobKey(designId));
}

export async function deleteDesignThumbnail(designId: string): Promise<void> {
  await deleteLogoBlob(thumbnailBlobKey(designId));
}

export async function getDesignThumbnailUrl(
  designId: string,
): Promise<string | null> {
  const blob = await loadDesignThumbnail(designId);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

export async function captureDesignThumbnail(
  designId: string,
  node: HTMLElement,
  platformId: Parameters<typeof getPlatform>[0],
): Promise<void> {
  const platform = getPlatform(platformId);
  const captureNode =
    node.querySelector<HTMLElement>(".social-post") ?? node;

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const dataUrl = await capturePostPng({
    node: captureNode,
    width: platform.width,
    height: platform.height,
    scale: THUMBNAIL_CAPTURE_SCALE,
  });

  await saveDesignThumbnail(designId, dataUrlToBlob(dataUrl));
}

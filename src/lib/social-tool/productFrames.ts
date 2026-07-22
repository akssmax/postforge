import type { ProductPageId } from "@/lib/social-tool/presets";

export const PRODUCT_PAGE_FRAMES = {
  leads: { width: 1100, height: 720 },
  pipeline: { width: 980, height: 640 },
  scheduler: { width: 680, height: 620 },
  stats: { width: 960, height: 560 },
  pricing: { width: 520, height: 620 },
  activity: { width: 760, height: 620 },
  profile: { width: 600, height: 620 },
  "form-card": { width: 520, height: 560 },
} as const satisfies Record<ProductPageId, { width: number; height: number }>;

export function getProductPageFrame(page: ProductPageId) {
  return PRODUCT_PAGE_FRAMES[page];
}

export function getProductPageNativeWidth(page: ProductPageId): number {
  return PRODUCT_PAGE_FRAMES[page].width;
}

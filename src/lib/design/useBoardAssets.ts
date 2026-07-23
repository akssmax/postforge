"use client";

import { useEffect, useState } from "react";
import { hydrateAllLogoSrcs } from "@/lib/brand/storage";
import type { BrandKitPersisted, BrandLogoVariant } from "@/lib/brand/types";
import { resolveFeaturedImageSrc } from "@/lib/social-tool/featuredBlock";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";

export function useBoardAssets(
  brand: BrandKitPersisted | null | undefined,
  featured: FeaturedBlockPersisted | null | undefined,
) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoSrcs, setLogoSrcs] = useState<
    Partial<Record<BrandLogoVariant, string | null>>
  >({});
  const [featuredImageSrc, setFeaturedImageSrc] = useState<string | null>(null);

  const brandKey = brand
    ? `${brand.logo?.id ?? ""}:${brand.logos?.primary?.id ?? ""}:${brand.activeBackgroundPresetId ?? ""}`
    : "";
  const featuredKey = featured?.image?.id ?? featured?.activeBlockId ?? "";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!brand) {
        setLogoSrc(null);
        setLogoSrcs({});
        return;
      }
      const srcs = await hydrateAllLogoSrcs(brand);
      if (cancelled) return;
      setLogoSrcs(srcs);
      setLogoSrc(srcs.primary ?? null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [brand, brandKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!featured?.image) {
        setFeaturedImageSrc(null);
        return;
      }
      const src = await resolveFeaturedImageSrc(featured.image);
      if (cancelled) return;
      setFeaturedImageSrc(src);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [featured, featuredKey]);

  return { logoSrc, logoSrcs, featuredImageSrc };
}

"use client";

import { useEffect, useState } from "react";
import type { LandingBrand } from "@/components/landing/landingBrands";
import {
  recolorIllustrationSvg,
  STORYSET_PRIMARY_ACCENTS,
  stripSvgXmlDecl,
} from "@/lib/social-tool/visualBlocks/library/illustrations/recolorClient";

const svgCache = new Map<string, string>();

async function fetchSvg(path: string): Promise<string> {
  const cached = svgCache.get(path);
  if (cached) return cached;
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const text = stripSvgXmlDecl(await res.text());
  svgCache.set(path, text);
  return text;
}

/** Load logo SVG markup (for currentColor / brand tinting on canvas). */
export function useLandingLogoMarkup(
  logoSrc: string,
  opts?: { forCanvasTint?: boolean },
): string | null {
  const [markup, setMarkup] = useState<string | null>(() => svgCache.get(logoSrc) ?? null);

  useEffect(() => {
    let cancelled = false;
    void fetchSvg(logoSrc)
      .then((svg) => {
        if (cancelled) return;
        // Monochrome tint on canvas: swap fixed fills for currentColor
        const prepared =
          opts?.forCanvasTint !== false
            ? svg.replace(
                /fill="(#[0-9A-Fa-f]{3,8})"/g,
                (match, hex: string) => {
                  // Keep Blinkit yellow badge / Google multi-color accents
                  const keep = new Set([
                    "#FFE141",
                    "#ffe141",
                    "#0C831F",
                    "#0c831f",
                    "#4285F4",
                    "#34A853",
                    "#FBBC05",
                    "#EA4335",
                    "#4285f4",
                    "#34a853",
                    "#fbbc05",
                    "#ea4335",
                  ]);
                  if (keep.has(hex)) return match;
                  return 'fill="currentColor"';
                },
              )
            : svg;
        setMarkup(prepared);
      })
      .catch(() => {
        if (!cancelled) setMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [logoSrc, opts?.forCanvasTint]);

  return markup;
}

/**
 * Fetch illustration SVG and recolor accents to the brand primary —
 * showcases Postforge's brand-aware illustration generation.
 */
export function useBrandRecoloredIllustration(
  illustrationSrc: string,
  brand: LandingBrand,
): string | null {
  const [markup, setMarkup] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSvg(illustrationSrc)
      .then((svg) => {
        if (cancelled) return;
        const accents = illustrationSrc.includes("/storyset/")
          ? STORYSET_PRIMARY_ACCENTS
          : undefined;
        setMarkup(recolorIllustrationSvg(svg, brand.colors.primary, accents));
      })
      .catch(() => {
        if (!cancelled) setMarkup(null);
      });
    return () => {
      cancelled = true;
    };
  }, [illustrationSrc, brand.colors.primary]);

  return markup;
}

/** Logo tint: light logos on dark posts, dark logos on light posts. */
export function logoColorModeFromTextOnBrand(
  textOnBrand: string,
): "light" | "dark" {
  const hex = textOnBrand.trim().toLowerCase();
  if (hex === "#f4f4f4" || hex.startsWith("#f") || hex.startsWith("rgb(244")) {
    return "light";
  }
  return "dark";
}

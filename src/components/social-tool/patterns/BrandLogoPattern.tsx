"use client";

import { useMemo } from "react";
import { getBrandPatternById } from "@/lib/social-tool/patterns/brandPatterns";
import type { BrandPatternId } from "@/lib/social-tool/patterns/types";

type BrandLogoPatternProps = {
  logoSvgMarkup: string;
  brandPatternId: BrandPatternId;
  color: string;
  opacity: number;
  scale: number;
  animated: boolean;
  className?: string;
};

export function BrandLogoPattern({
  logoSvgMarkup,
  brandPatternId,
  color,
  opacity,
  scale,
  animated,
  className = "",
}: BrandLogoPatternProps) {
  const pattern = useMemo(
    () => getBrandPatternById(logoSvgMarkup, color, brandPatternId),
    [logoSvgMarkup, color, brandPatternId],
  );

  if (!pattern) return null;

  return (
    <div
      className={`social-post-pattern social-post-pattern--brand ${animated ? "is-animated" : ""} ${className}`.trim()}
      style={
        {
          opacity,
          "--sp-pattern-scale": scale,
        } as React.CSSProperties
      }
      aria-hidden
      dangerouslySetInnerHTML={{ __html: pattern.svgMarkup }}
    />
  );
}

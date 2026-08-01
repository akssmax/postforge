"use client";

import type { CSSProperties } from "react";
import { CanvasSlot } from "@/components/social-tool/CanvasSlot";

type Props = {
  logoSrc: string | null;
  svgMarkup?: string | null;
  hasLogo: boolean;
  height: number;
  invert?: boolean;
  usesExplicitColors?: boolean;
  colorMode?: "light" | "dark" | "inherit";
};

/**
 * Prefer inherited `--sp-logo-h` from the logo chrome wrapper so live scale
 * preview can update one CSS variable without fighting React inline pixels.
 */
function logoSizeStyle(height: number): CSSProperties {
  const fallback = `${height}px`;
  return {
    height: `var(--sp-logo-h, ${fallback})`,
    width: "auto",
    maxWidth: "100%",
  };
}

export function BrandLogoSlot({
  logoSrc,
  svgMarkup,
  hasLogo,
  height,
  invert = false,
  usesExplicitColors = false,
  colorMode = "inherit",
}: Props) {
  if (!hasLogo) {
    return (
      <CanvasSlot
        variant="logo"
        style={{
          ...logoSizeStyle(height),
          minWidth: `calc(var(--sp-logo-h, ${height}px) * 2.4)`,
        }}
      />
    );
  }

  if (svgMarkup) {
    const tintClass =
      colorMode === "dark"
        ? " brand-logo-inline--mono-dark"
        : colorMode === "light"
          ? " brand-logo-inline--mono-light"
          : usesExplicitColors
            ? ""
            : " text-white";
    return (
      <div
        className={`brand-logo-inline${tintClass}${invert ? " brand-logo-invert" : ""}`}
        style={logoSizeStyle(height)}
        role="img"
        aria-label="Brand logo"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    );
  }

  if (logoSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt="Brand logo"
        className={`brand-logo-img${invert ? " brand-logo-invert" : ""}`}
        style={logoSizeStyle(height)}
        draggable={false}
      />
    );
  }

  return (
    <CanvasSlot
      variant="logo"
      style={{
        ...logoSizeStyle(height),
        minWidth: `calc(var(--sp-logo-h, ${height}px) * 2.4)`,
      }}
    />
  );
}

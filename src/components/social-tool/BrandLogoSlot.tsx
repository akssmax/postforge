"use client";

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
        style={{ height, minWidth: Math.round(height * 2.4) }}
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
        style={{ height }}
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
        style={{ height, width: "auto" }}
        draggable={false}
      />
    );
  }

  return (
    <CanvasSlot
      variant="logo"
      style={{ height, minWidth: Math.round(height * 2.4) }}
    />
  );
}

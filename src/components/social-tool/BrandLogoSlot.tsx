"use client";

import { CanvasSlot } from "@/components/social-tool/CanvasSlot";

type Props = {
  logoSrc: string | null;
  svgMarkup?: string | null;
  hasLogo: boolean;
  height: number;
  invert?: boolean;
};

export function BrandLogoSlot({
  logoSrc,
  svgMarkup,
  hasLogo,
  height,
  invert = false,
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
    return (
      <div
        className={`brand-logo-inline text-white${invert ? " brand-logo-invert" : ""}`}
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
        className="brand-logo-img"
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

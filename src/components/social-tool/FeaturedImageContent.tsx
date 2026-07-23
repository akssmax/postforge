"use client";

import { cn } from "@/lib/utils";

type Props = {
  imageSrc: string | null;
  svgMarkup?: string | null;
  /** Skip padded featured-image wrapper — for library visual blocks on canvas */
  bare?: boolean;
  className?: string;
};

export function FeaturedImageContent({
  imageSrc,
  svgMarkup,
  bare = false,
  className,
}: Props) {
  if (svgMarkup) {
    if (bare) {
      return (
        <div
          className={cn("visual-block-svg-root", className)}
          role="img"
          aria-label="Visual block"
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      );
    }

    return (
      <div
        className={cn("social-post-featured-image social-post-featured-image--svg", className)}
        role="img"
        aria-label="Featured image"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    );
  }

  if (imageSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc}
        alt="Featured"
        className={cn("social-post-featured-image", className)}
        draggable={false}
      />
    );
  }

  return null;
}

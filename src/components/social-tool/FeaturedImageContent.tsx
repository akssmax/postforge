"use client";

type Props = {
  imageSrc: string | null;
  svgMarkup?: string | null;
};

export function FeaturedImageContent({ imageSrc, svgMarkup }: Props) {
  if (svgMarkup) {
    return (
      <div
        className="social-post-featured-image social-post-featured-image--svg"
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
        className="social-post-featured-image"
        draggable={false}
      />
    );
  }

  return null;
}

import type { Metadata } from "next";
import {
  shareImageAlt,
  shareImageSize,
} from "@/lib/brand/postforgeShareImage";

const defaultOgImage = {
  url: "/opengraph-image",
  width: shareImageSize.width,
  height: shareImageSize.height,
  alt: shareImageAlt,
  type: "image/png" as const,
};

/** Attach default Postforge OG + Twitter card images to route metadata. */
export function withShareImages(metadata: Metadata = {}): Metadata {
  const openGraph = metadata.openGraph ?? {};
  const twitter = metadata.twitter ?? {};

  return {
    ...metadata,
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Postforge",
      ...openGraph,
      images: openGraph.images ?? [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      ...twitter,
      images: twitter.images ?? ["/twitter-image"],
    },
  };
}

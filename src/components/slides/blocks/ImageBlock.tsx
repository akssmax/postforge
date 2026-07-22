"use client";

import type { ImageBlock } from "@/lib/slides/types";

type Props = {
  block: ImageBlock;
};

export function ImageBlockView({ block }: Props) {
  const { src, fit, opacity } = block.props;
  if (!src) {
    return (
      <div className="slides-block-image-empty">
        <span>Upload an image</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      className="slides-block-image"
      style={{
        width: "100%",
        height: "100%",
        objectFit: fit,
        opacity,
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
}

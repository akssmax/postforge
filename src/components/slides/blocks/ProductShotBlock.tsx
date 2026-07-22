"use client";

import { ProductPreview } from "@/components/social-tool/ProductPreview";
import type { ProductBlock } from "@/lib/slides/types";
import { SLIDE_WIDTH } from "@/lib/slides/types";

type Props = {
  block: ProductBlock;
  /** No interactive DOM (buttons) — for filmstrip thumbs */
  staticPreview?: boolean;
};

const NATIVE_WIDTH = 1100;

export function ProductShotBlockView({ block, staticPreview }: Props) {
  const framePx = (block.w / 100) * SLIDE_WIDTH;
  const uiScale = framePx / NATIVE_WIDTH;

  if (staticPreview) {
    return (
      <div className="slides-block-product slides-block-product--static">
        <div className="slides-product-static">
          <div className="slides-product-static-bar" />
          <div className="slides-product-static-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="slides-block-product">
      <div
        className="slides-block-product-inner"
        style={{
          width: NATIVE_WIDTH,
          transform: `scale(${uiScale})`,
          transformOrigin: "top left",
        }}
      >
        <ProductPreview page={block.props.page} frameWidth={NATIVE_WIDTH} />
      </div>
    </div>
  );
}

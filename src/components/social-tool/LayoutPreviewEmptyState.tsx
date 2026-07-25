"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import { EMPTY_POST_COPY } from "@/lib/design/designSession";
import { DEFAULT_POST_LAYOUT_SPACING } from "@/lib/social-tool/layoutSpacing";
import {
  getPostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";

/** Layouts that read clearly as distinct wireframes in the empty-state carousel */
const PREVIEW_LAYOUT_IDS: PostLayoutId[] = [
  "classic-hero",
  "centered-announcement",
  "logo-footer-bar",
  "product-focus",
  "visual-first",
];

const CYCLE_MS = 3800;

type Props = {
  width: number;
  height: number;
  previewScale?: number;
  /** Fit scale for layout box; user zoom is applied on the canvas zoom layer. */
  layoutScale?: number;
};

export function LayoutPreviewEmptyState({
  width,
  height,
  previewScale = 1,
  layoutScale: layoutScaleProp,
}: Props) {
  const layoutScale = layoutScaleProp ?? previewScale;
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const layoutId = PREVIEW_LAYOUT_IDS[index]!;
  const layout = getPostLayout(layoutId);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % PREVIEW_LAYOUT_IDS.length);
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div
      className="layout-preview-empty-state"
      style={{
        width: width * layoutScale,
        height: height * layoutScale,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={layoutId}
          className="layout-preview-empty-state__frame"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            className="layout-preview-empty-state__scale"
            style={{
              width,
              height,
              transform: `scale(${layoutScale})`,
            }}
          >
            <ProductShotPost
              width={width}
              height={height}
              copy={EMPTY_POST_COPY}
              pattern="none"
              showPattern={false}
              productPage="leads"
              featuredMode="image"
              hasFeaturedImage={false}
              showLogo
              showContent
              showFeaturedImage
              emptyStatePreview
              layoutId={layoutId}
              spacing={DEFAULT_POST_LAYOUT_SPACING}
              featuredTransform={DEFAULT_FEATURED_TRANSFORM}
              previewScale={previewScale}
              interactive={false}
              logoAlign={layout.logoAlign}
              logoPlacement={layout.logoPlacement}
              textAlign={layout.textAlign}
            />
          </div>
        </motion.div>
      </AnimatePresence>
      <motion.p
        key={`label-${layoutId}`}
        className="layout-preview-empty-state__label"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        {layout.name}
      </motion.p>
    </div>
  );
}

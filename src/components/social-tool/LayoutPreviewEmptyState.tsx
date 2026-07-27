"use client";

import { useEffect, useMemo, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
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

const CYCLE_MS = 4200;
const GAP_PX = 32;
const SIDE_SCALE = 0.76;
const SLIDE_SPRING = { type: "spring" as const, stiffness: 400, damping: 34 };

type Props = {
  width: number;
  height: number;
  previewScale?: number;
  /** Fit scale for layout box; user zoom is applied on the canvas zoom layer. */
  layoutScale?: number;
};

function layoutAt(index: number): PostLayoutId {
  const len = PREVIEW_LAYOUT_IDS.length;
  return PREVIEW_LAYOUT_IDS[((index % len) + len) % len]!;
}

type PreviewBoardProps = {
  layoutId: PostLayoutId;
  width: number;
  height: number;
  layoutScale: number;
  previewScale: number;
  isCenter: boolean;
};

function PreviewBoard({
  layoutId,
  width,
  height,
  layoutScale,
  previewScale,
  isCenter,
}: PreviewBoardProps) {
  const layout = getPostLayout(layoutId);
  const boardScale = layoutScale * (isCenter ? 1 : SIDE_SCALE);

  return (
    <div
      className={`layout-preview-empty-state__board${
        isCenter ? " is-center" : " is-side"
      }`}
    >
      <div
        className="layout-preview-empty-state__board-inner"
        style={{
          width: width * boardScale,
          height: height * boardScale,
        }}
      >
        <div
          className="layout-preview-empty-state__scale"
          style={{
            width,
            height,
            transform: `scale(${boardScale})`,
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
      </div>
    </div>
  );
}

export function LayoutPreviewEmptyState({
  width,
  height,
  previewScale = 1,
  layoutScale: layoutScaleProp,
}: Props) {
  const layoutScale = layoutScaleProp ?? previewScale;
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);

  const slotW = width * layoutScale;
  const slotH = height * layoutScale;
  const viewportW = slotW * 3 + GAP_PX * 2;
  const step = slotW + GAP_PX;

  const slotLayouts = useMemo(
    () => [-1, 0, 1, 2].map((offset) => layoutAt(index + offset)),
    [index],
  );

  const centerLayout = getPostLayout(layoutAt(index));

  useEffect(() => {
    if (reduceMotion) return;

    let cancelled = false;

    const run = async () => {
      while (!cancelled) {
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, CYCLE_MS);
        });
        if (cancelled) break;

        await animate(x, -step, SLIDE_SPRING);
        if (cancelled) break;

        x.set(0);
        setIndex((current) => (current + 1) % PREVIEW_LAYOUT_IDS.length);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [reduceMotion, step, x]);

  if (reduceMotion) {
    return (
      <div
        className="layout-preview-empty-state layout-preview-empty-state--static"
        style={{ width: slotW, height: slotH }}
      >
        <PreviewBoard
          layoutId={layoutAt(index)}
          width={width}
          height={height}
          layoutScale={layoutScale}
          previewScale={previewScale}
          isCenter
        />
        <p className="layout-preview-empty-state__label">{centerLayout.name}</p>
      </div>
    );
  }

  return (
    <div
      className="layout-preview-empty-state layout-preview-empty-state--multi"
      style={{ width: viewportW }}
    >
      <div
        className="layout-preview-empty-state__viewport"
        style={{ width: viewportW, height: slotH }}
      >
        <motion.div
          className="layout-preview-empty-state__track"
          style={{ x, gap: GAP_PX }}
        >
          {slotLayouts.map((layoutId, slotIndex) => (
            <div
              key={slotIndex}
              className="layout-preview-empty-state__slot"
              style={{ width: slotW, height: slotH }}
            >
              <PreviewBoard
                layoutId={layoutId}
                width={width}
                height={height}
                layoutScale={layoutScale}
                previewScale={previewScale}
                isCenter={slotIndex === 1}
              />
            </div>
          ))}
        </motion.div>
      </div>
      <motion.p
        key={centerLayout.id}
        className="layout-preview-empty-state__label"
        initial={{ y: 6 }}
        animate={{ y: 0 }}
        transition={SLIDE_SPRING}
      >
        {centerLayout.name}
      </motion.p>
    </div>
  );
}

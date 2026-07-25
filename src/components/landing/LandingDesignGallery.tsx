"use client";

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import "@/components/social-tool/social-tool.css";
import { getLandingBrand } from "@/components/landing/landingBrands";
import {
  LANDING_DEMO_DESIGNS,
  type LandingDemoDesign,
} from "@/components/landing/landingDemoDesigns";
import {
  logoColorModeFromTextOnBrand,
  useBrandRecoloredIllustration,
} from "@/components/landing/useLandingBrandAssets";
import { createLandingDemoState } from "@/lib/social-tool/landingShuffle";
import { getPlatform } from "@/lib/social-tool/presets";
import { getPostLayout } from "@/lib/social-tool/postLayouts";

const ease = [0.22, 1, 0.36, 1] as const;

function useDemoCanvas(design: LandingDemoDesign) {
  const brand = getLandingBrand(design.brandId);
  const platform = getPlatform(design.platformId);
  const layout = getPostLayout(design.layoutId);
  const demo = useMemo(
    () =>
      createLandingDemoState(design.brandId, brand.colors, {
        platformId: design.platformId,
        layoutId: design.layoutId,
        copy: design.copy,
        illustrationSrc: design.illustrationSrc,
        showFeaturedImage: design.showFeaturedImage,
        pattern: design.pattern,
        showPattern: design.showPattern,
        patternOpacity: design.patternOpacity,
        patternScale: design.patternScale,
        backgroundPresetId: design.backgroundPresetId,
      }),
    [brand.colors, design],
  );
  const illustrationMarkup = useBrandRecoloredIllustration(
    demo.illustrationSrc,
    brand,
  );
  const logoColorMode = logoColorModeFromTextOnBrand(
    demo.backgroundCss.textOnBrand,
  );
  const logoInvert =
    !brand.usesExplicitColors && logoColorMode === "light";

  return {
    brand,
    platform,
    layout,
    demo,
    illustrationMarkup,
    logoInvert,
  };
}

function GalleryCanvas({
  design,
  maxWidth,
  maxHeight,
  className = "",
}: {
  design: LandingDemoDesign;
  maxWidth: number;
  maxHeight: number;
  className?: string;
}) {
  const { brand, platform, demo, illustrationMarkup, logoInvert } =
    useDemoCanvas(design);
  const previewScale = Math.min(
    maxWidth / platform.width,
    maxHeight / platform.height,
  );

  return (
    <div
      className={`pf-gallery-canvas-shell ${className}`.trim()}
      style={{
        width: platform.width * previewScale,
        height: platform.height * previewScale,
      }}
    >
      <div
        className="pf-gallery-canvas-scale"
        style={{
          width: platform.width,
          height: platform.height,
          transform: `scale(${previewScale})`,
        }}
      >
        <ProductShotPost
          width={platform.width}
          height={platform.height}
          copy={demo.copy}
          pattern={demo.pattern}
          showPattern={demo.showPattern}
          showBackground
          productPage="leads"
          featuredMode="image"
          featuredImageSrc={illustrationMarkup ? null : demo.illustrationSrc}
          featuredSvgMarkup={illustrationMarkup}
          hasFeaturedImage
          showLogo
          showContent
          showFeaturedImage={demo.showFeaturedImage}
          typeScale={demo.typeScale}
          logoScale={Math.max(demo.logoScale, 1.35)}
          logoAlign={demo.logoAlign}
          logoPlacement={demo.logoPlacement}
          textAlign={demo.textAlign}
          layoutId={demo.layoutId}
          logoSrc={brand.logoSrc}
          hasUploadedLogo
          logoInvert={logoInvert}
          logoUsesExplicitColors={brand.usesExplicitColors}
          backgroundPreset={demo.backgroundCss}
          brandColors={{
            primary: brand.colors.primary,
            accent: brand.colors.accent,
          }}
          patternOpacity={demo.patternOpacity}
          patternScale={demo.patternScale}
          featuredTransform={DEFAULT_FEATURED_TRANSFORM}
          previewScale={previewScale}
          interactive={false}
        />
      </div>
    </div>
  );
}

function GalleryThumb({
  design,
  selected,
  tabIndex,
  onSelect,
  onFocus,
  buttonRef,
}: {
  design: LandingDemoDesign;
  selected: boolean;
  tabIndex: number;
  onSelect: () => void;
  onFocus: () => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
}) {
  const brand = getLandingBrand(design.brandId);

  return (
    <button
      ref={buttonRef}
      type="button"
      role="option"
      aria-selected={selected}
      tabIndex={tabIndex}
      className={`pf-gallery-thumb${selected ? " is-active" : ""}`}
      onClick={onSelect}
      onFocus={onFocus}
    >
      <span className="pf-gallery-thumb-preview" aria-hidden>
        <GalleryCanvas
          design={design}
          maxWidth={132}
          maxHeight={148}
          className="pf-gallery-thumb-canvas"
        />
      </span>
      <span className="pf-gallery-thumb-meta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logoSrc} alt="" className="pf-gallery-thumb-logo" />
        <span className="pf-gallery-thumb-title">{design.title}</span>
      </span>
    </button>
  );
}

export function LandingDesignGallery() {
  const reduceMotion = useReducedMotion();
  const listboxId = useId();
  const [selectedId, setSelectedId] = useState(LANDING_DEMO_DESIGNS[0]!.id);
  const [focusIndex, setFocusIndex] = useState(0);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = Math.max(
    0,
    LANDING_DEMO_DESIGNS.findIndex((d) => d.id === selectedId),
  );
  const selected = LANDING_DEMO_DESIGNS[selectedIndex]!;
  const { brand, platform, layout } = useDemoCanvas(selected);

  const selectAt = useCallback((index: number, focus = false) => {
    const next = LANDING_DEMO_DESIGNS[index];
    if (!next) return;
    setSelectedId(next.id);
    setFocusIndex(index);
    if (focus) {
      requestAnimationFrame(() => {
        thumbRefs.current[index]?.focus();
      });
    }
  }, []);

  function onStripKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const count = LANDING_DEMO_DESIGNS.length;
    if (count === 0) return;

    let next = focusIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      next = (focusIndex + 1) % count;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      next = (focusIndex - 1 + count) % count;
    } else if (event.key === "Home") {
      event.preventDefault();
      next = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      next = count - 1;
    } else {
      return;
    }
    selectAt(next, true);
  }

  return (
    <div className="pf-gallery-showcase">
      <div className="pf-gallery-stage">
        <div className="pf-gallery-copy">
          <p className="pf-gallery-kicker">{brand.name}</p>
          <h3 className="pf-gallery-title">{selected.title}</h3>
          <p className="pf-gallery-caption">
            {platform.label} · {layout.name}
          </p>
          <p className="pf-gallery-lede">{selected.copy.heading}</p>
          {selected.copy.subheading ? (
            <p className="pf-gallery-sub">{selected.copy.subheading}</p>
          ) : null}
          <Link href="/tool" className="pf-btn pf-btn-accent pf-btn-sm">
            Remix in the tool
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="pf-gallery-spotlight">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              className="pf-gallery-spotlight-frame"
              initial={
                reduceMotion ? false : { opacity: 0, y: 14, scale: 0.985 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: reduceMotion ? 0 : 0.35, ease }}
            >
              <GalleryCanvas
                design={selected}
                maxWidth={520}
                maxHeight={560}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div
        className="pf-gallery-strip"
        role="listbox"
        id={listboxId}
        aria-label="Showcase designs"
        aria-orientation="horizontal"
        onKeyDown={onStripKeyDown}
      >
        {LANDING_DEMO_DESIGNS.map((design, index) => (
          <GalleryThumb
            key={design.id}
            design={design}
            selected={design.id === selectedId}
            tabIndex={index === focusIndex ? 0 : -1}
            onSelect={() => selectAt(index)}
            onFocus={() => setFocusIndex(index)}
            buttonRef={(node) => {
              thumbRefs.current[index] = node;
            }}
          />
        ))}
      </div>
    </div>
  );
}

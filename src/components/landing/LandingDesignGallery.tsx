"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip } from "@heroui/react";
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
        typeScale: design.typeScale,
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
          featuredTransform={{
            ...DEFAULT_FEATURED_TRANSFORM,
            ...design.featuredTransform,
          }}
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

export function LandingDesignGallery({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const listboxId = useId();
  const carouselId = useId();
  const [selectedId, setSelectedId] = useState(LANDING_DEMO_DESIGNS[0]!.id);
  const [focusIndex, setFocusIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = Math.max(
    0,
    LANDING_DEMO_DESIGNS.findIndex((d) => d.id === selectedId),
  );
  const selected = LANDING_DEMO_DESIGNS[selectedIndex]!;
  const { brand, platform, layout } = useDemoCanvas(selected);

  const selectAt = useCallback(
    (index: number, focus = false, direction?: 1 | -1) => {
      const next = LANDING_DEMO_DESIGNS[index];
      if (!next) return;
      if (direction !== undefined) {
        setSlideDirection(direction);
      } else if (index !== selectedIndex) {
        setSlideDirection(index > selectedIndex ? 1 : -1);
      }
      setSelectedId(next.id);
      setFocusIndex(index);
      if (focus) {
        requestAnimationFrame(() => {
          thumbRefs.current[index]?.focus();
        });
      }
    },
    [selectedIndex],
  );

  const goPrev = useCallback(() => {
    const count = LANDING_DEMO_DESIGNS.length;
    selectAt((selectedIndex - 1 + count) % count, false, -1);
  }, [selectAt, selectedIndex]);

  const goNext = useCallback(() => {
    const count = LANDING_DEMO_DESIGNS.length;
    selectAt((selectedIndex + 1) % count, false, 1);
  }, [selectAt, selectedIndex]);

  useEffect(() => {
    if (!compact || reduceMotion || carouselPaused) return;
    const timer = window.setInterval(goNext, 6000);
    return () => window.clearInterval(timer);
  }, [carouselPaused, compact, goNext, reduceMotion]);

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

  function onCarouselKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAt(0, false, -1);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAt(LANDING_DEMO_DESIGNS.length - 1, false, 1);
    }
  }

  if (compact) {
    return (
      <div
        className="pf-gallery-carousel"
        id={carouselId}
        role="region"
        aria-roledescription="carousel"
        aria-label="Example outputs"
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
        onFocusCapture={() => setCarouselPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setCarouselPaused(false);
          }
        }}
        onKeyDown={onCarouselKeyDown}
      >
        <div className="pf-gallery-carousel-stage">
          <Tooltip delay={500}>
            <Tooltip.Trigger>
              <button
                type="button"
                className="pf-gallery-carousel-nav pf-gallery-carousel-nav--prev"
                aria-label="Previous example"
                aria-controls={carouselId}
                onClick={goPrev}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="left" offset={8}>
              Previous
            </Tooltip.Content>
          </Tooltip>

          <div
            className="pf-gallery-carousel-spotlight"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={selected.id}
                className="pf-gallery-carousel-frame"
                initial={
                  reduceMotion
                    ? false
                    : { opacity: 0, x: slideDirection * 48, scale: 0.985 }
                }
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? undefined
                    : { opacity: 0, x: slideDirection * -48, scale: 0.99 }
                }
                transition={{ duration: reduceMotion ? 0 : 0.38, ease }}
              >
                <GalleryCanvas
                  design={selected}
                  maxWidth={480}
                  maxHeight={520}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <Tooltip delay={500}>
            <Tooltip.Trigger>
              <button
                type="button"
                className="pf-gallery-carousel-nav pf-gallery-carousel-nav--next"
                aria-label="Next example"
                aria-controls={carouselId}
                onClick={goNext}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="right" offset={8}>
              Next
            </Tooltip.Content>
          </Tooltip>
        </div>

        <div className="pf-gallery-carousel-copy">
          <p className="pf-gallery-kicker">{brand.name}</p>
          <h3 className="pf-gallery-title">{selected.title}</h3>
          <p className="pf-gallery-caption">
            {platform.label} · {layout.name}
          </p>
          <p className="pf-gallery-lede">{selected.copy.heading}</p>
          {selected.copy.subheading ? (
            <p className="pf-gallery-sub">{selected.copy.subheading}</p>
          ) : null}
        </div>

        <div
          className="pf-gallery-carousel-dots"
          role="tablist"
          aria-label="Choose example"
        >
          {LANDING_DEMO_DESIGNS.map((design, index) => (
            <button
              key={design.id}
              type="button"
              role="tab"
              className={`pf-gallery-carousel-dot${
                design.id === selectedId ? " is-active" : ""
              }`}
              aria-selected={design.id === selectedId}
              aria-label={`${design.title}, ${getLandingBrand(design.brandId).name}`}
              tabIndex={design.id === selectedId ? 0 : -1}
              onClick={() => selectAt(index, false, index > selectedIndex ? 1 : -1)}
            />
          ))}
        </div>

        <Link
          href="/designs"
          className="pf-btn pf-btn-ghost pf-btn-sm pf-gallery-carousel-cta"
        >
          View saved designs
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    );
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

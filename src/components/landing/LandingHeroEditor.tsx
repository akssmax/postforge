"use client";

import Link from "next/link";
import { ArrowUpRight, Shuffle } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LandingCanvasPreview } from "@/components/landing/LandingCanvasPreview";
import { LandingEditorShell } from "@/components/landing/LandingEditorShell";
import { LandingProductFrame } from "@/components/landing/LandingProductFrame";
import { getLandingBrand } from "@/components/landing/landingBrands";
import type { LandingDemoDesign } from "@/components/landing/landingDemoDesigns";
import { getHeroGoldenDesign } from "@/lib/landing/goldenDesigns";
import {
  createLandingDemoState,
  shuffleLandingDemo,
  type LandingDemoState,
} from "@/lib/social-tool/landingShuffle";
import { getPlatform } from "@/lib/social-tool/presets";

const ease = [0.22, 1, 0.36, 1] as const;

const HERO_COPY_VARIANTS = [
  {
    id: "canvas",
    title: "From logo to finished post in one canvas.",
    lede:
      "Upload your brand, brief the AI, shuffle layouts, and export for LinkedIn, Instagram, and print. No blank canvas paralysis.",
  },
  {
    id: "brand",
    title: "Your logo becomes a design system.",
    lede:
      "Drop in a mark once — Postforge extracts colors, builds backgrounds, and tiles logo patterns across every post.",
  },
  {
    id: "shuffle",
    title: "Explore finished compositions in one click.",
    lede:
      "Cycle layout, surface, pattern, and copy across artboards. Skip the blank canvas and land on-brand faster.",
  },
  {
    id: "brief",
    title: "Describe it once, refine in chat.",
    lede:
      "Brief the AI in plain language, get a first draft on canvas, then follow up without leaving the editor.",
  },
] as const;

const COPY_CYCLE_MS = 5500;

const copyEnter = {
  opacity: 0,
  y: 18,
  filter: "blur(6px)",
};

const copyActive = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
};

const copyExit = {
  opacity: 0,
  y: -14,
  filter: "blur(4px)",
};

function HeroRotatingCopy({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [index, setIndex] = useState(0);
  const copy = HERO_COPY_VARIANTS[index] ?? HERO_COPY_VARIANTS[0]!;

  useEffect(() => {
    if (reduceMotion || HERO_COPY_VARIANTS.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_COPY_VARIANTS.length);
    }, COPY_CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  const motionProps = reduceMotion
    ? { initial: false as const, animate: copyActive, exit: undefined }
    : {
        initial: copyEnter,
        animate: copyActive,
        exit: copyExit,
        transition: { duration: 0.5, ease },
      };

  return (
    <>
      <div className="pf-hero-v2-title-wrap" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={copy.id}
            className="pf-hero-v2-title"
            {...motionProps}
          >
            {copy.title}
          </motion.h1>
        </AnimatePresence>
      </div>
      <div className="pf-hero-v2-lede-wrap" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={copy.id} className="pf-hero-v2-lede" {...motionProps}>
            {copy.lede}
          </motion.p>
        </AnimatePresence>
      </div>
    </>
  );
}

function demoFromDesign(
  design: LandingDemoDesign,
  colors: ReturnType<typeof getLandingBrand>["colors"],
): LandingDemoState {
  return createLandingDemoState(design.brandId, colors, {
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
  });
}

export function LandingHeroEditor() {
  const reduceMotion = useReducedMotion();
  const design = getHeroGoldenDesign();
  const brand = getLandingBrand(design.brandId);
  const platform = getPlatform(design.platformId);
  const platformLabel = platform.label.replace("LinkedIn ", "LinkedIn · ");
  const [demo, setDemo] = useState<LandingDemoState | null>(null);
  const [shuffleFlash, setShuffleFlash] = useState(false);

  useEffect(() => {
    setDemo(demoFromDesign(design, brand.colors));
  }, [brand.colors, design]);

  const handleShuffle = useCallback(() => {
    setDemo((prev) =>
      prev ? shuffleLandingDemo(design.brandId, prev, brand.colors) : prev,
    );
    setShuffleFlash(true);
    window.setTimeout(() => setShuffleFlash(false), 650);
  }, [brand.colors, design.brandId]);

  const shellHighlight = useMemo(
    () => ({
      brand: true,
      shuffle: shuffleFlash,
    }),
    [shuffleFlash],
  );

  if (!demo) return null;

  return (
    <section className="pf-hero-v2" aria-label="Hero">
      <div className="pf-hero-v2-bg" aria-hidden>
        <div className="pf-hero-v2-grid" />
        <div className="pf-hero-v2-glow pf-hero-v2-glow--primary" />
        <div className="pf-hero-v2-glow pf-hero-v2-glow--secondary" />
      </div>
      <div className="pf-hero-v2-inner">
        <motion.div
          className="pf-hero-v2-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
        >
          <p className="pf-hero-v2-kicker">Brand-first social design</p>
          <HeroRotatingCopy reduceMotion={reduceMotion} />
          <div className="pf-hero-v2-cta">
            <Link href="/tool" className="pf-btn pf-btn-accent">
              Start designing
              <ArrowUpRight className="size-5" />
            </Link>
            <button
              type="button"
              className="pf-btn pf-btn-ghost"
              onClick={handleShuffle}
            >
              <Shuffle className="size-4" aria-hidden />
              Try Shuffle
            </button>
          </div>
        </motion.div>

        <motion.div
          className="pf-hero-v2-product"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
        >
          <LandingProductFrame>
            <LandingEditorShell
              brandId={design.brandId}
              platformId={design.platformId}
              platformLabel={platformLabel}
              highlight={shellHighlight}
              defaultAsideCollapsed={false}
              onShuffle={handleShuffle}
              canvas={
                <LandingCanvasPreview
                  design={design}
                  demo={demo}
                  maxScale={0.78}
                  minScale={0.48}
                  maxShellPx={520}
                  showShuffleFlash={shuffleFlash}
                />
              }
            />
          </LandingProductFrame>
        </motion.div>
      </div>
    </section>
  );
}

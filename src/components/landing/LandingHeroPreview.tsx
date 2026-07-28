"use client";

import { useEffect, useMemo, useState } from "react";
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

const ease = [0.22, 1, 0.36, 1] as const;

const HERO_DESIGNS = LANDING_DEMO_DESIGNS.filter((d) =>
  ["claude-launch", "linear-ship", "blinkit-split"].includes(d.id),
);

function HeroFrame({ design }: { design: LandingDemoDesign }) {
  const brand = getLandingBrand(design.brandId);
  const platform = getPlatform(design.platformId);
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
  const previewScale = 0.42;
  const shellStyle = {
    width: platform.width * previewScale,
    height: platform.height * previewScale,
  };

  return (
    <div className="pf-hero-preview-shell" style={shellStyle}>
      <div
        className="pf-hero-preview-scale"
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

export function LandingHeroPreview() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const design = HERO_DESIGNS[index] ?? HERO_DESIGNS[0]!;

  useEffect(() => {
    if (reduceMotion || HERO_DESIGNS.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_DESIGNS.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  return (
    <div className="pf-hero-preview" aria-hidden>
      <div className="pf-hero-preview-glow" />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={design.id}
          className="pf-hero-preview-frame"
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease }}
        >
          <HeroFrame design={design} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

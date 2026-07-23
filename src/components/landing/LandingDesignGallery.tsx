"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

function GalleryCard({
  design,
  index,
  reduceMotion,
}: {
  design: LandingDemoDesign;
  index: number;
  reduceMotion: boolean | null;
}) {
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
  const previewScale = Math.min(280 / platform.width, 0.28);
  const illustrationMarkup = useBrandRecoloredIllustration(
    demo.illustrationSrc,
    brand,
  );
  const logoColorMode = logoColorModeFromTextOnBrand(
    demo.backgroundCss.textOnBrand,
  );
  const logoInvert =
    !brand.usesExplicitColors && logoColorMode === "light";

  return (
    <motion.article
      className="pf-gallery-card"
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease }}
    >
      <div className="pf-gallery-preview">
        <div
          className="pf-gallery-canvas-shell"
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
      </div>
      <div className="pf-gallery-meta">
        <p className="pf-gallery-title">{design.title}</p>
        <p className="pf-gallery-caption">
          {brand.name} · {platform.label} · {layout.name}
        </p>
      </div>
    </motion.article>
  );
}

export function LandingDesignGallery() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pf-gallery-grid">
      {LANDING_DEMO_DESIGNS.map((design, i) => (
        <GalleryCard
          key={design.id}
          design={design}
          index={i}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
}

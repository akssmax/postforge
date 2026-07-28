"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import "@/components/social-tool/social-tool.css";
import { getLandingBrand } from "@/components/landing/landingBrands";
import type { LandingDemoDesign } from "@/components/landing/landingDemoDesigns";
import {
  logoColorModeFromTextOnBrand,
  useBrandRecoloredIllustration,
} from "@/components/landing/useLandingBrandAssets";
import { createLandingDemoState } from "@/lib/social-tool/landingShuffle";
import { getPlatform } from "@/lib/social-tool/presets";

type Props = {
  design: LandingDemoDesign;
  /** Upper bound for CSS scale (default 0.88). */
  maxScale?: number;
  /** Lower bound for CSS scale (default 0.58). */
  minScale?: number;
  className?: string;
};

export function LandingCanvasPreview({
  design,
  maxScale = 0.88,
  minScale = 0.58,
  className = "",
}: Props) {
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

  const stageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(minScale);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const width = stage.clientWidth;
      if (width <= 0) return;
      const fit = width / platform.width;
      // Never scale above container width — minScale is a hint only when there is room.
      setPreviewScale(Math.min(maxScale, fit));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [maxScale, platform.width]);

  const shellStyle = useMemo(
    () => ({
      width: platform.width * previewScale,
      height: platform.height * previewScale,
    }),
    [platform.height, platform.width, previewScale],
  );

  return (
    <div
      ref={stageRef}
      className={`pf-canvas-preview ${className}`.trim()}
    >
      <div className="pf-canvas-preview-shell" style={shellStyle}>
        <div
          className="pf-canvas-preview-scale"
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
  );
}

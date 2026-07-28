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
import type { LandingDemoState } from "@/lib/social-tool/landingShuffle";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import { getPlatform } from "@/lib/social-tool/presets";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";

type Props = {
  design: LandingDemoDesign;
  /** Live demo state — when set, canvas reacts to shuffle / spacing edits. */
  demo?: LandingDemoState;
  onDemoChange?: (patch: Partial<LandingDemoState>) => void;
  /** Upper bound for CSS scale (default 0.88). */
  maxScale?: number;
  /** Lower bound for CSS scale (default 0.58). */
  minScale?: number;
  /** Cap shell width/height (px) so square artboards are not squashed by CSS max-width. */
  maxShellPx?: number;
  className?: string;
  interactive?: boolean;
  showSpacingControls?: boolean;
  spacing?: PostLayoutSpacing;
  onSpacingChange?: (spacing: PostLayoutSpacing) => void;
  showShuffleFlash?: boolean;
};

export function LandingCanvasPreview({
  design,
  demo: demoOverride,
  onDemoChange,
  maxScale = 0.88,
  minScale = 0.58,
  maxShellPx,
  className = "",
  interactive = false,
  showSpacingControls = false,
  spacing = DEFAULT_POST_LAYOUT_SPACING,
  onSpacingChange,
  showShuffleFlash = false,
}: Props) {
  const brand = getLandingBrand(design.brandId);
  const platform = getPlatform(design.platformId);
  const seededDemo = useMemo(
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
  const demo = demoOverride ?? seededDemo;
  const illustrationMarkup = useBrandRecoloredIllustration(
    demo.illustrationSrc,
    brand,
  );
  const featuredTransform = useMemo(
    () => ({
      ...DEFAULT_FEATURED_TRANSFORM,
      ...design.featuredTransform,
    }),
    [design.featuredTransform],
  );
  const logoColorMode = logoColorModeFromTextOnBrand(
    demo.backgroundCss.textOnBrand,
  );
  const logoInvert =
    !brand.usesExplicitColors && logoColorMode === "light";

  const stageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(minScale);
  const [canvasSelection, setCanvasSelection] =
    useState<CanvasSelectionId | null>(null);

  useEffect(() => {
    setCanvasSelection(null);
  }, [design.id]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateScale = () => {
      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;
      if (stageWidth <= 0 || stageHeight <= 0) return;

      let fit = Math.min(
        stageWidth / platform.width,
        stageHeight / platform.height,
      );
      if (maxShellPx != null && maxShellPx > 0) {
        fit = Math.min(
          fit,
          maxShellPx / platform.width,
          maxShellPx / platform.height,
        );
      }
      // Never scale above container — minScale is a hint only when there is room.
      setPreviewScale(Math.min(maxScale, fit));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [maxScale, maxShellPx, platform.height, platform.width]);

  const shellStyle = useMemo(
    () =>
      ({
        width: platform.width * previewScale,
        height: platform.height * previewScale,
        "--pf-canvas-aspect": `${platform.width} / ${platform.height}`,
      }) as React.CSSProperties,
    [platform.height, platform.width, previewScale],
  );

  return (
    <div
      ref={stageRef}
      className={`pf-canvas-preview ${className}`.trim()}
    >
      <div className="pf-canvas-preview-shell" style={shellStyle}>
        {showShuffleFlash ? (
          <span className="pf-tool-shuffle-flash" aria-hidden />
        ) : null}
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
            onTypeScaleChange={
              onDemoChange
                ? (typeScale) => onDemoChange({ typeScale })
                : undefined
            }
            logoScale={Math.max(demo.logoScale, 1.35)}
            onLogoScaleChange={
              onDemoChange
                ? (logoScale) => onDemoChange({ logoScale })
                : undefined
            }
            logoAlign={demo.logoAlign}
            logoPlacement={demo.logoPlacement}
            textAlign={demo.textAlign}
            onTextAlignChange={
              onDemoChange
                ? (textAlign) => onDemoChange({ textAlign })
                : undefined
            }
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
            featuredTransform={featuredTransform}
            previewScale={previewScale}
            interactive={interactive}
            showSpacingControls={showSpacingControls}
            spacing={spacing}
            onSpacingChange={onSpacingChange}
            showPropertyPills={interactive}
            canvasSelection={interactive ? canvasSelection : null}
            onCanvasSelect={interactive ? setCanvasSelection : undefined}
          />
        </div>
      </div>
    </div>
  );
}

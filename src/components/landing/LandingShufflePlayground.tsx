"use client";

import { useMemo, useState } from "react";
import { Shuffle } from "lucide-react";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import "@/components/social-tool/social-tool.css";
import {
  getLandingBrand,
  LANDING_BRANDS,
  type LandingBrandId,
} from "@/components/landing/landingBrands";
import {
  logoColorModeFromTextOnBrand,
  useBrandRecoloredIllustration,
} from "@/components/landing/useLandingBrandAssets";
import {
  createLandingDemoState,
  shuffleLandingDemo,
  type LandingDemoState,
} from "@/lib/social-tool/landingShuffle";
import { getPlatform } from "@/lib/social-tool/presets";

type Props = {
  /** Compact chrome for hero embed */
  compact?: boolean;
  className?: string;
  initialBrandId?: LandingBrandId;
};

export function LandingShufflePlayground({
  compact = false,
  className = "",
  initialBrandId = "claude",
}: Props) {
  const [brandId, setBrandId] = useState<LandingBrandId>(initialBrandId);
  const brand = getLandingBrand(brandId);
  const [demo, setDemo] = useState<LandingDemoState>(() =>
    createLandingDemoState(initialBrandId, getLandingBrand(initialBrandId).colors),
  );

  const platform = getPlatform(demo.platformId);
  /** Fit the full square in the hero column without cropping. */
  const previewScale = compact ? 0.42 : 0.48;
  const illustrationMarkup = useBrandRecoloredIllustration(
    demo.illustrationSrc,
    brand,
  );
  const logoColorMode = logoColorModeFromTextOnBrand(
    demo.backgroundCss.textOnBrand,
  );
  const logoInvert =
    !brand.usesExplicitColors && logoColorMode === "light";

  function selectBrand(id: LandingBrandId) {
    const next = getLandingBrand(id);
    setBrandId(id);
    setDemo(
      createLandingDemoState(id, next.colors, {
        layoutId: demo.layoutId,
        platformId: demo.platformId,
        showFeaturedImage: true,
      }),
    );
  }

  function handleShuffle() {
    setDemo((prev) => shuffleLandingDemo(brandId, prev, brand.colors));
  }

  const canvasStyle = useMemo(
    () => ({
      width: platform.width * previewScale,
      height: platform.height * previewScale,
    }),
    [platform.height, platform.width, previewScale],
  );

  return (
    <div className={`pf-playground ${compact ? "pf-playground-compact" : ""} ${className}`.trim()}>
      <div className="pf-playground-stage">
        <div className="pf-playground-canvas-shell" style={canvasStyle}>
          <div
            className="pf-playground-canvas-scale"
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

      <div className="pf-playground-controls">
        <div className="pf-brand-chips" role="listbox" aria-label="Demo brand">
          {LANDING_BRANDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={b.id === brandId}
              className={`pf-brand-chip${b.id === brandId ? " is-active" : ""}`}
              onClick={() => selectBrand(b.id)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.logoSrc} alt="" width={18} height={18} />
              <span>{b.name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pf-btn pf-btn-accent pf-btn-sm"
          onClick={handleShuffle}
          aria-label="Shuffle layout, background, pattern, and copy"
        >
          <Shuffle className="size-3.5" strokeWidth={2.25} aria-hidden />
          Shuffle
        </button>
      </div>
    </div>
  );
}

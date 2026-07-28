"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LandingEditorShell } from "@/components/landing/LandingEditorShell";
import { LandingProductFrame } from "@/components/landing/LandingProductFrame";
import { LandingCanvasPreview } from "@/components/landing/LandingCanvasPreview";
import { getGoldenDesign } from "@/lib/landing/goldenDesigns";
import type { LandingDemoDesign } from "@/components/landing/landingDemoDesigns";
import type { LandingEditorHighlight } from "@/components/landing/LandingEditorShell";
import { getLandingBrand, type LandingBrandId } from "@/components/landing/landingBrands";
import {
  createLandingDemoState,
  shuffleLandingDemo,
  type LandingDemoState,
} from "@/lib/social-tool/landingShuffle";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";

type Props = {
  designId: string;
  brandId: LandingBrandId;
  highlight?: LandingEditorHighlight;
  asideTab?: "design" | "chat";
  chatVisible?: number;
  /** Keep sidebar open when highlighting brand panel */
  defaultAsideCollapsed?: boolean;
};

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

export function LandingFeatureEditorPreview({
  designId,
  brandId,
  highlight = {},
  asideTab = "design",
  chatVisible = 0,
  defaultAsideCollapsed,
}: Props) {
  const design = getGoldenDesign(designId);
  const brand = getLandingBrand(brandId);
  const [demo, setDemo] = useState<LandingDemoState | null>(null);
  const [spacing, setSpacing] = useState<PostLayoutSpacing>(
    DEFAULT_POST_LAYOUT_SPACING,
  );
  const [spacingActive, setSpacingActive] = useState(false);
  const [contrastActive, setContrastActive] = useState(false);
  const [shuffleFlash, setShuffleFlash] = useState(false);

  useEffect(() => {
    if (!design) return;
    setDemo(demoFromDesign(design, brand.colors));
    setSpacing(DEFAULT_POST_LAYOUT_SPACING);
    setSpacingActive(false);
    setContrastActive(false);
  }, [brand.colors, design, designId]);

  const handleShuffle = useCallback(() => {
    setDemo((prev) =>
      prev ? shuffleLandingDemo(brandId, prev, brand.colors) : prev,
    );
    setShuffleFlash(true);
    window.setTimeout(() => setShuffleFlash(false), 650);
  }, [brand.colors, brandId]);

  const shellHighlight = useMemo(
    (): LandingEditorHighlight => ({
      brand: highlight.brand,
      export: highlight.export,
      shuffle: shuffleFlash,
      spacing: spacingActive,
    }),
    [highlight.brand, highlight.export, shuffleFlash, spacingActive],
  );

  if (!design || !demo) return null;

  return (
    <LandingProductFrame className="pf-chapter-tool">
      <LandingEditorShell
        brandId={brandId}
        platformId={design.platformId}
        asideTab={asideTab}
        chatVisible={chatVisible}
        highlight={shellHighlight}
        headerSkeleton
        defaultAsideCollapsed={defaultAsideCollapsed ?? true}
        onShuffle={handleShuffle}
        spacingActive={spacingActive}
        onToggleSpacing={() => setSpacingActive((on) => !on)}
        contrastActive={contrastActive}
        onToggleContrast={() => setContrastActive((on) => !on)}
        canvas={
          <LandingCanvasPreview
            design={design}
            demo={demo}
            onDemoChange={(patch) =>
              setDemo((prev) => (prev ? { ...prev, ...patch } : prev))
            }
            maxScale={0.96}
            minScale={0.52}
            className="pf-chapter-canvas"
            interactive
            showSpacingControls={spacingActive}
            spacing={spacing}
            onSpacingChange={setSpacing}
            showShuffleFlash={shuffleFlash}
          />
        }
      />
    </LandingProductFrame>
  );
}

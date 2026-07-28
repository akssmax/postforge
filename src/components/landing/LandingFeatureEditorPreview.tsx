"use client";

import { LandingEditorShell } from "@/components/landing/LandingEditorShell";
import { LandingProductFrame } from "@/components/landing/LandingProductFrame";
import { LandingCanvasPreview } from "@/components/landing/LandingCanvasPreview";
import { getGoldenDesign } from "@/lib/landing/goldenDesigns";
import type { LandingEditorHighlight } from "@/components/landing/LandingEditorShell";
import type { LandingBrandId } from "@/components/landing/landingBrands";

type Props = {
  designId: string;
  brandId: LandingBrandId;
  highlight?: LandingEditorHighlight;
  asideTab?: "design" | "chat";
  chatVisible?: number;
  /** Keep sidebar open when highlighting brand panel */
  defaultAsideCollapsed?: boolean;
};

export function LandingFeatureEditorPreview({
  designId,
  brandId,
  highlight = {},
  asideTab = "design",
  chatVisible = 0,
  defaultAsideCollapsed,
}: Props) {
  const design = getGoldenDesign(designId);
  if (!design) return null;

  return (
    <LandingProductFrame>
      <LandingEditorShell
        brandId={brandId}
        platformId={design.platformId}
        asideTab={asideTab}
        chatVisible={chatVisible}
        highlight={highlight}
        defaultAsideCollapsed={
          defaultAsideCollapsed ?? true
        }
        canvas={
          <LandingCanvasPreview
            design={design}
            maxScale={0.68}
            minScale={0.48}
          />
        }
      />
    </LandingProductFrame>
  );
}

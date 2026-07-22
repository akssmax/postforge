"use client";

import {
  Ban,
  CircleDashed,
  Hexagon,
  PanelsTopLeft,
  Shapes,
} from "lucide-react";
import { Switch } from "@heroui/react";
import { BrandPanel } from "@/components/social-tool/BrandPanel";
import { BriefChatPanel } from "@/components/social-tool/BriefChatPanel";
import { ContentPanel } from "@/components/social-tool/ContentPanel";
import { DesignEmptyState } from "@/components/social-tool/DesignEmptyState";
import { FeaturedBlockPanel } from "@/components/social-tool/FeaturedBlockPanel";
import {
  InspectorSegment,
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import type { UseBrandKitReturn } from "@/lib/brand/useBrandKit";
import type { UseFeaturedBlockReturn } from "@/lib/social-tool/useFeaturedBlock";
import type { DesignDocument, DesignOnboardingPhase } from "@/lib/design/types";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import {
  PATTERN_OPTIONS,
  type LogoAlign,
  type LogoPlacement,
  type PatternId,
  type PlatformId,
  type PostCopy,
  type SocialFontId,
  type TextAlign,
} from "@/lib/social-tool/presets";

const PATTERN_ICONS = {
  monogram: Hexagon,
  "monogram-soft": CircleDashed,
  footer: PanelsTopLeft,
  outline: Shapes,
  none: Ban,
} as const;

type BrandPanelProps = Pick<
  UseBrandKitReturn,
  | "kit"
  | "uploading"
  | "error"
  | "uploadLogo"
  | "removeLogo"
  | "setColor"
  | "resetColor"
  | "applySwatch"
  | "solidBackgroundPresets"
  | "gradientBackgroundPresets"
  | "activeBackground"
  | "harmonySwatches"
  | "setBackgroundPreset"
>;

type FeaturedPanelProps = Pick<
  UseFeaturedBlockReturn,
  | "mode"
  | "setMode"
  | "productPage"
  | "setProductPage"
  | "image"
  | "imageSrc"
  | "uploading"
  | "error"
  | "uploadImage"
  | "removeImage"
>;

type Props = {
  phase: DesignOnboardingPhase;
  platformId: PlatformId;
  inspectorSelection: CanvasSelectionId | null;
  showContent: boolean;
  onShowContentChange: (value: boolean) => void;
  copy: PostCopy;
  onUpdateField: <K extends keyof PostCopy>(key: K, value: PostCopy[K]) => void;
  onAddExtraField: () => void;
  onRemoveExtraField: (id: string) => void;
  onUpdateExtraField: (id: string, value: string) => void;
  textAlign: TextAlign;
  onTextAlignChange: (value: TextAlign) => void;
  headingFont: SocialFontId;
  onHeadingFontChange: (value: SocialFontId) => void;
  subFont: SocialFontId;
  onSubFontChange: (value: SocialFontId) => void;
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
  showBrand: boolean;
  onShowBrandChange: (value: boolean) => void;
  logoScale: number;
  onLogoScaleChange: (value: number) => void;
  logoPlacement: LogoPlacement;
  onLogoPlacementChange: (value: LogoPlacement) => void;
  logoAlign: LogoAlign;
  onLogoAlignChange: (value: LogoAlign) => void;
  showFeaturedImage: boolean;
  onShowFeaturedImageChange: (value: boolean) => void;
  featuredTransform: FeaturedImageTransform;
  onFeaturedTransformChange: (value: FeaturedImageTransform) => void;
  pattern: PatternId;
  onPatternChange: (value: PatternId) => void;
  showPattern: boolean;
  onShowPatternChange: (value: boolean) => void;
  patternOpacity: number;
  onPatternOpacityChange: (value: number) => void;
  patternScale: number;
  onPatternScaleChange: (value: number) => void;
  patternAnimated: boolean;
  onPatternAnimatedChange: (value: boolean) => void;
  brand: BrandPanelProps;
  featured: FeaturedPanelProps;
  onBriefGenerate: (patch: Partial<DesignDocument>) => void;
  onBriefSkip: () => void;
};

function PatternSection({
  pattern,
  onPatternChange,
  showPattern,
  onShowPatternChange,
  patternOpacity,
  onPatternOpacityChange,
  patternScale,
  onPatternScaleChange,
  patternAnimated,
  onPatternAnimatedChange,
}: Pick<
  Props,
  | "pattern"
  | "onPatternChange"
  | "showPattern"
  | "onShowPatternChange"
  | "patternOpacity"
  | "onPatternOpacityChange"
  | "patternScale"
  | "onPatternScaleChange"
  | "patternAnimated"
  | "onPatternAnimatedChange"
>) {
  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Pattern</p>
        <Switch
          size="sm"
          isSelected={showPattern}
          onChange={onShowPatternChange}
          aria-label="Show pattern"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      {showPattern ? (
        <>
          <InspectorSegment
            aria-label="Background pattern"
            value={pattern}
            onChange={(v) => onPatternChange(v as PatternId)}
            options={PATTERN_OPTIONS.map((p) => ({
              id: p.id,
              label: p.label,
              icon: PATTERN_ICONS[p.id],
            }))}
          />
          {pattern !== "none" ? (
            <>
              <InspectorSlider
                label="Opacity"
                value={patternOpacity}
                onChange={onPatternOpacityChange}
                min={0.05}
                max={1}
                step={0.01}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <InspectorSlider
                label="Scale"
                value={patternScale}
                onChange={onPatternScaleChange}
                min={0.5}
                max={2}
                step={0.05}
                format={(v) =>
                  `${v.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`
                }
              />
              <div className="social-tool-row">
                <span className="social-tool-row-label">Animation</span>
                <Switch
                  size="sm"
                  isSelected={patternAnimated}
                  onChange={onPatternAnimatedChange}
                  aria-label="Pattern animation"
                >
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function InspectorEmptyState() {
  return (
    <section className="social-tool-section flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-text-primary">Select an element</p>
      <p className="mt-2 max-w-[240px] text-xs leading-5 text-text-tertiary">
        Click copy, logo, featured image, or pattern on the canvas to edit its properties.
      </p>
    </section>
  );
}

export function DesignInspector(props: Props) {
  const { phase, inspectorSelection, brand, featured } = props;

  if (phase === "needsLogo") {
    return (
      <DesignEmptyState
        onUpload={brand.uploadLogo}
        uploading={brand.uploading}
        error={brand.error}
      />
    );
  }

  if (phase === "needsBrief") {
    return (
      <>
        <BrandPanel
          {...brand}
          showBrand={props.showBrand}
          onShowBrandChange={props.onShowBrandChange}
          logoScale={props.logoScale}
          onLogoScaleChange={props.onLogoScaleChange}
          logoPlacement={props.logoPlacement}
          onLogoPlacementChange={props.onLogoPlacementChange}
          logoAlign={props.logoAlign}
          onLogoAlignChange={props.onLogoAlignChange}
        />
        <BriefChatPanel
          platformId={props.platformId}
          onGenerate={props.onBriefGenerate}
          onSkip={props.onBriefSkip}
        />
      </>
    );
  }

  if (inspectorSelection === null) {
    return <InspectorEmptyState />;
  }

  if (inspectorSelection === "copy") {
    return (
      <ContentPanel
        showContent={props.showContent}
        onShowContentChange={props.onShowContentChange}
        copy={props.copy}
        onUpdateField={props.onUpdateField}
        onAddExtraField={props.onAddExtraField}
        onRemoveExtraField={props.onRemoveExtraField}
        onUpdateExtraField={props.onUpdateExtraField}
        textAlign={props.textAlign}
        onTextAlignChange={props.onTextAlignChange}
        headingFont={props.headingFont}
        onHeadingFontChange={props.onHeadingFontChange}
        subFont={props.subFont}
        onSubFontChange={props.onSubFontChange}
        typeScale={props.typeScale}
        onTypeScaleChange={props.onTypeScaleChange}
      />
    );
  }

  if (inspectorSelection === "logo") {
    return (
      <BrandPanel
        {...brand}
        showBrand={props.showBrand}
        onShowBrandChange={props.onShowBrandChange}
        logoScale={props.logoScale}
        onLogoScaleChange={props.onLogoScaleChange}
        logoPlacement={props.logoPlacement}
        onLogoPlacementChange={props.onLogoPlacementChange}
        logoAlign={props.logoAlign}
        onLogoAlignChange={props.onLogoAlignChange}
      />
    );
  }

  if (inspectorSelection === "featured") {
    return (
      <FeaturedBlockPanel
        showFeaturedBlock={props.showFeaturedImage}
        onShowFeaturedBlockChange={props.onShowFeaturedImageChange}
        mode={featured.mode}
        setMode={featured.setMode}
        productPage={featured.productPage}
        setProductPage={featured.setProductPage}
        image={featured.image}
        imageSrc={featured.imageSrc}
        uploading={featured.uploading}
        error={featured.error}
        uploadImage={featured.uploadImage}
        removeImage={featured.removeImage}
        featuredTransform={props.featuredTransform}
        onFeaturedTransformChange={props.onFeaturedTransformChange}
      />
    );
  }

  if (inspectorSelection === "pattern") {
    return <PatternSection {...props} />;
  }

  return null;
}

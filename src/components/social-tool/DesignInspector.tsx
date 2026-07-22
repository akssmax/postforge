"use client";

import { Switch } from "@heroui/react";
import { BrandPanel } from "@/components/social-tool/BrandPanel";
import { BrandBackgroundPicker } from "@/components/social-tool/BrandBackgroundPicker";
import { BriefChatPanel } from "@/components/social-tool/BriefChatPanel";
import { ContentPanel } from "@/components/social-tool/ContentPanel";
import { DesignEmptyState } from "@/components/social-tool/DesignEmptyState";
import { FeaturedBlockPanel } from "@/components/social-tool/FeaturedBlockPanel";
import {
  isPatternNone,
  PatternLibraryPicker,
} from "@/components/social-tool/PatternLibraryPicker";
import { InspectorSlider } from "@/components/social-tool/InspectorControls";
import type { UseBrandKitReturn } from "@/lib/brand/useBrandKit";
import type { UseFeaturedBlockReturn } from "@/lib/social-tool/useFeaturedBlock";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { DesignOnboardingPhase } from "@/lib/design/types";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import {
  type LogoAlign,
  type LogoPlacement,
  type PlatformId,
  type PostCopy,
  type SocialFontId,
  type TextAlign,
} from "@/lib/social-tool/presets";

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
  pattern: PatternRef;
  onPatternChange: (value: PatternRef) => void;
  patternTint?: string;
  designId?: string;
  showPattern: boolean;
  onShowPatternChange: (value: boolean) => void;
  showBackground: boolean;
  onShowBackgroundChange: (value: boolean) => void;
  patternOpacity: number;
  onPatternOpacityChange: (value: number) => void;
  patternScale: number;
  onPatternScaleChange: (value: number) => void;
  patternAnimated: boolean;
  onPatternAnimatedChange: (value: boolean) => void;
  brand: BrandPanelProps;
  featured: FeaturedPanelProps;
  onBriefGenerate: (result: BriefGenerationResult) => void;
  onBriefSkip: () => void;
};

function PatternSection({
  pattern,
  onPatternChange,
  patternTint,
  designId,
  showPattern,
  onShowPatternChange,
  patternOpacity,
  onPatternOpacityChange,
  patternScale,
  onPatternScaleChange,
  patternAnimated,
  onPatternAnimatedChange,
  brand,
}: Pick<
  Props,
  | "pattern"
  | "onPatternChange"
  | "patternTint"
  | "designId"
  | "showPattern"
  | "onShowPatternChange"
  | "patternOpacity"
  | "onPatternOpacityChange"
  | "patternScale"
  | "onPatternScaleChange"
  | "patternAnimated"
  | "onPatternAnimatedChange"
  | "brand"
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
          <PatternLibraryPicker
            pattern={pattern}
            onPatternChange={onPatternChange}
            patternTint={patternTint}
            designId={designId}
            logoSvgMarkup={brand.kit.logo?.svgMarkup ?? null}
            logoMime={brand.kit.logo?.mime ?? null}
          />
          {!isPatternNone(pattern) ? (
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

function BlockPanelsOverview(props: Props) {
  return (
    <FeaturedBlockPanel
      showFeaturedBlock={props.showFeaturedImage}
      onShowFeaturedBlockChange={props.onShowFeaturedImageChange}
      mode={props.featured.mode}
      setMode={props.featured.setMode}
      productPage={props.featured.productPage}
      setProductPage={props.featured.setProductPage}
      image={props.featured.image}
      imageSrc={props.featured.imageSrc}
      uploading={props.featured.uploading}
      error={props.featured.error}
      uploadImage={props.featured.uploadImage}
      removeImage={props.featured.removeImage}
      featuredTransform={props.featuredTransform}
      onFeaturedTransformChange={props.onFeaturedTransformChange}
    />
  );
}

function BackgroundSection({
  brand,
  showBackground,
  onShowBackgroundChange,
}: {
  brand: BrandPanelProps;
  showBackground: boolean;
  onShowBackgroundChange: (value: boolean) => void;
}) {
  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Background</p>
        <Switch
          size="sm"
          isSelected={showBackground}
          onChange={onShowBackgroundChange}
          aria-label="Show background"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      {showBackground ? (
        <BrandBackgroundPicker
          activeBackground={brand.activeBackground}
          solidPresets={brand.solidBackgroundPresets}
          gradientPresets={brand.gradientBackgroundPresets}
          onSelect={brand.setBackgroundPreset}
        />
      ) : null}
    </section>
  );
}

/** Canvas-level controls — always visible once logo onboarding is done */
function FixedCanvasPanels(props: Props) {
  return (
    <>
      <BackgroundSection
        brand={props.brand}
        showBackground={props.showBackground}
        onShowBackgroundChange={props.onShowBackgroundChange}
      />
      <PatternSection {...props} />
    </>
  );
}

function InspectorOverview(props: Props) {
  return (
    <>
      <BlockPanelsOverview {...props} />
      <FixedCanvasPanels {...props} />
    </>
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
        <BlockPanelsOverview {...props} />
        <FixedCanvasPanels {...props} />
      </>
    );
  }

  if (inspectorSelection === null || inspectorSelection === "pattern") {
    return <InspectorOverview {...props} />;
  }

  if (inspectorSelection === "copy") {
    return (
      <>
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
        <FixedCanvasPanels {...props} />
      </>
    );
  }

  if (inspectorSelection === "logo") {
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
        <FixedCanvasPanels {...props} />
      </>
    );
  }

  if (inspectorSelection === "featured") {
    return (
      <>
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
        <FixedCanvasPanels {...props} />
      </>
    );
  }

  return null;
}

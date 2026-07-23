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
import { getMonogramMarkup } from "@/lib/brand/logoVariants";
import type { UseBrandKitReturn } from "@/lib/brand/useBrandKit";
import type { UseFeaturedBlockReturn } from "@/lib/social-tool/useFeaturedBlock";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { BriefChatState } from "@/lib/llm/useBriefChat";
import type { DesignOnboardingPhase } from "@/lib/design/types";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import { canvasSelectionKind } from "@/lib/social-tool/canvasSelection";
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
  | "uploadLogoVariant"
  | "removeLogoVariant"
  | "setColor"
  | "resetColor"
  | "applySwatch"
  | "solidBackgroundPresets"
  | "gradientBackgroundPresets"
  | "activeBackground"
  | "harmonySwatches"
  | "setBackgroundPreset"
>;

type FeaturedPanelProps = {
  mode: import("@/lib/social-tool/featuredBlock").FeaturedBlockMode;
  visualBlocks: import("@/lib/social-tool/visualBlocks/types").VisualBlockRecord[];
  activeBlockId?: string | null;
  generatingVisualBlocks?: boolean;
  featuredVisualKind?: "ui" | "illustration";
  brandColors?: { primary?: string; accent?: string };
  onGenerateVisualBlocks: (
    source?: "library" | "generate",
    options?: { pickFeatured?: boolean; preferredKind?: "ui" | "illustration" },
  ) => void;
  onSelectVisualBlock: (blockId: string) => void;
  image: import("@/lib/social-tool/featuredBlock").FeaturedImageRecord | null;
  imageSrc: string | null;
  uploading: boolean;
  error: string | null;
  onUploadImage: (file: File) => Promise<void>;
  onRemoveImage: () => Promise<void>;
};

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
  onBriefApplyPlan: (plan: ValidatedDesignPlan) => void;
  onBriefSkip: () => void;
  briefChat?: BriefChatState;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
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
            logoSvgMarkup={getMonogramMarkup(brand.kit) ?? brand.kit.logo?.svgMarkup ?? null}
            logoMime={
              brand.kit.logos?.monogram?.mime ??
              brand.kit.logo?.mime ??
              null
            }
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
                max={4}
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
      visualBlocks={props.featured.visualBlocks}
      activeBlockId={props.featured.activeBlockId}
      generatingVisualBlocks={props.featured.generatingVisualBlocks}
      featuredVisualKind={props.featured.featuredVisualKind}
      brandColors={props.featured.brandColors}
      onGenerateVisualBlocks={props.featured.onGenerateVisualBlocks}
      onSelectVisualBlock={props.featured.onSelectVisualBlock}
      image={props.featured.image}
      imageSrc={props.featured.imageSrc}
      uploading={props.featured.uploading}
      error={props.featured.error}
      onUploadImage={props.featured.onUploadImage}
      onRemoveImage={props.featured.onRemoveImage}
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
function FixedCanvasPanels(
  props: Props & {
    /** When a canvas element is selected, keep background only to reduce scroll */
    compact?: boolean;
  },
) {
  return (
    <>
      <BackgroundSection
        brand={props.brand}
        showBackground={props.showBackground}
        onShowBackgroundChange={props.onShowBackgroundChange}
      />
      {props.compact ? null : <PatternSection {...props} />}
    </>
  );
}

function BrandInspectorSection(
  props: Pick<
    Props,
    | "brand"
    | "showBrand"
    | "onShowBrandChange"
    | "logoScale"
    | "onLogoScaleChange"
    | "logoPlacement"
    | "onLogoPlacementChange"
    | "logoAlign"
    | "onLogoAlignChange"
  > & {
    defaultExpanded?: boolean;
  },
) {
  return (
    <BrandPanel
      {...props.brand}
      showBrand={props.showBrand}
      onShowBrandChange={props.onShowBrandChange}
      logoScale={props.logoScale}
      onLogoScaleChange={props.onLogoScaleChange}
      logoPlacement={props.logoPlacement}
      onLogoPlacementChange={props.onLogoPlacementChange}
      logoAlign={props.logoAlign}
      onLogoAlignChange={props.onLogoAlignChange}
      defaultExpanded={props.defaultExpanded}
    />
  );
}

function InspectorOverview(props: Props) {
  return (
    <>
      <BrandInspectorSection {...props} defaultExpanded={false} />
      <FixedCanvasPanels {...props} />
      <BlockPanelsOverview {...props} />
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
    if (!props.briefChat) return null;

    return (
      <>
        <BrandInspectorSection {...props} defaultExpanded={false} />
        <BriefChatPanel
          {...props.briefChat}
          onSkip={props.onBriefSkip}
          autoFocus
        />
        <FixedCanvasPanels {...props} />
        <BlockPanelsOverview {...props} />
      </>
    );
  }

  if (inspectorSelection === null || inspectorSelection === "pattern") {
    return <InspectorOverview {...props} />;
  }

  const selectionKind = canvasSelectionKind(inspectorSelection);

  if (selectionKind === "copy") {
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
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  if (selectionKind === "logo") {
    return (
      <>
        <BrandInspectorSection {...props} defaultExpanded />
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  if (selectionKind === "featured") {
    return (
      <>
        <FeaturedBlockPanel
          showFeaturedBlock={props.showFeaturedImage}
          onShowFeaturedBlockChange={props.onShowFeaturedImageChange}
          mode={featured.mode}
          visualBlocks={featured.visualBlocks}
          activeBlockId={featured.activeBlockId}
          generatingVisualBlocks={featured.generatingVisualBlocks}
          featuredVisualKind={featured.featuredVisualKind}
          brandColors={featured.brandColors}
          onGenerateVisualBlocks={featured.onGenerateVisualBlocks}
          onSelectVisualBlock={featured.onSelectVisualBlock}
          image={featured.image}
          imageSrc={featured.imageSrc}
          uploading={featured.uploading}
          error={featured.error}
          onUploadImage={featured.onUploadImage}
          onRemoveImage={featured.onRemoveImage}
          featuredTransform={props.featuredTransform}
          onFeaturedTransformChange={props.onFeaturedTransformChange}
        />
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  return null;
}

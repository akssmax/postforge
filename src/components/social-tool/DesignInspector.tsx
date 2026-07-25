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
import {
  InspectorSlider,
  InspectorTextSegment,
} from "@/components/social-tool/InspectorControls";
import { Button, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { getMonogramOnlyMarkup } from "@/lib/brand/logoVariants";
import { ASIDE_PANEL_TOGGLE_LAYOUT_ID } from "@/components/social-tool/asidePanelMotion";
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

export type AsideTab = "chat" | "design";

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
  featuredVisualKind?: "ui" | "illustration" | "3d";
  brandColors?: { primary?: string; accent?: string };
  selectedSlotId?: string;
  featuredSlotIds?: string[];
  onSelectFeaturedSlot?: (slotId: string) => void;
  onGenerateVisualBlocks: (
    source?: "library" | "generate",
    options?: {
      pickFeatured?: boolean;
      preferredKind?: "ui" | "illustration" | "3d";
      slotId?: string;
    },
  ) => void;
  onShuffleVisualBlock: (
    preferredKind?: "ui" | "illustration" | "3d",
    slotId?: string,
  ) => void;
  onSelectVisualBlock: (blockId: string, slotId?: string) => void;
  image: import("@/lib/social-tool/featuredBlock").FeaturedImageRecord | null;
  imageSrc: string | null;
  uploading: boolean;
  error: string | null;
  onUploadImage: (file: File, slotId?: string) => Promise<void>;
  onRemoveImage: (slotId?: string) => Promise<void>;
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
  /** Ready-phase Chat | Design tab (design sessions with briefChat only). */
  asideTab?: AsideTab;
  onAsideTabChange?: (tab: AsideTab) => void;
  onCollapseAside?: () => void;
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
            logoSvgMarkup={getMonogramOnlyMarkup(brand.kit)}
            logoMime={brand.kit.logos?.monogram?.mime ?? null}
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
      selectedSlotId={props.featured.selectedSlotId}
      featuredSlotIds={props.featured.featuredSlotIds}
      onSelectFeaturedSlot={props.featured.onSelectFeaturedSlot}
      onGenerateVisualBlocks={props.featured.onGenerateVisualBlocks}
      onShuffleVisualBlock={props.featured.onShuffleVisualBlock}
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

function ReadyDesignPanels(props: Props) {
  const { inspectorSelection, featured } = props;

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
          selectedSlotId={featured.selectedSlotId}
          featuredSlotIds={featured.featuredSlotIds}
          onSelectFeaturedSlot={featured.onSelectFeaturedSlot}
          onGenerateVisualBlocks={featured.onGenerateVisualBlocks}
          onShuffleVisualBlock={featured.onShuffleVisualBlock}
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

function UnifiedAsideShell(props: Props) {
  const asideTab = props.asideTab ?? "chat";
  const onAsideTabChange = props.onAsideTabChange;

  if (!props.briefChat || !onAsideTabChange) {
    return <ReadyDesignPanels {...props} />;
  }

  return (
    <div className="social-tool-aside-unified flex min-h-0 flex-1 flex-col">
      <header className="social-tool-aside-tabs">
        <InspectorTextSegment
          aria-label="Sidebar mode"
          value={asideTab}
          onChange={(value) => onAsideTabChange(value as AsideTab)}
          options={[
            { id: "design", label: "Design" },
            { id: "chat", label: "Chat" },
          ]}
          className="social-tool-aside-tabs__segment min-w-0 flex-1"
        />
        {props.onCollapseAside ? (
          <motion.div
            layoutId={ASIDE_PANEL_TOGGLE_LAYOUT_ID}
            className="shrink-0"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  aria-label="Hide sidebar"
                  className="social-tool-aside-collapse-btn size-9 shrink-0"
                  onPress={props.onCollapseAside}
                >
                  <PanelLeftClose className="size-4" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom" offset={8}>
                <p className="layout-shuffle-tooltip-title">Hide sidebar</p>
                <p className="layout-shuffle-tooltip-body">
                  Expand the canvas to full width
                </p>
              </Tooltip.Content>
            </Tooltip>
          </motion.div>
        ) : null}
      </header>
      {asideTab === "chat" ? (
        <BriefChatPanel {...props.briefChat} mode="follow-up" autoFocus />
      ) : (
        <div className="social-tool-aside-design min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <ReadyDesignPanels {...props} />
        </div>
      )}
    </div>
  );
}

export function DesignInspector(props: Props) {
  const { phase, brand } = props;

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
      <div className="flex min-h-0 flex-1 flex-col">
        <BrandInspectorSection {...props} defaultExpanded={false} />
        <BriefChatPanel
          {...props.briefChat}
          mode="onboarding"
          onSkip={props.onBriefSkip}
          autoFocus
        />
        {/* Background, pattern, and visual slot controls appear after the brief generates. */}
      </div>
    );
  }

  if (props.briefChat && props.onAsideTabChange) {
    return <UnifiedAsideShell {...props} />;
  }

  return <ReadyDesignPanels {...props} />;
}

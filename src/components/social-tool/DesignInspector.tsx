"use client";

import type { ReactNode } from "react";
import { Switch } from "@heroui/react";
import { BrandPanel } from "@/components/social-tool/BrandPanel";
import { BrandBackgroundPicker } from "@/components/social-tool/BrandBackgroundPicker";
import { BriefChatPanel } from "@/components/social-tool/BriefChatPanel";
import { ContentPanel } from "@/components/social-tool/ContentPanel";
import type { EditableTextSlot } from "@/lib/social-tool/layoutAdapter";
import { legacyEditableSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";
import { DesignEmptyState } from "@/components/social-tool/DesignEmptyState";
import { CanvasInspectorEmptyState } from "@/components/social-tool/CanvasInspectorEmptyState";
import { FeaturedBlockPanel } from "@/components/social-tool/FeaturedBlockPanel";
import { ShapesLibraryPicker } from "@/components/social-tool/shapes/ShapesLibraryPicker";
import { ShapeInspectorPanel } from "@/components/social-tool/shapes/ShapeInspectorPanel";
import { IconsLibraryPicker } from "@/components/social-tool/icons/IconsLibraryPicker";
import { IconInspectorPanel } from "@/components/social-tool/icons/IconInspectorPanel";
import {
  isPatternNone,
  PatternLibraryPicker,
} from "@/components/social-tool/PatternLibraryPicker";
import {
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import { UnifiedAsideHeader } from "@/components/social-tool/UnifiedAsideHeader";
import { getMonogramOnlyMarkup } from "@/lib/brand/logoVariants";
import type { UseBrandKitReturn } from "@/lib/brand/useBrandKit";
import type { UseFeaturedBlockReturn } from "@/lib/social-tool/useFeaturedBlock";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { BriefChatState } from "@/lib/llm/useBriefChat";
import type { DesignOnboardingPhase } from "@/lib/design/types";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import { canvasSelectionKind, iconIdFromSelection, shapeIdFromSelection } from "@/lib/social-tool/canvasSelection";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type { CanvasIconRecord } from "@/lib/social-tool/icons/types";
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
  onApplyStockPhoto?: (
    photo: {
      id: string;
      url: string;
      photographer: string;
      attribution: string;
      downloadUrl?: string;
    },
    slotId?: string,
  ) => void;
  stockAttribution?: string | null;
};

type Props = {
  phase: DesignOnboardingPhase;
  platformId: PlatformId;
  inspectorSelection: CanvasSelectionId | null;
  showContent: boolean;
  onShowContentChange: (value: boolean) => void;
  copy: PostCopy;
  editableTextSlots?: EditableTextSlot[];
  onUpdateTextSlot?: (slotId: string, text: string) => void;
  onUpdateField: <K extends keyof PostCopy>(key: K, value: PostCopy[K]) => void;
  onAddExtraField?: () => void;
  onRemoveExtraField?: (id: string) => void;
  onUpdateExtraField?: (id: string, value: string) => void;
  artifactId?: string;
  artifactCategory?: ArtifactCategoryId;
  layoutId?: string;
  platformReason?: string;
  showFeaturedInspector?: boolean;
  textAlign: TextAlign;
  onTextAlignChange: (value: TextAlign) => void;
  headingFont: SocialFontId;
  onHeadingFontChange: (value: SocialFontId) => void;
  subFont: SocialFontId;
  onSubFontChange: (value: SocialFontId) => void;
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
  copyVariantIndex?: number;
  copyVariantCount?: number;
  onCycleCopyVariant?: (delta: 1 | -1) => void;
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
  onSkipLogo?: () => void;
  briefChat?: BriefChatState;
  /** Ready-phase Chat | Design tab (design sessions with briefChat only). */
  asideTab?: AsideTab;
  onAsideTabChange?: (tab: AsideTab) => void;
  onCollapseAside?: () => void;
  briefArtifactCategory?: ArtifactCategoryId | null;
  onBriefArtifactCategoryChange?: (category: ArtifactCategoryId | null) => void;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  canvasShapes?: CanvasShapeRecord[];
  onAddCanvasShape?: (libraryId: string) => void;
  onUpdateCanvasShape?: (id: string, patch: Partial<CanvasShapeRecord>) => void;
  onRemoveCanvasShape?: (id: string) => void;
  canvasIcons?: CanvasIconRecord[];
  onAddCanvasIcon?: (iconName: string) => void;
  onUpdateCanvasIcon?: (id: string, patch: Partial<CanvasIconRecord>) => void;
  onRemoveCanvasIcon?: (id: string) => void;
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

function resolveEditableSlots(props: Props): EditableTextSlot[] {
  return props.editableTextSlots ?? legacyEditableSlotsFromCopy(props.copy);
}

function resolveUpdateTextSlot(props: Props): (slotId: string, text: string) => void {
  if (props.onUpdateTextSlot) return props.onUpdateTextSlot;
  return (slotId, text) => {
    if (slotId === "headline") {
      props.onUpdateField("heading", text);
      return;
    }
    if (slotId === "subheading") {
      props.onUpdateField("subheading", text);
      return;
    }
    props.onUpdateExtraField?.(slotId, text);
  };
}

function SharedContentPanel(props: Props) {
  return (
    <ContentPanel
      showContent={props.showContent}
      onShowContentChange={props.onShowContentChange}
      editableSlots={resolveEditableSlots(props)}
      onUpdateTextSlot={resolveUpdateTextSlot(props)}
      textAlign={props.textAlign}
      onTextAlignChange={props.onTextAlignChange}
      headingFont={props.headingFont}
      onHeadingFontChange={props.onHeadingFontChange}
      subFont={props.subFont}
      onSubFontChange={props.onSubFontChange}
      typeScale={props.typeScale}
      onTypeScaleChange={props.onTypeScaleChange}
      copyVariantIndex={props.copyVariantIndex}
      copyVariantCount={props.copyVariantCount}
      onCycleCopyVariant={props.onCycleCopyVariant}
    />
  );
}

function DesignInfoSection({
  artifactId,
  artifactCategory,
  layoutId,
  platformReason,
}: {
  artifactId?: string;
  artifactCategory?: ArtifactCategoryId;
  layoutId?: string;
  platformReason?: string;
}) {
  if (!artifactId && !artifactCategory && !layoutId) return null;

  const label = artifactId
    ? artifactId.replace(/_/g, " ")
    : artifactCategory?.replace(/_/g, " ");

  return (
    <section className="social-tool-section space-y-2">
      <p className="social-tool-section-title">Design type</p>
      <div className="flex flex-wrap items-center gap-2">
        {label ? (
          <span className="design-info-chip inline-flex rounded-full border border-overlay-border bg-overlay-subtle px-2.5 py-1 text-xs font-medium capitalize text-text-secondary">
            {label}
          </span>
        ) : null}
        {layoutId ? (
          <span className="text-xs text-text-tertiary">{layoutId.replace(/-/g, " ")}</span>
        ) : null}
      </div>
      {platformReason ? (
        <p className="text-xs text-text-tertiary">{platformReason}</p>
      ) : null}
    </section>
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

function ReadyDesignPanels(props: Props) {
  const { inspectorSelection, featured } = props;

  if (inspectorSelection === null) {
    return <CanvasInspectorEmptyState />;
  }

  if (inspectorSelection === "pattern") {
    return (
      <>
        <PatternSection {...props} />
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  const selectionKind = canvasSelectionKind(inspectorSelection);

  if (selectionKind === "copy") {
    return (
      <>
        <SharedContentPanel {...props} />
        <FixedCanvasPanels {...props} compact />
        <DesignInfoSection
          artifactId={props.artifactId}
          artifactCategory={props.artifactCategory}
          layoutId={props.layoutId}
          platformReason={props.platformReason}
        />
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
          onApplyStockPhoto={featured.onApplyStockPhoto}
          stockAttribution={featured.stockAttribution}
          featuredTransform={props.featuredTransform}
          onFeaturedTransformChange={props.onFeaturedTransformChange}
        />
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  if (selectionKind === "shape") {
    const shapeId = shapeIdFromSelection(inspectorSelection);
    const shape = props.canvasShapes?.find((entry) => entry.id === shapeId);
    return (
      <>
        {shape && props.onUpdateCanvasShape && props.onRemoveCanvasShape ? (
          <ShapeInspectorPanel
            shape={shape}
            brandAccent={featured.brandColors?.accent}
            onChange={(next) => props.onUpdateCanvasShape!(shape.id, next)}
            onRemove={() => props.onRemoveCanvasShape!(shape.id)}
          />
        ) : null}
        {props.onAddCanvasShape ? (
          <ShapesLibraryPicker
            shapeCount={props.canvasShapes?.length ?? 0}
            brandColors={{
              primary: featured.brandColors?.primary,
              accent: featured.brandColors?.accent,
            }}
            onAddShape={props.onAddCanvasShape}
            compact
          />
        ) : null}
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  if (selectionKind === "icon") {
    const iconId = iconIdFromSelection(inspectorSelection);
    const icon = props.canvasIcons?.find((entry) => entry.id === iconId);
    return (
      <>
        {icon && props.onUpdateCanvasIcon && props.onRemoveCanvasIcon ? (
          <IconInspectorPanel
            icon={icon}
            brandAccent={featured.brandColors?.accent}
            onChange={(next) => props.onUpdateCanvasIcon!(icon.id, next)}
            onRemove={() => props.onRemoveCanvasIcon!(icon.id)}
          />
        ) : null}
        {props.onAddCanvasIcon ? (
          <IconsLibraryPicker
            iconCount={props.canvasIcons?.length ?? 0}
            brandColors={{
              primary: featured.brandColors?.primary,
              accent: featured.brandColors?.accent,
            }}
            onAddIcon={props.onAddCanvasIcon}
            compact
          />
        ) : null}
        <FixedCanvasPanels {...props} compact />
      </>
    );
  }

  return null;
}

type AsideShellProps = {
  children: ReactNode;
  asideTab?: AsideTab;
  onAsideTabChange?: (tab: AsideTab) => void;
  showTabs?: boolean;
  onCollapseAside?: () => void;
  /** Chat layout: body fills height and scrolls inside the conversation. */
  fillBody?: boolean;
};

function AsideShell({
  children,
  asideTab,
  onAsideTabChange,
  showTabs = false,
  onCollapseAside,
  fillBody = false,
}: AsideShellProps) {
  return (
    <div className="social-tool-aside-unified flex min-h-0 flex-1 flex-col overflow-hidden">
      <UnifiedAsideHeader
        asideTab={asideTab}
        onAsideTabChange={onAsideTabChange}
        showTabs={showTabs}
        onCollapseAside={onCollapseAside}
      />
      <div
        className={`social-tool-aside-body min-h-0 flex-1 overscroll-contain${
          fillBody
            ? " social-tool-aside-body--fill flex flex-col overflow-hidden"
            : " overflow-y-auto"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function UnifiedAsideShell(props: Props) {
  const asideTab = props.asideTab ?? "chat";
  const onAsideTabChange = props.onAsideTabChange;
  const designIdle =
    asideTab === "design" && props.inspectorSelection === null;

  if (!props.briefChat || !onAsideTabChange) {
    return (
      <AsideShell
        onCollapseAside={props.onCollapseAside}
        fillBody={props.inspectorSelection === null}
      >
        <div
          className={`social-tool-aside-design${
            props.inspectorSelection === null
              ? " social-tool-aside-design--idle"
              : ""
          }`}
        >
          <ReadyDesignPanels {...props} />
        </div>
      </AsideShell>
    );
  }

  return (
    <AsideShell
      asideTab={asideTab}
      onAsideTabChange={onAsideTabChange}
      showTabs
      onCollapseAside={props.onCollapseAside}
      fillBody={asideTab === "chat" || designIdle}
    >
      {asideTab === "chat" ? (
        <BriefChatPanel
          {...props.briefChat}
          mode="follow-up"
          autoFocus
          selectedCategory={props.briefArtifactCategory}
          onSelectCategory={props.onBriefArtifactCategoryChange}
        />
      ) : (
        <div
          className={`social-tool-aside-design${
            designIdle ? " social-tool-aside-design--idle" : ""
          }`}
        >
          <ReadyDesignPanels {...props} />
        </div>
      )}
    </AsideShell>
  );
}

export function DesignInspector(props: Props) {
  const { phase, brand } = props;

  if (phase === "needsLogo") {
    return (
      <AsideShell>
        <DesignEmptyState
          onUpload={brand.uploadLogo}
          onDescribe={props.onSkipLogo}
          uploading={brand.uploading}
          error={brand.error}
        />
      </AsideShell>
    );
  }

  if (phase === "needsBrief") {
    if (!props.briefChat) return null;

    return (
      <AsideShell fillBody>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <BrandInspectorSection {...props} defaultExpanded={false} />
          <BriefChatPanel
            {...props.briefChat}
            mode="onboarding"
            onSkip={props.onBriefSkip}
            autoFocus
            selectedCategory={props.briefArtifactCategory}
            onSelectCategory={props.onBriefArtifactCategoryChange}
          />
        </div>
      </AsideShell>
    );
  }

  if (props.briefChat && props.onAsideTabChange) {
    return <UnifiedAsideShell {...props} />;
  }

  return <ReadyDesignPanels {...props} />;
}

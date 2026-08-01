"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Tooltip } from "@heroui/react";
import {
  ProductShotPost,
  type FeaturedImageTransform,
} from "@/components/social-tool/templates/ProductShotPost";
import { LayoutShuffleButton } from "@/components/social-tool/LayoutShuffleButton";
import { LayoutSpacingToggle } from "@/components/social-tool/LayoutSpacingToggle";
import { GenerateVariantsButton } from "@/components/social-tool/GenerateVariantsButton";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { artboardIndexLabel } from "@/lib/design/variantGroup";
import { useBoardAssets } from "@/lib/design/useBoardAssets";
import {
  buildBackgroundPresets,
  getActiveBackgroundPreset,
} from "@/lib/brand/backgroundPresets";
import {
  getMonogramOnlyMarkup,
  logoVariantColorMode,
  resolveCanvasLogo,
} from "@/lib/brand/logoVariants";
import {
  readableSubTextOnBackground,
  readableTextOnBackground,
  resolveBackgroundHex,
} from "@/lib/brand/contrast";
import { resolveDocumentLayout, layoutIdForDocument } from "@/lib/social-tool/layoutRegistry";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { resolveDesignCanvasSize } from "@/lib/design-engine/canvasSpec";
import { getTemplate, getPlatform, type TextAlign } from "@/lib/social-tool/presets";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type { ShufflePreferences } from "@/lib/social-tool/shufflePreferences";
import {
  canvasSelectionKind,
  type CanvasSelectionId,
} from "@/lib/social-tool/canvasSelection";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type { CanvasIconRecord } from "@/lib/social-tool/icons/types";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

const EMPTY_SHAPES: CanvasShapeRecord[] = [];
const EMPTY_ICONS: CanvasIconRecord[] = [];
const EMPTY_VISUAL_BLOCKS: VisualBlockRecord[] = [];

type Props = {
  board: DesignSessionPersisted;
  originDesignId: string;
  index: number;
  isActive: boolean;
  isOrigin: boolean;
  previewScale: number;
  /** Layout scale (fit only). When omitted, uses previewScale. */
  layoutScale?: number;
  adjustSpacing: boolean;
  onToggleSpacing: () => void;
  onActivate: () => void;
  /** Custom artboard name; empty/undefined falls back to index label */
  artboardName?: string;
  onRenameArtboard?: (name: string) => void;
  canDeleteArtboard?: boolean;
  onDeleteArtboard?: () => void;
  canDuplicateArtboard?: boolean;
  onDuplicateArtboard?: () => void;
  onShuffle: (prefs: ShufflePreferences) => void;
  shufflePending?: boolean;
  onGenerateVariants: () => void;
  generatingVariants: boolean;
  canGenerate: boolean;
  showGenerateButton: boolean;
  /** Live overrides when this board is the active session */
  liveFeaturedImageSrc?: string | null;
  liveLogoSrc?: string | null;
  interactive?: boolean;
  exporting?: boolean;
  canvasSelection?: CanvasSelectionId | null;
  onCanvasSelect?: (id: CanvasSelectionId | null) => void;
  onTypeScaleChange?: (value: number) => void;
  onLogoScaleChange?: (value: number) => void;
  onTextAlignChange?: (value: TextAlign) => void;
  copyVariantIndex?: number;
  copyVariantCount?: number;
  onCycleCopyVariant?: (delta: 1 | -1) => void;
  showPropertyPills?: boolean;
  onFeaturedTransformChange?: (
    t: FeaturedImageTransform,
    slotId?: string,
  ) => void;
  onHistoryCoalesceBegin?: (key: "featuredTransform" | "spacing" | "copy" | "shapes" | "icons" | "typeScale" | "logoScale") => void;
  onHistoryCoalesceEnd?: (key: "featuredTransform" | "spacing" | "copy" | "shapes" | "icons" | "typeScale" | "logoScale") => void;
  editingCopyField?: import("@/lib/social-tool/copyEdit").EditingCopyField | null;
  onCopyFieldEditStart?: (
    field: import("@/lib/social-tool/copyEdit").EditingCopyField,
  ) => void;
  onCopyFieldChange?: (
    field: import("@/lib/social-tool/copyEdit").EditingCopyField,
    value: string,
  ) => void;
  onCopyFieldCommit?: () => void;
  onCopyFieldCancel?: () => void;
  onSpacingChange?: (v: PostLayoutSpacing) => void;
  onSelectVisualBlock?: (blockId: string, slotId?: string) => void;
  onGenerateVisualBlocks?: (
    source?: "library" | "generate",
    options?: { pickFeatured?: boolean; slotId?: string },
  ) => void;
  onAddFeaturedSlot?: () => void;
  onReorderFeaturedSlot?: (slotId: string, direction: "left" | "right") => void;
  onRemoveFeaturedSlot?: (slotId: string) => void;
  onShuffleFeaturedSlot?: (slotId: string) => void;
  onUploadFeaturedImage?: (file: File, slotId: string) => void;
  generatingVisualBlocks?: boolean;
  onCanvasShapesChange?: (shapes: CanvasShapeRecord[]) => void;
  onCanvasIconsChange?: (icons: import("@/lib/social-tool/icons/types").CanvasIconRecord[]) => void;
  canvasRef?: React.Ref<HTMLDivElement>;
  viewportRef?: React.Ref<HTMLDivElement>;
  reveal?: boolean;
  toolbarEndExtra?: React.ReactNode;
  showContent?: boolean;
  /** When hand/Space pan is active, don't steal pointer for board activation */
  handActive?: boolean;
};

function CanvasVariantArtboardInner({
  board,
  originDesignId,
  index,
  isActive,
  isOrigin,
  previewScale,
  layoutScale: layoutScaleProp,
  adjustSpacing,
  onToggleSpacing,
  onActivate,
  artboardName,
  onRenameArtboard,
  canDeleteArtboard = false,
  onDeleteArtboard,
  canDuplicateArtboard = false,
  onDuplicateArtboard,
  onShuffle,
  shufflePending = false,
  onGenerateVariants,
  generatingVariants,
  canGenerate,
  showGenerateButton,
  liveFeaturedImageSrc,
  liveLogoSrc,
  interactive = false,
  exporting = false,
  canvasSelection = null,
  onCanvasSelect,
  onTypeScaleChange,
  onLogoScaleChange,
  onTextAlignChange,
  copyVariantIndex = 0,
  copyVariantCount = 0,
  onCycleCopyVariant,
  showPropertyPills = true,
  onFeaturedTransformChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
  editingCopyField = null,
  onCopyFieldEditStart,
  onCopyFieldChange,
  onCopyFieldCommit,
  onCopyFieldCancel,
  onSpacingChange,
  onSelectVisualBlock,
  onGenerateVisualBlocks,
  onAddFeaturedSlot,
  onReorderFeaturedSlot,
  onRemoveFeaturedSlot,
  onShuffleFeaturedSlot,
  onUploadFeaturedImage,
  generatingVisualBlocks = false,
  onCanvasShapesChange,
  onCanvasIconsChange,
  canvasRef,
  viewportRef,
  reveal = true,
  toolbarEndExtra,
  showContent,
  handActive = false,
}: Props) {
  const layoutScale = layoutScaleProp ?? previewScale;
  const reduceMotion = useReducedMotion();
  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCanceledRef = useRef(false);
  const doc = board.document;
  const { logoSrc: hydratedLogoSrc, logoSrcs, featuredImageSrc: hydratedFeatured } =
    useBoardAssets(board.brand, board.featured);

  const kit = useMemo(
    () => ({ ...board.brand, logoSrc: hydratedLogoSrc, logoSrcs }),
    [board.brand, hydratedLogoSrc, logoSrcs],
  );
  const backgrounds = useMemo(
    () => buildBackgroundPresets(board.brand.colors),
    [board.brand.colors],
  );
  const activeBackground = useMemo(
    () =>
      getActiveBackgroundPreset(
        backgrounds,
        board.brand.activeBackgroundPresetId,
      ),
    [backgrounds, board.brand.activeBackgroundPresetId],
  );

  const canvasSize = resolveDesignCanvasSize(doc);
  const platform = useMemo(
    () => ({
      ...getPlatform(doc.platformId),
      width: canvasSize.width,
      height: canvasSize.height,
    }),
    [doc.platformId, canvasSize.width, canvasSize.height],
  );
  const template = getTemplate(doc.templateId);
  const activeLayout = getPostLayout(layoutIdForDocument(doc));
  const resolvedLayout = useMemo(() => resolveDocumentLayout(doc), [doc]);
  const visualBlocks = board.featured.visualBlocks ?? EMPTY_VISUAL_BLOCKS;
  const activeComposedBlock = activeVisualBlock(
    visualBlocks,
    board.featured.activeBlockId,
  );
  const brandColors = useMemo(
    () => ({
      primary: board.brand.colors.primary,
      accent: board.brand.colors.accent,
    }),
    [board.brand.colors.primary, board.brand.colors.accent],
  );
  const canvasShapes = doc.canvasShapes ?? EMPTY_SHAPES;
  const canvasIcons = doc.canvasIcons ?? EMPTY_ICONS;

  const bgCss = activeBackground.css;
  const bgHex = resolveBackgroundHex(bgCss.background);
  const canvasLogo = resolveCanvasLogo(kit, bgCss.background);
  const resolvedLogoSrc = canvasLogo
    ? (logoSrcs?.[canvasLogo.variant] ??
      (canvasLogo.variant === "primary" ? hydratedLogoSrc : null))
    : hydratedLogoSrc;
  const canvasLogoSrc =
    (isActive && liveLogoSrc !== undefined ? liveLogoSrc : null) ??
    resolvedLogoSrc;
  const canvasLogoColorMode = canvasLogo
    ? logoVariantColorMode(canvasLogo.variant, canvasLogo.record)
    : "inherit";
  const patternLogoSvgMarkup = getMonogramOnlyMarkup(kit);
  const featuredImageSrc =
    (isActive && liveFeaturedImageSrc !== undefined
      ? liveFeaturedImageSrc
      : null) ?? hydratedFeatured;

  const textColor =
    doc.showBackground &&
    doc.showBrand &&
    (board.brand.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableTextOnBackground(bgHex)
        : bgCss.textOnBrand
      : undefined;
  const subTextColor =
    doc.showBackground &&
    doc.showBrand &&
    (board.brand.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableSubTextOnBackground(bgHex)
        : bgCss.subText
      : undefined;

  const indexLabel = artboardIndexLabel(index);
  const customName = artboardName?.trim() || "";
  const displayLabel = customName || indexLabel;

  useEffect(() => {
    if (!renaming) return;
    const input = renameInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [renaming]);

  function startRename() {
    if (!onRenameArtboard) return;
    renameCanceledRef.current = false;
    setRenameDraft(displayLabel);
    setRenaming(true);
  }

  function commitRename() {
    if (renameCanceledRef.current) {
      renameCanceledRef.current = false;
      return;
    }
    setRenaming(false);
    onRenameArtboard?.(renameDraft);
  }

  function cancelRename() {
    renameCanceledRef.current = true;
    setRenaming(false);
  }

  return (
    <motion.div
      className={`canvas-preview-stack canvas-variant-artboard${isActive ? " is-artboard-active" : ""}`}
      style={{ width: platform.width * layoutScale }}
      data-artboard-id={board.designId}
      initial={
        reduceMotion || !reveal || isOrigin
          ? false
          : { opacity: 0, x: 48, scale: 0.96 }
      }
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 380, damping: 28, delay: index * 0.08 }
      }
      onPointerDown={(e) => {
        if (handActive) return;
        if (!isActive) {
          onActivate();
        }
      }}
    >
      <div className="canvas-artboard-header">
        <div className="canvas-artboard-label-row">
          {renaming ? (
            <input
              ref={renameInputRef}
              type="text"
              className="canvas-artboard-label canvas-artboard-label-input"
              value={renameDraft}
              aria-label={`Rename artboard ${indexLabel}`}
              maxLength={40}
              onChange={(e) => setRenameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={commitRename}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelRename();
                }
              }}
            />
          ) : (
            <button
              type="button"
              className={`canvas-artboard-label canvas-artboard-label-btn${isActive ? " is-active" : ""}`}
              aria-label={
                customName
                  ? `Focus ${customName} (artboard ${indexLabel}). Double-click to rename`
                  : `Focus artboard ${indexLabel}. Double-click to rename`
              }
              aria-pressed={isActive}
              onClick={(e) => {
                e.stopPropagation();
                onActivate();
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onActivate();
                startRename();
              }}
            >
              {displayLabel}
            </button>
          )}
          {canDuplicateArtboard || canDeleteArtboard ? (
            <div
              className={`canvas-artboard-label-actions${
                isActive ? "" : " is-placeholder"
              }`}
              aria-hidden={!isActive}
            >
              {canDuplicateArtboard && onDuplicateArtboard ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      isIconOnly
                      aria-label="Duplicate artboard"
                      className="canvas-artboard-action-btn"
                      onPress={() => {
                        onActivate();
                        onDuplicateArtboard();
                      }}
                    >
                      <Copy className="size-3.5" strokeWidth={2.25} aria-hidden />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    <p className="layout-shuffle-tooltip-title">Duplicate</p>
                    <p className="layout-shuffle-tooltip-body">
                      Clone this artboard next to it
                    </p>
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className="canvas-artboard-action-btn canvas-artboard-action-btn--spacer" aria-hidden />
              )}
              {canDeleteArtboard && onDeleteArtboard ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      isIconOnly
                      aria-label="Delete artboard"
                      className="canvas-artboard-action-btn canvas-artboard-action-btn--danger"
                      onPress={onDeleteArtboard}
                    >
                      <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    <p className="layout-shuffle-tooltip-title">Delete</p>
                    <p className="layout-shuffle-tooltip-body">
                      Remove this artboard from the set
                    </p>
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className="canvas-artboard-action-btn canvas-artboard-action-btn--spacer" aria-hidden />
              )}
            </div>
          ) : null}
        </div>
        <div className="canvas-preview-toolbar">
        <LayoutShuffleButton
          layoutName={activeLayout.name}
          onShuffle={onShuffle}
          isPending={shufflePending}
          preferenceScopeId={board.designId}
        />
        <div className="canvas-preview-toolbar-end">
          {showGenerateButton ? (
            <GenerateVariantsButton
              generating={generatingVariants}
              disabled={!canGenerate}
              onGenerate={onGenerateVariants}
            />
          ) : null}
          <LayoutSpacingToggle
            enabled={adjustSpacing && isActive}
            onToggle={() => {
              if (!isActive) onActivate();
              onToggleSpacing();
            }}
          />
          {isActive ? toolbarEndExtra : null}
        </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={`canvas-preview-viewport relative ${
          isActive && canvasSelection
            ? "overflow-visible has-canvas-selection"
            : "overflow-hidden"
        }${
          isActive &&
          showPropertyPills &&
          !!canvasSelection &&
          (canvasSelectionKind(canvasSelection) === "copy" ||
            canvasSelectionKind(canvasSelection) === "logo" ||
            canvasSelectionKind(canvasSelection) === "featured")
            ? " has-property-pills"
            : ""
        }`}
        data-canvas-pills-open={
          isActive &&
          showPropertyPills &&
          !!canvasSelection &&
          (canvasSelectionKind(canvasSelection) === "copy" ||
            canvasSelectionKind(canvasSelection) === "logo" ||
            canvasSelectionKind(canvasSelection) === "featured")
            ? "true"
            : undefined
        }
        style={{
          width: platform.width * layoutScale,
          height: platform.height * layoutScale,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: platform.width,
            height: platform.height,
            transform: `scale(${layoutScale})`,
            transformOrigin: "top left",
          }}
        >
          <div
            className="relative"
            style={{ width: platform.width, height: platform.height }}
          >
            <div ref={canvasRef}>
              <ProductShotPost
                width={platform.width}
                height={platform.height}
                copy={doc.copy}
                pattern={doc.pattern}
                designId={isOrigin ? originDesignId : board.designId}
                showPattern={doc.showPattern}
                showBackground={doc.showBackground}
                exporting={!!exporting}
                patternOpacity={doc.patternOpacity}
                patternScale={doc.patternScale}
                patternAnimated={
                  doc.patternAnimated && !exporting && isActive
                }
                productPage={board.featured.productPage}
                featuredMode={board.featured.mode}
                composedSvgMarkup={
                  board.featured.mode === "composed"
                    ? activeComposedBlock?.svgMarkup ?? null
                    : null
                }
                composedBlock={
                  board.featured.mode === "composed"
                    ? activeComposedBlock ?? null
                    : null
                }
                brandColors={brandColors}
                visualBlocks={visualBlocks}
                activeVisualBlockId={board.featured.activeBlockId}
                generatingVisualBlocks={generatingVisualBlocks && isActive}
                onGenerateVisualBlocks={
                  isActive ? onGenerateVisualBlocks : undefined
                }
                onSelectVisualBlock={isActive ? onSelectVisualBlock : undefined}
                onAddFeaturedSlot={isActive ? onAddFeaturedSlot : undefined}
                onReorderFeaturedSlot={
                  isActive ? onReorderFeaturedSlot : undefined
                }
                onRemoveFeaturedSlot={
                  isActive ? onRemoveFeaturedSlot : undefined
                }
                onShuffleFeaturedSlot={
                  isActive ? onShuffleFeaturedSlot : undefined
                }
                onUploadFeaturedImage={
                  isActive ? onUploadFeaturedImage : undefined
                }
                featuredImageSrc={featuredImageSrc}
                featuredSvgMarkup={board.featured.image?.svgMarkup ?? null}
                hasFeaturedImage={!!board.featured.image}
                typeScale={doc.typeScale}
                onTypeScaleChange={isActive ? onTypeScaleChange : undefined}
                showPropertyPills={showPropertyPills && isActive}
                logoScale={doc.logoScale}
                onLogoScaleChange={isActive ? onLogoScaleChange : undefined}
                logoAlign={doc.logoAlign}
                logoPlacement={doc.logoPlacement}
                showLogo={doc.showBrand}
                showFeaturedImage={doc.showFeaturedImage}
                featuredTransform={doc.featuredTransform}
                onFeaturedTransformChange={
                  isActive ? onFeaturedTransformChange : undefined
                }
                onHistoryCoalesceBegin={
                  isActive ? onHistoryCoalesceBegin : undefined
                }
                onHistoryCoalesceEnd={
                  isActive ? onHistoryCoalesceEnd : undefined
                }
                editingCopyField={isActive ? editingCopyField : null}
                onCopyFieldEditStart={
                  isActive ? onCopyFieldEditStart : undefined
                }
                onCopyFieldChange={isActive ? onCopyFieldChange : undefined}
                onCopyFieldCommit={isActive ? onCopyFieldCommit : undefined}
                onCopyFieldCancel={isActive ? onCopyFieldCancel : undefined}
                previewScale={previewScale}
                interactive={interactive && isActive}
                textAlign={doc.textAlign}
                onTextAlignChange={isActive ? onTextAlignChange : undefined}
                copyVariantIndex={doc.copyVariantIndex ?? 0}
                copyVariantCount={
                  doc.copyVariants && doc.copyVariants.length > 0
                    ? doc.copyVariants.length
                    : 0
                }
                onCycleCopyVariant={isActive ? onCycleCopyVariant : undefined}
                headingFont={doc.headingFont}
                subFont={doc.subFont}
                accentPeriod={template.accentPeriod}
                logoSrc={canvasLogoSrc}
                logoSvgMarkup={canvasLogo?.record.svgMarkup ?? null}
                patternLogoSvgMarkup={patternLogoSvgMarkup}
                hasUploadedLogo={!!canvasLogo}
                backgroundPreset={
                  doc.showBackground && board.brand.activeBackgroundPresetId
                    ? bgCss
                    : undefined
                }
                logoBackdrop={doc.logoBackdrop}
                logoInvert={doc.logoInvert}
                logoUsesExplicitColors={
                  canvasLogo?.record.usesExplicitColors ?? false
                }
                logoColorMode={canvasLogoColorMode}
                textColorOverride={textColor}
                subTextColorOverride={subTextColor}
                layoutId={doc.layoutId}
                dynamicLayout={resolvedLayout}
                textSlots={doc.textSlots}
                featuredSlots={doc.featuredSlots}
                canvasShapes={canvasShapes}
                onCanvasShapesChange={isActive ? onCanvasShapesChange : undefined}
                canvasIcons={canvasIcons}
                onCanvasIconsChange={isActive ? onCanvasIconsChange : undefined}
                spacing={doc.layoutSpacing}
                onSpacingChange={isActive ? onSpacingChange : undefined}
                showSpacingControls={adjustSpacing && isActive}
                canvasSelection={isActive ? canvasSelection : null}
                onCanvasSelect={isActive ? onCanvasSelect : undefined}
                showContent={showContent ?? doc.showContent}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Skip re-renders when only sibling/workspace chrome changed.
 * Inactive boards ignore interaction chrome (hand, pills, spacing, zoom preview)
 * — those only affect the active artboard.
 */
export function artboardPropsAreEqual(prev: Props, next: Props): boolean {
  if (prev.isActive !== next.isActive) return false;
  if (prev.board.designId !== next.board.designId) return false;
  if (prev.index !== next.index) return false;
  if (prev.isOrigin !== next.isOrigin) return false;
  if (prev.layoutScale !== next.layoutScale) return false;
  if (prev.exporting !== next.exporting) return false;
  if (prev.shufflePending !== next.shufflePending) return false;
  if (prev.generatingVariants !== next.generatingVariants) return false;
  if (prev.canGenerate !== next.canGenerate) return false;
  if (prev.showGenerateButton !== next.showGenerateButton) return false;
  if (prev.artboardName !== next.artboardName) return false;
  if (prev.reveal !== next.reveal) return false;
  if (prev.showContent !== next.showContent) return false;
  if (prev.canDeleteArtboard !== next.canDeleteArtboard) return false;
  if (prev.canDuplicateArtboard !== next.canDuplicateArtboard) return false;
  if (prev.originDesignId !== next.originDesignId) return false;

  if (next.isActive) {
    // Active board needs zoom preview for pills/handles counter-scale + drag math.
    if (prev.previewScale !== next.previewScale) return false;
    if (prev.handActive !== next.handActive) return false;
    if (prev.interactive !== next.interactive) return false;
    if (prev.adjustSpacing !== next.adjustSpacing) return false;
    if (prev.showPropertyPills !== next.showPropertyPills) return false;
    if (prev.board !== next.board) return false;
    if (prev.canvasSelection !== next.canvasSelection) return false;
    if (prev.editingCopyField !== next.editingCopyField) return false;
    if (prev.liveFeaturedImageSrc !== next.liveFeaturedImageSrc) return false;
    if (prev.liveLogoSrc !== next.liveLogoSrc) return false;
    if (prev.copyVariantIndex !== next.copyVariantIndex) return false;
    if (prev.copyVariantCount !== next.copyVariantCount) return false;
    if (prev.generatingVisualBlocks !== next.generatingVisualBlocks) return false;
    if (prev.toolbarEndExtra !== next.toolbarEndExtra) return false;
  } else if (
    prev.board.updatedAt !== next.board.updatedAt ||
    prev.board.document !== next.board.document
  ) {
    return false;
  }

  return true;
}

export const CanvasVariantArtboard = memo(
  CanvasVariantArtboardInner,
  artboardPropsAreEqual,
);

export function CanvasVariantSkeleton({
  width,
  height,
  previewScale,
  layoutScale: layoutScaleProp,
  index,
}: {
  width: number;
  height: number;
  previewScale: number;
  layoutScale?: number;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const layoutScale = layoutScaleProp ?? previewScale;
  return (
    <motion.div
      className="canvas-preview-stack canvas-variant-artboard canvas-variant-skeleton"
      style={{ width: width * layoutScale }}
      initial={reduceMotion ? false : { opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { delay: index * 0.1, duration: 0.35 }
      }
    >
      <div className="canvas-artboard-label">{index + 1}</div>
      <div
        className="canvas-variant-skeleton-frame"
        style={{
          width: width * layoutScale,
          height: height * layoutScale,
        }}
      />
    </motion.div>
  );
}

export { AnimatePresence };

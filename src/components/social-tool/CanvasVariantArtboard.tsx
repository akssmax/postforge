"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
import { getTemplate, getPlatform } from "@/lib/social-tool/presets";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type { ShufflePreferences } from "@/lib/social-tool/shufflePreferences";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";

type Props = {
  board: DesignSessionPersisted;
  originDesignId: string;
  index: number;
  isActive: boolean;
  isOrigin: boolean;
  previewScale: number;
  adjustSpacing: boolean;
  onToggleSpacing: () => void;
  onActivate: () => void;
  /** Custom artboard name; empty/undefined falls back to index label */
  artboardName?: string;
  onRenameArtboard?: (name: string) => void;
  onShuffle: (prefs: ShufflePreferences) => void;
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
  showPropertyPills?: boolean;
  onFeaturedTransformChange?: (
    t: FeaturedImageTransform,
    slotId?: string,
  ) => void;
  onHistoryCoalesceBegin?: (key: "featuredTransform" | "spacing") => void;
  onHistoryCoalesceEnd?: (key: "featuredTransform" | "spacing") => void;
  onSpacingChange?: (v: PostLayoutSpacing) => void;
  onSelectVisualBlock?: (blockId: string, slotId?: string) => void;
  onGenerateVisualBlocks?: (
    source?: "library" | "generate",
    options?: { pickFeatured?: boolean; slotId?: string },
  ) => void;
  onAddFeaturedSlot?: () => void;
  onReorderFeaturedSlot?: (slotId: string, direction: "left" | "right") => void;
  onRemoveFeaturedSlot?: (slotId: string) => void;
  generatingVisualBlocks?: boolean;
  canvasRef?: React.Ref<HTMLDivElement>;
  viewportRef?: React.Ref<HTMLDivElement>;
  reveal?: boolean;
  toolbarEndExtra?: React.ReactNode;
  showContent?: boolean;
  /** When hand/Space pan is active, don't steal pointer for board activation */
  handActive?: boolean;
};

export function CanvasVariantArtboard({
  board,
  originDesignId,
  index,
  isActive,
  isOrigin,
  previewScale,
  adjustSpacing,
  onToggleSpacing,
  onActivate,
  artboardName,
  onRenameArtboard,
  onShuffle,
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
  showPropertyPills = true,
  onFeaturedTransformChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
  onSpacingChange,
  onSelectVisualBlock,
  onGenerateVisualBlocks,
  onAddFeaturedSlot,
  onReorderFeaturedSlot,
  onRemoveFeaturedSlot,
  generatingVisualBlocks = false,
  canvasRef,
  viewportRef,
  reveal = true,
  toolbarEndExtra,
  showContent,
  handActive = false,
}: Props) {
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

  const platform = getPlatform(doc.platformId);
  const template = getTemplate(doc.templateId);
  const activeLayout = getPostLayout(layoutIdForDocument(doc));
  const resolvedLayout = useMemo(() => resolveDocumentLayout(doc), [doc]);
  const activeComposedBlock = activeVisualBlock(
    board.featured.visualBlocks ?? [],
    board.featured.activeBlockId,
  );

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
    doc.showBrand && (board.brand.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableTextOnBackground(bgHex)
        : bgCss.textOnBrand
      : undefined;
  const subTextColor =
    doc.showBrand && (board.brand.activeBackgroundPresetId || doc.textContrastBoost)
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
      style={{ width: platform.width * previewScale }}
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
      <div className="canvas-preview-toolbar">
        <LayoutShuffleButton
          layoutName={activeLayout.name}
          onShuffle={onShuffle}
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

      <div
        ref={viewportRef}
        className="canvas-preview-viewport relative overflow-hidden"
        style={{
          width: platform.width * previewScale,
          height: platform.height * previewScale,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: platform.width,
            height: platform.height,
            transform: `scale(${previewScale})`,
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
                exporting={!!exporting && isActive}
                patternOpacity={doc.patternOpacity}
                patternScale={doc.patternScale}
                patternAnimated={doc.patternAnimated && !exporting && isActive}
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
                brandColors={{
                  primary: board.brand.colors.primary,
                  accent: board.brand.colors.accent,
                }}
                visualBlocks={board.featured.visualBlocks ?? []}
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
                previewScale={previewScale}
                interactive={interactive && isActive}
                textAlign={doc.textAlign}
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

export function CanvasVariantSkeleton({
  width,
  height,
  previewScale,
  index,
}: {
  width: number;
  height: number;
  previewScale: number;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="canvas-preview-stack canvas-variant-artboard canvas-variant-skeleton"
      style={{ width: width * previewScale }}
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
          width: width * previewScale,
          height: height * previewScale,
        }}
      />
    </motion.div>
  );
}

export { AnimatePresence };

"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { Move, Plus } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { BrandLogoSlot } from "@/components/social-tool/BrandLogoSlot";
import { CanvasSlot, isEmptyCopyField } from "@/components/social-tool/CanvasSlot";
import { FeaturedImageContent } from "@/components/social-tool/FeaturedImageContent";
import { PostPattern } from "@/components/social-tool/PostPattern";
import { ProductPreview, getProductPageNativeWidth } from "@/components/social-tool/ProductPreview";
import { VisualBlocksLibraryPicker } from "@/components/social-tool/VisualBlocksLibraryPicker";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import {
  parseSvgViewBox,
  resolveVisualBlockDimensions,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import type { BackgroundPreset } from "@/lib/brand/types";
import type { DesignBlockId } from "@/lib/brand/contrast";
import { CanvasShapeLayer } from "@/components/social-tool/shapes/CanvasShapeLayer";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type {
  DynamicLayout,
  FeaturedSlotContent,
  TextSlotContent,
  TextSlotRole,
} from "@/lib/social-tool/dynamicLayout";
import { dynamicLayoutAsPostLayout } from "@/lib/social-tool/layoutRegistry";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import { textSlotsForLayout } from "@/lib/social-tool/dynamicLayout";
import {
  FEATURED_PRIMARY_SLOT_ID,
  MAX_FEATURED_SLOTS,
  migrateFeaturedSlotBlockIds,
  resolveSlotBlock,
} from "@/lib/social-tool/featuredSlots";
import {
  DEFAULT_POST_LAYOUT_ID,
  getLayoutTextSide,
  getPostLayout,
  layoutUsesSplit,
  resolveFeaturedLayoutZones,
  resolveFooterBlocks,
  layoutHasFooterStrip,
  resolveSplitLayoutZones,
  type FeaturedFrameRadius,
  type PostContentBlock,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { CanvasPropertyPills } from "@/components/social-tool/CanvasPropertyPills";
import { CanvasCopyEditor } from "@/components/social-tool/CanvasCopyEditor";
import {
  editingCopyFieldsEqual,
  type EditingCopyField,
} from "@/lib/social-tool/copyEdit";
import { imageFileFromDataTransfer } from "@/lib/social-tool/featuredImageDrop";
import {
  SplitTextColumnShareHandle,
  SpacingHandle,
} from "@/components/social-tool/SpacingHandle";
import { canvasSelectionKind } from "@/lib/social-tool/canvasSelection";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  canvasScaleFactor,
  resolveSplitTextColumnShare,
  spacingToCssVars,
  spacingTokenToPx,
  type PostLayoutSpacing,
  type SpacingToken,
  type SpacingTokenKey,
} from "@/lib/social-tool/layoutSpacing";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import {
  getSocialFont,
  parseAccentMarkup,
  type LogoAlign,
  type LogoPlacement,
  type PostCopy,
  type ProductPageId,
  type SocialFontId,
  type TextAlign,
} from "@/lib/social-tool/presets";

export type FeaturedImageTransform = {
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  scale: number;
  perspective: number;
};

export const DEFAULT_FEATURED_TRANSFORM: FeaturedImageTransform = {
  x: 0,
  y: 0,
  z: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  scale: 1,
  perspective: 1400,
};

type Props = {
  width: number;
  height: number;
  copy: PostCopy;
  pattern: PatternRef;
  designId?: string;
  showPattern?: boolean;
  showBackground?: boolean;
  productPage: ProductPageId;
  featuredMode?: FeaturedBlockMode;
  featuredImageSrc?: string | null;
  featuredSvgMarkup?: string | null;
  hasFeaturedImage?: boolean;
  typeScale?: number;
  onTypeScaleChange?: (value: number) => void;
  /** Show floating property pills when selection + inspector are active */
  showPropertyPills?: boolean;
  logoScale?: number;
  onLogoScaleChange?: (value: number) => void;
  logoAlign?: LogoAlign;
  logoPlacement?: LogoPlacement;
  textAlign?: TextAlign;
  onTextAlignChange?: (value: TextAlign) => void;
  headingFont?: SocialFontId;
  subFont?: SocialFontId;
  showLogo?: boolean;
  showContent?: boolean;
  showFeaturedImage?: boolean;
  featuredTransform?: FeaturedImageTransform;
  onFeaturedTransformChange?: (
    next: FeaturedImageTransform,
    slotId?: string,
  ) => void;
  /** Coalesce pointer-drag edits into one undo step */
  onHistoryCoalesceBegin?: (key: "featuredTransform" | "spacing" | "copy" | "shapes") => void;
  onHistoryCoalesceEnd?: (key: "featuredTransform" | "spacing" | "copy" | "shapes") => void;
  /** Live canvas text edit (double-click) */
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
  /** Preview CSS scale — used to convert screen drag deltas to canvas space */
  previewScale?: number;
  /** Show drag handles / hover chrome (off during export) */
  interactive?: boolean;
  patternOpacity?: number;
  patternScale?: number;
  patternAnimated?: boolean;
  accentPeriod?: boolean;
  logoSrc?: string | null;
  logoSvgMarkup?: string | null;
  patternLogoSvgMarkup?: string | null;
  hasUploadedLogo?: boolean;
  logoColorMode?: "light" | "dark" | "inherit";
  backgroundPreset?: BackgroundPreset["css"];
  designMode?: boolean;
  onSelectBlock?: (id: DesignBlockId | null) => void;
  canvasSelection?: CanvasSelectionId | null;
  onCanvasSelect?: (id: CanvasSelectionId | null) => void;
  logoBackdrop?: boolean;
  logoInvert?: boolean;
  logoUsesExplicitColors?: boolean;
  textColorOverride?: string;
  subTextColorOverride?: string;
  layoutId?: PostLayoutId;
  spacing?: PostLayoutSpacing;
  onSpacingChange?: (spacing: PostLayoutSpacing) => void;
  showSpacingControls?: boolean;
  /** White wireframe carousel before logo upload */
  emptyStatePreview?: boolean;
  /** True while capturing export — transparent no-bg for PNG */
  exporting?: boolean;
  /** Composed visual block SVG for featured slot */
  composedSvgMarkup?: string | null;
  composedBlock?: VisualBlockRecord | null;
  brandColors?: { primary?: string; accent?: string };
  visualBlocks?: import("@/lib/social-tool/visualBlocks/types").VisualBlockRecord[];
  activeVisualBlockId?: string | null;
  generatingVisualBlocks?: boolean;
  onGenerateVisualBlocks?: (
    source?: "library" | "generate",
    options?: { pickFeatured?: boolean; slotId?: string },
  ) => void;
  onSelectVisualBlock?: (blockId: string, slotId?: string) => void;
  onAddFeaturedSlot?: () => void;
  onReorderFeaturedSlot?: (slotId: string, direction: "left" | "right") => void;
  onRemoveFeaturedSlot?: (slotId: string) => void;
  onShuffleFeaturedSlot?: (slotId: string) => void;
  onUploadFeaturedImage?: (file: File, slotId: string) => void;
  dynamicLayout?: DynamicLayout;
  textSlots?: TextSlotContent[];
  featuredSlots?: FeaturedSlotContent[];
  canvasShapes?: CanvasShapeRecord[];
  onCanvasShapesChange?: (shapes: CanvasShapeRecord[]) => void;
};

function scale(base: number, width: number, height: number) {
  return Math.round(base * canvasScaleFactor(width, height));
}

function alignClass(align: LogoAlign | TextAlign) {
  if (align === "left") return "items-start text-left";
  if (align === "right") return "items-end text-right";
  return "items-center text-center";
}

/** Keep the copy column flush with logo edges (not centered as a block). */
function textColumnSelf(align: TextAlign) {
  if (align === "left") return "self-start";
  if (align === "right") return "self-end";
  return "self-center";
}

function justifyLogo(align: LogoAlign) {
  if (align === "left") return "justify-start";
  if (align === "right") return "justify-end";
  return "justify-center";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** SVG illustrations should sit on the post color — not a gray photo plate. */
function isIllustrationFeaturedAsset(
  imageSrc: string | null | undefined,
  svgMarkup: string | null | undefined,
): boolean {
  if (svgMarkup) return true;
  if (!imageSrc) return false;
  return /\.svg([?#]|$)/i.test(imageSrc);
}

function featuredRadiusStyle(
  corner: FeaturedFrameRadius,
  radius: number,
): React.CSSProperties {
  switch (corner) {
    case "top-right":
      return { borderTopRightRadius: radius };
    case "bottom-left":
      return { borderBottomLeftRadius: radius };
    case "bottom-right":
      return { borderBottomRightRadius: radius };
    case "none":
      return { borderRadius: 0 };
    case "top-left":
    default:
      return { borderTopLeftRadius: radius };
  }
}

export function ProductShotPost({
  width,
  height,
  copy,
  pattern,
  designId,
  showPattern = true,
  showBackground = true,
  productPage,
  featuredMode = "genui",
  featuredImageSrc = null,
  featuredSvgMarkup = null,
  hasFeaturedImage = false,
  typeScale = 1,
  onTypeScaleChange,
  showPropertyPills = true,
  logoScale = 1,
  onLogoScaleChange,
  logoAlign = "left",
  logoPlacement = "top",
  textAlign = "center",
  onTextAlignChange,
  headingFont = "sans",
  subFont = "sans",
  showLogo = true,
  showContent = true,
  showFeaturedImage = true,
  featuredTransform = DEFAULT_FEATURED_TRANSFORM,
  onFeaturedTransformChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
  previewScale = 1,
  interactive = false,
  editingCopyField = null,
  onCopyFieldEditStart,
  onCopyFieldChange,
  onCopyFieldCommit,
  onCopyFieldCancel,
  patternOpacity = 0.28,
  patternScale = 1,
  patternAnimated = false,
  accentPeriod = true,
  logoSrc = null,
  logoSvgMarkup = null,
  patternLogoSvgMarkup = null,
  logoColorMode = "inherit",
  hasUploadedLogo = false,
  backgroundPreset,
  designMode = false,
  onSelectBlock,
  canvasSelection = null,
  onCanvasSelect,
  logoBackdrop = false,
  logoInvert = false,
  logoUsesExplicitColors = false,
  textColorOverride,
  subTextColorOverride,
  layoutId = DEFAULT_POST_LAYOUT_ID,
  spacing = DEFAULT_POST_LAYOUT_SPACING,
  onSpacingChange,
  showSpacingControls = false,
  emptyStatePreview = false,
  exporting = false,
  dynamicLayout,
  textSlots,
  featuredSlots,
  composedSvgMarkup = null,
  composedBlock = null,
  brandColors,
  visualBlocks = [],
  activeVisualBlockId = null,
  generatingVisualBlocks = false,
  onGenerateVisualBlocks,
  onSelectVisualBlock,
  onAddFeaturedSlot,
  onReorderFeaturedSlot,
  onRemoveFeaturedSlot,
  onShuffleFeaturedSlot,
  onUploadFeaturedImage,
  canvasShapes = [],
  onCanvasShapesChange,
}: Props) {
  const layout = dynamicLayout
    ? dynamicLayoutAsPostLayout(dynamicLayout)
    : getPostLayout(layoutId);
  const layoutSlotDefs = dynamicLayout ? textSlotsForLayout(dynamicLayout) : [];
  const canvasScale = canvasScaleFactor(width, height);
  const aspect = height / width;
  const isTallPrint = aspect >= 1.8;
  const layoutPadPx = spacingTokenToPx(spacing.layoutPad, width, height);
  const textZonePadBottomPx = spacingTokenToPx(
    spacing.textZonePadBottom,
    width,
    height,
  );
  const logoCopyGapPx = spacingTokenToPx(spacing.logoCopyGap, width, height);
  const copyBlockGapPx = spacingTokenToPx(spacing.copyBlockGap, width, height);
  const featuredSlotGapPx = spacingTokenToPx(
    spacing.featuredSlotGap,
    width,
    height,
  );
  const footerPadPx = spacingTokenToPx(spacing.footerPad, width, height);
  const footerBlockGapPx = spacingTokenToPx(
    spacing.footerBlockGap,
    width,
    height,
  );
  const pad = layoutPadPx;
  const radius = scale(12, width, height);
  const logoH = Math.max(12, Math.round(34 * canvasScale * logoScale));
  const showSpacingHandles =
    showSpacingControls && interactive && !!onSpacingChange;
  const selectionKind = canvasSelectionKind(canvasSelection);
  const hasPropertyPills =
    interactive &&
    showPropertyPills &&
    !editingCopyField &&
    ((selectionKind === "copy" &&
      (!!onTypeScaleChange || !!onTextAlignChange)) ||
      (selectionKind === "logo" && !!onLogoScaleChange) ||
      (selectionKind === "featured" &&
        (!!onFeaturedTransformChange ||
          !!onShuffleFeaturedSlot ||
          !!onReorderFeaturedSlot ||
          !!onRemoveFeaturedSlot ||
          !!onAddFeaturedSlot)));
  const spacingHistoryCoalesce = {
    onHistoryCoalesceBegin: onHistoryCoalesceBegin
      ? () => onHistoryCoalesceBegin("spacing")
      : undefined,
    onHistoryCoalesceEnd: onHistoryCoalesceEnd
      ? () => onHistoryCoalesceEnd("spacing")
      : undefined,
  };

  function setSpacingToken(key: SpacingTokenKey, token: SpacingToken) {
    onSpacingChange?.({ ...spacing, [key]: token });
  }

  function setSplitTextColumnShare(share: number) {
    onSpacingChange?.({ ...spacing, splitTextColumnShare: share });
  }

  const splitTextColumnShare = resolveSplitTextColumnShare(
    spacing,
    layout.textColumnRatio ?? 0.38,
  );

  const showFooterLogo = showLogo && logoPlacement === "footer";
  const showFooterExtras =
    layout.extrasPlacement === "footer" &&
    layout.footerBlocks.includes("extras");
  const filledExtraFields = copy.extraFields.filter((field) => field.value.trim());
  const showFooterExtrasStrip =
    showFooterExtras &&
    (emptyStatePreview || filledExtraFields.length > 0);
  const footerBlocks = resolveFooterBlocks(layout, showFooterLogo).filter(
    (block) => block !== "extras" || showFooterExtrasStrip,
  );
  const contactSlotText =
    textSlots?.find(
      (slot) => slot.role === "contact" || slot.slotId === "contact-footer",
    )?.text ?? copy.extraFields.find((field) => field.value.trim())?.value ?? "";
  const showContactFooter =
    layout.footerContact &&
    (emptyStatePreview || !isEmptyCopyField(contactSlotText));
  const hasFooterStrip =
    layoutHasFooterStrip(layout) &&
    (showFooterLogo || showFooterExtrasStrip || showContactFooter);

  let footerH = 0;
  if (hasFooterStrip) {
    footerH = footerPadPx;
    if (showFooterLogo) footerH += logoH + footerPadPx / 2;
    if (showFooterExtrasStrip) {
      const lineCount = emptyStatePreview
        ? Math.max(copy.extraFields.length, 1)
        : filledExtraFields.length;
      footerH += scale(lineCount * 24 + 8, width, height);
      if (showFooterLogo) footerH += footerBlockGapPx;
    }
    if (showContactFooter) {
      footerH += scale(28, width, height);
      if (showFooterLogo || showFooterExtrasStrip) footerH += footerBlockGapPx;
    }
    footerH += footerPadPx;
  }

  // Tall standees: more room for brand + hierarchy in the upper band
  const fi = featuredTransform;
  const featuredReady =
    featuredMode === "genui" ||
    (featuredMode === "image" &&
      (hasFeaturedImage || !!featuredImageSrc || !!featuredSvgMarkup));
  const showFeaturedFrame =
    showFeaturedImage && featuredReady && !emptyStatePreview;

  const isSplit = layoutUsesSplit(layout);
  const textSide = getLayoutTextSide(layout);

  const { textZone, productZone } = resolveFeaturedLayoutZones({
    width,
    height,
    footerH,
    layout,
    showFeaturedImage: showFeaturedImage && !isSplit,
    isTallPrint,
    typeScale,
    showTopLogo: showLogo && logoPlacement === "top",
    spacing,
    logoScale,
    copy,
  });

  const splitZones = isSplit
    ? resolveSplitLayoutZones({
        width,
        height,
        footerH,
        layout,
        showFeaturedImage,
        isTallPrint,
        showTopLogo: showLogo && logoPlacement === "top",
        spacing,
        logoScale,
      })
    : null;

  const frameWidth =
    isSplit && splitZones ? splitZones.featuredColumn : width - 2 * pad;
  const nativeWidth = getProductPageNativeWidth(productPage);

  const headingParts = parseAccentMarkup(copy.heading);
  const hasHeading = !isEmptyCopyField(copy.heading);
  const hasSubheading = !isEmptyCopyField(copy.subheading);
  const headingFamily = getSocialFont(headingFont).family;
  const subFamily = getSocialFont(subFont).family;

  const [hoveredSlotId, setHoveredSlotId] = useState<string | null>(null);
  const [draggingSlotId, setDraggingSlotId] = useState<string | null>(null);
  const [featuredZoneHovered, setFeaturedZoneHovered] = useState(false);
  const [copyEditAnchor, setCopyEditAnchor] = useState<HTMLElement | null>(null);
  const [dropTargetSlotId, setDropTargetSlotId] = useState<string | null>(null);
  const postRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editingCopyField || !postRootRef.current) {
      setCopyEditAnchor(null);
      return;
    }
    const key =
      editingCopyField.kind === "extra"
        ? `extra:${editingCopyField.id}`
        : editingCopyField.kind;
    const el = postRootRef.current.querySelector(
      `[data-copy-field="${key}"]`,
    ) as HTMLElement | null;
    setCopyEditAnchor(el);
  }, [editingCopyField, copy.heading, copy.subheading, copy.extraFields]);

  function startCopyFieldEdit(
    field: EditingCopyField,
    ev: React.MouseEvent,
  ) {
    if (!interactive || exporting || !onCopyFieldEditStart) return;
    ev.preventDefault();
    ev.stopPropagation();
    onCanvasSelect?.("copy");
    onCopyFieldEditStart(field);
  }

  function isEditingField(field: EditingCopyField) {
    return editingCopyFieldsEqual(editingCopyField, field);
  }

  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    slotId: string;
    base: FeaturedImageTransform;
    frameWidth: number;
    productZone: number;
  } | null>(null);
  const fiRef = useRef(featuredTransform);
  const metricsRef = useRef({ frameWidth, productZone, previewScale });
  const onChangeRef = useRef(onFeaturedTransformChange);

  fiRef.current = featuredTransform;
  const featuredDragZoneWidth =
    isSplit && splitZones ? splitZones.featuredColumn : width - 2 * pad;
  const featuredDragZoneHeight =
    isSplit && splitZones ? splitZones.rowHeight : productZone;
  metricsRef.current = {
    frameWidth:
      featuredMode === "genui" || featuredMode === "composed"
        ? featuredDragZoneWidth
        : frameWidth,
    productZone:
      featuredMode === "genui" || featuredMode === "composed"
        ? featuredDragZoneHeight
        : isSplit && splitZones
          ? splitZones.rowHeight
          : productZone,
    previewScale,
  };
  onChangeRef.current = onFeaturedTransformChange;

  const canDrag =
    interactive && typeof onFeaturedTransformChange === "function";
  const dragging = draggingSlotId != null;

  useEffect(() => {
    if (!interactive) {
      setHoveredSlotId(null);
      setDraggingSlotId(null);
      setFeaturedZoneHovered(false);
      dragRef.current = null;
    }
  }, [interactive]);

  function featuredSelectId(slotId: string): CanvasSelectionId {
    return slotId === "featured-primary" ? "featured" : `featured:${slotId}`;
  }

  function isFeaturedSlotSelected(slotId: string): boolean {
    if (canvasSelection === "featured" && slotId === "featured-primary") return true;
    return canvasSelection === `featured:${slotId}`;
  }

  function selectableClassForFeatured(slotId: string) {
    if (!interactive || !onCanvasSelect) return "";
    return `canvas-selectable${isFeaturedSlotSelected(slotId) ? " is-canvas-selected" : ""}`;
  }

  function textForRole(role: TextSlotRole, slotId: string): string {
    const fromSlot = textSlots?.find((slot) => slot.slotId === slotId);
    if (fromSlot) return fromSlot.text;
    if (role === "headline") return copy.heading;
    if (role === "subheading") return copy.subheading;
    const extra = copy.extraFields.find((f) => f.id === slotId);
    return extra?.value ?? copy.extraFields[0]?.value ?? "";
  }

  function selectableClass(id: CanvasSelectionId) {
    if (!interactive || !onCanvasSelect) return "";
    return `canvas-selectable${canvasSelection === id ? " is-canvas-selected" : ""}`;
  }

  function handleCanvasSelect(id: CanvasSelectionId, ev: React.PointerEvent) {
    if (!interactive || !onCanvasSelect) return;
    ev.stopPropagation();
    onCanvasSelect(id);
  }

  function applyFeaturedDragDelta(clientX: number, clientY: number) {
    const drag = dragRef.current;
    const onChange = onChangeRef.current;
    if (!drag || !onChange) return;

    const scaleFactor = metricsRef.current.previewScale > 0
      ? metricsRef.current.previewScale
      : 1;
    const dxPx = (clientX - drag.startX) / scaleFactor;
    const dyPx = (clientY - drag.startY) / scaleFactor;
    const nextX = clamp(
      drag.originX + (dxPx / Math.max(drag.frameWidth, 1)) * 100,
      -100,
      100,
    );
    const nextY = clamp(
      drag.originY + (dyPx / Math.max(drag.productZone, 1)) * 100,
      -100,
      100,
    );

    onChange(
      {
        ...drag.base,
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
      },
      drag.slotId,
    );
  }

  function renderFeaturedDragHandle(
    visible: boolean,
    slot: FeaturedSlotContent,
    viewportHeight: number,
    viewportWidth: number | undefined,
  ) {
    if (!canDrag || !visible) return null;
    const slotDragging = draggingSlotId === slot.slotId;

    return (
      <button
        type="button"
        className={`social-featured-drag-handle${slotDragging ? " is-dragging" : ""}`}
        aria-label="Drag to move"
        onPointerDown={(ev) => {
          if (!canDrag) return;
          ev.preventDefault();
          ev.stopPropagation();
          const selectId = featuredSelectId(slot.slotId);
          onCanvasSelect?.(selectId);
          onHistoryCoalesceBegin?.("featuredTransform");
          const origin = slot.transform ?? fiRef.current;
          const fallback = metricsRef.current;
          setDraggingSlotId(slot.slotId);
          dragRef.current = {
            startX: ev.clientX,
            startY: ev.clientY,
            originX: origin.x,
            originY: origin.y,
            slotId: slot.slotId,
            base: origin,
            frameWidth: viewportWidth ?? fallback.frameWidth,
            productZone: viewportHeight || fallback.productZone,
          };
          ev.currentTarget.setPointerCapture(ev.pointerId);
        }}
        onPointerMove={(ev) => {
          if (!dragRef.current || !ev.currentTarget.hasPointerCapture(ev.pointerId)) {
            return;
          }
          ev.preventDefault();
          ev.stopPropagation();
          applyFeaturedDragDelta(ev.clientX, ev.clientY);
        }}
        onPointerUp={(ev) => {
          if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
            ev.currentTarget.releasePointerCapture(ev.pointerId);
          }
          dragRef.current = null;
          setDraggingSlotId(null);
          onHistoryCoalesceEnd?.("featuredTransform");
        }}
        onPointerCancel={(ev) => {
          if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
            ev.currentTarget.releasePointerCapture(ev.pointerId);
          }
          dragRef.current = null;
          setDraggingSlotId(null);
          onHistoryCoalesceEnd?.("featuredTransform");
        }}
      >
        <Move className="size-3.5" strokeWidth={2.25} aria-hidden />
      </button>
    );
  }

  const logoEl = showLogo ? (
    <div
      className={`${logoBackdrop ? "brand-logo-backdrop inline-flex" : "inline-flex"} ${selectableClass("logo")}`}
      data-design-block="logo"
      data-canvas-select="logo"
      onPointerDown={(ev) => handleCanvasSelect("logo", ev)}
    >
      {hasPropertyPills && selectionKind === "logo" ? (
        <CanvasPropertyPills
          selection={canvasSelection}
          enabled
          typeScale={typeScale}
          onTypeScaleChange={onTypeScaleChange}
          textAlign={textAlign}
          onTextAlignChange={onTextAlignChange}
          logoScale={logoScale}
          onLogoScaleChange={onLogoScaleChange}
        />
      ) : null}
      <BrandLogoSlot
        logoSrc={logoSrc}
        svgMarkup={logoSvgMarkup}
        hasLogo={hasUploadedLogo}
        height={logoH}
        invert={logoInvert}
        usesExplicitColors={logoUsesExplicitColors}
        colorMode={logoColorMode}
      />
    </div>
  ) : null;

  const headlineStyle = textColorOverride
    ? { color: textColorOverride }
    : undefined;
  const subStyle = {
    maxWidth: isTallPrint ? "min(22em, 100%)" : "min(28em, 100%)",
    ...(subTextColorOverride ? { color: subTextColorOverride } : {}),
  };

  const headlineSlotStyle = {
    width: scale(isTallPrint ? 480 : 560, width, height),
    height: scale(isTallPrint ? 72 : 64, width, height),
    maxWidth: "100%",
  };
  const subheadingSlotStyle = {
    width: scale(isTallPrint ? 360 : 420, width, height),
    height: scale(isTallPrint ? 40 : 36, width, height),
    maxWidth: "100%",
  };
  const extraSlotStyle = {
    width: scale(isTallPrint ? 320 : 380, width, height),
    height: scale(28, width, height),
    maxWidth: "100%",
  };

  function renderEmptyTextSlot(
    key: string,
    variant: "headline" | "subheading" | "extra",
    style: CSSProperties,
    options?: { className?: string; designBlock?: "headline" | "subheading" },
  ) {
    if (!emptyStatePreview) return null;
    return (
      <CanvasSlot
        key={key}
        variant={variant}
        className={options?.className}
        style={style}
        designBlock={options?.designBlock}
      />
    );
  }

  function renderExtras(zone: "main" | "footer") {
    const fields =
      zone === "footer"
        ? copy.extraFields
        : copy.extraFields.filter((field) => field.value.trim());

    const nodes = fields
      .map((field) => {
        const editing = isEditingField({ kind: "extra", id: field.id });
        return field.value.trim() || editing ? (
          <p
            key={field.id}
            className={`social-post-extra${zone === "footer" ? " social-post-extra--footer" : ""}${editing ? " is-copy-editing" : ""}`}
            data-copy-field={`extra:${field.id}`}
            style={{ maxWidth: isTallPrint ? "min(22em, 100%)" : "min(28em, 100%)" }}
            onDoubleClick={(ev) =>
              startCopyFieldEdit({ kind: "extra", id: field.id }, ev)
            }
          >
            {field.value}
          </p>
        ) : (
          renderEmptyTextSlot(field.id, "extra", extraSlotStyle, {
            className: zone === "footer" ? "social-post-extra--footer" : undefined,
          })
        );
      })
      .filter(Boolean);

    if (nodes.length > 0) return nodes;

    if (zone === "footer" && showFooterExtras && emptyStatePreview) {
      return renderEmptyTextSlot("extra-footer-slot", "extra", extraSlotStyle, {
        className: "social-post-extra--footer",
      });
    }

    return null;
  }

  function renderMainBlock(block: PostContentBlock) {
    switch (block) {
      case "headline": {
        const editing = isEditingField({ kind: "heading" });
        return hasHeading || editing ? (
          <h1
            key="headline"
            className={`social-post-headline${editing ? " is-copy-editing" : ""}`}
            data-design-block="headline"
            data-copy-field="heading"
            style={headlineStyle}
            onDoubleClick={(ev) => startCopyFieldEdit({ kind: "heading" }, ev)}
          >
            {headingParts.map((part, i) => {
              if (part.type === "br") return <br key={`br-${i}`} />;
              if (part.type === "accent") {
                return (
                  <span key={`a-${i}`} className="social-post-accent">
                    {part.value}
                  </span>
                );
              }
              return <span key={`t-${i}`}>{part.value}</span>;
            })}
          </h1>
        ) : (
          renderEmptyTextSlot("headline-slot", "headline", headlineSlotStyle, {
            designBlock: "headline",
          })
        );
      }
      case "subheading": {
        const editing = isEditingField({ kind: "subheading" });
        return hasSubheading || editing ? (
          <p
            key="subheading"
            className={`social-post-sub${editing ? " is-copy-editing" : ""}`}
            data-design-block="subheading"
            data-copy-field="subheading"
            style={subStyle}
            onDoubleClick={(ev) =>
              startCopyFieldEdit({ kind: "subheading" }, ev)
            }
          >
            {copy.subheading}
          </p>
        ) : (
          renderEmptyTextSlot("subheading-slot", "subheading", subheadingSlotStyle, {
            designBlock: "subheading",
          })
        );
      }
      case "extras":
        if (layout.extrasPlacement !== "main") return null;
        {
          const extras = renderExtras("main");
          if (!extras) return null;
          return (
            <div key="extras-main" className="social-post-extras-main">
              {extras}
            </div>
          );
        }
      default:
        return null;
    }
  }

  function renderGapZone(
    key: string,
    heightPx: number,
    token: SpacingToken,
    spacingKey: SpacingTokenKey,
    ariaLabel: string,
  ) {
    if (heightPx <= 0 && !showSpacingHandles) return null;
    return (
      <div
        key={key}
        className="spacing-zone spacing-zone--gap"
        style={{ height: Math.max(heightPx, showSpacingHandles ? 6 : 0) }}
      >
        {showSpacingHandles ? (
          <SpacingHandle
            kind="gap"
            variant="between"
            token={token}
            onTokenChange={(t) => setSpacingToken(spacingKey, t)}
            previewScale={previewScale}
            ariaLabel={ariaLabel}
            {...spacingHistoryCoalesce}
          />
        ) : null}
      </div>
    );
  }

  function renderSplitColumnGapZone(gapPx: number, rowHeight: number) {
    if (gapPx <= 0 && !showSpacingHandles) return null;
    return (
      <div
        className="spacing-zone spacing-zone--column-gap"
        style={{
          width: Math.max(gapPx, showSpacingHandles ? 10 : 0),
          height: rowHeight,
        }}
      >
        {showSpacingHandles ? (
          <SpacingHandle
            kind="gap"
            variant="between-column"
            token={spacing.splitColumnGap}
            onTokenChange={(t) => setSpacingToken("splitColumnGap", t)}
            previewScale={previewScale}
            ariaLabel="Gap between copy and visual columns"
            {...spacingHistoryCoalesce}
          />
        ) : null}
      </div>
    );
  }

  function renderCopyStack() {
    const entries = layout.mainBlocks
      .map((block) => ({ block, node: renderMainBlock(block) }))
      .filter((entry) => entry.node != null);

    const layoutHasMainExtras =
      layout.mainBlocks.includes("extras") && layout.extrasPlacement === "main";
    const layoutHasFooterExtras =
      layout.extrasPlacement === "footer" && layout.footerBlocks.includes("extras");
    const dynamicBodySlots = layoutHasMainExtras
      ? []
      : (textSlots?.filter(
          (slot) =>
            (slot.role === "body" || slot.role === "caption") &&
            !entries.some(
              (entry) => entry.block === "headline" && slot.role === "headline",
            ) &&
            !(layoutHasFooterExtras && slot.role === "caption"),
        ) ?? []);

    const bodyNodes = dynamicBodySlots
      .map((slot) => {
        const text = textForRole(slot.role, slot.slotId);
        if (isEmptyCopyField(text)) {
          return renderEmptyTextSlot(slot.slotId, "extra", subheadingSlotStyle);
        }
        return (
          <p key={slot.slotId} className="social-post-sub" style={subStyle}>
            {text}
          </p>
        );
      })
      .filter(Boolean);

    const allEntries = [
      ...entries.flatMap((entry, index) => {
        const items: React.ReactNode[] = [];
        if (index > 0) {
          items.push(
            renderGapZone(
              `copy-gap-${index}`,
              copyBlockGapPx,
              spacing.copyBlockGap,
              "copyBlockGap",
              "Space between copy blocks",
            ),
          );
        }
        items.push(<Fragment key={entry.block}>{entry.node}</Fragment>);
        return items;
      }),
      ...bodyNodes.flatMap((node, index) => {
        const items: React.ReactNode[] = [];
        if (entries.length > 0 || index > 0) {
          items.push(
            renderGapZone(
              `copy-extra-gap-${index}`,
              copyBlockGapPx,
              spacing.copyBlockGap,
              "copyBlockGap",
              "Space between copy blocks",
            ),
          );
        }
        items.push(node);
        return items;
      }),
    ];

    return allEntries;
  }

  function renderFooterBlock(block: "logo" | "extras" | "contact") {
    if (block === "logo" && showFooterLogo) return logoEl;
    if (block === "contact") {
      const contactSlot = textSlots?.find(
        (slot) => slot.role === "contact" || slot.slotId === "contact-footer",
      );
      const text = contactSlot
        ? textForRole(contactSlot.role, contactSlot.slotId)
        : "";
      if (isEmptyCopyField(text)) {
        return renderEmptyTextSlot("contact-footer", "extra", extraSlotStyle, {
          className: "social-post-extra--footer",
        });
      }
      return (
        <p key="contact-footer" className="social-post-extra social-post-extra--footer" style={subStyle}>
          {text}
        </p>
      );
    }
    if (block === "extras" && showFooterExtrasStrip) {
      const extras = renderExtras("footer");
      if (!extras) return null;
      return (
        <div key="footer-extras" className="social-post-footer-extras">
          {extras}
        </div>
      );
    }
    return null;
  }

  function renderFooterTextSlots() {
    const footerRoles = new Set(["cta", "contact", "caption", "name", "title"]);
    const slots =
      textSlots?.filter((slot) => footerRoles.has(slot.role)) ??
      [];
    if (slots.length === 0) return null;

    return slots.map((slot) => {
      const text = textForRole(slot.role, slot.slotId);
      if (isEmptyCopyField(text)) {
        return renderEmptyTextSlot(slot.slotId, "extra", extraSlotStyle, {
          className: "social-post-extra--footer",
        });
      }
      const isCta = slot.role === "cta";
      return (
        <p
          key={slot.slotId}
          className={
            isCta
              ? "social-post-extra social-post-extra--footer font-semibold text-[var(--sp-accent,var(--brand-accent))]"
              : "social-post-extra social-post-extra--footer"
          }
          style={isCta ? undefined : subStyle}
        >
          {text}
        </p>
      );
    });
  }

  const surfaceStyle = {
    width,
    height,
    "--sp-pad": `${layoutPadPx}px`,
    "--canvas-preview-scale": previewScale,
    "--sp-type-scale": typeScale,
    "--sp-canvas-ratio": canvasScale,
    "--sp-heading-font": headingFamily,
    "--sp-sub-font": subFamily,
    ...spacingToCssVars(spacing, width, height),
    ...(backgroundPreset && showBackground
      ? {
          "--sp-bg": backgroundPreset.background,
          "--sp-pattern-tint": backgroundPreset.patternTint,
          "--sp-footer-pattern-tint": backgroundPreset.footerPatternTint,
          "--sp-text-on-brand": backgroundPreset.textOnBrand,
          "--sp-accent": backgroundPreset.accentDot,
          "--sp-sub-text": backgroundPreset.subText,
        }
      : {}),
  } as React.CSSProperties;

  const featuredFrameRadius = featuredRadiusStyle(layout.featuredRadius, radius);
  const textZoneJustify =
    layout.textVerticalAlign === "center" && !isTallPrint
      ? "justify-center"
      : "justify-start";
  const layoutStackClass =
    layout.stack === "featured-first"
      ? " social-post-product-layout--featured-first"
      : "";
  const layoutCompositionClass = isSplit
    ? ` social-post-product-layout--split social-post-product-layout--text-${textSide}`
    : "";

  function renderTextBand(opts: {
    bandWidth?: number;
    bandHeight: number;
    split?: boolean;
  }) {
    const { bandWidth, bandHeight, split = false } = opts;
    return (
      <div
        className={`social-post-text-zone${isTallPrint ? " social-post-text-zone--tall" : ""}${split ? " social-post-text-zone--split" : ""}`}
        style={{
          ...(bandWidth != null ? { width: bandWidth, flexShrink: 0 } : {}),
          height: split
            ? bandHeight
            : showFeaturedImage
              ? textZone - layoutPadPx
              : height - 2 * layoutPadPx - footerH,
          paddingBottom: split ? 0 : textZonePadBottomPx,
        }}
      >
        {showLogo && logoPlacement === "top" ? (
          <div className={`flex w-full shrink-0 ${justifyLogo(logoAlign)}`}>
            {logoEl}
          </div>
        ) : null}

        {showLogo && logoPlacement === "top"
          ? renderGapZone(
              "logo-copy-gap",
              logoCopyGapPx,
              spacing.logoCopyGap,
              "logoCopyGap",
              "Space between logo and copy",
            )
          : null}

        {showContent ? (
          <div
            className={`social-post-copy-stack flex w-full flex-col ${selectableClass("copy")} ${
              isTallPrint || split
                ? "max-w-none shrink-0 justify-start"
                : `max-w-[920px] flex-1 ${textZoneJustify} ${textColumnSelf(textAlign)}`
            } ${split && layout.textVerticalAlign === "center" ? "justify-center flex-1" : ""} ${alignClass(textAlign)}`}
            data-canvas-select="copy"
            onPointerDown={(ev) => handleCanvasSelect("copy", ev)}
          >
            {hasPropertyPills && selectionKind === "copy" ? (
              <CanvasPropertyPills
                selection={canvasSelection}
                enabled
                typeScale={typeScale}
                onTypeScaleChange={onTypeScaleChange}
                textAlign={textAlign}
                onTextAlignChange={onTextAlignChange}
                logoScale={logoScale}
                onLogoScaleChange={onLogoScaleChange}
              />
            ) : null}
            {renderCopyStack()}
          </div>
        ) : null}

        {!split && showSpacingHandles ? (
          <SpacingHandle
            kind="padding"
            variant="edge-bottom"
            token={spacing.textZonePadBottom}
            onTokenChange={(t) => setSpacingToken("textZonePadBottom", t)}
            previewScale={previewScale}
            ariaLabel="Text zone bottom padding"
            {...spacingHistoryCoalesce}
          />
        ) : null}

        {split && showSpacingHandles ? (
          <SplitTextColumnShareHandle
            share={splitTextColumnShare}
            onShareChange={setSplitTextColumnShare}
            edge={textSide === "left" ? "right" : "left"}
            previewScale={previewScale}
            ariaLabel="Copy column width"
            {...spacingHistoryCoalesce}
          />
        ) : null}
      </div>
    );
  }

  function renderFeaturedViewport(
    viewportHeight: number,
    viewportWidth: number | undefined,
    slot: FeaturedSlotContent = {
      slotId: FEATURED_PRIMARY_SLOT_ID,
      mode: featuredMode,
      productPage,
      visible: true,
      transform: fi,
    },
    slotMeta?: { index: number; total: number },
  ) {
    const slotTransform = slot.transform ?? fi;
    const slotProductPage = slot.productPage ?? productPage;
    const slotMode = slot.mode ?? featuredMode;
    const slotBlock = resolveSlotBlock(slot, visualBlocks);
    const slotComposedMarkup =
      slotBlock?.svgMarkup ??
      (slot.slotId === FEATURED_PRIMARY_SLOT_ID ? composedSvgMarkup : null);
    const slotNativeWidth = getProductPageNativeWidth(slotProductPage);
    const slotFeaturedReady =
      slotMode === "placeholder" ||
      slotMode === "composed" ||
      slotMode === "genui" ||
      (slotMode === "image" &&
        (hasFeaturedImage || !!featuredImageSrc || !!featuredSvgMarkup));
    const slotShowFrame = showFeaturedImage && slot.visible && slotFeaturedReady && !emptyStatePreview;
    const isGenuiFeatured = slotMode === "genui" && slotShowFrame;
    const isPlaceholderFeatured = slotMode === "placeholder" && slotShowFrame;
    const isComposedFeatured = slotMode === "composed" && slotShowFrame;
    const composedSlotEmpty = !slotBlock && !slotComposedMarkup;
    const composedNativeSize = slotBlock
      ? resolveVisualBlockDimensions(slotBlock)
      : slotComposedMarkup
        ? parseSvgViewBox(slotComposedMarkup) ?? VISUAL_LIBRARY_FRAME
        : VISUAL_LIBRARY_FRAME;
    const viewportEditable = slotShowFrame && (interactive || canDrag);
    const selectId = featuredSelectId(slot.slotId);
    const slotSelected = isFeaturedSlotSelected(slot.slotId);
    const showEmptyPicker =
      interactive &&
      onGenerateVisualBlocks &&
      !exporting &&
      (isPlaceholderFeatured || (isComposedFeatured && composedSlotEmpty));
    const showDragHandle =
      canDrag &&
      slotShowFrame &&
      !showEmptyPicker &&
      (slotSelected ||
        hoveredSlotId === slot.slotId ||
        draggingSlotId === slot.slotId);

    return (
      <div
        className={`social-post-product-viewport${viewportEditable ? " is-editable" : ""}${isGenuiFeatured ? " social-post-product-viewport--genui" : ""} ${selectableClassForFeatured(slot.slotId)}${viewportWidth != null ? " social-post-product-viewport--split" : ""}${slotSelected && hasPropertyPills ? " has-property-pills" : ""}${draggingSlotId === slot.slotId ? " is-dragging-featured" : ""}${dropTargetSlotId === slot.slotId ? " is-drop-target" : ""}`}
        data-canvas-select={selectId}
        onPointerDown={(ev) => handleCanvasSelect(selectId, ev)}
        onPointerEnter={() => {
          if (canDrag && slotShowFrame && !showEmptyPicker) {
            setHoveredSlotId(slot.slotId);
          }
        }}
        onPointerLeave={() => {
          if (draggingSlotId !== slot.slotId) {
            setHoveredSlotId((current) =>
              current === slot.slotId ? null : current,
            );
          }
        }}
        onDragOver={(ev) => {
          if (!interactive || exporting || !onUploadFeaturedImage) return;
          if (![...ev.dataTransfer.types].includes("Files")) return;
          ev.preventDefault();
          ev.stopPropagation();
          ev.dataTransfer.dropEffect = "copy";
          setDropTargetSlotId(slot.slotId);
        }}
        onDragLeave={(ev) => {
          if (ev.currentTarget.contains(ev.relatedTarget as Node)) return;
          setDropTargetSlotId((current) =>
            current === slot.slotId ? null : current,
          );
        }}
        onDrop={(ev) => {
          if (!interactive || exporting || !onUploadFeaturedImage) return;
          ev.preventDefault();
          ev.stopPropagation();
          setDropTargetSlotId(null);
          const file = imageFileFromDataTransfer(ev.dataTransfer);
          if (file) onUploadFeaturedImage(file, slot.slotId);
        }}
        onPaste={(ev) => {
          if (!interactive || exporting || !onUploadFeaturedImage) return;
          if (!slotSelected) return;
          const file = imageFileFromDataTransfer(ev.clipboardData);
          if (!file) return;
          ev.preventDefault();
          ev.stopPropagation();
          onUploadFeaturedImage(file, slot.slotId);
        }}
        tabIndex={slotSelected ? 0 : undefined}
        style={
          {
            height: viewportHeight,
            ...(viewportWidth != null ? { width: viewportWidth, flexShrink: 0 } : { flex: "1 1 0", minWidth: 0 }),
            ...(slotShowFrame
              ? {
                  "--fi-perspective": `${slotTransform.perspective}px`,
                  "--fi-x": `${slotTransform.x}%`,
                  "--fi-y": `${slotTransform.y}%`,
                  "--fi-z": `${slotTransform.z}px`,
                  "--fi-rx": `${slotTransform.rotateX}deg`,
                  "--fi-ry": `${slotTransform.rotateY}deg`,
                  "--fi-rz": `${slotTransform.rotateZ}deg`,
                  "--fi-scale": slotTransform.scale,
                }
              : {}),
          } as React.CSSProperties
        }
      >
        {hasPropertyPills && slotSelected ? (
          <CanvasPropertyPills
            selection={selectId}
            enabled
            typeScale={typeScale}
            featuredScale={slotTransform.scale}
            onFeaturedScaleChange={
              onFeaturedTransformChange
                ? (scale) =>
                    onFeaturedTransformChange(
                      { ...slotTransform, scale },
                      slot.slotId,
                    )
                : undefined
            }
            featuredSlotIndex={slotMeta?.index ?? 0}
            featuredSlotCount={slotMeta?.total ?? 1}
            featuredSlotHasVisual={Boolean(slotBlock || slotComposedMarkup)}
            onShuffleFeaturedSlot={onShuffleFeaturedSlot}
            shufflingFeaturedSlot={generatingVisualBlocks}
            onReorderFeaturedSlot={onReorderFeaturedSlot}
            onRemoveFeaturedSlot={onRemoveFeaturedSlot}
            onAddFeaturedSlot={onAddFeaturedSlot}
          />
        ) : null}
        {slotShowFrame ? (
          showEmptyPicker ? (
            <div
              className="social-post-product-frame social-post-product-frame--composed social-post-product-frame--composed-empty social-post-product-frame--slot social-post-product-frame--placeholder"
              style={featuredFrameRadius}
            >
              <div className="social-post-featured-placeholder">
                <div className="social-post-featured-placeholder__actions">
                  <VisualBlocksLibraryPicker
                    blocks={visualBlocks}
                    activeBlockId={slot.activeBlockId ?? activeVisualBlockId}
                    generating={generatingVisualBlocks}
                    brandColors={brandColors}
                    onGenerate={(source) =>
                      onGenerateVisualBlocks?.(source, {
                        pickFeatured: true,
                        slotId: slot.slotId,
                      })
                    }
                    onSelect={(blockId) =>
                      onSelectVisualBlock?.(blockId, slot.slotId)
                    }
                    triggerLabel="Choose visual"
                    slotTrigger
                    autoPick
                  />
                </div>
              </div>
            </div>
          ) : isComposedFeatured ? (
            <div
              className={`social-post-product-frame social-post-product-frame--composed${draggingSlotId === slot.slotId ? " is-dragging" : ""}`}
              style={featuredFrameRadius}
              data-design-block={slot.slotId === "featured-primary" ? "featured" : undefined}
              data-canvas-select={slot.slotId === "featured-primary" ? "featured" : undefined}
            >
              <div
                className={`social-post-product-inner social-post-product-inner--composed${draggingSlotId === slot.slotId ? " is-dragging" : ""}`}
                style={{
                  width: composedNativeSize.width,
                  height: composedNativeSize.height,
                }}
              >
                {slotBlock ? (
                  <VisualBlockRenderer
                    block={slotBlock}
                    brandColors={brandColors}
                    canvasFit
                  />
                ) : (
                  <FeaturedImageContent imageSrc={null} svgMarkup={slotComposedMarkup} />
                )}
              </div>
            </div>
          ) : isGenuiFeatured ? (
            <div
              className={`social-post-product-inner social-post-product-inner--genui${draggingSlotId === slot.slotId ? " is-dragging" : ""}`}
              style={featuredFrameRadius}
              data-design-block={slot.slotId === "featured-primary" ? "featured" : undefined}
              data-canvas-select={slot.slotId === "featured-primary" ? "featured" : undefined}
            >
              <ProductPreview page={slotProductPage} frameWidth={slotNativeWidth} />
            </div>
          ) : (
            <div
              className={`social-post-product-frame${isIllustrationFeaturedAsset(featuredImageSrc, featuredSvgMarkup) ? " social-post-product-frame--illustration" : ""}${draggingSlotId === slot.slotId ? " is-dragging" : ""}`}
              style={featuredFrameRadius}
              data-design-block={slot.slotId === "featured-primary" ? "featured" : undefined}
              data-canvas-select={slot.slotId === "featured-primary" ? "featured" : undefined}
            >
              <div className="social-post-product-inner social-post-product-inner--image">
                <FeaturedImageContent
                  imageSrc={featuredImageSrc ?? null}
                  svgMarkup={featuredSvgMarkup ?? null}
                />
              </div>
            </div>
          )
        ) : (
          <div
            className="social-post-product-frame social-post-product-frame--slot"
            style={featuredFrameRadius}
          >
            <CanvasSlot variant="image" className="social-post-image-slot" />
          </div>
        )}
        {renderFeaturedDragHandle(
          showDragHandle,
          slot,
          viewportHeight,
          viewportWidth,
        )}
      </div>
    );
  }

  function renderAddFeaturedSlotControl(
    viewportHeight: number,
    visible: boolean,
  ) {
    if (!interactive || exporting || !onAddFeaturedSlot) return null;
    const size = Math.max(52, Math.round(64 * canvasScale));
    return (
      <div
        className={`social-post-featured-add-slot${visible ? " is-visible" : ""}`}
        style={
          {
            height: viewportHeight,
            "--featured-add-slot-size": `${size}px`,
            "--featured-add-slot-gap": `${Math.max(6, featuredSlotGapPx)}px`,
          } as React.CSSProperties
        }
        aria-hidden={!visible}
      >
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label="Add visual slot"
              className="social-post-featured-add-slot__btn"
              isDisabled={!visible}
              onPress={() => onAddFeaturedSlot()}
            >
              <Plus className="size-5" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="left" offset={8}>
            <p className="layout-shuffle-tooltip-title">Add visual slot</p>
          </Tooltip.Content>
        </Tooltip>
      </div>
    );
  }

  function renderAllFeaturedViewports(viewportHeight: number, viewportWidth?: number) {
    const slots = migrateFeaturedSlotBlockIds(
      featuredSlots?.filter((slot) => slot.visible),
      activeVisualBlockId,
    );

    const canAdd =
      interactive &&
      !exporting &&
      !!onAddFeaturedSlot &&
      slots.length < MAX_FEATURED_SLOTS;
    const featuredSelected =
      canvasSelectionKind(canvasSelection) === "featured";
    const showAddControl =
      canAdd && (featuredZoneHovered || featuredSelected);
    const gap = Math.max(
      showSpacingHandles ? 6 : 0,
      featuredSlotGapPx,
    );

    if (slots.length <= 1 && !canAdd) {
      return renderFeaturedViewport(viewportHeight, viewportWidth, slots[0], {
        index: 0,
        total: 1,
      });
    }

    const gaps = gap * Math.max(0, slots.length - 1);
    const availableWidth =
      viewportWidth != null
        ? Math.max(0, viewportWidth - gaps)
        : undefined;
    const eachWidth =
      availableWidth != null ? availableWidth / Math.max(1, slots.length) : undefined;

    return (
      <div
        className={`social-post-featured-slots relative flex w-full flex-row items-stretch${showSpacingHandles ? " has-spacing-handles" : ""}`}
        style={{
          height: viewportHeight,
          gap: 0,
          ...(viewportWidth != null ? { width: viewportWidth } : {}),
        }}
        onPointerEnter={() => {
          if (canAdd) setFeaturedZoneHovered(true);
        }}
        onPointerLeave={() => setFeaturedZoneHovered(false)}
      >
        {slots.map((slot, index) => (
          <Fragment key={slot.slotId}>
            {index > 0 ? (
              <div
                className="spacing-zone spacing-zone--slot-gap"
                style={{
                  width: gap,
                  height: viewportHeight,
                }}
              >
                {showSpacingHandles ? (
                  <SpacingHandle
                    kind="gap"
                    variant="between-column"
                    token={spacing.featuredSlotGap}
                    onTokenChange={(t) =>
                      setSpacingToken("featuredSlotGap", t)
                    }
                    previewScale={previewScale}
                    ariaLabel="Space between visual slots"
                    {...spacingHistoryCoalesce}
                  />
                ) : null}
              </div>
            ) : null}
            <div
              className="social-post-featured-slot-cell min-w-0"
              style={
                eachWidth != null
                  ? { width: eachWidth, flex: "0 0 auto" }
                  : { flex: "1 1 0", minWidth: 0 }
              }
            >
              {renderFeaturedViewport(viewportHeight, undefined, slot, {
                index,
                total: slots.length,
              })}
            </div>
          </Fragment>
        ))}
        {canAdd
          ? renderAddFeaturedSlotControl(viewportHeight, showAddControl)
          : null}
      </div>
    );
  }

  return (
    <div
      ref={postRootRef}
      className={`social-post ${
        emptyStatePreview
          ? "social-post--preview-empty"
          : showBackground
            ? "social-post--dark"
            : `social-post--dark social-post--no-bg${exporting ? " social-post--exporting" : ""}`
      } social-post--product${hasPropertyPills ? " has-property-pills" : ""}`}
      style={surfaceStyle}
      onPointerDown={() => {
        if (interactive && !editingCopyField) {
          if (designMode) onSelectBlock?.(null);
          onCanvasSelect?.(null);
        }
      }}
    >
      {copyEditAnchor &&
      editingCopyField &&
      onCopyFieldChange &&
      onCopyFieldCommit &&
      onCopyFieldCancel ? (
        <CanvasCopyEditor
          anchor={copyEditAnchor}
          value={
            editingCopyField.kind === "heading"
              ? copy.heading
              : editingCopyField.kind === "subheading"
                ? copy.subheading
                : (copy.extraFields.find((f) => f.id === editingCopyField.id)
                    ?.value ?? "")
          }
          multiline={editingCopyField.kind !== "heading"}
          accentRich={editingCopyField.kind === "heading"}
          onChange={(next) => onCopyFieldChange(editingCopyField, next)}
          onCommit={onCopyFieldCommit}
          onCancel={onCopyFieldCancel}
        />
      ) : null}
      {showPattern ? (
        <PostPattern
          pattern={pattern}
          designId={designId}
          logoSvgMarkup={patternLogoSvgMarkup ?? logoSvgMarkup}
          theme="dark"
          opacity={patternOpacity}
          scale={patternScale}
          animated={patternAnimated}
          patternTint={backgroundPreset?.patternTint}
          footerPatternTint={backgroundPreset?.footerPatternTint}
        />
      ) : null}

      <CanvasShapeLayer
        shapes={canvasShapes}
        canvasWidth={width}
        canvasHeight={height}
        previewScale={previewScale}
        interactive={interactive}
        exporting={exporting}
        canvasSelection={canvasSelection}
        onCanvasSelect={onCanvasSelect}
        onShapesChange={onCanvasShapesChange}
        onHistoryCoalesceBegin={
          onHistoryCoalesceBegin
            ? () => onHistoryCoalesceBegin("shapes")
            : undefined
        }
        onHistoryCoalesceEnd={
          onHistoryCoalesceEnd ? () => onHistoryCoalesceEnd("shapes") : undefined
        }
        tier="back"
      />

      <div
        className={`social-post-product-layout${layoutStackClass}${layoutCompositionClass}${showSpacingHandles ? " has-spacing-handles" : ""}`}
      >
        {showSpacingHandles ? (
          <>
            <SpacingHandle
              kind="padding"
              variant="edge-top"
              token={spacing.layoutPad}
              onTokenChange={(t) => setSpacingToken("layoutPad", t)}
              previewScale={previewScale}
              ariaLabel="Layout top padding"
              className="spacing-handle--layout-pad spacing-handle--layout-pad-top"
              {...spacingHistoryCoalesce}
            />
            <SpacingHandle
              kind="padding"
              variant="edge-left"
              token={spacing.layoutPad}
              onTokenChange={(t) => setSpacingToken("layoutPad", t)}
              previewScale={previewScale}
              ariaLabel="Layout left padding"
              className="spacing-handle--layout-pad spacing-handle--layout-pad-left"
              {...spacingHistoryCoalesce}
            />
            <SpacingHandle
              kind="padding"
              variant="edge-right"
              token={spacing.layoutPad}
              onTokenChange={(t) => setSpacingToken("layoutPad", t)}
              previewScale={previewScale}
              ariaLabel="Layout right padding"
              className="spacing-handle--layout-pad spacing-handle--layout-pad-right"
              {...spacingHistoryCoalesce}
            />
            <SpacingHandle
              kind="padding"
              variant="edge-bottom"
              token={spacing.layoutPad}
              onTokenChange={(t) => setSpacingToken("layoutPad", t)}
              previewScale={previewScale}
              ariaLabel="Layout bottom padding"
              className="spacing-handle--layout-pad spacing-handle--layout-pad-bottom"
              {...spacingHistoryCoalesce}
            />
          </>
        ) : null}

        {isSplit && splitZones && showFeaturedImage ? (
          <div
            className={`social-post-split-row${showSpacingHandles ? " has-spacing-handles" : ""}`}
            style={{
              height: splitZones.rowHeight,
            }}
          >
            {textSide === "left" ? (
              <>
                {renderTextBand({
                  bandWidth: splitZones.textColumn,
                  bandHeight: splitZones.rowHeight,
                  split: true,
                })}
                {renderSplitColumnGapZone(
                  splitZones.columnGap,
                  splitZones.rowHeight,
                )}
                {renderAllFeaturedViewports(
                  splitZones.rowHeight,
                  splitZones.featuredColumn,
                )}
              </>
            ) : (
              <>
                {renderAllFeaturedViewports(
                  splitZones.rowHeight,
                  splitZones.featuredColumn,
                )}
                {renderSplitColumnGapZone(
                  splitZones.columnGap,
                  splitZones.rowHeight,
                )}
                {renderTextBand({
                  bandWidth: splitZones.textColumn,
                  bandHeight: splitZones.rowHeight,
                  split: true,
                })}
              </>
            )}
          </div>
        ) : (
          <>
            {renderTextBand({ bandHeight: textZone - layoutPadPx })}

            {showFeaturedImage ? renderAllFeaturedViewports(productZone) : null}
          </>
        )}

        {hasFooterStrip ? (
          <div
            className={`social-post-footer-strip flex w-full flex-col${showSpacingHandles ? " has-spacing-handles" : ""}`}
            style={{
              minHeight: footerH,
              paddingBlock: footerPadPx,
              paddingInline: 0,
            }}
          >
            {showSpacingHandles ? (
              <SpacingHandle
                kind="padding"
                variant="edge-top"
                token={spacing.footerPad}
                onTokenChange={(t) => setSpacingToken("footerPad", t)}
                previewScale={previewScale}
                ariaLabel="Footer padding"
                className="spacing-handle--footer-pad"
                {...spacingHistoryCoalesce}
              />
            ) : null}
            {footerBlocks.flatMap((block, index) => {
              const content = renderFooterBlock(block);
              if (!content) return [];

              const items: React.ReactNode[] = [];
              if (index > 0) {
                items.push(
                  renderGapZone(
                    `footer-gap-${index}`,
                    footerBlockGapPx,
                    spacing.footerBlockGap,
                    "footerBlockGap",
                    "Footer block spacing",
                  ),
                );
              }
              items.push(
                <div
                  key={`footer-${block}`}
                  className={
                    block === "logo"
                      ? `social-post-footer-block flex w-full shrink-0 ${justifyLogo(logoAlign)}`
                      : `social-post-footer-block flex w-full flex-col ${alignClass(textAlign)}`
                  }
                >
                  {content}
                </div>,
              );
              return items;
            })}
            {renderFooterTextSlots()}
          </div>
        ) : null}
      </div>

      <CanvasShapeLayer
        shapes={canvasShapes}
        canvasWidth={width}
        canvasHeight={height}
        previewScale={previewScale}
        interactive={interactive}
        exporting={exporting}
        canvasSelection={canvasSelection}
        onCanvasSelect={onCanvasSelect}
        onShapesChange={onCanvasShapesChange}
        onHistoryCoalesceBegin={
          onHistoryCoalesceBegin
            ? () => onHistoryCoalesceBegin("shapes")
            : undefined
        }
        onHistoryCoalesceEnd={
          onHistoryCoalesceEnd ? () => onHistoryCoalesceEnd("shapes") : undefined
        }
        tier="front"
      />
    </div>
  );
}

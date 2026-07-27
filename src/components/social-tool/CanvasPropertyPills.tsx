"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Button, Label, Slider, Tooltip } from "@heroui/react";
import {
  InspectorSegment,
} from "@/components/social-tool/InspectorControls";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import {
  canvasSelectionKind,
  featuredSlotIdFromSelection,
} from "@/lib/social-tool/canvasSelection";
import { MAX_FEATURED_SLOTS } from "@/lib/social-tool/featuredSlots";
import type { TextAlign } from "@/lib/social-tool/presets";

const TYPE_SCALE_MIN = 0.75;
const TYPE_SCALE_MAX = 4;
const TYPE_SCALE_STEP = 0.05;

const LOGO_SCALE_MIN = 0.5;
const LOGO_SCALE_MAX = 3;
const LOGO_SCALE_STEP = 0.05;

const FEATURED_SCALE_MIN = 0.12;
const FEATURED_SCALE_MAX = 4;
const FEATURED_SCALE_STEP = 0.01;

const ALIGN_OPTIONS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
] as const;

function formatScale(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`;
}

function PillSeparator() {
  return <span className="canvas-property-pill-separator" aria-hidden />;
}

function InlineScaleSection({
  value,
  onChange,
  min,
  max,
  step,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  ariaLabel: string;
}) {
  const safeScale = Number.isFinite(value) ? value : min;

  return (
    <div className="canvas-property-pill-section canvas-property-pill-section--scale">
      <span className="canvas-property-pill-label">Scale</span>
      <Slider
        aria-label={ariaLabel}
        className="canvas-property-pill-scale-slider"
        minValue={min}
        maxValue={max}
        step={step}
        value={safeScale}
        onChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number" && !Number.isNaN(n)) {
            onChange(n);
          }
        }}
      >
        <Label className="sr-only">{ariaLabel}</Label>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <span className="canvas-property-pill-value" aria-live="polite">
        {formatScale(safeScale)}
      </span>
    </div>
  );
}

function CopyTypographyPills({
  typeScale,
  onTypeScaleChange,
  textAlign,
  onTextAlignChange,
}: {
  typeScale: number;
  onTypeScaleChange?: (value: number) => void;
  textAlign: TextAlign;
  onTextAlignChange?: (value: TextAlign) => void;
}) {
  if (!onTextAlignChange && !onTypeScaleChange) return null;

  return (
    <div
      className="canvas-property-pill canvas-property-pill--typography"
      role="group"
      aria-label="Text style"
    >
      {onTextAlignChange ? (
        <div className="canvas-property-pill-section canvas-property-pill-section--align">
          <span className="canvas-property-pill-label">Align</span>
          <InspectorSegment
            aria-label="Text alignment"
            value={textAlign}
            onChange={(v) => onTextAlignChange(v as TextAlign)}
            options={[...ALIGN_OPTIONS]}
          />
        </div>
      ) : null}

      {onTextAlignChange && onTypeScaleChange ? <PillSeparator /> : null}

      {onTypeScaleChange ? (
        <InlineScaleSection
          value={typeScale}
          onChange={onTypeScaleChange}
          min={TYPE_SCALE_MIN}
          max={TYPE_SCALE_MAX}
          step={TYPE_SCALE_STEP}
          ariaLabel="Text scale"
        />
      ) : null}
    </div>
  );
}

function FeaturedSlotsPill({
  slotId,
  index,
  count,
  onShuffle,
  shuffling = false,
  onReorder,
  onRemove,
  onAdd,
  slotHasVisual = true,
  featuredScale = 1,
  onFeaturedScaleChange,
}: {
  slotId: string;
  index: number;
  count: number;
  onShuffle?: (slotId: string) => void;
  shuffling?: boolean;
  onReorder?: (slotId: string, direction: "left" | "right") => void;
  onRemove?: (slotId: string) => void;
  onAdd?: () => void;
  /** When false on the sole slot, hide clear (nothing to delete). */
  slotHasVisual?: boolean;
  featuredScale?: number;
  onFeaturedScaleChange?: (value: number) => void;
}) {
  const atStart = index <= 0;
  const atEnd = index >= count - 1;
  const canShuffle = !!onShuffle;
  const isSoleSlot = count <= 1;
  const canRemove =
    !!onRemove && (count > 1 || (isSoleSlot && slotHasVisual));
  const canAdd = count < MAX_FEATURED_SLOTS && !!onAdd;
  const showOrder = count > 1 && !!onReorder;
  const showSlotMeta = showOrder || count > 0;
  const showManage = canAdd || canRemove;
  const removeLabel = isSoleSlot ? "Clear visual" : "Remove visual slot";
  const removeTooltip = isSoleSlot ? "Clear visual" : "Remove slot";
  const hasSlotControls = canShuffle || showOrder || canRemove || canAdd;
  const showScale = !!onFeaturedScaleChange;

  if (!hasSlotControls && !showScale) return null;

  return (
    <div
      className={`canvas-property-pill${showScale ? " canvas-property-pill--typography" : ""}`}
      role="group"
      aria-label="Visual slots"
    >
      {canShuffle ? (
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label="Shuffle visual"
              isDisabled={shuffling}
              className="canvas-property-pill-btn"
              onPress={() => onShuffle(slotId)}
            >
              <Shuffle className="size-3.5" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">
              {shuffling ? "Shuffling…" : "Shuffle visual"}
            </p>
          </Tooltip.Content>
        </Tooltip>
      ) : null}

      {canShuffle && (showSlotMeta || showManage) ? <PillSeparator /> : null}

      {showSlotMeta ? (
        <>
          <span className="canvas-property-pill-label">Slots</span>
          {showOrder ? (
            <>
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    isIconOnly
                    aria-label="Move visual slot left"
                    isDisabled={atStart}
                    className="canvas-property-pill-btn"
                    onPress={() => onReorder(slotId, "left")}
                  >
                    <ChevronLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom" offset={8}>
                  <p className="layout-shuffle-tooltip-title">Move left</p>
                </Tooltip.Content>
              </Tooltip>
              <span className="canvas-property-pill-value" aria-live="polite">
                {index + 1}/{count}
              </span>
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    isIconOnly
                    aria-label="Move visual slot right"
                    isDisabled={atEnd}
                    className="canvas-property-pill-btn"
                    onPress={() => onReorder(slotId, "right")}
                  >
                    <ChevronRight className="size-3.5" strokeWidth={2.25} aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom" offset={8}>
                  <p className="layout-shuffle-tooltip-title">Move right</p>
                </Tooltip.Content>
              </Tooltip>
            </>
          ) : (
            <span className="canvas-property-pill-value" aria-live="polite">
              {count}/{MAX_FEATURED_SLOTS}
            </span>
          )}
        </>
      ) : null}

      {showSlotMeta && showManage ? <PillSeparator /> : null}

      {canAdd ? (
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label="Add visual slot"
              className="canvas-property-pill-btn"
              onPress={() => onAdd()}
            >
              <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Add slot</p>
          </Tooltip.Content>
        </Tooltip>
      ) : null}
      {canRemove ? (
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label={removeLabel}
              className="canvas-property-pill-btn"
              onPress={() => onRemove(slotId)}
            >
              <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">{removeTooltip}</p>
          </Tooltip.Content>
        </Tooltip>
      ) : null}

      {showScale && hasSlotControls ? <PillSeparator /> : null}

      {showScale ? (
        <InlineScaleSection
          value={featuredScale}
          onChange={onFeaturedScaleChange}
          min={FEATURED_SCALE_MIN}
          max={FEATURED_SCALE_MAX}
          step={FEATURED_SCALE_STEP}
          ariaLabel="Visual scale"
        />
      ) : null}
    </div>
  );
}

export type CanvasPropertyPillsProps = {
  selection: CanvasSelectionId | null;
  /** When false, hide pills (e.g. aside collapsed or Chat tab). */
  enabled?: boolean;
  typeScale: number;
  onTypeScaleChange?: (value: number) => void;
  textAlign?: TextAlign;
  onTextAlignChange?: (value: TextAlign) => void;
  logoScale?: number;
  onLogoScaleChange?: (value: number) => void;
  featuredScale?: number;
  onFeaturedScaleChange?: (value: number) => void;
  featuredSlotIndex?: number;
  featuredSlotCount?: number;
  featuredSlotHasVisual?: boolean;
  onShuffleFeaturedSlot?: (slotId: string) => void;
  shufflingFeaturedSlot?: boolean;
  onReorderFeaturedSlot?: (slotId: string, direction: "left" | "right") => void;
  onRemoveFeaturedSlot?: (slotId: string) => void;
  onAddFeaturedSlot?: () => void;
};

/**
 * Floating quick-edit pills near the selected canvas element.
 * Supports text scale/align, logo scale, and featured slot scale/shuffle/add/reorder/remove.
 */
export function CanvasPropertyPills({
  selection,
  enabled = true,
  typeScale,
  onTypeScaleChange,
  textAlign = "center",
  onTextAlignChange,
  logoScale = 1,
  onLogoScaleChange,
  featuredScale = 1,
  onFeaturedScaleChange,
  featuredSlotIndex = 0,
  featuredSlotCount = 1,
  featuredSlotHasVisual = true,
  onShuffleFeaturedSlot,
  shufflingFeaturedSlot = false,
  onReorderFeaturedSlot,
  onRemoveFeaturedSlot,
  onAddFeaturedSlot,
}: CanvasPropertyPillsProps) {
  if (!enabled) return null;

  const kind = canvasSelectionKind(selection);
  if (kind === "copy" && (onTypeScaleChange || onTextAlignChange)) {
    return (
      <div
        className="canvas-property-pills"
        data-canvas-chrome="property-pills"
        onPointerDown={(ev) => ev.stopPropagation()}
      >
        <CopyTypographyPills
          typeScale={typeScale}
          onTypeScaleChange={onTypeScaleChange}
          textAlign={textAlign}
          onTextAlignChange={onTextAlignChange}
        />
      </div>
    );
  }

  if (kind === "logo" && onLogoScaleChange) {
    return (
      <div
        className="canvas-property-pills"
        data-canvas-chrome="property-pills"
        onPointerDown={(ev) => ev.stopPropagation()}
      >
        <div
          className="canvas-property-pill canvas-property-pill--typography"
          role="group"
          aria-label="Logo scale"
        >
          <InlineScaleSection
            value={logoScale}
            onChange={onLogoScaleChange}
            min={LOGO_SCALE_MIN}
            max={LOGO_SCALE_MAX}
            step={LOGO_SCALE_STEP}
            ariaLabel="Logo scale"
          />
        </div>
      </div>
    );
  }

  if (
    kind === "featured" &&
    (onFeaturedScaleChange ||
      onShuffleFeaturedSlot ||
      onReorderFeaturedSlot ||
      onRemoveFeaturedSlot ||
      onAddFeaturedSlot)
  ) {
    const slotId = featuredSlotIdFromSelection(selection);
    if (!slotId) return null;
    return (
      <div
        className="canvas-property-pills"
        data-canvas-chrome="property-pills"
        onPointerDown={(ev) => ev.stopPropagation()}
      >
        <FeaturedSlotsPill
          slotId={slotId}
          index={featuredSlotIndex}
          count={featuredSlotCount}
          slotHasVisual={featuredSlotHasVisual}
          onShuffle={onShuffleFeaturedSlot}
          shuffling={shufflingFeaturedSlot}
          onReorder={onReorderFeaturedSlot}
          onRemove={onRemoveFeaturedSlot}
          onAdd={onAddFeaturedSlot}
          featuredScale={featuredScale}
          onFeaturedScaleChange={onFeaturedScaleChange}
        />
      </div>
    );
  }

  return null;
}

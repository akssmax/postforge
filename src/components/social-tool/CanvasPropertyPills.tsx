"use client";

import { ChevronLeft, ChevronRight, Minus, Plus, Trash2 } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import {
  canvasSelectionKind,
  featuredSlotIdFromSelection,
} from "@/lib/social-tool/canvasSelection";
import { MAX_FEATURED_SLOTS } from "@/lib/social-tool/featuredSlots";

const TYPE_SCALE_MIN = 0.75;
const TYPE_SCALE_MAX = 4;
const TYPE_SCALE_STEP = 0.05;

const LOGO_SCALE_MIN = 0.5;
const LOGO_SCALE_MAX = 3;
const LOGO_SCALE_STEP = 0.05;

function clampScale(value: number, min: number, max: number, step: number) {
  return Math.min(max, Math.max(min, Math.round(value / step) * step));
}

function formatScale(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`;
}

type ScalePillProps = {
  label: string;
  groupAriaLabel: string;
  decreaseAriaLabel: string;
  increaseAriaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

function ScalePill({
  label,
  groupAriaLabel,
  decreaseAriaLabel,
  increaseAriaLabel,
  value,
  min,
  max,
  step,
  onChange,
}: ScalePillProps) {
  const safe = Number.isFinite(value) ? value : 1;
  const atMin = safe <= min + 1e-9;
  const atMax = safe >= max - 1e-9;

  return (
    <div className="canvas-property-pill" role="group" aria-label={groupAriaLabel}>
      <span className="canvas-property-pill-label">{label}</span>
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="sm"
            isIconOnly
            aria-label={decreaseAriaLabel}
            isDisabled={atMin}
            className="canvas-property-pill-btn"
            onPress={() => onChange(clampScale(safe - step, min, max, step))}
          >
            <Minus className="size-3.5" strokeWidth={2.25} aria-hidden />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="bottom" offset={8}>
          <p className="layout-shuffle-tooltip-title">Decrease scale</p>
        </Tooltip.Content>
      </Tooltip>
      <span className="canvas-property-pill-value" aria-live="polite">
        {formatScale(safe)}
      </span>
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="sm"
            isIconOnly
            aria-label={increaseAriaLabel}
            isDisabled={atMax}
            className="canvas-property-pill-btn"
            onPress={() => onChange(clampScale(safe + step, min, max, step))}
          >
            <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="bottom" offset={8}>
          <p className="layout-shuffle-tooltip-title">Increase scale</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

function CopyScalePill({
  typeScale,
  onTypeScaleChange,
}: {
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
}) {
  return (
    <ScalePill
      label="Scale"
      groupAriaLabel="Text scale"
      decreaseAriaLabel="Decrease text scale"
      increaseAriaLabel="Increase text scale"
      value={typeScale}
      min={TYPE_SCALE_MIN}
      max={TYPE_SCALE_MAX}
      step={TYPE_SCALE_STEP}
      onChange={onTypeScaleChange}
    />
  );
}

function LogoScalePill({
  logoScale,
  onLogoScaleChange,
}: {
  logoScale: number;
  onLogoScaleChange: (value: number) => void;
}) {
  return (
    <ScalePill
      label="Scale"
      groupAriaLabel="Logo scale"
      decreaseAriaLabel="Decrease logo scale"
      increaseAriaLabel="Increase logo scale"
      value={logoScale}
      min={LOGO_SCALE_MIN}
      max={LOGO_SCALE_MAX}
      step={LOGO_SCALE_STEP}
      onChange={onLogoScaleChange}
    />
  );
}

function FeaturedSlotsPill({
  slotId,
  index,
  count,
  onReorder,
  onRemove,
  onAdd,
}: {
  slotId: string;
  index: number;
  count: number;
  onReorder?: (slotId: string, direction: "left" | "right") => void;
  onRemove?: (slotId: string) => void;
  onAdd?: () => void;
}) {
  const atStart = index <= 0;
  const atEnd = index >= count - 1;
  const canRemove = count > 1 && !!onRemove;
  const canAdd = count < MAX_FEATURED_SLOTS && !!onAdd;
  const showOrder = count > 1 && !!onReorder;

  if (!showOrder && !canRemove && !canAdd) return null;

  return (
    <div className="canvas-property-pill" role="group" aria-label="Visual slots">
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
              aria-label="Remove visual slot"
              className="canvas-property-pill-btn"
              onPress={() => onRemove(slotId)}
            >
              <Trash2 className="size-3.5" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Remove slot</p>
          </Tooltip.Content>
        </Tooltip>
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
  logoScale?: number;
  onLogoScaleChange?: (value: number) => void;
  featuredSlotIndex?: number;
  featuredSlotCount?: number;
  onReorderFeaturedSlot?: (slotId: string, direction: "left" | "right") => void;
  onRemoveFeaturedSlot?: (slotId: string) => void;
  onAddFeaturedSlot?: () => void;
};

/**
 * Floating quick-edit pills near the selected canvas element.
 * Supports text/logo scale and featured slot add/reorder/remove.
 */
export function CanvasPropertyPills({
  selection,
  enabled = true,
  typeScale,
  onTypeScaleChange,
  logoScale = 1,
  onLogoScaleChange,
  featuredSlotIndex = 0,
  featuredSlotCount = 1,
  onReorderFeaturedSlot,
  onRemoveFeaturedSlot,
  onAddFeaturedSlot,
}: CanvasPropertyPillsProps) {
  if (!enabled) return null;

  const kind = canvasSelectionKind(selection);
  if (kind === "copy" && onTypeScaleChange) {
    return (
      <div
        className="canvas-property-pills"
        data-canvas-chrome="property-pills"
        onPointerDown={(ev) => ev.stopPropagation()}
      >
        <CopyScalePill
          typeScale={typeScale}
          onTypeScaleChange={onTypeScaleChange}
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
        <LogoScalePill
          logoScale={logoScale}
          onLogoScaleChange={onLogoScaleChange}
        />
      </div>
    );
  }

  if (
    kind === "featured" &&
    (onReorderFeaturedSlot || onRemoveFeaturedSlot || onAddFeaturedSlot)
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
          onReorder={onReorderFeaturedSlot}
          onRemove={onRemoveFeaturedSlot}
          onAdd={onAddFeaturedSlot}
        />
      </div>
    );
  }

  return null;
}

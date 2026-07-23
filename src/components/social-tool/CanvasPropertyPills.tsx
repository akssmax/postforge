"use client";

import { Minus, Plus } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import { canvasSelectionKind } from "@/lib/social-tool/canvasSelection";

const TYPE_SCALE_MIN = 0.75;
const TYPE_SCALE_MAX = 4;
const TYPE_SCALE_STEP = 0.05;

function clampTypeScale(value: number) {
  return Math.min(
    TYPE_SCALE_MAX,
    Math.max(TYPE_SCALE_MIN, Math.round(value / TYPE_SCALE_STEP) * TYPE_SCALE_STEP),
  );
}

function formatTypeScale(value: number) {
  return `${value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`;
}

type CopyScalePillProps = {
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
};

function CopyScalePill({ typeScale, onTypeScaleChange }: CopyScalePillProps) {
  const safe = Number.isFinite(typeScale) ? typeScale : 1;
  const atMin = safe <= TYPE_SCALE_MIN + 1e-9;
  const atMax = safe >= TYPE_SCALE_MAX - 1e-9;

  return (
    <div
      className="canvas-property-pill"
      role="group"
      aria-label="Text scale"
    >
      <span className="canvas-property-pill-label">Scale</span>
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="sm"
            isIconOnly
            aria-label="Decrease text scale"
            isDisabled={atMin}
            className="canvas-property-pill-btn"
            onPress={() => onTypeScaleChange(clampTypeScale(safe - TYPE_SCALE_STEP))}
          >
            <Minus className="size-3.5" strokeWidth={2.25} aria-hidden />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="bottom" offset={8}>
          <p className="layout-shuffle-tooltip-title">Decrease scale</p>
        </Tooltip.Content>
      </Tooltip>
      <span className="canvas-property-pill-value" aria-live="polite">
        {formatTypeScale(safe)}
      </span>
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="sm"
            isIconOnly
            aria-label="Increase text scale"
            isDisabled={atMax}
            className="canvas-property-pill-btn"
            onPress={() => onTypeScaleChange(clampTypeScale(safe + TYPE_SCALE_STEP))}
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

export type CanvasPropertyPillsProps = {
  selection: CanvasSelectionId | null;
  /** When false, hide pills (e.g. aside collapsed or Chat tab). */
  enabled?: boolean;
  typeScale: number;
  onTypeScaleChange?: (value: number) => void;
};

/**
 * Floating quick-edit pills near the selected canvas element.
 * Currently supports text blocks (copy); extend per selection kind later.
 */
export function CanvasPropertyPills({
  selection,
  enabled = true,
  typeScale,
  onTypeScaleChange,
}: CanvasPropertyPillsProps) {
  if (!enabled) return null;

  const kind = canvasSelectionKind(selection);
  if (kind !== "copy" || !onTypeScaleChange) return null;

  return (
    <div
      className="canvas-property-pills"
      onPointerDown={(ev) => ev.stopPropagation()}
    >
      <CopyScalePill
        typeScale={typeScale}
        onTypeScaleChange={onTypeScaleChange}
      />
    </div>
  );
}

"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { Button, Switch, Tooltip } from "@heroui/react";
import {
  InspectorLiveSlider,
  InspectorTransformRow,
} from "@/components/social-tool/InspectorControls";
import { DEFAULT_SHAPE_TRANSFORM } from "@/lib/social-tool/shapes/types";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";

type Props = {
  shape: CanvasShapeRecord;
  onChange: (shape: CanvasShapeRecord) => void;
  onRemove: () => void;
  brandAccent?: string;
  onHistoryCoalesceBegin?: () => void;
  onHistoryCoalesceEnd?: () => void;
};

export function ShapeInspectorPanel({
  shape,
  onChange,
  onRemove,
  brandAccent,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
}: Props) {
  function patch(partial: Partial<CanvasShapeRecord>) {
    onChange({ ...shape, ...partial });
  }

  function patchTransform(
    key: keyof CanvasShapeRecord["transform"],
    value: number,
  ) {
    onChange({
      ...shape,
      transform: { ...shape.transform, [key]: value },
    });
  }

  const behindContent = shape.zIndex < 6;

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="social-transform-heading !mb-0">{shape.label}</p>
        <span className="text-xs text-text-secondary capitalize">{shape.category}</span>
      </div>

      <div className="space-y-3">
        <InspectorTransformRow
          label="Position"
          fields={[
            {
              key: "x",
              value: shape.transform.x,
              onChange: (x) => patchTransform("x", x),
              step: 1,
              precision: 1,
            },
            {
              key: "y",
              value: shape.transform.y,
              onChange: (y) => patchTransform("y", y),
              step: 1,
              precision: 1,
            },
            {
              key: "z",
              value: 0,
              onChange: () => {},
              step: 1,
              precision: 0,
            },
          ]}
          action={
            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  className="social-transform-reset"
                  aria-label="Reset shape transform"
                  onPress={() =>
                    onChange({
                      ...shape,
                      transform: {
                        ...DEFAULT_SHAPE_TRANSFORM,
                        scale: shape.transform.scale,
                      },
                    })
                  }
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom" offset={8}>
                <p className="layout-shuffle-tooltip-title">Reset position</p>
              </Tooltip.Content>
            </Tooltip>
          }
        />

        <InspectorLiveSlider
          label="Scale"
          value={shape.transform.scale}
          onChange={(scale) => patchTransform("scale", scale)}
          min={0.08}
          max={2.5}
          step={0.01}
          format={(v) => `${v.toFixed(2)}×`}
          onCoalesceBegin={onHistoryCoalesceBegin}
          onCoalesceEnd={onHistoryCoalesceEnd}
        />

        <InspectorLiveSlider
          label="Rotate"
          value={shape.transform.rotateZ}
          onChange={(rotateZ) => patchTransform("rotateZ", rotateZ)}
          min={-180}
          max={180}
          step={1}
          format={(v) => `${Math.round(v)}°`}
          onCoalesceBegin={onHistoryCoalesceBegin}
          onCoalesceEnd={onHistoryCoalesceEnd}
        />

        <InspectorLiveSlider
          label="Opacity"
          value={shape.opacity ?? 0.25}
          onChange={(opacity) => patch({ opacity })}
          min={0.05}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onCoalesceBegin={onHistoryCoalesceBegin}
          onCoalesceEnd={onHistoryCoalesceEnd}
        />

        <div className="layout-shuffle-menu-row">
          <span className="layout-shuffle-menu-label">Behind content</span>
          <Switch
            size="sm"
            isSelected={behindContent}
            onChange={(selected) => patch({ zIndex: selected ? 2 : 8 })}
            aria-label="Place shape behind content"
          >
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>

        {brandAccent ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Fill</span>
            <button
              type="button"
              className="size-6 rounded-full border border-overlay-border"
              style={{ background: shape.fill ?? brandAccent }}
              aria-label="Shape fill color"
              onClick={() => patch({ fill: brandAccent })}
            />
            <span className="text-xs text-text-secondary">{shape.fill ?? brandAccent}</span>
          </div>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onPress={onRemove}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Remove shape
        </Button>
      </div>
    </section>
  );
}

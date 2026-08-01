"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import {
  InspectorLiveSlider,
  InspectorTransformRow,
} from "@/components/social-tool/InspectorControls";
import {
  DEFAULT_ICON_TRANSFORM,
  type CanvasIconRecord,
} from "@/lib/social-tool/icons/types";

type Props = {
  icon: CanvasIconRecord;
  onChange: (icon: CanvasIconRecord) => void;
  onRemove: () => void;
  brandAccent?: string;
  onHistoryCoalesceBegin?: () => void;
  onHistoryCoalesceEnd?: () => void;
};

export function IconInspectorPanel({
  icon,
  onChange,
  onRemove,
  brandAccent,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
}: Props) {
  function patch(partial: Partial<CanvasIconRecord>) {
    onChange({ ...icon, ...partial });
  }

  function patchTransform(
    key: keyof CanvasIconRecord["transform"],
    value: number,
  ) {
    onChange({
      ...icon,
      transform: { ...icon.transform, [key]: value },
    });
  }

  function setColor(color: string) {
    onChange({ ...icon, color });
  }

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="social-transform-heading !mb-0">{icon.label}</p>
        <span className="text-xs text-text-secondary capitalize">{icon.category}</span>
      </div>

      <div className="space-y-3">
        <InspectorTransformRow
          label="Position"
          fields={[
            {
              key: "x",
              value: icon.transform.x,
              onChange: (x) => patchTransform("x", x),
              step: 1,
              precision: 1,
            },
            {
              key: "y",
              value: icon.transform.y,
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
                  aria-label="Reset icon transform"
                  onPress={() =>
                    onChange({
                      ...icon,
                      transform: {
                        ...DEFAULT_ICON_TRANSFORM,
                        scale: icon.transform.scale,
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
          value={icon.transform.scale}
          onChange={(scale) => patchTransform("scale", scale)}
          min={0.4}
          max={2.5}
          step={0.01}
          format={(v) => `${v.toFixed(2)}×`}
          onCoalesceBegin={onHistoryCoalesceBegin}
          onCoalesceEnd={onHistoryCoalesceEnd}
        />

        <InspectorLiveSlider
          label="Rotate"
          value={icon.transform.rotateZ}
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
          value={icon.opacity ?? 1}
          onChange={(opacity) => patch({ opacity })}
          min={0.1}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onCoalesceBegin={onHistoryCoalesceBegin}
          onCoalesceEnd={onHistoryCoalesceEnd}
        />

        {brandAccent ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Color</span>
            <button
              type="button"
              className="size-6 rounded-full border border-overlay-border"
              style={{ background: icon.color }}
              aria-label="Icon color"
              onClick={() => setColor(brandAccent)}
            />
            <span className="text-xs text-text-secondary">{icon.color}</span>
          </div>
        ) : null}

        <Button variant="secondary" size="sm" className="w-full" onPress={onRemove}>
          <Trash2 className="size-3.5" aria-hidden />
          Remove icon
        </Button>
      </div>
    </section>
  );
}

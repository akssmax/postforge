"use client";

import type { Key } from "@heroui/react";
import { ListBox, Select } from "@heroui/react";
import { PlatformIcon } from "@/components/social-tool/PlatformIcon";
import {
  PLATFORM_PRESETS,
  getPlatform,
  platformOptionLabel,
  type PlatformId,
} from "@/lib/social-tool/presets";

type Props = {
  value: PlatformId;
  onChange: (value: PlatformId) => void;
};

function platformMeta(preset: (typeof PLATFORM_PRESETS)[number]): string {
  if (preset.sizeLabel) return preset.sizeLabel;
  return `${preset.width}×${preset.height}`;
}

export function CanvasPlatformPicker({ value, onChange }: Props) {
  const selected = getPlatform(value);

  return (
    <Select
      className="canvas-platform-pill"
      aria-label="Canvas platform"
      value={value as Key}
      onChange={(next) => {
        if (next != null) onChange(next as PlatformId);
      }}
    >
      <Select.Trigger className="canvas-platform-pill-trigger">
        <Select.Value className="canvas-platform-pill-value">
          <PlatformIcon platformId={value} />
          <span className="canvas-platform-pill-label" title={platformOptionLabel(selected)}>
            {platformOptionLabel(selected)}
          </span>
        </Select.Value>
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="min-w-[16rem]">
        <ListBox>
          {PLATFORM_PRESETS.map((preset) => (
            <ListBox.Item
              key={preset.id}
              id={preset.id}
              textValue={platformOptionLabel(preset)}
            >
              <div className="canvas-platform-option">
                <PlatformIcon platformId={preset.id} />
                <div className="canvas-platform-option-copy">
                  <span className="canvas-platform-option-label">{preset.label}</span>
                  <span className="canvas-platform-option-meta">
                    {preset.kind === "print" && preset.printInches
                      ? `Print · ${preset.printInches.width}×${preset.printInches.height} in`
                      : platformMeta(preset)}
                  </span>
                </div>
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

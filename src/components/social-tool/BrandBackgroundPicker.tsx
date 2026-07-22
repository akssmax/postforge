"use client";

import { Check } from "lucide-react";
import { Popover } from "@heroui/react";
import type { BackgroundPreset } from "@/lib/brand/types";

type Props = {
  activeBackground: BackgroundPreset;
  solidPresets: BackgroundPreset[];
  gradientPresets: BackgroundPreset[];
  onSelect: (id: string | null) => void;
};

function SolidSwatch({
  preset,
  active,
  onSelect,
}: {
  preset: BackgroundPreset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`brand-bg-solid-swatch${active ? " is-active" : ""}`}
      style={{ background: preset.css.background }}
      aria-pressed={active}
      aria-label={preset.label}
      title={preset.label}
      onClick={onSelect}
    >
      {active ? <Check className="brand-bg-swatch-check" strokeWidth={2.5} /> : null}
    </button>
  );
}

function GradientSwatch({
  preset,
  active,
  onSelect,
}: {
  preset: BackgroundPreset;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`brand-bg-gradient-swatch${active ? " is-active" : ""}`}
      style={{ background: preset.css.background }}
      aria-pressed={active}
      aria-label={preset.label}
      title={preset.label}
      onClick={onSelect}
    />
  );
}

export function BrandBackgroundPicker({
  activeBackground,
  solidPresets,
  gradientPresets,
  onSelect,
}: Props) {
  const selectPreset = (preset: BackgroundPreset) => {
    onSelect(preset.id === "default" ? null : preset.id);
  };

  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" className="brand-bg-picker-trigger">
          <span
            className="brand-bg-picker-preview"
            style={{ background: activeBackground.css.background }}
            aria-hidden
          />
          <span className="brand-bg-picker-label">Background</span>
        </button>
      </Popover.Trigger>
      <Popover.Content placement="bottom start" className="brand-bg-popover-content">
        <Popover.Dialog className="brand-bg-popover">
          <div className="brand-bg-popover-section">
            <p className="brand-bg-popover-heading">Colors</p>
            <div className="brand-bg-solid-grid">
              {solidPresets.map((preset) => (
                <SolidSwatch
                  key={preset.id}
                  preset={preset}
                  active={activeBackground.id === preset.id}
                  onSelect={() => selectPreset(preset)}
                />
              ))}
            </div>
          </div>

          <div className="brand-bg-popover-divider" role="separator" />

          <div className="brand-bg-popover-section">
            <p className="brand-bg-popover-heading">Gradient</p>
            <div className="brand-bg-gradient-grid">
              {gradientPresets.map((preset) => (
                <GradientSwatch
                  key={preset.id}
                  preset={preset}
                  active={activeBackground.id === preset.id}
                  onSelect={() => selectPreset(preset)}
                />
              ))}
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

"use client";

import { useMemo } from "react";
import { parseColor } from "react-aria-components";
import type { Color } from "react-aria-components";
import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
} from "@heroui/react";
import { RotateCcw } from "lucide-react";
import { Label } from "@heroui/react";

type Props = {
  label: string;
  value: string;
  extracted?: string;
  onChange: (hex: string) => void;
  onReset: () => void;
};

function toColor(hex: string): Color {
  try {
    return parseColor(hex);
  } catch {
    return parseColor("#ff6140");
  }
}

function colorToHex(color: Color): string {
  return `#${color.toString("hex")}`;
}

export function BrandColorPicker({
  label,
  value,
  extracted,
  onChange,
  onReset,
}: Props) {
  const color = useMemo(() => toColor(value), [value]);

  return (
    <div className="brand-color-picker">
      <div className="brand-color-picker-head">
        <Label className="social-tool-label !mb-0">{label}</Label>
        {extracted && extracted !== value ? (
          <button
            type="button"
            className="brand-color-reset"
            onClick={onReset}
            aria-label={`Reset ${label}`}
            title="Reset to extracted"
          >
            <RotateCcw className="size-3.5" />
          </button>
        ) : null}
      </div>

      <ColorPicker
        value={color}
        onChange={(next) => onChange(colorToHex(next))}
      >
        <div className="brand-color-picker-row">
          <ColorPicker.Trigger className="brand-color-picker-trigger">
            <ColorSwatch />
          </ColorPicker.Trigger>
          <ColorField
            fullWidth
            value={color}
            onChange={(next) => {
              if (next) onChange(colorToHex(next));
            }}
            aria-label={`${label} hex value`}
          >
            <ColorField.Group variant="secondary">
              <ColorField.Input className="brand-color-hex-input" />
            </ColorField.Group>
          </ColorField>
        </div>

        <ColorPicker.Popover className="brand-color-popover">
          <div className="brand-color-popover-body">
            <ColorArea colorSpace="hsb" className="brand-color-area">
              <ColorArea.Thumb />
            </ColorArea>
            <ColorSlider channel="hue" colorSpace="hsb" className="brand-color-hue">
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
          </div>
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  );
}

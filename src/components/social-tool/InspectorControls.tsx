"use client";

import type { Key } from "@heroui/react";
import {
  Label,
  ListBox,
  Select,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";

type SegmentOption = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type SegmentProps = {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  options: SegmentOption[];
  size?: "sm" | "md";
};

/** Figma-style icon segmented control (HeroUI ToggleButtonGroup). */
export function InspectorSegment({
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  size = "sm",
}: SegmentProps) {
  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      selectionMode="single"
      disallowEmptySelection
      size={size}
      className="social-tool-segment"
      selectedKeys={new Set([value])}
      onSelectionChange={(keys) => {
        const next = [...keys][0];
        if (next != null) onChange(String(next));
      }}
    >
      {options.map((opt, index) => {
        const Icon = opt.icon;
        return (
          <ToggleButton
            key={opt.id}
            id={opt.id}
            isIconOnly
            aria-label={opt.label}
          >
            {index > 0 ? <ToggleButtonGroup.Separator /> : null}
            <Icon className="size-3.5" />
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}

type SelectOption = {
  id: string;
  label: string;
  description?: string;
};

type InspectorSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export function InspectorSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
}: InspectorSelectProps) {
  return (
    <Select
      className={`social-tool-select w-full ${className}`}
      placeholder={placeholder}
      value={value as Key}
      onChange={(next) => {
        if (next != null) onChange(String(next));
      }}
    >
      <Label className="social-tool-label !mb-1.5 !normal-case !tracking-normal">
        {label}
      </Label>
      <Select.Trigger className="w-full">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="min-w-[var(--trigger-width)]">
        <ListBox>
          {options.map((opt) => (
            <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label}>
              <div className="flex flex-col gap-0.5">
                <span>{opt.label}</span>
                {opt.description ? (
                  <span className="text-[11px] text-text-tertiary">
                    {opt.description}
                  </span>
                ) : null}
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

type AxisKey = "x" | "y" | "z";

type AxisField = {
  key: AxisKey;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  precision?: number;
};

type InspectorTransformRowProps = {
  label: string;
  fields: [AxisField, AxisField, AxisField];
  locked?: boolean;
};

function formatAxisValue(value: number, precision = 0) {
  if (precision <= 0) return Math.round(value);
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

/** Figma-style X/Y/Z pill inputs for transform rows. */
export function InspectorTransformRow({
  label,
  fields,
  locked = false,
}: InspectorTransformRowProps) {
  return (
    <div className="social-transform-row">
      <div className="social-transform-row-label">
        <span>{label}</span>
        {locked ? <Lock className="social-transform-lock" aria-hidden /> : null}
      </div>
      <div className="social-transform-axes">
        {fields.map((field) => (
          <label
            key={field.key}
            className={`social-axis-field social-axis-field--${field.key}`}
          >
            <span className="social-axis-letter">{field.key.toUpperCase()}</span>
            <input
              type="number"
              className="social-axis-input"
              value={formatAxisValue(field.value, field.precision ?? 0)}
              step={field.step ?? 1}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isNaN(n)) field.onChange(n);
              }}
              aria-label={`${label} ${field.key.toUpperCase()}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

type InspectorSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (value: number) => string;
  "aria-label"?: string;
};

function defaultFormat(value: number) {
  return value
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d)0$/, "$1");
}

/** Compact labeled slider for inspector panels. */
export function InspectorSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = defaultFormat,
  "aria-label": ariaLabel,
}: InspectorSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="social-tool-row-label">{label}</span>
        <span className="font-mono text-xs text-text-tertiary">
          {format(value)}
        </span>
      </div>
      <Slider
        aria-label={ariaLabel ?? label}
        className="w-full"
        minValue={min}
        maxValue={max}
        step={step}
        value={value}
        onChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number" && !Number.isNaN(n)) onChange(n);
        }}
      >
        <Label className="sr-only">{ariaLabel ?? label}</Label>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  );
}

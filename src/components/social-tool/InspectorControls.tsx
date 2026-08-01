"use client";

import { useRef } from "react";
import type { Key } from "@heroui/react";
import {
  Label,
  ListBox,
  Select,
  Slider,
  Tabs,
  Tooltip,
} from "@heroui/react";
import type { LucideIcon } from "lucide-react";
import { Lock } from "lucide-react";
import { useLiveSliderValue } from "@/lib/social-tool/useLiveSliderValue";

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

/** Compact icon segmented control (HeroUI Tabs). */
export function InspectorSegment({
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  size = "sm",
}: SegmentProps) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(key: Key) => {
        if (key != null) onChange(String(key));
      }}
      className={`social-tool-segment social-tool-segment--icons${
        size === "md" ? " social-tool-segment--md" : ""
      }`}
      aria-label={ariaLabel}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={ariaLabel}>
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <Tabs.Tab key={opt.id} id={opt.id} aria-label={opt.label}>
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <span className="social-tool-segment__hit">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    <p className="layout-shuffle-tooltip-title">{opt.label}</p>
                  </Tooltip.Content>
                </Tooltip>
                <Tabs.Indicator />
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.ListContainer>
      {options.map((opt) => (
        <Tabs.Panel key={opt.id} id={opt.id} className="sr-only">
          {opt.label}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

type TextSegmentOption = {
  id: string;
  label: string;
};

type TextSegmentProps = {
  "aria-label": string;
  value: string;
  onChange: (value: string) => void;
  options: TextSegmentOption[];
  size?: "sm" | "md";
  className?: string;
};

/** Labeled segmented control (e.g. Chat | Design sidebar tabs). */
export function InspectorTextSegment({
  "aria-label": ariaLabel,
  value,
  onChange,
  options,
  size = "sm",
  className,
}: TextSegmentProps) {
  return (
    <Tabs
      selectedKey={value}
      onSelectionChange={(key: Key) => {
        if (key != null) onChange(String(key));
      }}
      className={[
        "social-tool-segment",
        "social-tool-segment--text",
        size === "md" ? "social-tool-segment--md" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={ariaLabel}>
          {options.map((opt) => (
            <Tabs.Tab key={opt.id} id={opt.id}>
              {opt.label}
              <Tabs.Indicator />
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {options.map((opt) => (
        <Tabs.Panel key={opt.id} id={opt.id} className="sr-only">
          {opt.label}
        </Tabs.Panel>
      ))}
    </Tabs>
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
  hideLabel?: boolean;
};

export function InspectorSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  className = "",
  hideLabel = false,
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
      {hideLabel ? null : (
        <Label className="social-tool-label !mb-1.5 !normal-case !tracking-normal">
          {label}
        </Label>
      )}
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
  action?: React.ReactNode;
};

function formatAxisValue(value: number, precision = 0) {
  const safe = Number.isFinite(value) ? value : 0;
  if (precision <= 0) return Math.round(safe);
  const factor = 10 ** precision;
  return Math.round(safe * factor) / factor;
}

/** Figma-style X/Y/Z pill inputs for transform rows. */
export function InspectorTransformRow({
  label,
  fields,
  locked = false,
  action,
}: InspectorTransformRowProps) {
  return (
    <div className="social-transform-row">
      <div className="social-transform-row-label">
        <span>{label}</span>
        {locked ? <Lock className="social-transform-lock" aria-hidden /> : null}
      </div>
      <div className="social-transform-row-controls">
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
        {action ? <div className="social-transform-row-action">{action}</div> : null}
      </div>
    </div>
  );
}

type InspectorSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onInteractionStart?: () => void;
  onInteractionEnd?: (value: number) => void;
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
  onInteractionStart,
  onInteractionEnd,
  min,
  max,
  step = 1,
  format = defaultFormat,
  "aria-label": ariaLabel,
}: InspectorSliderProps) {
  const safeValue = Number.isFinite(value) ? value : min;
  const draggingRef = useRef(false);
  const latestRef = useRef(safeValue);
  latestRef.current = safeValue;

  function ensureDragging() {
    if (draggingRef.current) return;
    draggingRef.current = true;
    onInteractionStart?.();
  }

  function finishDragging(final: number) {
    if (!draggingRef.current) {
      onChange(final);
      return;
    }
    draggingRef.current = false;
    latestRef.current = final;
    onInteractionEnd?.(final);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="social-tool-row-label">{label}</span>
        <span className="font-mono text-xs text-text-tertiary">
          {format(safeValue)}
        </span>
      </div>
      <Slider
        aria-label={ariaLabel ?? label}
        className="w-full"
        minValue={min}
        maxValue={max}
        step={step}
        value={safeValue}
        onChange={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number" && !Number.isNaN(n)) {
            ensureDragging();
            latestRef.current = n;
            onChange(n);
          }
        }}
        onChangeEnd={(next) => {
          const n = Array.isArray(next) ? next[0] : next;
          if (typeof n === "number" && !Number.isNaN(n)) {
            finishDragging(n);
          }
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

/**
 * Inspector slider with local RAF preview; commits once on pointer-up.
 * Pass coalesce callbacks so a drag is a single undo step.
 */
export function InspectorLiveSlider({
  label,
  value,
  onChange,
  onCoalesceBegin,
  onCoalesceEnd,
  min,
  max,
  step = 1,
  format = defaultFormat,
  "aria-label": ariaLabel,
}: Omit<InspectorSliderProps, "onInteractionStart" | "onInteractionEnd"> & {
  onCoalesceBegin?: () => void;
  onCoalesceEnd?: () => void;
}) {
  const live = useLiveSliderValue(
    value,
    onChange,
    onCoalesceBegin,
    onCoalesceEnd,
  );

  return (
    <InspectorSlider
      label={label}
      value={live.display}
      onChange={live.onLiveChange}
      onInteractionStart={live.onInteractionStart}
      onInteractionEnd={live.onInteractionEnd}
      min={min}
      max={max}
      step={step}
      format={format}
      aria-label={ariaLabel}
    />
  );
}

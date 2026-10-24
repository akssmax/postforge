"use client";

import { Input, Label, TextArea, TextField } from "@heroui/react";
import { InspectorSelect, InspectorSlider, InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import type { NodeField } from "@/lib/canvas/fields";

const UNSET = "__unset";

type Props = {
  field: NodeField;
  value: unknown;
  /** `coalesce` is set while a slider drags, so one drag is one undo step. */
  onChange: (value: unknown, coalesce?: string) => void;
};

/** One inspector row for a declarative field (node properties and agent tweaks). */
export function CanvasFieldControl({ field, value, onChange }: Props) {
  switch (field.kind) {
    case "textarea":
      return (
        <TextField fullWidth value={String(value ?? "")} onChange={(next) => onChange(next, `text:${field.path}`)}>
          <Label className="social-tool-label">{field.label}</Label>
          <TextArea rows={3} className="min-h-[4.5rem] resize-y" />
        </TextField>
      );
    case "text":
      return (
        <TextField
          fullWidth
          value={String(value ?? "")}
          onChange={(next) => {
            const trimmed = next.trim();
            // An empty optional text field removes it (e.g. custom colour).
            if (field.path === "colorHex") {
              if (!trimmed) onChange(undefined);
              else if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) onChange(trimmed);
              return;
            }
            onChange(next, `text:${field.path}`);
          }}
        >
          <Label className="social-tool-label">{field.label}</Label>
          <Input placeholder={field.placeholder} />
        </TextField>
      );
    case "select": {
      const options = field.optional ? [{ id: UNSET, label: "Default" }, ...field.options] : field.options;
      return (
        <InspectorSelect
          label={field.label}
          value={value === undefined || value === null ? UNSET : String(value)}
          options={options}
          onChange={(next) => onChange(next === UNSET ? undefined : next)}
        />
      );
    }
    case "segment": {
      const options = field.optional ? [{ id: UNSET, label: "Auto" }, ...field.options] : field.options;
      return (
        <div className="space-y-1.5">
          <span className="social-tool-label">{field.label}</span>
          <InspectorTextSegment
            aria-label={field.label}
            size="sm"
            value={value === undefined || value === null ? UNSET : String(value)}
            options={options}
            onChange={(next) => onChange(next === UNSET ? undefined : next)}
          />
        </div>
      );
    }
    case "slider":
      return (
        <InspectorSlider
          label={field.label}
          min={field.min}
          max={field.max}
          step={field.step}
          value={typeof value === "number" ? value : field.fallback}
          onChange={(next) => onChange(next, `slider:${field.path}`)}
          onInteractionEnd={(next) => onChange(next, `slider:${field.path}`)}
        />
      );
  }
}

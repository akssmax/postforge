"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button, Label, Switch, TextArea, Tooltip } from "@heroui/react";
import {
  InspectorSegment,
  InspectorSelect,
  InspectorLiveSlider,
} from "@/components/social-tool/InspectorControls";
import type { EditableTextSlot } from "@/lib/social-tool/layoutAdapter";
import {
  SOCIAL_FONTS,
  type SocialFontId,
  type TextAlign,
} from "@/lib/social-tool/presets";

const ALIGN_OPTIONS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
] as const;

type Props = {
  showContent: boolean;
  onShowContentChange: (value: boolean) => void;
  editableSlots: EditableTextSlot[];
  onUpdateTextSlot: (slotId: string, text: string) => void;
  onClearTextSlot?: (slotId: string) => void;
  textAlign: TextAlign;
  onTextAlignChange: (value: TextAlign) => void;
  headingFont: SocialFontId;
  onHeadingFontChange: (value: SocialFontId) => void;
  subFont: SocialFontId;
  onSubFontChange: (value: SocialFontId) => void;
  typeScale: number;
  onTypeScaleChange: (value: number) => void;
  onHistoryCoalesceBegin?: (key: string) => void;
  onHistoryCoalesceEnd?: (key?: string) => void;
  copyVariantIndex?: number;
  copyVariantCount?: number;
  onCycleCopyVariant?: (delta: 1 | -1) => void;
};

function slotFieldId(slotId: string): string {
  return `content-slot-${slotId}`;
}

function isMultilineRole(role: EditableTextSlot["role"]): boolean {
  return role === "body" || role === "caption" || role === "contact";
}

function isPrimaryContentRole(role: EditableTextSlot["role"]): boolean {
  return role === "headline" || role === "subheading";
}

function isSlotVisible(
  slot: EditableTextSlot,
  retainedEmptySlotIds: ReadonlySet<string>,
): boolean {
  if (isPrimaryContentRole(slot.role)) return true;
  if (slot.text.trim().length > 0) return true;
  return retainedEmptySlotIds.has(slot.slotId);
}

export function ContentPanel({
  showContent,
  onShowContentChange,
  editableSlots,
  onUpdateTextSlot,
  onClearTextSlot,
  textAlign,
  onTextAlignChange,
  headingFont,
  onHeadingFontChange,
  subFont,
  onSubFontChange,
  typeScale,
  onTypeScaleChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
  copyVariantIndex = 0,
  copyVariantCount = 0,
  onCycleCopyVariant,
}: Props) {
  const showVariantCycle = !!onCycleCopyVariant && copyVariantCount > 1;
  const [retainedEmptySlotIds, setRetainedEmptySlotIds] = useState(
    () => new Set<string>(),
  );

  const visibleSlots = editableSlots.filter((slot) =>
    isSlotVisible(slot, retainedEmptySlotIds),
  );

  function retainEmptySlot(slotId: string) {
    setRetainedEmptySlotIds((prev) => {
      if (prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.add(slotId);
      return next;
    });
  }

  function releaseEmptySlot(slotId: string) {
    setRetainedEmptySlotIds((prev) => {
      if (!prev.has(slotId)) return prev;
      const next = new Set(prev);
      next.delete(slotId);
      return next;
    });
  }

  function handleClearSlot(slot: EditableTextSlot) {
    if (onClearTextSlot) {
      onClearTextSlot(slot.slotId);
    } else {
      onUpdateTextSlot(slot.slotId, "");
    }
    releaseEmptySlot(slot.slotId);
  }

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Content</p>
        <div className="flex items-center gap-2">
          {showVariantCycle ? (
            <div
              className="copy-variant-cycle"
              role="group"
              aria-label="Copy variants"
            >
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label="Previous copy variant"
                    onPress={() => onCycleCopyVariant?.(-1)}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Previous variant</Tooltip.Content>
              </Tooltip>
              <span className="copy-variant-cycle-label text-xs text-text-tertiary">
                {copyVariantIndex + 1}/{copyVariantCount}
              </span>
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label="Next copy variant"
                    onPress={() => onCycleCopyVariant?.(1)}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>Next variant</Tooltip.Content>
              </Tooltip>
            </div>
          ) : null}
          <Switch
            size="sm"
            isSelected={showContent}
            onChange={onShowContentChange}
            aria-label="Show content on canvas"
          >
            Show
          </Switch>
        </div>
      </div>

      <div className="space-y-3">
        {visibleSlots.map((slot) => {
          const fieldId = slotFieldId(slot.slotId);
          const multiline = isMultilineRole(slot.role);
          const retainOnFocus = !isPrimaryContentRole(slot.role);
          return (
            <div key={slot.slotId} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={fieldId} className="text-xs text-text-secondary">
                  {slot.label}
                </Label>
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      aria-label={`Remove ${slot.label}`}
                      onPress={() => handleClearSlot(slot)}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    <p className="layout-shuffle-tooltip-title">
                      Remove {slot.label}
                    </p>
                  </Tooltip.Content>
                </Tooltip>
              </div>
              <TextArea
                id={fieldId}
                value={slot.text}
                onChange={(e) => onUpdateTextSlot(slot.slotId, e.target.value)}
                onFocus={() => {
                  if (retainOnFocus) retainEmptySlot(slot.slotId);
                }}
                onBlur={(e) => {
                  if (
                    retainOnFocus &&
                    e.currentTarget.value.trim().length === 0
                  ) {
                    releaseEmptySlot(slot.slotId);
                  }
                }}
                rows={
                  multiline
                    ? slot.role === "body"
                      ? 3
                      : 2
                    : slot.role === "headline"
                      ? 2
                      : 1
                }
                className="content-slot-textarea w-full"
                data-slot-role={slot.role}
              />
              {slot.role === "headline" ? (
                <p className="text-[0.6875rem] text-text-tertiary">
                  Use [[text]] for emphasis
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="social-tool-row">
        <span className="social-tool-row-label">Align</span>
        <InspectorSegment
          aria-label="Text alignment"
          value={textAlign}
          onChange={(value) => onTextAlignChange(value as TextAlign)}
          options={ALIGN_OPTIONS.map((opt) => ({
            id: opt.id,
            label: opt.label,
            icon: opt.icon,
          }))}
        />
      </div>

      <InspectorSelect
        label="Heading font"
        value={headingFont}
        onChange={(value) => onHeadingFontChange(value as SocialFontId)}
        options={SOCIAL_FONTS.map((font) => ({
          id: font.id,
          label: font.label,
        }))}
      />

      <InspectorSelect
        label="Subheading font"
        value={subFont}
        onChange={(value) => onSubFontChange(value as SocialFontId)}
        options={SOCIAL_FONTS.map((font) => ({
          id: font.id,
          label: font.label,
        }))}
      />

      <InspectorLiveSlider
        label="Type scale"
        value={typeScale}
        min={0.85}
        max={1.15}
        step={0.01}
        onChange={onTypeScaleChange}
        onCoalesceBegin={
          onHistoryCoalesceBegin
            ? () => onHistoryCoalesceBegin("typeScale")
            : undefined
        }
        onCoalesceEnd={
          onHistoryCoalesceEnd
            ? () => onHistoryCoalesceEnd("typeScale")
            : undefined
        }
      />
    </section>
  );
}

"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Key } from "@heroui/react";
import {
  Button,
  ListBox,
  Modal,
  Popover,
  Select,
  Tooltip,
  useOverlayState,
} from "@heroui/react";
import { PlatformIcon } from "@/components/social-tool/PlatformIcon";
import type { CanvasSpec } from "@/lib/design/types";
import { resolveArtboardLabel } from "@/lib/design-engine/canvasSpec";
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

type BadgeProps = {
  platformId: PlatformId;
  canvasSpec?: CanvasSpec;
  artifactId?: string;
};

type BadgePickerProps = {
  value: PlatformId;
  onChange: (value: PlatformId) => void;
  canvasSpec?: CanvasSpec;
  artifactId?: string;
  disabled?: boolean;
};

function platformMeta(preset: (typeof PLATFORM_PRESETS)[number]): string {
  if (preset.sizeLabel) return preset.sizeLabel;
  return `${preset.width}×${preset.height}`;
}

function PlatformOptionButton({
  preset,
  isCurrent,
  onSelect,
}: {
  preset: (typeof PLATFORM_PRESETS)[number];
  isCurrent: boolean;
  onSelect: (id: PlatformId) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={isCurrent}
      className={`canvas-platform-option-button${isCurrent ? " is-current" : ""}`}
      onClick={() => onSelect(preset.id)}
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
    </button>
  );
}

function PlatformListItems({
  currentValue,
  onSelect,
}: {
  currentValue?: PlatformId;
  onSelect?: (id: PlatformId) => void;
} = {}) {
  return (
    <>
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
    </>
  );
}

export function CanvasPlatformBadge({
  platformId,
  canvasSpec,
  artifactId,
}: BadgeProps) {
  const label = resolveArtboardLabel({ platformId, canvasSpec, artifactId });

  return (
    <div
      className="canvas-platform-pill canvas-platform-pill-badge"
      aria-label={`Artboard: ${label}`}
    >
      <span className="canvas-platform-pill-value">
        <PlatformIcon platformId={platformId} />
        <span className="canvas-platform-pill-label" title={label}>
          {label}
        </span>
      </span>
    </div>
  );
}

export function CanvasPlatformBadgePicker({
  value,
  onChange,
  canvasSpec,
  artifactId,
  disabled = false,
}: BadgePickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingPlatformId, setPendingPlatformId] = useState<PlatformId | null>(
    null,
  );
  const pendingPlatformRef = useRef<PlatformId | null>(null);
  const confirmModal = useOverlayState({
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        pendingPlatformRef.current = null;
        setPendingPlatformId(null);
      }
    },
  });

  const label = resolveArtboardLabel({
    platformId: value,
    canvasSpec,
    artifactId,
  });
  const pendingPreset = pendingPlatformId ? getPlatform(pendingPlatformId) : null;

  function requestPlatformChange(next: PlatformId) {
    setPickerOpen(false);
    if (next === value) return;
    pendingPlatformRef.current = next;
    setPendingPlatformId(next);
    window.requestAnimationFrame(() => confirmModal.open());
  }

  function confirmPlatformChange() {
    const next = pendingPlatformRef.current ?? pendingPlatformId;
    if (!next) return;
    pendingPlatformRef.current = null;
    onChange(next);
    confirmModal.close();
  }

  return (
    <>
      <Popover isOpen={pickerOpen} onOpenChange={setPickerOpen}>
        <Popover.Trigger>
          <Tooltip delay={500}>
            <Tooltip.Trigger>
              <button
                type="button"
                className="canvas-platform-pill canvas-platform-pill-badge canvas-platform-pill-badge-trigger"
                aria-label={`Artboard: ${label}. Change artboard size.`}
                disabled={disabled}
              >
                <span className="canvas-platform-pill-value">
                  <PlatformIcon platformId={value} />
                  <span className="canvas-platform-pill-label" title={label}>
                    {label}
                  </span>
                  <ChevronDown className="canvas-platform-pill-chevron" aria-hidden />
                </span>
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" offset={8}>
              Change artboard size
            </Tooltip.Content>
          </Tooltip>
        </Popover.Trigger>
        <Popover.Content className="min-w-[16rem] p-1">
          <div
            className="canvas-platform-menu"
            role="listbox"
            aria-label="Artboard size"
          >
            {PLATFORM_PRESETS.map((preset) => (
              <PlatformOptionButton
                key={preset.id}
                preset={preset}
                isCurrent={preset.id === value}
                onSelect={requestPlatformChange}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover>

      <Modal state={confirmModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Change artboard size?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                {pendingPreset ? (
                  <p className="text-sm text-text-secondary">
                    Switch to{" "}
                    <span className="font-semibold text-text-primary">
                      {platformOptionLabel(pendingPreset)}
                    </span>
                    . Your existing design will be adapted to the new dimensions — type,
                    logo, and featured visuals will be rescaled, and the layout may change
                    if it is not compatible with this format.
                  </p>
                ) : null}
              </Modal.Body>
              <Modal.Footer className="gap-2">
                <Button variant="secondary" onPress={confirmModal.close}>
                  Cancel
                </Button>
                <Button variant="primary" onPress={confirmPlatformChange}>
                  Adapt design
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
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
          <PlatformListItems />
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

"use client";

import { useMemo, useRef } from "react";
import { ImagePlus, RotateCcw, Shuffle, Trash2 } from "lucide-react";
import { Button, Switch } from "@heroui/react";
import {
  InspectorSlider,
  InspectorTransformRow,
} from "@/components/social-tool/InspectorControls";
import {
  DEFAULT_FEATURED_TRANSFORM,
  type FeaturedImageTransform,
} from "@/components/social-tool/templates/ProductShotPost";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";
import {
  featuredVisualKindLabel,
  isFeaturedVisualKind,
  type FeaturedVisualKind,
} from "@/lib/social-tool/featuredVisualKind";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type GenerateOptions = {
  pickFeatured?: boolean;
  preferredKind?: FeaturedVisualKind;
  slotId?: string;
};

type Props = {
  showFeaturedBlock: boolean;
  onShowFeaturedBlockChange: (value: boolean) => void;
  mode: FeaturedBlockMode;
  visualBlocks: VisualBlockRecord[];
  activeBlockId?: string | null;
  generatingVisualBlocks?: boolean;
  featuredVisualKind?: FeaturedVisualKind;
  brandColors?: { primary?: string; accent?: string };
  selectedSlotId?: string;
  featuredSlotIds?: string[];
  onSelectFeaturedSlot?: (slotId: string) => void;
  onGenerateVisualBlocks: (
    source?: "library" | "generate",
    options?: GenerateOptions,
  ) => void;
  onShuffleVisualBlock: (
    preferredKind?: FeaturedVisualKind,
    slotId?: string,
  ) => void;
  onSelectVisualBlock: (blockId: string, slotId?: string) => void;
  image: {
    fileName?: string;
    svgMarkup?: string;
  } | null;
  imageSrc?: string | null;
  uploading?: boolean;
  error?: string | null;
  onUploadImage: (file: File) => Promise<void>;
  onRemoveImage: () => Promise<void>;
  featuredTransform: FeaturedImageTransform;
  onFeaturedTransformChange: (next: FeaturedImageTransform) => void;
};

const KIND_OPTIONS: { id: FeaturedVisualKind; label: string }[] = [
  { id: "ui", label: "UI" },
  { id: "illustration", label: "Illustration" },
  { id: "3d", label: "3D" },
];

export function FeaturedBlockPanel({
  showFeaturedBlock,
  onShowFeaturedBlockChange,
  mode,
  visualBlocks,
  activeBlockId,
  generatingVisualBlocks = false,
  featuredVisualKind,
  onGenerateVisualBlocks,
  onShuffleVisualBlock,
  onSelectVisualBlock,
  selectedSlotId,
  featuredSlotIds,
  onSelectFeaturedSlot,
  image,
  imageSrc,
  uploading = false,
  error,
  onUploadImage,
  onRemoveImage,
  featuredTransform,
  onFeaturedTransformChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showImageUpload = mode === "image";
  const targetSlotId = selectedSlotId;

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return null;
    return visualBlocks.find((block) => block.id === activeBlockId) ?? null;
  }, [activeBlockId, visualBlocks]);

  const activeKind: FeaturedVisualKind = isFeaturedVisualKind(activeBlock?.kind)
    ? activeBlock.kind
    : featuredVisualKind ?? "ui";

  function switchKind(nextKind: FeaturedVisualKind) {
    if (nextKind === activeKind && activeBlock) return;
    const existing =
      visualBlocks.find(
        (block) => block.kind === nextKind && block.id !== activeBlockId,
      ) ?? visualBlocks.find((block) => block.kind === nextKind);
    if (existing) {
      onSelectVisualBlock(existing.id, targetSlotId);
      return;
    }
    onGenerateVisualBlocks("library", {
      pickFeatured: true,
      preferredKind: nextKind,
      slotId: targetSlotId,
    });
  }

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Visuals</p>
        <Switch
          size="sm"
          isSelected={showFeaturedBlock}
          onChange={onShowFeaturedBlockChange}
          aria-label="Show visuals"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>

      {showFeaturedBlock ? (
        <div className="social-transform-panel space-y-3">
          {featuredSlotIds && featuredSlotIds.length > 1 ? (
            <div className="featured-slot-chips flex gap-1 rounded-lg border border-leap-line p-1">
              {featuredSlotIds.map((slotId, index) => {
                const selected = (selectedSlotId ?? featuredSlotIds[0]) === slotId;
                return (
                  <button
                    key={slotId}
                    type="button"
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "bg-surface-secondary text-text-primary shadow-sm"
                        : "text-text-tertiary hover:text-text-secondary"
                    }`}
                    onClick={() => onSelectFeaturedSlot?.(slotId)}
                  >
                    Slot {index + 1}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="featured-visual-kind-toggle flex gap-1 rounded-lg border border-leap-line p-1">
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  activeKind === option.id
                    ? "bg-surface-secondary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
                disabled={generatingVisualBlocks}
                onClick={() => switchKind(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs text-text-tertiary">
              {activeBlock
                ? activeBlock.label
                : `No ${featuredVisualKindLabel(activeKind).toLowerCase()} yet`}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              isDisabled={generatingVisualBlocks}
              onPress={() => onShuffleVisualBlock(activeKind, targetSlotId)}
            >
              <Shuffle className="size-3.5" />
              {generatingVisualBlocks ? "Shuffling…" : "Shuffle"}
            </Button>
          </div>

          <div className="featured-image-upload-actions flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUploadImage(file);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              isDisabled={uploading}
              onPress={() => inputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              {image ? "Replace upload" : "Upload"}
            </Button>
            {image ? (
              <Button variant="outline" size="sm" onPress={() => void onRemoveImage()}>
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            ) : null}
          </div>

          {showImageUpload && image ? (
            <div className="featured-image-upload-preview">
              {image.svgMarkup ? (
                <div
                  className="featured-image-upload-thumb"
                  dangerouslySetInnerHTML={{ __html: image.svgMarkup }}
                />
              ) : imageSrc ? (
                <div className="featured-image-upload-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageSrc} alt="" className="featured-image-upload-thumb-img" />
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              {mode === "composed" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  isDisabled={generatingVisualBlocks}
                  onPress={() =>
                    onGenerateVisualBlocks("library", {
                      pickFeatured: true,
                      preferredKind: featuredVisualKind,
                      slotId: targetSlotId,
                    })
                  }
                >
                  <RotateCcw className="size-3.5" />
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}

          {showFeaturedBlock &&
          (mode === "composed" || mode === "genui" || mode === "image") ? (
            <div className="social-transform-block border-t border-leap-line pt-3">
              <p className="social-transform-heading">Transform</p>
              <div className="space-y-3">
                <InspectorTransformRow
                  label="Position"
                  fields={[
                    {
                      key: "x",
                      value: featuredTransform.x,
                      onChange: (x) =>
                        onFeaturedTransformChange({ ...featuredTransform, x }),
                      step: 1,
                      precision: 1,
                    },
                    {
                      key: "y",
                      value: featuredTransform.y,
                      onChange: (y) =>
                        onFeaturedTransformChange({ ...featuredTransform, y }),
                      step: 1,
                      precision: 1,
                    },
                    {
                      key: "z",
                      value: featuredTransform.z,
                      onChange: (z) =>
                        onFeaturedTransformChange({ ...featuredTransform, z }),
                      step: 5,
                    },
                  ]}
                  action={
                    <button
                      type="button"
                      className="social-transform-reset"
                      aria-label="Reset transform"
                      title="Reset transform"
                      onClick={() =>
                        onFeaturedTransformChange({ ...DEFAULT_FEATURED_TRANSFORM })
                      }
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                  }
                />
                <InspectorSlider
                  label="Scale"
                  value={featuredTransform.scale}
                  onChange={(scale) =>
                    onFeaturedTransformChange({ ...featuredTransform, scale })
                  }
                  min={0.12}
                  max={4}
                  step={0.01}
                  format={(v) => `${v.toFixed(2)}×`}
                />
                <InspectorSlider
                  label="Rotate X"
                  value={featuredTransform.rotateX}
                  onChange={(rotateX) =>
                    onFeaturedTransformChange({ ...featuredTransform, rotateX })
                  }
                  min={-60}
                  max={60}
                  step={1}
                  format={(v) => `${Math.round(v)}°`}
                />
                <InspectorSlider
                  label="Rotate Y"
                  value={featuredTransform.rotateY}
                  onChange={(rotateY) =>
                    onFeaturedTransformChange({ ...featuredTransform, rotateY })
                  }
                  min={-60}
                  max={60}
                  step={1}
                  format={(v) => `${Math.round(v)}°`}
                />
                <InspectorSlider
                  label="Rotate Z"
                  value={featuredTransform.rotateZ}
                  onChange={(rotateZ) =>
                    onFeaturedTransformChange({ ...featuredTransform, rotateZ })
                  }
                  min={-45}
                  max={45}
                  step={1}
                  format={(v) => `${Math.round(v)}°`}
                />
                <InspectorSlider
                  label="Perspective"
                  value={featuredTransform.perspective}
                  onChange={(perspective) =>
                    onFeaturedTransformChange({ ...featuredTransform, perspective })
                  }
                  min={400}
                  max={2400}
                  step={50}
                  format={(v) => `${Math.round(v)}px`}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

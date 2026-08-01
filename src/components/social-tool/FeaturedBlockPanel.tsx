"use client";

import { useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Search, Shuffle, Trash2 } from "lucide-react";
import { Button, Switch, Tooltip } from "@heroui/react";
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
import { imageFileFromDataTransfer } from "@/lib/social-tool/featuredImageDrop";

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
  onUploadImage: (file: File, slotId?: string) => Promise<void>;
  onRemoveImage: (slotId?: string) => Promise<void>;
  onApplyStockPhoto?: (
    photo: {
      id: string;
      url: string;
      photographer: string;
      attribution: string;
      downloadUrl?: string;
    },
    slotId?: string,
  ) => void;
  stockAttribution?: string | null;
  featuredTransform: FeaturedImageTransform;
  onFeaturedTransformChange: (next: FeaturedImageTransform) => void;
};

const KIND_OPTIONS: { id: FeaturedVisualKind | "photo"; label: string }[] = [
  { id: "ui", label: "UI" },
  { id: "illustration", label: "Illustration" },
  { id: "3d", label: "3D" },
  { id: "photo", label: "Photo" },
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
  onApplyStockPhoto,
  stockAttribution,
  featuredTransform,
  onFeaturedTransformChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);
  const [stockQuery, setStockQuery] = useState("");
  const [stockLoading, setStockLoading] = useState(false);
  const [stockPage, setStockPage] = useState(1);
  const [stockOrientation, setStockOrientation] = useState<
    "squarish" | "portrait" | "landscape"
  >("squarish");
  const [stockResults, setStockResults] = useState<
    Array<{
      id: string;
      url: string;
      thumbUrl: string;
      photographer: string;
      attribution: string;
      downloadUrl?: string;
    }>
  >([]);
  const [photoTabSelected, setPhotoTabSelected] = useState(mode === "image");
  const photoTabActive = photoTabSelected || mode === "image";
  const targetSlotId = selectedSlotId ?? featuredSlotIds?.[0];

  const activeBlock = useMemo(() => {
    if (!activeBlockId) return null;
    return visualBlocks.find((block) => block.id === activeBlockId) ?? null;
  }, [activeBlockId, visualBlocks]);

  const activeKind: FeaturedVisualKind = isFeaturedVisualKind(activeBlock?.kind)
    ? activeBlock.kind
    : featuredVisualKind ?? "ui";

  async function searchStockPhotos(options?: { append?: boolean; page?: number }) {
    const query = stockQuery.trim();
    if (!query || !onApplyStockPhoto) return;
    const page = options?.page ?? (options?.append ? stockPage + 1 : 1);
    setStockLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: "8",
        page: String(page),
        orientation: stockOrientation,
      });
      const response = await fetch(`/api/stock/unsplash/search?${params.toString()}`);
      if (!response.ok) return;
      const payload = (await response.json()) as {
        results?: Array<{
          id: string;
          url: string;
          thumbUrl: string;
          photographer: string;
          attribution: string;
          downloadUrl?: string;
        }>;
      };
      const next = payload.results ?? [];
      setStockResults((current) => (options?.append ? [...current, ...next] : next));
      setStockPage(page);
    } finally {
      setStockLoading(false);
    }
  }

  function switchKind(nextKind: FeaturedVisualKind | "photo") {
    if (nextKind === "photo") {
      setPhotoTabSelected(true);
      return;
    }
    setPhotoTabSelected(false);
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
                  (option.id === "photo" ? photoTabActive : activeKind === option.id)
                    ? "bg-surface-secondary text-text-primary shadow-sm"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
                disabled={generatingVisualBlocks && option.id !== "photo"}
                onClick={() => switchKind(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {photoTabActive ? (
            <>
              <div
                className={`featured-image-upload-actions flex flex-wrap gap-2${dropActive ? " is-drop-active" : ""}`}
                onDragOver={(ev) => {
                  if (![...ev.dataTransfer.types].includes("Files")) return;
                  ev.preventDefault();
                  ev.dataTransfer.dropEffect = "copy";
                  setDropActive(true);
                }}
                onDragLeave={(ev) => {
                  if (ev.currentTarget.contains(ev.relatedTarget as Node)) return;
                  setDropActive(false);
                }}
                onDrop={(ev) => {
                  ev.preventDefault();
                  setDropActive(false);
                  const file = imageFileFromDataTransfer(ev.dataTransfer);
                  if (file) void onUploadImage(file, targetSlotId);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUploadImage(file, targetSlotId);
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
                  {image ? "Replace upload" : "Upload photo"}
                </Button>
                {image ? (
                  <Button variant="outline" size="sm" onPress={() => void onRemoveImage(targetSlotId)}>
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>

              {onApplyStockPhoto ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-secondary">Unsplash</p>
                  <div className="flex gap-2">
                    <select
                      value={stockOrientation}
                      onChange={(e) =>
                        setStockOrientation(
                          e.target.value as "squarish" | "portrait" | "landscape",
                        )
                      }
                      className="rounded-md border border-leap-line bg-surface px-2 py-1.5 text-xs"
                      aria-label="Photo orientation"
                    >
                      <option value="squarish">Square</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                    <input
                      type="search"
                      value={stockQuery}
                      onChange={(e) => setStockQuery(e.target.value)}
                      placeholder="Search Unsplash…"
                      className="min-w-0 flex-1 rounded-md border border-leap-line bg-surface px-2 py-1.5 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void searchStockPhotos();
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={stockLoading || !stockQuery.trim()}
                      onPress={() => void searchStockPhotos()}
                      aria-label="Search stock photos"
                    >
                      {stockLoading ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Search className="size-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>
                  {stockResults.length > 0 ? (
                    <div className="grid grid-cols-4 gap-1.5">
                      {stockResults.map((photo) => (
                        <button
                          key={photo.id}
                          type="button"
                          className="aspect-square overflow-hidden rounded-md border border-leap-line"
                          onClick={() =>
                            onApplyStockPhoto(
                              {
                                id: photo.id,
                                url: photo.url,
                                photographer: photo.photographer,
                                attribution: photo.attribution,
                                downloadUrl: photo.downloadUrl,
                              },
                              targetSlotId,
                            )
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.thumbUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {stockResults.length > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      isDisabled={stockLoading || !stockQuery.trim()}
                      onPress={() => void searchStockPhotos({ append: true })}
                    >
                      Load more
                    </Button>
                  ) : null}
                  {stockAttribution ? (
                    <p className="text-[10px] leading-snug text-text-tertiary">{stockAttribution}</p>
                  ) : null}
                </div>
              ) : null}

              {mode === "image" && image ? (
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
            </>
          ) : (
            <>
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

          <div
            className={`featured-image-upload-actions flex flex-wrap gap-2${dropActive ? " is-drop-active" : ""}`}
            onDragOver={(ev) => {
              if (![...ev.dataTransfer.types].includes("Files")) return;
              ev.preventDefault();
              ev.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }}
            onDragLeave={(ev) => {
              if (ev.currentTarget.contains(ev.relatedTarget as Node)) return;
              setDropActive(false);
            }}
            onDrop={(ev) => {
              ev.preventDefault();
              setDropActive(false);
              const file = imageFileFromDataTransfer(ev.dataTransfer);
              if (file) void onUploadImage(file, targetSlotId);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUploadImage(file, targetSlotId);
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
              <Button variant="outline" size="sm" onPress={() => void onRemoveImage(targetSlotId)}>
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            ) : null}
            <p className="w-full text-[11px] text-text-tertiary">
              Or drop / paste an image onto the canvas slot
            </p>
          </div>

          {onApplyStockPhoto ? (
            <div className="mt-1 space-y-2 border-t border-leap-line pt-3">
              <p className="text-xs font-medium text-text-secondary">Quick stock search</p>
              <div className="flex gap-2">
                <input
                  type="search"
                  value={stockQuery}
                  onChange={(e) => setStockQuery(e.target.value)}
                  placeholder="Search Unsplash…"
                  className="min-w-0 flex-1 rounded-md border border-leap-line bg-surface px-2 py-1.5 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void searchStockPhotos();
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  isDisabled={stockLoading || !stockQuery.trim()}
                  onPress={() => {
                    setPhotoTabSelected(true);
                    void searchStockPhotos();
                  }}
                  aria-label="Search stock photos"
                >
                  {stockLoading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Search className="size-3.5" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          ) : null}
            </>
          )}

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
                    <Tooltip delay={500}>
                      <Tooltip.Trigger>
                        <Button
                          variant="secondary"
                          size="sm"
                          isIconOnly
                          className="social-transform-reset"
                          aria-label="Reset transform"
                          onPress={() =>
                            onFeaturedTransformChange({
                              ...DEFAULT_FEATURED_TRANSFORM,
                            })
                          }
                        >
                          <RotateCcw className="size-3.5" aria-hidden />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content placement="bottom" offset={8}>
                        <p className="layout-shuffle-tooltip-title">
                          Reset transform
                        </p>
                      </Tooltip.Content>
                    </Tooltip>
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

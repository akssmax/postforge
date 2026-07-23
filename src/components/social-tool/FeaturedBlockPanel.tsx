"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Switch } from "@heroui/react";
import {
  InspectorSelect,
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
  type FeaturedVisualKind,
} from "@/lib/social-tool/featuredVisualKind";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type GenerateOptions = {
  pickFeatured?: boolean;
  preferredKind?: FeaturedVisualKind;
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
  onGenerateVisualBlocks: (
    source?: "library" | "generate",
    options?: GenerateOptions,
  ) => void;
  onSelectVisualBlock: (blockId: string) => void;
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

function VisualKindSection({
  kind,
  label,
  blocks,
  activeBlockId,
  generating,
  onPick,
  onSelect,
}: {
  kind: FeaturedVisualKind;
  label: string;
  blocks: VisualBlockRecord[];
  activeBlockId?: string | null;
  generating: boolean;
  onPick: () => void;
  onSelect: (blockId: string) => void;
}) {
  const options = useMemo(
    () =>
      blocks.map((block) => ({
        id: block.id,
        label: block.label,
        description: block.kind,
      })),
    [blocks],
  );

  const activeInSection = blocks.find((block) => block.id === activeBlockId) ?? null;

  return (
    <div className="featured-visual-kind-section space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {label}
        </p>
        <Button
          variant="outline"
          size="sm"
          isDisabled={generating}
          onPress={onPick}
        >
          {generating ? "Picking…" : blocks.length > 0 ? `Swap ${label.toLowerCase()}` : `Pick ${label.toLowerCase()}`}
        </Button>
      </div>

      {blocks.length > 0 ? (
        <InspectorSelect
          label={`Active ${label.toLowerCase()}`}
          value={activeInSection?.id ?? ""}
          onChange={onSelect}
          options={options}
          placeholder={`Select ${label.toLowerCase()}`}
        />
      ) : (
        <p className="text-[11px] leading-4 text-text-tertiary">
          No {label.toLowerCase()} selected yet.
        </p>
      )}
    </div>
  );
}

export function FeaturedBlockPanel({
  showFeaturedBlock,
  onShowFeaturedBlockChange,
  mode,
  visualBlocks,
  activeBlockId,
  generatingVisualBlocks = false,
  featuredVisualKind,
  onGenerateVisualBlocks,
  onSelectVisualBlock,
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

  const uiBlocks = useMemo(
    () => visualBlocks.filter((block) => block.kind === "ui"),
    [visualBlocks],
  );
  const illustrationBlocks = useMemo(
    () => visualBlocks.filter((block) => block.kind === "illustration"),
    [visualBlocks],
  );

  const activeBlock = useMemo(() => {
    if (visualBlocks.length === 0) return null;
    return (
      visualBlocks.find((block) => block.id === activeBlockId) ?? visualBlocks[0] ?? null
    );
  }, [activeBlockId, visualBlocks]);

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Visual slot</p>
        <Switch
          size="sm"
          isSelected={showFeaturedBlock}
          onChange={onShowFeaturedBlockChange}
          aria-label="Show visual slot"
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
          {featuredVisualKind ? (
            <p className="text-[11px] leading-4 text-text-tertiary">
              Brief intent prefers{" "}
              <span className="font-medium text-text-secondary">
                {featuredVisualKindLabel(featuredVisualKind).toLowerCase()}s
              </span>{" "}
              in the featured slot.
            </p>
          ) : null}

          {activeBlock ? (
            <div className="rounded-xl border border-leap-line px-3 py-2.5">
              <p className="text-sm font-medium text-text-primary">{activeBlock.label}</p>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-text-tertiary">
                Active · {activeBlock.kind}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-leap-line px-3 py-2.5">
              <p className="text-sm font-medium text-text-primary">No visual selected</p>
              <p className="mt-0.5 text-[11px] leading-4 text-text-tertiary">
                Pick a UI block for product proof, or an illustration for brand and story.
              </p>
            </div>
          )}

          <VisualKindSection
            kind="ui"
            label="UI blocks"
            blocks={uiBlocks}
            activeBlockId={activeBlockId}
            generating={generatingVisualBlocks}
            onPick={() =>
              onGenerateVisualBlocks("library", {
                pickFeatured: true,
                preferredKind: "ui",
              })
            }
            onSelect={onSelectVisualBlock}
          />

          <VisualKindSection
            kind="illustration"
            label="Illustrations"
            blocks={illustrationBlocks}
            activeBlockId={activeBlockId}
            generating={generatingVisualBlocks}
            onPick={() =>
              onGenerateVisualBlocks("library", {
                pickFeatured: true,
                preferredKind: "illustration",
              })
            }
            onSelect={onSelectVisualBlock}
          />

          <div className="featured-visual-actions flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              isDisabled={generatingVisualBlocks}
              onPress={() => onGenerateVisualBlocks("generate")}
            >
              Generate custom SVG
            </Button>
          </div>

          <p className="text-[11px] leading-4 text-text-tertiary">
            Library patterns are instant.{" "}
            <Link href="/visuals" className="text-brand-600 hover:underline dark:text-brand-400">
              Browse all visuals
            </Link>
          </p>

          <div className="featured-image-upload-card">
            <div className="featured-image-upload-meta">
              <p className="text-sm font-medium text-text-primary">Upload asset</p>
              <p className="text-xs text-text-tertiary">
                Optional — upload any image (PNG, JPG, WebP) or a custom SVG to replace the
                library visual.
              </p>
              <div className="featured-image-upload-actions">
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
                  {image ? "Replace asset" : "Upload asset"}
                </Button>
                {image ? (
                  <Button variant="outline" size="sm" onPress={() => void onRemoveImage()}>
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
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
          </div>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          {showFeaturedBlock &&
          (mode === "composed" || mode === "genui" || mode === "image") ? (
            <div className="social-transform-block">
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
                  min={0.6}
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

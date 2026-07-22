"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button, Switch, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import {
  InspectorSelect,
  InspectorSlider,
  InspectorTransformRow,
} from "@/components/social-tool/InspectorControls";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import type { UseFeaturedBlockReturn } from "@/lib/social-tool/useFeaturedBlock";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";
import type { ProductPageId } from "@/lib/social-tool/presets";
import { PRODUCT_PAGES } from "@/lib/social-tool/presets";

type Props = Pick<
  UseFeaturedBlockReturn,
  | "mode"
  | "setMode"
  | "productPage"
  | "setProductPage"
  | "image"
  | "imageSrc"
  | "uploading"
  | "error"
  | "uploadImage"
  | "removeImage"
> & {
  showFeaturedBlock: boolean;
  onShowFeaturedBlockChange: (value: boolean) => void;
  featuredTransform: FeaturedImageTransform;
  onFeaturedTransformChange: (next: FeaturedImageTransform) => void;
};

export function FeaturedBlockPanel({
  showFeaturedBlock,
  onShowFeaturedBlockChange,
  mode,
  setMode,
  productPage,
  setProductPage,
  image,
  imageSrc,
  uploading,
  error,
  uploadImage,
  removeImage,
  featuredTransform,
  onFeaturedTransformChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="social-tool-section-title !mb-0">Featured block</p>
        <Switch
          size="sm"
          isSelected={showFeaturedBlock}
          onChange={onShowFeaturedBlockChange}
          aria-label="Show featured block"
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
          <ToggleButtonGroup
            aria-label="Featured block type"
            selectionMode="single"
            disallowEmptySelection
            size="sm"
            className="social-tool-segment featured-block-mode-segment"
            selectedKeys={new Set([mode])}
            onSelectionChange={(keys) => {
              const next = [...keys][0];
              if (next === "image" || next === "genui") {
                setMode(next as FeaturedBlockMode);
              }
            }}
          >
            <ToggleButton id="image" className="px-3 text-xs font-semibold">
              Image
            </ToggleButton>
            <ToggleButtonGroup.Separator />
            <ToggleButton id="genui" className="px-3 text-xs font-semibold">
              GenUI
            </ToggleButton>
          </ToggleButtonGroup>

          {mode === "image" ? (
            <div className="featured-image-upload-card">
              <div className="featured-image-upload-preview">
                {image ? (
                  image.svgMarkup ? (
                    <div
                      className="featured-image-upload-thumb"
                      dangerouslySetInnerHTML={{ __html: image.svgMarkup }}
                    />
                  ) : imageSrc ? (
                    <div className="featured-image-upload-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageSrc}
                        alt=""
                        className="featured-image-upload-thumb-img"
                      />
                    </div>
                  ) : (
                    <div className="featured-image-upload-thumb-empty" />
                  )
                ) : (
                  <div className="featured-image-upload-thumb-empty" />
                )}
              </div>
              <div className="featured-image-upload-meta">
                <p className="text-sm font-medium text-text-primary">
                  {image ? image.fileName : "No image yet"}
                </p>
                <p className="text-xs text-text-tertiary">
                  PNG, JPG, WebP, or SVG up to 5 MB
                </p>
                <div className="featured-image-upload-actions">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadImage(file);
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
                    {image ? "Replace" : "Upload"}
                  </Button>
                  {image ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => void removeImage()}
                    >
                      <Trash2 className="size-3.5" />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              <InspectorSelect
                label="UI block"
                value={productPage}
                onChange={(v) => setProductPage(v as ProductPageId)}
                options={PRODUCT_PAGES.map((p) => ({
                  id: p.id,
                  label: p.label,
                  description: p.description,
                }))}
              />
              <p className="text-[11px] leading-4 text-text-tertiary">
                Example CRM screens for now. AI-generated branded UI blocks coming
                soon.
              </p>
            </>
          )}

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

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
              />
              <InspectorSlider
                label="Scale"
                value={featuredTransform.scale}
                onChange={(scale) =>
                  onFeaturedTransformChange({ ...featuredTransform, scale })
                }
                min={0.6}
                max={1.6}
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
        </div>
      ) : null}
    </section>
  );
}

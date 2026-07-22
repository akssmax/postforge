"use client";

import { useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ImagePlus,
  PanelBottom,
  PanelTop,
  Trash2,
} from "lucide-react";
import { Button, Disclosure, Switch } from "@heroui/react";
import { BrandColorPicker } from "@/components/social-tool/BrandColorPicker";
import {
  InspectorSegment,
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import type { UseBrandKitReturn } from "@/lib/brand/useBrandKit";
import type { BrandColors } from "@/lib/brand/types";
import type { LogoAlign, LogoPlacement } from "@/lib/social-tool/presets";

const LOGO_PLACEMENT_OPTIONS = [
  { id: "top", label: "Top", icon: PanelTop },
  { id: "footer", label: "Footer", icon: PanelBottom },
] as const;

const LOGO_ALIGN_OPTIONS = [
  { id: "left", label: "Left", icon: AlignLeft },
  { id: "center", label: "Center", icon: AlignCenter },
  { id: "right", label: "Right", icon: AlignRight },
] as const;

type Props = Pick<
  UseBrandKitReturn,
  | "kit"
  | "uploading"
  | "error"
  | "uploadLogo"
  | "removeLogo"
  | "setColor"
  | "resetColor"
  | "applySwatch"
  | "harmonySwatches"
> & {
  showBrand: boolean;
  onShowBrandChange: (value: boolean) => void;
  logoScale: number;
  onLogoScaleChange: (value: number) => void;
  logoPlacement: LogoPlacement;
  onLogoPlacementChange: (value: LogoPlacement) => void;
  logoAlign: LogoAlign;
  onLogoAlignChange: (value: LogoAlign) => void;
  defaultExpanded?: boolean;
};

const COLOR_ROLES: { key: Exclude<keyof BrandColors, "extracted">; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "neutral", label: "Neutral" },
];

export function BrandPanel({
  kit,
  uploading,
  error,
  uploadLogo,
  removeLogo,
  setColor,
  resetColor,
  applySwatch,
  harmonySwatches,
  showBrand,
  onShowBrandChange,
  logoScale,
  onLogoScaleChange,
  logoPlacement,
  onLogoPlacementChange,
  logoAlign,
  onLogoAlignChange,
  defaultExpanded = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSvgLogo = kit.logo?.mime === "image/svg+xml";

  return (
    <section className="social-tool-section brand-panel">
      <Disclosure
        className="brand-panel-disclosure"
        defaultExpanded={defaultExpanded}
      >
        <Disclosure.Heading className="brand-panel-disclosure-heading">
          <div className="brand-panel-disclosure-header">
            <Disclosure.Trigger className="brand-disclosure-trigger brand-panel-disclosure-trigger">
              <span className="social-tool-section-title !mb-0">Brand</span>
              <Disclosure.Indicator className="brand-disclosure-indicator brand-panel-disclosure-indicator">
                <ChevronDown className="size-4" />
              </Disclosure.Indicator>
            </Disclosure.Trigger>
            <div
              className="brand-panel-disclosure-switch"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                size="sm"
                isSelected={showBrand}
                onChange={onShowBrandChange}
                aria-label="Show brand on canvas"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>
          </div>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className="brand-panel-disclosure-body">
            {showBrand ? (
              <>
                <p className="text-[11px] leading-4 text-text-tertiary">
                  Upload SVG or PNG. SVG unlocks live contrast checks on the canvas.
                </p>

                <div className="brand-upload-card">
            <div className="brand-upload-preview">
              {kit.logo ? (
                kit.logo.svgMarkup ? (
                  <div
                    className="brand-upload-thumb brand-logo-inline"
                    dangerouslySetInnerHTML={{ __html: kit.logo.svgMarkup }}
                  />
                ) : kit.logoSrc ? (
                  <div className="brand-upload-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={kit.logoSrc} alt="" className="brand-upload-thumb-img" />
                  </div>
                ) : (
                  <div className="brand-logo-placeholder brand-upload-thumb-empty" />
                )
              ) : (
                <div className="brand-logo-placeholder brand-upload-thumb-empty" />
              )}
            </div>
            <div className="brand-upload-meta">
              <p className="text-sm font-medium text-text-primary">
                {kit.logo ? kit.logo.fileName : "No logo yet"}
              </p>
              <p className="text-xs text-text-tertiary">
                {hasSvgLogo
                  ? "Contrast checks enabled"
                  : kit.logo
                    ? "Upload SVG for contrast checks"
                    : "Placeholder shows on canvas until upload"}
              </p>
              <div className="brand-upload-actions">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".svg,.png,image/svg+xml,image/png"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadLogo(file);
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
                  {kit.logo ? "Replace" : "Upload"}
                </Button>
                {kit.logo ? (
                  <Button variant="outline" size="sm" onPress={() => void removeLogo()}>
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="brand-panel-block">
            <p className="social-tool-label !mb-3">Logo</p>
            <div className="space-y-3">
              <InspectorSlider
                label="Scale"
                value={logoScale}
                onChange={onLogoScaleChange}
                min={0.5}
                max={3}
                step={0.05}
                format={(v) =>
                  `${v.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}×`
                }
                aria-label="Logo scale"
              />
              <div className="social-tool-row">
                <span className="social-tool-row-label">Placement</span>
                <InspectorSegment
                  aria-label="Logo placement"
                  value={logoPlacement}
                  onChange={(v) => onLogoPlacementChange(v as LogoPlacement)}
                  options={[...LOGO_PLACEMENT_OPTIONS]}
                />
              </div>
              <div className="social-tool-row">
                <span className="social-tool-row-label">Align</span>
                <InspectorSegment
                  aria-label="Logo alignment"
                  value={logoAlign}
                  onChange={(v) => onLogoAlignChange(v as LogoAlign)}
                  options={[...LOGO_ALIGN_OPTIONS]}
                />
              </div>
            </div>
          </div>

          <Disclosure className="brand-colors-disclosure">
            <Disclosure.Heading>
              <Disclosure.Trigger className="brand-disclosure-trigger brand-colors-disclosure-trigger">
                <span>Brand colors</span>
                <Disclosure.Indicator className="brand-disclosure-indicator brand-colors-disclosure-indicator">
                  <ChevronDown className="size-4" />
                </Disclosure.Indicator>
              </Disclosure.Trigger>
            </Disclosure.Heading>
            <Disclosure.Content>
              <Disclosure.Body className="brand-colors-disclosure-body">
                <div className="brand-color-grid">
                  {COLOR_ROLES.map(({ key, label }) => (
                    <BrandColorPicker
                      key={key}
                      label={label}
                      value={kit.colors[key] as string}
                      extracted={kit.colors.extracted?.[key] as string | undefined}
                      onChange={(hex) => setColor(key, hex)}
                      onReset={() => resetColor(key)}
                    />
                  ))}
                </div>

                <div className="brand-panel-block-inner">
                  <p className="social-tool-label !mb-2">Suggested palette</p>
                  <div className="brand-harmony-row">
                    {harmonySwatches.map((swatch) => (
                      <button
                        key={swatch.id}
                        type="button"
                        className="brand-harmony-swatch"
                        style={{ background: swatch.hex }}
                        title={`${swatch.label} → ${swatch.role}`}
                        aria-label={`Apply ${swatch.label} as ${swatch.role}`}
                        onClick={() => applySwatch(swatch.hex, swatch.role)}
                      />
                    ))}
                  </div>
                </div>
              </Disclosure.Body>
            </Disclosure.Content>
          </Disclosure>
              </>
            ) : (
              <p className="text-[11px] leading-4 text-text-tertiary">
                Brand is hidden on the canvas. Turn it on to show your logo.
              </p>
            )}
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>
    </section>
  );
}

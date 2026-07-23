"use client";

import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@heroui/react";
import {
  BRAND_LOGO_VARIANT_META,
  BRAND_LOGO_VARIANTS,
  getKitCompleteness,
  getLogoRecord,
} from "@/lib/brand/logoVariants";
import type { BrandKitRuntime, BrandLogoVariant } from "@/lib/brand/types";

type Props = {
  kit: BrandKitRuntime;
  uploading: boolean;
  uploadLogoVariant: (variant: BrandLogoVariant, file: File) => Promise<void>;
  removeLogoVariant: (variant: BrandLogoVariant) => Promise<void>;
};

function LogoVariantCard({
  variant,
  kit,
  uploading,
  uploadLogoVariant,
  removeLogoVariant,
}: Props & { variant: BrandLogoVariant }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = BRAND_LOGO_VARIANT_META[variant];
  const record = getLogoRecord(kit, variant);
  const src = kit.logoSrcs?.[variant] ?? (variant === "primary" ? kit.logoSrc : null);

  return (
    <div className="brand-kit-card">
      <div className="brand-kit-card-preview">
        {record?.svgMarkup ? (
          <div
            className={`brand-kit-card-thumb brand-logo-inline${
              variant === "onLight" ? " brand-logo-inline--mono-dark" : ""
            }${variant === "onDark" ? " brand-logo-inline--mono-light" : ""}`}
            dangerouslySetInnerHTML={{ __html: record.svgMarkup }}
          />
        ) : src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="brand-kit-card-img" />
        ) : (
          <div className="brand-kit-card-empty" />
        )}
      </div>
      <div className="brand-kit-card-meta">
        <p className="brand-kit-card-label">{meta.label}</p>
        <p className="brand-kit-card-hint">{meta.hint}</p>
        <p className="brand-kit-card-formats">{meta.formats}</p>
      </div>
      <div className="brand-kit-card-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadLogoVariant(variant, file);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          isDisabled={uploading}
          aria-label={`Upload ${meta.label} logo`}
          onPress={() => inputRef.current?.click()}
        >
          <ImagePlus className="size-3.5" />
          {record ? "Replace" : "Upload"}
        </Button>
        {record ? (
          <Button
            variant="outline"
            size="sm"
            aria-label={`Remove ${meta.label} logo`}
            onPress={() => void removeLogoVariant(variant)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function BrandLogoKitGrid(props: Props) {
  const completeness = getKitCompleteness(props.kit);

  return (
    <div className="brand-kit-grid-wrap">
      <div className="brand-kit-grid-header">
        <p className="social-tool-label !mb-0">Brand kit</p>
        <span
          className={`brand-kit-status${completeness.ready ? " is-ready" : ""}`}
        >
          {completeness.ready
            ? "Kit complete"
            : `${completeness.missing.length} missing`}
        </span>
      </div>
      <p className="brand-kit-grid-hint">
        Upload purpose-built logos so generation picks the right mark on light,
        dark, and pattern backgrounds.
      </p>
      <div className="brand-kit-grid">
        {BRAND_LOGO_VARIANTS.map((variant) => (
          <LogoVariantCard key={variant} {...props} variant={variant} />
        ))}
      </div>
    </div>
  );
}

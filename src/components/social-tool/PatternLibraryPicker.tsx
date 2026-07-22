"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, Trash2, Upload } from "lucide-react";
import { Popover, Switch } from "@heroui/react";
import { generateBrandPatterns } from "@/lib/social-tool/patterns/brandPatterns";
import {
  LIBRARY_PATTERNS,
  libraryPatternRef,
} from "@/lib/social-tool/patterns/library";
import { isPatternNone } from "@/lib/social-tool/patterns/migratePatternRef";
import {
  addCustomPattern,
  customPatternRefForRecord,
  deleteCustomPattern,
  listCustomPatterns,
  parsePatternSvgFile,
} from "@/lib/social-tool/patterns/patternStorage";
import {
  brandPatternRef,
  listLegacyPatternOptions,
  resolvePattern,
} from "@/lib/social-tool/patterns/resolvePattern";
import { svgToDataUrl, tintSvgMarkup } from "@/lib/social-tool/patterns/tintSvg";
import type {
  CustomPatternRecord,
  PatternCategory,
  PatternRef,
  PatternScope,
} from "@/lib/social-tool/patterns/types";

type Props = {
  pattern: PatternRef;
  onPatternChange: (value: PatternRef) => void;
  patternTint?: string;
  designId?: string;
  logoSvgMarkup?: string | null;
  logoMime?: string | null;
};

const CATEGORY_LABELS: Record<PatternCategory, string> = {
  lines: "Lines",
  dots: "Dots",
  geometric: "Geometric",
  organic: "Organic",
  texture: "Texture",
};

function PatternSwatch({
  active,
  label,
  previewStyle,
  onSelect,
  onDelete,
}: {
  active: boolean;
  label: string;
  previewStyle?: React.CSSProperties;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="pattern-lib-swatch-wrap">
      <button
        type="button"
        className={`pattern-lib-swatch${active ? " is-active" : ""}`}
        style={previewStyle}
        aria-pressed={active}
        aria-label={label}
        title={label}
        onClick={onSelect}
      >
        {active ? (
          <Check className="pattern-lib-swatch-check" strokeWidth={2.5} />
        ) : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          className="pattern-lib-swatch-delete"
          aria-label={`Delete ${label}`}
          title="Delete pattern"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </div>
  );
}

function tilePreviewStyle(svg: string, color: string, tileW: number, tileH: number) {
  return {
    backgroundImage: svgToDataUrl(tintSvgMarkup(svg, color)),
    backgroundSize: `${Math.max(6, Math.round(tileW / 2))}px ${Math.max(6, Math.round(tileH / 2))}px`,
    backgroundRepeat: "repeat",
  } as React.CSSProperties;
}

function PatternPreviewSwatch({
  patternRef,
  color,
  designId,
  logoSvgMarkup,
}: {
  patternRef: PatternRef;
  color: string;
  designId?: string;
  logoSvgMarkup?: string | null;
}) {
  const resolved = resolvePattern(patternRef, designId);

  if (resolved.kind === "none") {
    return { background: "transparent" } as React.CSSProperties;
  }

  if (resolved.kind === "library") {
    return tilePreviewStyle(
      resolved.def.svg,
      color,
      resolved.def.tileWidth,
      resolved.def.tileHeight,
    );
  }

  if (resolved.kind === "custom") {
    return tilePreviewStyle(
      resolved.record.svgMarkup,
      color,
      resolved.record.tileWidth,
      resolved.record.tileHeight,
    );
  }

  if (resolved.kind === "brand" && logoSvgMarkup) {
    const brand = generateBrandPatterns(logoSvgMarkup, color).find(
      (p) => p.id === resolved.brandId,
    );
    if (brand) {
      return tilePreviewStyle(
        brand.svgMarkup,
        color,
        brand.tileWidth,
        brand.tileHeight,
      );
    }
  }

  if (resolved.kind === "legacy") {
    if (resolved.legacyId === "footer") {
      return {
        backgroundImage:
          "repeating-linear-gradient(135deg, color-mix(in oklab, var(--swatch) 35%, transparent) 0 2px, transparent 2px 10px)",
        ["--swatch" as string]: color,
      } as React.CSSProperties;
    }
    if (resolved.legacyId === "outline") {
      return {
        background: `radial-gradient(circle at 80% 70%, color-mix(in oklab, ${color} 40%, transparent), transparent 65%)`,
      };
    }
    if (resolved.legacyId === "monogram-soft") {
      return {
        background: `radial-gradient(circle at 50% 100%, color-mix(in oklab, ${color} 25%, transparent), transparent 70%)`,
      };
    }
    return {
      background: `radial-gradient(circle at 50% 100%, color-mix(in oklab, ${color} 35%, transparent), transparent 72%)`,
    };
  }

  return { background: color, opacity: 0.2 };
}

export function PatternLibraryPicker({
  pattern,
  onPatternChange,
  patternTint = "#4BB793",
  designId,
  logoSvgMarkup,
  logoMime,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [customPatterns, setCustomPatterns] = useState<CustomPatternRecord[]>([]);
  const [uploadScope, setUploadScope] = useState<PatternScope>("global");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasSvgLogo =
    logoMime === "image/svg+xml" && !!logoSvgMarkup?.trim();

  const refreshCustom = useCallback(() => {
    setCustomPatterns(listCustomPatterns(designId));
  }, [designId]);

  const resolved = resolvePattern(pattern, designId);
  const activeLabel =
    resolved.kind === "library"
      ? resolved.def.label
      : resolved.kind === "brand"
        ? resolved.label
        : resolved.kind === "custom"
          ? resolved.record.name
          : resolved.kind === "legacy"
            ? listLegacyPatternOptions().find((o) => o.ref === resolved.ref)
                ?.label ?? "Pattern"
            : "None";

  const libraryByCategory = useMemo(() => {
    const map = new Map<PatternCategory, typeof LIBRARY_PATTERNS>();
    for (const def of LIBRARY_PATTERNS) {
      const list = map.get(def.category) ?? [];
      list.push(def);
      map.set(def.category, list);
    }
    return map;
  }, []);

  const brandPatterns = useMemo(
    () => (hasSvgLogo && logoSvgMarkup ? generateBrandPatterns(logoSvgMarkup, patternTint) : []),
    [hasSvgLogo, logoSvgMarkup, patternTint],
  );

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const parsed = await parsePatternSvgFile(file);
      const record = addCustomPattern({
        name: file.name.replace(/\.svg$/i, "") || "Custom pattern",
        svgMarkup: parsed.svgMarkup,
        tileWidth: parsed.tileWidth,
        tileHeight: parsed.tileHeight,
        scope: uploadScope,
        designId,
      });
      refreshCustom();
      onPatternChange(customPatternRefForRecord(record) as PatternRef);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDeleteCustom = (id: string) => {
    if (!window.confirm("Remove this pattern from your library?")) return;
    deleteCustomPattern(id, designId);
    refreshCustom();
    if (pattern === `custom:${id}`) {
      onPatternChange("legacy:monogram");
    }
  };

  return (
    <Popover>
      <Popover.Trigger>
        <button type="button" className="pattern-lib-picker-trigger">
          <span
            className="pattern-lib-picker-preview"
            style={PatternPreviewSwatch({
              patternRef: pattern,
              color: patternTint,
              designId,
              logoSvgMarkup,
            })}
            aria-hidden
          />
          <span className="pattern-lib-picker-label">{activeLabel}</span>
        </button>
      </Popover.Trigger>
      <Popover.Content
        placement="bottom start"
        className="pattern-lib-popover-content"
        onOpenChange={(open) => {
          if (open) refreshCustom();
        }}
      >
        <Popover.Dialog className="pattern-lib-popover">
          {hasSvgLogo ? (
            <div className="pattern-lib-popover-section">
              <p className="pattern-lib-popover-heading">Brand</p>
              <div className="pattern-lib-grid">
                {brandPatterns.map((bp) => {
                  const ref = brandPatternRef(bp.id) as PatternRef;
                  return (
                    <PatternSwatch
                      key={bp.id}
                      active={pattern === ref}
                      label={bp.label}
                      previewStyle={tilePreviewStyle(
                        bp.svgMarkup,
                        patternTint,
                        bp.tileWidth,
                        bp.tileHeight,
                      )}
                      onSelect={() => onPatternChange(ref)}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pattern-lib-popover-section">
              <p className="pattern-lib-popover-heading">Brand</p>
              <p className="pattern-lib-hint">
                Upload an SVG logo to unlock brand patterns.
              </p>
            </div>
          )}

          <div className="pattern-lib-popover-divider" role="separator" />

          <div className="pattern-lib-popover-section">
            <p className="pattern-lib-popover-heading">Library</p>
            {Array.from(libraryByCategory.entries()).map(([category, defs]) => (
              <div key={category} className="pattern-lib-category-block">
                <p className="pattern-lib-category-label">
                  {CATEGORY_LABELS[category]}
                </p>
                <div className="pattern-lib-grid">
                  {defs.map((def) => {
                    const ref = libraryPatternRef(def.id) as PatternRef;
                    return (
                      <PatternSwatch
                        key={def.id}
                        active={pattern === ref}
                        label={def.label}
                        previewStyle={tilePreviewStyle(
                          def.svg,
                          patternTint,
                          def.tileWidth,
                          def.tileHeight,
                        )}
                        onSelect={() => onPatternChange(ref)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="pattern-lib-popover-divider" role="separator" />

          <div className="pattern-lib-popover-section">
            <p className="pattern-lib-popover-heading">Custom</p>
            <div className="pattern-lib-upload-row">
              <input
                ref={fileRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="sr-only"
                onChange={(e) => void handleUpload(e.target.files?.[0])}
              />
              <button
                type="button"
                className="pattern-lib-upload-btn"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-3.5" />
                {uploading ? "Uploading…" : "Upload SVG"}
              </button>
              {designId ? (
                <label className="pattern-lib-scope-toggle">
                  <Switch
                    size="sm"
                    isSelected={uploadScope === "design"}
                    onChange={(checked) =>
                      setUploadScope(checked ? "design" : "global")
                    }
                  >
                    <Switch.Content>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                  <span>This design only</span>
                </label>
              ) : null}
            </div>
            {uploadError ? (
              <p className="pattern-lib-error">{uploadError}</p>
            ) : null}
            {customPatterns.length > 0 ? (
              <div className="pattern-lib-grid">
                {customPatterns.map((record) => {
                  const ref = customPatternRefForRecord(record) as PatternRef;
                  return (
                    <PatternSwatch
                      key={record.id}
                      active={pattern === ref}
                      label={record.name}
                      previewStyle={tilePreviewStyle(
                        record.svgMarkup,
                        patternTint,
                        record.tileWidth,
                        record.tileHeight,
                      )}
                      onSelect={() => onPatternChange(ref)}
                      onDelete={() => handleDeleteCustom(record.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="pattern-lib-hint">No custom patterns yet.</p>
            )}
          </div>

          <div className="pattern-lib-popover-divider" role="separator" />

          <div className="pattern-lib-popover-section">
            <p className="pattern-lib-popover-heading">Postforge legacy</p>
            <div className="pattern-lib-grid">
              {listLegacyPatternOptions().map((option) => (
                <PatternSwatch
                  key={option.ref}
                  active={pattern === option.ref}
                  label={option.label}
                  previewStyle={PatternPreviewSwatch({
                    patternRef: option.ref,
                    color: patternTint,
                    designId,
                    logoSvgMarkup,
                  })}
                  onSelect={() => onPatternChange(option.ref)}
                />
              ))}
            </div>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export { isPatternNone };

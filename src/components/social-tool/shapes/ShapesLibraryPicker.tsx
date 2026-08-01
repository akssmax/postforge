"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Shapes } from "lucide-react";
import { Button, Popover, Tooltip } from "@heroui/react";
import {
  SHAPE_CATALOG,
  SHAPES_BY_CATEGORY,
  searchShapeCatalog,
} from "@/lib/social-tool/shapes/catalog";
import {
  MAX_CANVAS_SHAPES,
  SHAPE_CATEGORIES,
  SHAPE_CATEGORY_LABELS,
  type ShapeCategory,
} from "@/lib/social-tool/shapes/types";

type Props = {
  shapeCount: number;
  brandColors?: { primary?: string; accent?: string };
  onAddShape: (libraryId: string) => void;
  compact?: boolean;
};

function ShapePreviewTile({
  svgMarkup,
  label,
  disabled,
  onClick,
}: {
  svgMarkup: string;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="shapes-picker-tile"
      disabled={disabled}
      onClick={onClick}
      aria-label={`Add ${label}`}
      title={label}
    >
      <span
        className="shapes-picker-tile__preview"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <span className="shapes-picker-tile__label">{label}</span>
    </button>
  );
}

export function ShapesLibraryPicker({
  shapeCount,
  brandColors,
  onAddShape,
  compact = false,
}: Props) {
  const atLimit = shapeCount >= MAX_CANVAS_SHAPES;
  const colors = {
    primary: brandColors?.primary ?? "#1E293B",
    accent: brandColors?.accent ?? "#7C9A92",
  };

  const categories = useMemo(
    () =>
      SHAPE_CATEGORIES.filter(
        (category) => (SHAPES_BY_CATEGORY[category]?.length ?? 0) > 0,
      ),
    [],
  );

  const [activeCategory, setActiveCategory] = useState<ShapeCategory>(
    categories[0] ?? "basic",
  );

  const activeEntries = SHAPES_BY_CATEGORY[activeCategory] ?? [];

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="social-tool-section-title !mb-0">Shapes</p>
        <span className="text-xs text-text-tertiary">
          {shapeCount}/{MAX_CANVAS_SHAPES}
        </span>
      </div>

      <Popover>
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Popover.Trigger>
              <Button
                size={compact ? "sm" : "md"}
                variant="secondary"
                isDisabled={atLimit}
                className="w-full"
              >
                <Shapes className="size-4 shrink-0" aria-hidden />
                {atLimit ? "Shape limit reached" : "Add shape"}
              </Button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Decorative shapes</p>
            <p className="layout-shuffle-tooltip-body">
              Add up to {MAX_CANVAS_SHAPES} shapes with absolute positioning on the canvas.
            </p>
          </Tooltip.Content>
        </Tooltip>
        <Popover.Content className="shapes-picker-popover" placement="left top">
          <div className="shapes-picker-popover__header">
            <p className="shapes-picker-popover__title">Shape library</p>
            <Link href="/visuals?kind=shapes" className="shapes-picker-popover__link">
              Browse all
            </Link>
          </div>

          <div className="shapes-picker-tabs" role="tablist" aria-label="Shape categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={`shapes-picker-tab${activeCategory === category ? " is-active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {SHAPE_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          <div
            className="shapes-picker-grid"
            role="tabpanel"
            aria-label={SHAPE_CATEGORY_LABELS[activeCategory]}
          >
            {activeEntries.map((entry) => (
              <ShapePreviewTile
                key={entry.id}
                label={entry.label}
                svgMarkup={entry.render(colors)}
                disabled={atLimit}
                onClick={() => onAddShape(entry.id)}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover>

      {shapeCount === 0 ? (
        <p className="text-xs text-text-tertiary">
          Blobs, stars, arrows, and frames — drag to position anywhere on the artboard.
        </p>
      ) : null}
    </section>
  );
}

export function ShapesLibrarySearchGrid({
  query,
  brandColors,
  onAddShape,
  shapeCount,
}: {
  query: string;
  brandColors?: { primary?: string; accent?: string };
  onAddShape?: (libraryId: string) => void;
  shapeCount?: number;
}) {
  const colors = {
    primary: brandColors?.primary ?? "#1E293B",
    accent: brandColors?.accent ?? "#7C9A92",
  };
  const entries = query.trim() ? searchShapeCatalog(query) : SHAPE_CATALOG;
  const atLimit = (shapeCount ?? 0) >= MAX_CANVAS_SHAPES;

  return (
    <div className="visuals-shapes-grid">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="visuals-shapes-grid__item"
          disabled={atLimit && !!onAddShape}
          onClick={onAddShape ? () => onAddShape(entry.id) : undefined}
          title={entry.label}
        >
          <div
            className="visuals-shapes-grid__preview"
            dangerouslySetInnerHTML={{ __html: entry.render(colors) }}
          />
          <span className="visuals-shapes-grid__label">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}

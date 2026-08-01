"use client";

import { memo, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Popover, Tooltip } from "@heroui/react";
import {
  ICON_CATALOG,
  searchIconCatalog,
} from "@/lib/social-tool/icons/catalog";
import { LucideIconGlyph } from "@/components/social-tool/icons/LucideIconGlyph";
import {
  ICON_CATEGORIES,
  ICON_CATEGORY_LABELS,
  MAX_CANVAS_ICONS,
  type IconCategory,
} from "@/lib/social-tool/icons/types";

type Props = {
  iconCount: number;
  brandColors?: { primary?: string; accent?: string };
  onAddIcon: (iconName: string) => void;
  compact?: boolean;
};

function IconPreviewTile({
  iconName,
  label,
  color,
  disabled,
  onClick,
}: {
  iconName: string;
  label: string;
  color: string;
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
      <span className="shapes-picker-tile__preview flex items-center justify-center">
        <LucideIconGlyph iconName={iconName} color={color} size={24} strokeWidth={2} />
      </span>
      <span className="shapes-picker-tile__label">{label}</span>
    </button>
  );
}

const MemoIconPreviewTile = memo(IconPreviewTile);

export function IconsLibraryPicker({
  iconCount,
  brandColors,
  onAddIcon,
  compact = false,
}: Props) {
  const atLimit = iconCount >= MAX_CANVAS_ICONS;
  const accent = brandColors?.accent ?? "#7C9A92";

  const categories = useMemo(
    () =>
      ICON_CATEGORIES.filter((category) =>
        ICON_CATALOG.some((entry) => entry.category === category),
      ),
    [],
  );

  const [activeCategory, setActiveCategory] = useState<IconCategory>(
    categories[0] ?? "ui",
  );

  const activeEntries = useMemo(
    () => ICON_CATALOG.filter((entry) => entry.category === activeCategory),
    [activeCategory],
  );

  return (
    <section className="social-tool-section space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="social-tool-section-title !mb-0">Icons</p>
        <span className="text-xs text-text-tertiary">
          {iconCount}/{MAX_CANVAS_ICONS}
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
                <Sparkles className="size-4 shrink-0" aria-hidden />
                {atLimit ? "Icon limit reached" : "Add icon"}
              </Button>
            </Popover.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Lucide icons</p>
            <p className="layout-shuffle-tooltip-body">
              Add up to {MAX_CANVAS_ICONS} recolorable icons on the canvas.
            </p>
          </Tooltip.Content>
        </Tooltip>
        <Popover.Content className="shapes-picker-popover" placement="left top">
          <div className="shapes-picker-popover__header">
            <p className="shapes-picker-popover__title">Icon library</p>
          </div>

          <div className="shapes-picker-tabs" role="tablist" aria-label="Icon categories">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={activeCategory === category}
                className={`shapes-picker-tab${activeCategory === category ? " is-active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {ICON_CATEGORY_LABELS[category]}
              </button>
            ))}
          </div>

          <div
            className="shapes-picker-grid"
            role="tabpanel"
            aria-label={ICON_CATEGORY_LABELS[activeCategory]}
          >
            {activeEntries.map((entry) => (
              <MemoIconPreviewTile
                key={entry.name}
                iconName={entry.name}
                label={entry.label}
                color={accent}
                disabled={atLimit}
                onClick={() => onAddIcon(entry.name)}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover>

      {iconCount === 0 ? (
        <p className="text-xs text-text-tertiary">
          Badges, arrows, and accents — drag to position on the artboard.
        </p>
      ) : null}
    </section>
  );
}

export function IconsLibrarySearchGrid({
  query,
  brandColors,
  onAddIcon,
  iconCount,
}: {
  query: string;
  brandColors?: { primary?: string; accent?: string };
  onAddIcon?: (iconName: string) => void;
  iconCount?: number;
}) {
  const accent = brandColors?.accent ?? "#7C9A92";
  const entries = useMemo(
    () => (query.trim() ? searchIconCatalog(query) : ICON_CATALOG),
    [query],
  );
  const atLimit = (iconCount ?? 0) >= MAX_CANVAS_ICONS;

  return (
    <div className="visuals-shapes-grid">
      {entries.map((entry) => (
          <button
            key={entry.name}
            type="button"
            className="visuals-shapes-grid__item"
            disabled={atLimit && !!onAddIcon}
            onClick={onAddIcon ? () => onAddIcon(entry.name) : undefined}
            title={entry.label}
          >
            <div className="visuals-shapes-grid__preview flex items-center justify-center">
              <LucideIconGlyph
                iconName={entry.name}
                color={accent}
                size={24}
                strokeWidth={2}
              />
            </div>
            <span className="visuals-shapes-grid__label">{entry.label}</span>
          </button>
        ))}
    </div>
  );
}

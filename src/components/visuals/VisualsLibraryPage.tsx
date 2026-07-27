"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import {
  ILLUSTRATION_SOURCE_LABELS,
  type IllustrationSource,
} from "@/lib/social-tool/visualBlocks/library/illustrations/manifest";
import { THREED_SOURCE_LABELS } from "@/lib/social-tool/visualBlocks/library/threeD/manifest";
import {
  VISUAL_LIBRARY,
  isIllustrationPattern,
  isParametricPattern,
  isThreeDPattern,
  type VisualLibraryPattern,
} from "@/lib/social-tool/visualBlocks/library/catalog";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import {
  buildDefaultUiContent,
  isUiReactPattern,
} from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockKind, VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import {
  SHAPE_CATALOG,
  SHAPES_BY_CATEGORY,
  searchShapeCatalog,
} from "@/lib/social-tool/shapes/catalog";
import {
  SHAPE_CATEGORIES,
  SHAPE_CATEGORY_LABELS,
  type ShapeCategory,
} from "@/lib/social-tool/shapes/types";
import "@/components/visuals/visuals.css";

const PREVIEW_COLORS = {
  primary: "#1E293B",
  accent: "#7C9A92",
  headline: "AI-native CRM that sells itself",
  theme: "Automate 80% of pipeline work",
};

type KindFilter = "all" | VisualBlockKind | "shapes";
type SourceFilter = "all" | IllustrationSource;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ui", label: "UI" },
  { id: "diagram", label: "Diagrams" },
  { id: "illustration", label: "Illustrations" },
  { id: "3d", label: "3D" },
  { id: "shapes", label: "Shapes" },
];

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "undraw", label: "unDraw" },
  { id: "open-doodles", label: "Open Doodles" },
  { id: "storyset", label: "Storyset" },
];

function parametricPreview(pattern: VisualLibraryPattern): string {
  if (!isParametricPattern(pattern)) return "";
  return pattern.render(PREVIEW_COLORS);
}

function matchesSearch(pattern: VisualLibraryPattern, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [pattern.label, pattern.description, pattern.id, ...pattern.tags]
    .join(" ")
    .toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((token) => haystack.includes(token));
}

const PAGE_SIZE = 60;

export function VisualsLibraryPage() {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedCategory, setExpandedCategory] = useState<ShapeCategory | null>(null);

  const filtered = useMemo(() => {
    if (kindFilter === "shapes") return [];
    return VISUAL_LIBRARY.filter((pattern) => {
      if (kindFilter !== "all" && pattern.kind !== kindFilter) return false;
      if (sourceFilter !== "all") {
        if (!isIllustrationPattern(pattern)) return false;
        if (pattern.source !== sourceFilter) return false;
      }
      return matchesSearch(pattern, search);
    });
  }, [kindFilter, sourceFilter, search]);

  const shapeEntries = useMemo(() => {
    if (kindFilter !== "shapes") return [];
    return search.trim() ? searchShapeCatalog(search) : SHAPE_CATALOG;
  }, [kindFilter, search]);

  const visible = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const hasMore = kindFilter !== "shapes" && visibleCount < filtered.length;

  const counts = useMemo(() => {
    const ui = VISUAL_LIBRARY.filter((p) => p.kind === "ui").length;
    const diagram = VISUAL_LIBRARY.filter((p) => p.kind === "diagram").length;
    const illustration = VISUAL_LIBRARY.filter((p) => p.kind === "illustration").length;
    const threeD = VISUAL_LIBRARY.filter((p) => p.kind === "3d").length;
    return {
      ui,
      diagram,
      illustration,
      threeD,
      shapes: SHAPE_CATALOG.length,
      total: VISUAL_LIBRARY.length + SHAPE_CATALOG.length,
    };
  }, []);

  return (
    <div className="visuals-page">
      <header className="visuals-page__header">
        <Link href="/" className="visuals-page__back">
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div>
          <p className="visuals-page__eyebrow">Visual blocks</p>
          <h1 className="visuals-page__title">Visuals library</h1>
          <p className="visuals-page__subtitle">
            {counts.total} ready-made assets — {counts.ui} HeroUI UI cards, {counts.diagram}{" "}
            diagrams, {counts.illustration} illustrations, {counts.threeD} 3D elements,{" "}
            {counts.shapes} decorative shapes.
          </p>
        </div>
      </header>

      <div className="visuals-page__toolbar">
        <div className="visuals-filters">
          <p className="visuals-filters__label">Type</p>
          <div className="visuals-filters__row">
            {KIND_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`visuals-filter-chip${kindFilter === filter.id ? " is-active" : ""}`}
                onClick={() => {
                  setKindFilter(filter.id);
                  setVisibleCount(PAGE_SIZE);
                  setExpandedCategory(null);
                }}
              >
                {filter.label}
                {filter.id !== "all" ? (
                  <span className="visuals-filter-chip__count">
                    {filter.id === "ui"
                      ? counts.ui
                      : filter.id === "diagram"
                        ? counts.diagram
                        : filter.id === "3d"
                          ? counts.threeD
                          : filter.id === "shapes"
                            ? counts.shapes
                            : counts.illustration}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {kindFilter !== "shapes" &&
          (kindFilter === "all" || kindFilter === "illustration") && (
          <div className="visuals-filters">
            <p className="visuals-filters__label">Illustration source</p>
            <div className="visuals-filters__row">
              {SOURCE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`visuals-filter-chip${sourceFilter === filter.id ? " is-active" : ""}`}
                  onClick={() => {
                    setSourceFilter(filter.id);
                    setVisibleCount(PAGE_SIZE);
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="visuals-search">
          <Search className="visuals-search__icon size-4" />
          <input
            type="search"
            className="visuals-search__input"
            placeholder={
              kindFilter === "shapes"
                ? "Search shapes by name or tag…"
                : "Search by name, tag, or id…"
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
          />
        </label>
      </div>

      {kindFilter === "shapes" ? (
        <>
          <p className="visuals-page__results">
            {shapeEntries.length} shape{shapeEntries.length === 1 ? "" : "s"}
            {search.trim() ? ` matching “${search.trim()}”` : ""}
          </p>
          <div className="visuals-shapes-categories">
            {SHAPE_CATEGORIES.map((category) => {
              const entries = (SHAPES_BY_CATEGORY[category] ?? []).filter((entry) =>
                shapeEntries.some((item) => item.id === entry.id),
              );
              if (entries.length === 0) return null;
              const expanded = expandedCategory === category;
              const visibleEntries = expanded ? entries : entries.slice(0, 8);
              return (
                <section key={category} className="visuals-shapes-category">
                  <div className="visuals-shapes-category__head">
                    <h2 className="visuals-shapes-category__title">
                      {SHAPE_CATEGORY_LABELS[category]}
                    </h2>
                    {entries.length > 8 ? (
                      <button
                        type="button"
                        className="visuals-shapes-category__see-all"
                        onClick={() =>
                          setExpandedCategory(expanded ? null : category)
                        }
                      >
                        {expanded ? "Show less" : "See all"}
                      </button>
                    ) : null}
                  </div>
                  <div className="visuals-shapes-row">
                    {visibleEntries.map((entry) => (
                      <article key={entry.id} className="visuals-shapes-card">
                        <div
                          className="visuals-shapes-card__preview"
                          dangerouslySetInnerHTML={{
                            __html: entry.render(PREVIEW_COLORS),
                          }}
                        />
                        <p className="visuals-shapes-card__label">{entry.label}</p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p className="visuals-page__results">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} matches
            {filtered.length !== counts.total ? ` (${counts.total} total)` : ""}
          </p>

          <div className="visuals-page__grid">
            {visible.map((pattern) => {
              const svg = parametricPreview(pattern);
              const asset =
                isIllustrationPattern(pattern) || isThreeDPattern(pattern);
              const uiReact = isParametricPattern(pattern) && isUiReactPattern(pattern.id);
              const previewBlock: VisualBlockRecord | null = uiReact
                ? {
                    id: `preview-${pattern.id}`,
                    libraryId: pattern.id,
                    label: pattern.label,
                    kind: pattern.kind,
                    svgMarkup: "",
                    content: buildDefaultUiContent(pattern.id, PREVIEW_COLORS),
                    createdAt: 0,
                    theme: PREVIEW_COLORS.theme,
                  }
                : null;
              return (
                <article key={pattern.id} className="visuals-card">
                  <div className="visuals-card__preview">
                    {uiReact && previewBlock ? (
                      <VisualBlockRenderer
                        block={previewBlock}
                        brandColors={{
                          primary: PREVIEW_COLORS.primary,
                          accent: PREVIEW_COLORS.accent,
                        }}
                        compact
                      />
                    ) : asset ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pattern.assetPath}
                        alt=""
                        className="visuals-card__preview-img"
                      />
                    ) : (
                      <div
                        className="visuals-card__preview-svg"
                        style={{
                          backgroundImage: svg
                            ? `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`
                            : undefined,
                        }}
                      />
                    )}
                  </div>
                  <div className="visuals-card__body">
                    <div className="visuals-card__meta">
                      <h2 className="visuals-card__label">{pattern.label}</h2>
                      <span className="visuals-card__kind">{pattern.kind}</span>
                    </div>
                    {isIllustrationPattern(pattern) ? (
                      <p className="visuals-card__source">
                        {ILLUSTRATION_SOURCE_LABELS[pattern.source]} · {pattern.licenseLabel}
                      </p>
                    ) : isThreeDPattern(pattern) ? (
                      <p className="visuals-card__source">
                        {THREED_SOURCE_LABELS[pattern.source]} · {pattern.licenseLabel}
                      </p>
                    ) : uiReact ? (
                      <p className="visuals-card__source">HeroUI · brand-themed</p>
                    ) : null}
                    <p className="visuals-card__description">{pattern.description}</p>
                    <p className="visuals-card__id">{pattern.id}</p>
                    <div className="visuals-card__tags">
                      {pattern.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="visuals-card__tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore ? (
            <div className="visuals-page__more">
              <button
                type="button"
                className="visuals-page__more-btn"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                Load more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="visuals-page__empty">No patterns match your filters.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import {
  ILLUSTRATION_SOURCE_LABELS,
  type IllustrationSource,
} from "@/lib/social-tool/visualBlocks/library/illustrations/manifest";
import {
  VISUAL_LIBRARY,
  isAssetPattern,
  isParametricPattern,
  type VisualLibraryPattern,
} from "@/lib/social-tool/visualBlocks/library/catalog";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import {
  buildDefaultUiContent,
  isUiReactPattern,
} from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockKind, VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import "@/components/visuals/visuals.css";

const PREVIEW_COLORS = {
  primary: "#1E293B",
  accent: "#7C9A92",
  headline: "AI-native CRM that sells itself",
  theme: "Automate 80% of pipeline work",
};

type KindFilter = "all" | VisualBlockKind;
type SourceFilter = "all" | IllustrationSource;

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ui", label: "UI" },
  { id: "diagram", label: "Diagrams" },
  { id: "illustration", label: "Illustrations" },
];

const SOURCE_FILTERS: { id: SourceFilter; label: string }[] = [
  { id: "all", label: "All sources" },
  { id: "undraw", label: "unDraw" },
  { id: "open-doodles", label: "Open Doodles" },
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

export function VisualsLibraryPage() {
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return VISUAL_LIBRARY.filter((pattern) => {
      if (kindFilter !== "all" && pattern.kind !== kindFilter) return false;
      if (sourceFilter !== "all") {
        if (!isAssetPattern(pattern)) return false;
        if (pattern.source !== sourceFilter) return false;
      }
      return matchesSearch(pattern, search);
    });
  }, [kindFilter, sourceFilter, search]);

  const counts = useMemo(() => {
    const ui = VISUAL_LIBRARY.filter((p) => p.kind === "ui").length;
    const diagram = VISUAL_LIBRARY.filter((p) => p.kind === "diagram").length;
    const illustration = VISUAL_LIBRARY.filter((p) => p.kind === "illustration").length;
    return { ui, diagram, illustration, total: VISUAL_LIBRARY.length };
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
            {counts.total} ready-made patterns — {counts.ui} HeroUI UI cards, {counts.diagram} diagrams,{" "}
            {counts.illustration} illustrations. Pick instantly in the designer; the AI can swap
            text in UI patterns without regenerating.
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
                onClick={() => setKindFilter(filter.id)}
              >
                {filter.label}
                {filter.id !== "all" ? (
                  <span className="visuals-filter-chip__count">
                    {filter.id === "ui"
                      ? counts.ui
                      : filter.id === "diagram"
                        ? counts.diagram
                        : counts.illustration}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {(kindFilter === "all" || kindFilter === "illustration") && (
          <div className="visuals-filters">
            <p className="visuals-filters__label">Illustration source</p>
            <div className="visuals-filters__row">
              {SOURCE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`visuals-filter-chip${sourceFilter === filter.id ? " is-active" : ""}`}
                  onClick={() => setSourceFilter(filter.id)}
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
            placeholder="Search by name, tag, or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <p className="visuals-page__results">
        Showing {filtered.length} of {counts.total}
      </p>

      <div className="visuals-page__grid">
        {filtered.map((pattern) => {
          const svg = parametricPreview(pattern);
          const asset = isAssetPattern(pattern);
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
                {asset ? (
                  <p className="visuals-card__source">
                    {ILLUSTRATION_SOURCE_LABELS[pattern.source]} · {pattern.licenseLabel}
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

      {filtered.length === 0 ? (
        <p className="visuals-page__empty">No patterns match your filters.</p>
      ) : null}
    </div>
  );
}

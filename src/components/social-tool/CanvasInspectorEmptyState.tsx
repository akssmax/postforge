"use client";

import type { LucideIcon } from "lucide-react";
import {
  Grid3x3,
  Image,
  MousePointer2,
  Palette,
  Sparkles,
  Type,
} from "lucide-react";

type SelectableArea = {
  id: string;
  icon: LucideIcon;
  label: string;
  description: string;
};

const SELECTABLE_AREAS: SelectableArea[] = [
  {
    id: "copy",
    icon: Type,
    label: "Copy",
    description: "Headline, subheading, and body text",
  },
  {
    id: "logo",
    icon: Palette,
    label: "Brand",
    description: "Logo, placement, and scale",
  },
  {
    id: "featured",
    icon: Image,
    label: "Visuals",
    description: "Featured image and UI blocks",
  },
  {
    id: "pattern",
    icon: Grid3x3,
    label: "Pattern",
    description: "Background texture and opacity",
  },
];

/** Shown in the Design sidebar when nothing on the canvas is selected. */
export function CanvasInspectorEmptyState() {
  return (
    <section
      className="design-inspector-empty social-tool-section"
      aria-label="Canvas inspector"
    >
      <div className="design-inspector-empty__intro">
        <div className="design-inspector-empty__icon" aria-hidden>
          <MousePointer2 className="size-4" />
        </div>
        <div className="design-inspector-empty__copy min-w-0">
          <p className="social-tool-section-title design-inspector-empty__eyebrow">
            Design inspector
          </p>
          <h2 className="design-inspector-empty__title">
            Click an element on the canvas
          </h2>
          <p className="design-inspector-empty__body">
            Select copy, brand, visuals, or pattern on your artboard to edit
            them here.
          </p>
        </div>
      </div>

      <div className="design-inspector-empty__preview" aria-hidden>
        <div className="design-inspector-empty__stage">
          <div className="design-inspector-empty__artboard">
            <div className="design-inspector-empty__artboard-bg" />
            <div className="design-inspector-empty__artboard-pattern" />

            <div className="design-inspector-empty__layer design-inspector-empty__layer--logo">
              <span className="design-inspector-empty__logo-mark">
                <span />
                <span />
                <span />
              </span>
            </div>

            <div className="design-inspector-empty__layer design-inspector-empty__layer--copy is-highlighted">
              <span className="design-inspector-empty__line design-inspector-empty__line--lg" />
              <span className="design-inspector-empty__line design-inspector-empty__line--md" />
              <span className="design-inspector-empty__line design-inspector-empty__line--sm" />
            </div>

            <div className="design-inspector-empty__layer design-inspector-empty__layer--visual">
              <div className="design-inspector-empty__mock-card">
                <div className="design-inspector-empty__mock-card-top">
                  <span className="design-inspector-empty__mock-dot" />
                  <span className="design-inspector-empty__mock-bar" />
                </div>
                <div className="design-inspector-empty__mock-chart">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="design-inspector-empty__cursor" aria-hidden>
              <MousePointer2 className="size-4" strokeWidth={2.25} />
            </div>
          </div>
        </div>
        <p className="design-inspector-empty__preview-caption">
          Click any layer on your canvas to inspect it
        </p>
      </div>

      <ul className="design-inspector-empty__areas" aria-label="Editable layers">
        {SELECTABLE_AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <li key={area.id} className="design-inspector-empty__area">
              <span className="design-inspector-empty__area-icon" aria-hidden>
                <Icon className="size-3.5" strokeWidth={2.25} />
              </span>
              <span className="design-inspector-empty__area-copy">
                <span className="design-inspector-empty__area-label">
                  {area.label}
                </span>
                <span className="design-inspector-empty__area-desc">
                  {area.description}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="design-inspector-empty__tip">
        <Sparkles className="size-3.5 shrink-0 opacity-70" aria-hidden />
        <p>
          Use <strong>Chat</strong> for AI copy edits and layout changes across
          the whole design.
        </p>
      </div>
    </section>
  );
}

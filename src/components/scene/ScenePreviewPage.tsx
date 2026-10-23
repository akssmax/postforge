"use client";

import { useEffect, useMemo, useState } from "react";
import { SceneRenderer } from "@/components/scene/SceneRenderer";
import { createBlankSession, ensureDesignSessionLoaded } from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { composeScene, SCENE_COMPOSITIONS } from "@/lib/scene/compositions";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import type { SceneDocument } from "@/lib/scene/schema";
import { catalogLayoutRef } from "@/lib/social-tool/layoutAdapter";
import { POST_LAYOUTS, type PostLayoutId } from "@/lib/social-tool/postLayouts";
import { buildDefaultUiContent } from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

const SIZES = [
  { id: "square", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "story", label: "Story 9:16", width: 1080, height: 1920 },
  { id: "landscape", label: "Landscape", width: 1200, height: 627 },
] as const;

const SAMPLE_BLOCK: VisualBlockRecord = {
  id: "sample-visual",
  libraryId: "dashboard-metrics",
  label: "Dashboard metrics",
  kind: "ui",
  svgMarkup: "",
  content: buildDefaultUiContent("dashboard-metrics", {
    primary: "#1f3a5f",
    accent: "#f0a35e",
    headline: "Pipeline at a glance",
    theme: "Revenue analytics",
  }),
  createdAt: 0,
};

const SAMPLE_LOGO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48"><rect width="48" height="48" rx="12" fill="#f0a35e"/><text x="60" y="33" font-family="Arial" font-size="24" font-weight="700" fill="#ffffff">Acme</text></svg>';

/** A sample design shared by every preview, so layouts differ only in structure. */
function sampleSession(): DesignSessionPersisted {
  const base = createBlankSession("scene-sample");
  return {
    ...base,
    brand: {
      ...base.brand,
      colors: { primary: "#1f3a5f", secondary: "#14273f", accent: "#f0a35e", neutral: "#0b1726" },
      activeBackgroundPresetId: "brand-hero",
    },
    featured: { ...base.featured, mode: "composed", visualBlocks: [SAMPLE_BLOCK], activeBlockId: SAMPLE_BLOCK.id },
    document: {
      ...base.document,
      showBrand: true,
      showContent: true,
      showBackground: true,
      showFeaturedImage: true,
      // Let the layout derive slots from the sample copy and show its featured zone.
      textSlots: undefined,
      featuredSlots: undefined,
      copy: {
        heading: "Close deals [[2× faster]]",
        subheading: "Acme puts pipeline, outreach and reporting in one workspace.",
        // Ids match the layouts' CTA and contact slots.
        extraFields: [
          { id: "cta-primary", label: "CTA", value: "Book a demo" },
          { id: "extras-footer", label: "CTA", value: "Book a demo" },
          { id: "contact-footer", label: "Contact", value: "acme.com/demo" },
        ],
      },
      onboarding: { phase: "ready", briefSkipped: true },
    },
  };
}

function withLayout(session: DesignSessionPersisted, layoutId: PostLayoutId, size: (typeof SIZES)[number]): DesignSessionPersisted {
  return {
    ...session,
    document: {
      ...session.document,
      layoutId,
      layoutRef: catalogLayoutRef(layoutId),
      textSlots: undefined,
      canvasSpec: { width: size.width, height: size.height, unit: "px" },
    },
  };
}

function withSize(session: DesignSessionPersisted, size: (typeof SIZES)[number]): DesignSessionPersisted {
  return { ...session, document: { ...session.document, canvasSpec: { width: size.width, height: size.height, unit: "px" } } };
}

function SceneCard({ title, subtitle, scene, session }: { title: string; subtitle: string; scene: SceneDocument; session: DesignSessionPersisted }) {
  const scale = 300 / Math.max(scene.size.width, scene.size.height);
  return (
    <figure data-scene-card={scene.origin.id} style={{ margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", alignSelf: "flex-start" }}>
        <SceneRenderer
          scene={scene}
          scale={scale}
          colors={session.brand.colors}
          logo={{ svgMarkup: session.brand.logo?.svgMarkup ?? (session.designId === "scene-sample" ? SAMPLE_LOGO : null) }}
          blocks={session.featured.visualBlocks ?? []}
        />
      </div>
      <figcaption style={{ fontSize: 13, lineHeight: 1.35 }}>
        <strong>{title}</strong>
        <br />
        <span style={{ opacity: 0.7 }}>{subtitle}</span>
      </figcaption>
    </figure>
  );
}

export function ScenePreviewPage() {
  const [sizeId, setSizeId] = useState<(typeof SIZES)[number]["id"]>("square");
  const [loaded, setLoaded] = useState<DesignSessionPersisted | null>(null);
  const size = SIZES.find((entry) => entry.id === sizeId) ?? SIZES[0];

  useEffect(() => {
    const designId = new URLSearchParams(window.location.search).get("design");
    if (!designId) return;
    void ensureDesignSessionLoaded(designId).then(setLoaded);
  }, []);

  const sample = useMemo(() => sampleSession(), []);
  const source = loaded ?? sample;

  const cards = useMemo(() => {
    const compositions = SCENE_COMPOSITIONS.map((composition) => ({
      key: composition.id,
      title: composition.name,
      subtitle: composition.summary,
      scene: composeScene(withSize(source, size), composition.id),
    }));
    const layouts = loaded
      ? [{ key: "current", title: "This design", subtitle: "Converted from its saved layout", scene: sceneFromDesign(withSize(loaded, size)) }]
      : POST_LAYOUTS.map((layout) => ({
          key: layout.id,
          title: layout.name,
          subtitle: layout.summary,
          scene: sceneFromDesign(withLayout(sample, layout.id, size)),
        }));
    return { compositions, layouts };
  }, [loaded, sample, size, source]);

  return (
    <main style={{ padding: "32px max(16px, env(safe-area-inset-left, 0px))", display: "flex", flexDirection: "column", gap: 28, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Scene renderer</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 14 }}>
            {loaded ? "Your design, rendered as an auto-layout scene." : "Every catalog layout and scene composition, from one sample design."} Pick a size to see them reflow.
          </p>
        </div>
        <div role="radiogroup" aria-label="Canvas size" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SIZES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="radio"
              aria-checked={entry.id === sizeId}
              onClick={() => setSizeId(entry.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid #c8ccd4",
                background: entry.id === sizeId ? "#1f3a5f" : "transparent",
                color: entry.id === sizeId ? "#fff" : "inherit",
                cursor: "pointer",
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>Scene compositions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {cards.compositions.map(({ key, ...card }) => <SceneCard key={key} {...card} session={source} />)}
        </div>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17 }}>{loaded ? "Saved layout" : `Catalog layouts (${cards.layouts.length})`}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          {cards.layouts.map(({ key, ...card }) => <SceneCard key={key} {...card} session={source} />)}
        </div>
      </section>
    </main>
  );
}

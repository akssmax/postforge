"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneRenderer } from "@/components/scene/SceneRenderer";
import { DeckPanel } from "@/components/scene/DeckPanel";
import { createBlankSession, ensureDesignSessionLoaded } from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { composeScene, SCENE_COMPOSITIONS } from "@/lib/scene/compositions";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import { attachBlocks, streamComposeScene, type ComposeStreamEvent } from "@/lib/scene/compose/client";
import type { BrandColors } from "@/lib/brand/types";
import { resizeScene, SCENE_SIZES } from "@/lib/scene/sizes";
import { captureScenePng, copyScenePng, sceneFileName, withOffscreenScenes, zipFiles } from "@/lib/scene/export";
import { downloadBlob } from "@/lib/social-tool/exportPost";
import { saveScenesToCanvas } from "@/lib/canvas/openInCanvas";
import { withMotion, withShaderBackground, type MotionStyle, type ShaderPreset } from "@/lib/scene/motion";
import { exportSceneVideo, pickVideoCodec, type VideoFormat } from "@/lib/scene/video";
import type { SceneDocument } from "@/lib/scene/schema";
import { catalogLayoutRef } from "@/lib/social-tool/layoutAdapter";
import { POST_LAYOUTS, type PostLayoutId } from "@/lib/social-tool/postLayouts";
import { buildDefaultUiContent } from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

const SIZES = SCENE_SIZES;

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

type ComposeState = {
  scene: SceneDocument | null;
  colors: BrandColors | null;
  blocks: VisualBlockRecord[];
  status: "idle" | "draft" | "composing" | "done" | "error";
  message: string;
};

const IDLE_COMPOSE: ComposeState = { scene: null, colors: null, blocks: [], status: "idle", message: "" };

/** Loops the scene clock while playing; undefined (the still frame) otherwise. */
function useSceneClock(durationMs: number, playing: boolean): number | undefined {
  const [time, setTime] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const started = performance.now();
    const loop = (now: number) => {
      setTime((now - started) % (Math.max(durationMs, 1000) + 1000));
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [durationMs, playing]);
  return playing ? time : undefined;
}

const MOTION_CHOICES: Array<{ id: "auto" | MotionStyle; label: string }> = [
  { id: "auto", label: "As composed" },
  { id: "none", label: "None" },
  { id: "subtle", label: "Subtle" },
  { id: "lively", label: "Lively" },
];
const SHADER_CHOICES: Array<{ id: "auto" | "none" | ShaderPreset; label: string }> = [
  { id: "auto", label: "As composed" },
  { id: "none", label: "None" },
  { id: "mesh-gradient", label: "Mesh gradient" },
  { id: "aurora", label: "Aurora" },
  { id: "waves", label: "Waves" },
  { id: "grain", label: "Grain" },
];

const selectStyle = { font: "inherit", fontSize: 13, padding: "5px 8px", borderRadius: 8, border: "1px solid #c8ccd4", background: "transparent" } as const;

function ComposePanel({ size }: { size: (typeof SIZES)[number] }) {
  const [brief, setBrief] = useState("LinkedIn ad for Acme analytics: close deals 2× faster with one workspace for pipeline and reporting. Book a demo.");
  const [state, setState] = useState<ComposeState>(IDLE_COMPOSE);
  const abortRef = useRef<AbortController | null>(null);
  const busy = state.status === "draft" || state.status === "composing";

  async function compose() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...IDLE_COMPOSE, status: "composing", message: "Drafting…" });
    const onEvent = (event: ComposeStreamEvent) =>
      setState((prev) => {
        switch (event.type) {
          case "draft":
            return { ...prev, scene: event.scene, colors: event.colors, status: "draft", message: `Engine draft in ${event.ms} ms · AI composing…` };
          case "blocks":
            return { ...prev, blocks: event.blocks };
          case "partial":
            return { ...prev, scene: event.scene, status: "composing", message: `AI composing… ${(event.ms / 1000).toFixed(1)} s` };
          case "final":
            return {
              ...prev,
              scene: event.scene,
              status: "done",
              message:
                event.source === "ai"
                  ? `AI composition in ${(event.ms / 1000).toFixed(1)} s${event.rationale ? ` · ${event.rationale}` : ""}`
                  : (event.note ?? "Showing the engine draft."),
            };
          case "error":
            return { ...prev, status: "error", message: event.message };
        }
      });
    try {
      await streamComposeScene({ brief, size: { width: size.width, height: size.height } }, onEvent, controller.signal);
    } catch (error) {
      if (!controller.signal.aborted) setState((prev) => ({ ...prev, status: "error", message: error instanceof Error ? error.message : "Compose failed." }));
    }
  }

  const [motionChoice, setMotionChoice] = useState<(typeof MOTION_CHOICES)[number]["id"]>("auto");
  const [shaderChoice, setShaderChoice] = useState<(typeof SHADER_CHOICES)[number]["id"]>("auto");
  const [playing, setPlaying] = useState(false);
  const [mp4Supported, setMp4Supported] = useState(false);
  // Stable identity matters: the renderer ties its auto-fit to the scene object.
  const composed = useMemo(() => (state.scene ? attachBlocks(state.scene, state.blocks) : null), [state.scene, state.blocks]);
  const scene = useMemo(() => {
    if (!composed) return null;
    const moved = motionChoice === "auto" ? composed : withMotion(composed, motionChoice);
    return shaderChoice === "auto" ? moved : withShaderBackground(moved, shaderChoice);
  }, [composed, motionChoice, shaderChoice]);
  const animated = !!scene && (scene.durationMs > 0 || scene.overlays.some((overlay) => overlay.node.type === "shader"));
  const time = useSceneClock(scene?.durationMs ?? 0, playing && animated);
  const sceneWidth = scene?.size.width;
  const sceneHeight = scene?.size.height;
  useEffect(() => {
    if (!sceneWidth || !sceneHeight) return;
    let cancelled = false;
    void pickVideoCodec("mp4", sceneWidth, sceneHeight).then((choice) => {
      if (!cancelled) setMp4Supported(!!choice);
    });
    return () => {
      cancelled = true;
    };
  }, [sceneWidth, sceneHeight]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [exportMessage, setExportMessage] = useState("");
  const previewRoot = () => previewRef.current?.querySelector<HTMLElement>("[data-scene-root]") ?? null;

  async function runExport(label: string, task: () => Promise<string>) {
    setExportMessage(`${label}…`);
    try {
      setExportMessage(await task());
    } catch (error) {
      setExportMessage(`${label} failed: ${error instanceof Error ? error.message : "try again"}`);
    }
  }

  const openInCanvas = () =>
    runExport("Opening in canvas", async () => {
      if (!scene || !state.colors) throw new Error("nothing to open yet");
      const id = await saveScenesToCanvas({ title: "Composed design", colors: state.colors, scenes: [scene], names: ["Artboard 1"], blocks: state.blocks });
      window.location.assign(`/canvas/${id}`);
      return "Opening the canvas editor…";
    });

  const exportPng = () =>
    runExport("Exporting PNG", async () => {
      const root = previewRoot();
      if (!root || !scene) throw new Error("nothing to export yet");
      downloadBlob(await captureScenePng(root, scene), sceneFileName(scene, "", "png"));
      return "PNG downloaded.";
    });

  const copyPng = () =>
    runExport("Copying", async () => {
      const root = previewRoot();
      if (!root || !scene) throw new Error("nothing to copy yet");
      await copyScenePng(root, scene);
      return "Image copied. Paste it anywhere.";
    });

  const exportAllSizes = () =>
    runExport("Rendering every size", async () => {
      if (!scene || !state.colors) throw new Error("nothing to export yet");
      const colors = state.colors;
      const sized = SCENE_SIZES.map((entry) => resizeScene(scene, entry));
      const files = await withOffscreenScenes(
        sized.map((item) => ({ scene: item, colors, logo: { svgMarkup: SAMPLE_LOGO }, blocks: state.blocks })),
        async (roots) => {
          const out: Array<{ name: string; blob: Blob }> = [];
          for (const [index, root] of roots.entries()) {
            out.push({ name: sceneFileName(sized[index]!, SCENE_SIZES[index]!.id, "png"), blob: await captureScenePng(root, sized[index]!) });
          }
          return out;
        },
      );
      downloadBlob(await zipFiles(files), sceneFileName(scene, "all-sizes", "zip"));
      return `${files.length} sizes downloaded as a ZIP.`;
    });

  const exportVideo = (format: VideoFormat) => {
    const name = format === "mp4" ? "MP4" : "WebM";
    return runExport(`Rendering ${name}`, async () => {
      if (!scene || !state.colors) throw new Error("nothing to export yet");
      const started = performance.now();
      const blob = await exportSceneVideo(
        { scene, colors: state.colors, logo: { svgMarkup: SAMPLE_LOGO }, blocks: state.blocks },
        { format, onProgress: (progress) => setExportMessage(`Rendering ${name}… ${Math.round(progress * 100)}%`) },
      );
      downloadBlob(blob, sceneFileName(scene, "", format));
      return `${name} downloaded (${(blob.size / 1024 / 1024).toFixed(1)} MB, rendered in ${((performance.now() - started) / 1000).toFixed(1)} s).`;
    });
  };

  return (
    <section aria-labelledby="compose-heading" style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start" }}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void compose();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10, flex: "1 1 320px", maxWidth: 520 }}
      >
        <h2 id="compose-heading" style={{ margin: 0, fontSize: 17 }}>Compose from a brief</h2>
        <label htmlFor="compose-brief" style={{ fontSize: 13, opacity: 0.75 }}>
          The engine draft appears at once; one AI call then composes the design ({size.label}).
        </label>
        <textarea
          id="compose-brief"
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          rows={4}
          style={{ font: "inherit", fontSize: 14, padding: 10, borderRadius: 8, border: "1px solid #c8ccd4", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={brief.trim().length < 3}
            style={{ padding: "8px 16px", borderRadius: 999, border: 0, background: "#1f3a5f", color: "#fff", cursor: "pointer" }}
          >
            {busy ? "Compose again" : "Compose"}
          </button>
          <span role="status" aria-live="polite" data-compose-status={state.status} style={{ fontSize: 13, opacity: 0.8 }}>
            {state.message}
          </span>
        </div>
      </form>
      {scene && state.colors ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div ref={previewRef} data-compose-preview={state.status} style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.12)", alignSelf: "flex-start" }}>
            <SceneRenderer
              scene={scene}
              scale={420 / Math.max(scene.size.width, scene.size.height)}
              colors={state.colors}
              logo={{ svgMarkup: SAMPLE_LOGO }}
              blocks={state.blocks}
              time={time}
            />
          </div>
          <div role="group" aria-label="Playback" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 13 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Motion
              <select value={motionChoice} onChange={(event) => setMotionChoice(event.target.value as typeof motionChoice)} style={selectStyle}>
                {MOTION_CHOICES.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              Background
              <select value={shaderChoice} onChange={(event) => setShaderChoice(event.target.value as typeof shaderChoice)} style={selectStyle}>
                {SHADER_CHOICES.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
              </select>
            </label>
            <button
              type="button"
              disabled={!animated}
              aria-pressed={playing}
              onClick={() => setPlaying((value) => !value)}
              style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #c8ccd4", background: "transparent", cursor: "pointer" }}
            >
              {playing ? "Pause" : "Play"}
            </button>
          </div>
          <div role="group" aria-label="Export" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Download PNG", run: exportPng },
              { label: "Copy image", run: copyPng },
              { label: "All sizes (.zip)", run: exportAllSizes },
              { label: "Video (WebM)", run: () => exportVideo("webm") },
              ...(mp4Supported ? [{ label: "Video (MP4)", run: () => exportVideo("mp4") }] : []),
              { label: "Open in canvas", run: openInCanvas },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                disabled={busy}
                onClick={() => void action.run()}
                style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #c8ccd4", background: "transparent", cursor: "pointer" }}
              >
                {action.label}
              </button>
            ))}
            <span role="status" aria-live="polite" data-export-status style={{ fontSize: 13, opacity: 0.8 }}>{exportMessage}</span>
          </div>
        </div>
      ) : null}
    </section>
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

      <ComposePanel size={size} />

      <DeckPanel logoSvg={SAMPLE_LOGO} />

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

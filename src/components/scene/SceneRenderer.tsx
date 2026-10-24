"use client";

import { createContext, createElement, useContext, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import { SceneShader } from "@/components/scene/SceneShader";
import { motionStyle } from "@/lib/scene/motion";
import { PostPattern } from "@/components/social-tool/PostPattern";
import { resolveLucideIcon } from "@/lib/social-tool/icons/lucideRegistry";
import type { PatternId } from "@/lib/social-tool/presets";
import type { BrandColors } from "@/lib/brand/types";
import { buildBackgroundPresets, getActiveBackgroundPreset } from "@/lib/brand/backgroundPresets";
import { readableSubTextOnBackground, readableTextOnBackground, resolveBackgroundHex } from "@/lib/brand/contrast";
import type {
  ColorToken,
  FrameNode,
  SceneDocument,
  SceneNode,
  SceneOverlay,
  SpaceToken,
  TextNode,
  TextStyle,
  VisualNode,
} from "@/lib/scene/schema";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type SceneRendererProps = {
  scene: SceneDocument;
  colors: BrandColors;
  logo?: { src?: string | null; svgMarkup?: string | null };
  blocks?: VisualBlockRecord[];
  /** Resolves `asset:<slotId>` image urls (uploads held in IndexedDB). */
  assets?: Record<string, string | null | undefined>;
  /** Display scale; the scene always lays out at its native size. */
  scale?: number;
  /** Step type down until nothing spills outside the artboard (default on). */
  autoFit?: boolean;
  /** Scene clock in ms. Omit for the finished still frame. */
  time?: number;
  /** Fixed fit (from a settled render), e.g. for video frames where motion would skew measurement. */
  fit?: number;
};

/** Auto-fit shrinks type in 6% steps and stops at 70% of the design's scale. */
const FIT_STEP = 0.94;
const FIT_FLOOR = 0.7;

function sceneOverflows(root: HTMLElement): boolean {
  const frame = root.getBoundingClientRect();
  const slack = 1;
  for (const node of root.querySelectorAll<HTMLElement>("[data-scene-node]")) {
    const box = node.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) continue;
    if (box.bottom > frame.bottom + slack || box.right > frame.right + slack) return true;
    // Clamped text hides its overflow; scrollHeight still reports it.
    if (node.dataset.sceneText && node.scrollHeight > node.clientHeight + 1) return true;
  }
  return false;
}

/** Font size per text style, as a share of the artboard's short side. */
const TYPE_SCALE: Record<TextStyle, { size: number; lineHeight: number; weight: number }> = {
  display: { size: 0.092, lineHeight: 1.02, weight: 800 },
  headline: { size: 0.068, lineHeight: 1.06, weight: 750 },
  title: { size: 0.04, lineHeight: 1.22, weight: 500 },
  body: { size: 0.032, lineHeight: 1.38, weight: 400 },
  label: { size: 0.03, lineHeight: 1.2, weight: 650 },
  caption: { size: 0.024, lineHeight: 1.3, weight: 500 },
};

const LOGO_HEIGHT = { sm: 0.05, md: 0.068, lg: 0.1 } as const;

type Theme = {
  unit: number;
  colors: BrandColors;
  text: string;
  muted: string;
  fonts: SceneDocument["font"];
  typeScale: number;
  time?: number;
  props: SceneRendererProps;
};

type Ink = { text: string; muted: string };

const InkContext = createContext<Ink>({ text: "#0a1b25", muted: "rgba(10,27,37,0.65)" });

function space(theme: Theme, token: SpaceToken | undefined): number {
  return token ? Number(token) * theme.unit : 0;
}

function color(theme: Theme, ink: Ink, token: ColorToken | undefined): string | undefined {
  switch (token) {
    case "brand.primary": return theme.colors.primary;
    case "brand.secondary": return theme.colors.secondary;
    case "brand.accent": return theme.colors.accent;
    case "brand.neutral": return theme.colors.neutral;
    case "text": return ink.text;
    case "text.muted": return ink.muted;
    case "text.onAccent": return readableTextOnBackground(theme.colors.accent);
    case "surface": return "#ffffff";
    default: return undefined;
  }
}

/** Ink for children of a filled frame, so text on a card stays readable. */
function inkOn(fill: string): Ink {
  return { text: readableTextOnBackground(fill), muted: readableSubTextOnBackground(fill) };
}

function flexItem(node: { grow?: number; basis?: number }): CSSProperties {
  if (node.basis != null) return { flex: `0 0 ${node.basis * 100}%`, minWidth: 0, minHeight: 0 };
  if (node.grow != null) return { flex: `${node.grow} 1 0`, minWidth: 0, minHeight: 0 };
  return { flex: "0 0 auto", minWidth: 0, minHeight: 0 };
}

const ALIGN = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" } as const;
const JUSTIFY = { start: "flex-start", center: "center", end: "flex-end", between: "space-between" } as const;
const TEXT_ALIGN = { start: "left", center: "center", end: "right" } as const;

function renderRichText(text: string, accent: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex) => {
    const parts = line.split(/(\[\[[^[\]]+\]\])/g).map((part, i) =>
      part.startsWith("[[") && part.endsWith("]]")
        ? <span key={i} style={{ color: accent }}>{part.slice(2, -2)}</span>
        : part,
    );
    return lineIndex === 0 ? parts : [<br key={`br-${lineIndex}`} />, ...parts];
  });
}

function SceneText({ node, theme }: { node: TextNode; theme: Theme }) {
  const ink = useContext(InkContext);
  const type = TYPE_SCALE[node.style];
  const short = theme.unit * 100;
  const heading = node.style === "display" || node.style === "headline";
  return (
    <p
      data-scene-node={node.id}
      data-scene-text={node.role}
      style={{
        ...flexItem(node),
        ...motionStyle(node.motion, theme.time, theme.unit),
        margin: 0,
        fontFamily: heading ? theme.fonts.heading : theme.fonts.body,
        fontSize: type.size * short * theme.typeScale,
        lineHeight: type.lineHeight,
        fontWeight: type.weight,
        letterSpacing: heading ? "-0.02em" : undefined,
        color: node.colorHex ?? color(theme, ink, node.color) ?? ink.text,
        textAlign: TEXT_ALIGN[node.align ?? "start"],
        textWrap: heading ? "balance" : "pretty",
        overflowWrap: "break-word",
        ...(node.maxLines
          ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: node.maxLines, overflow: "hidden" }
          : {}),
      }}
    >
      {renderRichText(node.text, theme.colors.accent)}
    </p>
  );
}

/** UI blocks render at a small intrinsic size; lay them out at a reference width, then scale to the box. */
const UI_BLOCK_REFERENCE_WIDTH = 360;

function FitToBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // The observer fires once on observe, then on every resize of either element.
    const observer = new ResizeObserver(() => {
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      if (!width || !height) return;
      setScale(Math.min(box.clientWidth / width, box.clientHeight / height) * 0.92);
    });
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div ref={inner} style={{ width: UI_BLOCK_REFERENCE_WIDTH, flex: "0 0 auto", transform: `scale(${scale})`, transformOrigin: "center" }}>
        {children}
      </div>
    </div>
  );
}

function SceneVisual({ node, theme }: { node: VisualNode; theme: Theme }) {
  const ink = useContext(InkContext);
  const { props } = theme;
  const radius = space(theme, node.radius);
  const box: CSSProperties = {
    ...flexItem(node),
    ...(node.aspect ? { aspectRatio: String(node.aspect) } : {}),
    ...(node.basis == null && node.grow == null && !node.aspect ? { flex: "1 1 0" } : {}),
    position: "relative",
    overflow: "hidden",
    borderRadius: radius,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...motionStyle(node.motion, theme.time, theme.unit),
  };
  let content: ReactNode;
  if (node.source.kind === "block") {
    const blockId = node.source.blockId;
    const block = props.blocks?.find((entry) => entry.id === blockId);
    const renderer = block ? (
      <VisualBlockRenderer block={block} brandColors={{ primary: theme.colors.primary, accent: theme.colors.accent }} canvasFit />
    ) : null;
    content = !block ? null : block.svgMarkup ? (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{renderer}</div>
    ) : (
      <FitToBox>{renderer}</FitToBox>
    );
  } else if (node.source.kind === "image") {
    const url = node.source.url.startsWith("asset:") ? props.assets?.[node.source.url.slice(6)] : node.source.url;
    content = url ? (
      // eslint-disable-next-line @next/next/no-img-element -- scene renders arbitrary user and stock images at artboard size
      <img src={url} alt={node.source.alt} style={{ width: "100%", height: "100%", objectFit: node.fit }} />
    ) : null;
  }
  return (
    <div data-scene-node={node.id} data-scene-visual={node.role} style={box}>
      {content ?? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            border: `${Math.max(1, theme.unit * 0.25)}px dashed ${ink.muted}`,
            opacity: 0.6,
          }}
        />
      )}
    </div>
  );
}

function SceneLogo({ node, theme }: { node: Extract<SceneNode, { type: "logo" }>; theme: Theme }) {
  const { logo } = theme.props;
  // An uploaded SVG renders as an image so any embedded script can't run.
  const src = logo?.src ?? (logo?.svgMarkup ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logo.svgMarkup)}` : null);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand logos are user uploads or data URIs
    <img
      data-scene-node={node.id}
      src={src}
      alt="Logo"
      style={{
        height: LOGO_HEIGHT[node.size] * theme.unit * 100,
        width: "auto",
        maxWidth: "45%",
        objectFit: "contain",
        alignSelf: node.align ? ALIGN[node.align] : undefined,
        flex: "0 0 auto",
        ...motionStyle(node.motion, theme.time, theme.unit),
      }}
    />
  );
}

function SceneButton({ node, theme }: { node: Extract<SceneNode, { type: "button" }>; theme: Theme }) {
  const short = theme.unit * 100;
  const solid = node.variant === "solid";
  return (
    <span
      data-scene-node={node.id}
      data-scene-text="cta"
      style={{
        flex: "0 0 auto",
        alignSelf: node.align ? ALIGN[node.align] : undefined,
        display: "inline-flex",
        alignItems: "center",
        padding: `${short * 0.018}px ${short * 0.04}px`,
        borderRadius: short,
        fontFamily: theme.fonts.body,
        fontSize: TYPE_SCALE.label.size * short * theme.typeScale,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
        background: solid ? theme.colors.accent : "transparent",
        color: solid ? readableTextOnBackground(theme.colors.accent) : theme.colors.accent,
        border: `${Math.max(1, theme.unit * 0.3)}px solid ${theme.colors.accent}`,
        ...motionStyle(node.motion, theme.time, theme.unit),
      }}
    >
      {node.text}
    </span>
  );
}

function SceneFrame({ node, theme }: { node: FrameNode; theme: Theme }) {
  const ink = useContext(InkContext);
  const fill = color(theme, ink, node.fill);
  const style: CSSProperties = {
    ...flexItem(node),
    display: node.layout === "grid" ? "grid" : "flex",
    flexDirection: node.layout === "row" ? "row" : "column",
    ...(node.layout === "grid" ? { gridTemplateColumns: `repeat(${node.columns ?? 2}, minmax(0, 1fr))` } : {}),
    gap: space(theme, node.gap),
    padding: space(theme, node.pad),
    alignItems: ALIGN[node.align ?? "stretch"],
    justifyContent: JUSTIFY[node.justify ?? "start"],
    background: fill,
    borderRadius: space(theme, node.radius),
    ...motionStyle(node.motion, theme.time, theme.unit),
  };
  const children = (
    <div data-scene-node={node.id} style={style}>
      {node.children.map((child) => <SceneNodeView key={child.id} node={child} theme={theme} />)}
    </div>
  );
  return fill ? <InkContext.Provider value={inkOn(fill)}>{children}</InkContext.Provider> : children;
}

function SceneNodeView({ node, theme }: { node: SceneNode; theme: Theme }) {
  const ink = useContext(InkContext);
  switch (node.type) {
    case "frame": return <SceneFrame node={node} theme={theme} />;
    case "text": return <SceneText node={node} theme={theme} />;
    case "visual": return <SceneVisual node={node} theme={theme} />;
    case "logo": return <SceneLogo node={node} theme={theme} />;
    case "button": return <SceneButton node={node} theme={theme} />;
    case "spacer": return <div aria-hidden style={{ flex: `${node.grow} 1 0` }} />;
    case "icon": {
      const icon = resolveLucideIcon(node.name);
      const size = { sm: 4, md: 6, lg: 9 }[node.size] * theme.unit;
      // createElement on the static registry entry: the icon component isn't created during render.
      return icon ? (
        <span
          data-scene-node={node.id}
          aria-hidden
          style={{ display: "inline-flex", flex: "0 0 auto", color: color(theme, ink, node.color) ?? theme.colors.accent, alignSelf: node.align ? ALIGN[node.align] : undefined, ...motionStyle(node.motion, theme.time, theme.unit) }}
        >
          {createElement(icon, { width: size, height: size, strokeWidth: 2 })}
        </span>
      ) : null;
    }
    case "pattern":
      return (
        <div data-scene-node={node.id} aria-hidden style={{ ...flexItem(node), flex: node.grow != null || node.basis != null ? flexItem(node).flex : "1 1 auto", alignSelf: "stretch", position: "relative", overflow: "hidden" }}>
          <PostPattern pattern={node.patternId as PatternId} theme={ink.text === "#f4f4f4" ? "dark" : "light"} opacity={node.opacity} scale={node.scale} />
        </div>
      );
    case "shader":
      return (
        <div aria-hidden style={{ ...flexItem(node), flex: node.grow != null || node.basis != null ? flexItem(node).flex : "1 1 auto", alignSelf: "stretch", ...motionStyle(node.motion, theme.time, theme.unit) }}>
          <SceneShader
            node={node}
            time={theme.time ?? 0}
            colors={[color(theme, ink, node.colors[0]) ?? theme.colors.primary, color(theme, ink, node.colors[1]) ?? theme.colors.accent]}
          />
        </div>
      );
    case "shape": {
      const fill = color(theme, ink, node.color);
      const size = theme.unit * (node.shape === "dot" ? 2 : 1);
      return (
        <div
          aria-hidden
          data-scene-node={node.id}
          style={
            node.shape === "rule"
              ? { flex: "0 0 auto", height: Math.max(1, theme.unit * 0.25), alignSelf: "stretch", background: fill }
              : node.shape === "dot"
                ? { flex: "0 0 auto", width: size, height: size, borderRadius: size, background: fill }
                : { flex: "0 0 auto", width: theme.unit * 8, height: size, borderRadius: size, background: fill }
          }
        />
      );
    }
  }
}

function overlayBox(overlay: SceneOverlay, theme: Theme): CSSProperties {
  if (overlay.anchor === "fill") return { position: "absolute", inset: 0, display: "flex" };
  const inset = space(theme, overlay.inset);
  const box: CSSProperties = {
    position: "absolute",
    width: `${(overlay.width ?? 0.3) * 100}%`,
    height: `${(overlay.height ?? 0.3) * 100}%`,
    display: "flex",
  };
  if (overlay.anchor === "center") return { ...box, left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (overlay.anchor === "free") return { ...box, left: `${(overlay.x ?? 0) * 100}%`, top: `${(overlay.y ?? 0) * 100}%` };
  if (overlay.anchor.startsWith("top")) box.top = inset;
  else box.bottom = inset;
  if (overlay.anchor.endsWith("left")) box.left = inset;
  else box.right = inset;
  return box;
}

/** Draws a scene document at its native size with flex/grid; geometry comes from the browser. */
export function SceneRenderer(props: SceneRendererProps) {
  const { scene, colors, scale = 1, autoFit = true, time, fit: fixedFit } = props;
  const { width, height } = scene.size;
  const rootRef = useRef<HTMLDivElement>(null);
  // Fit is tied to the scene it was measured for, so a new scene starts at full size.
  const [fitState, setFitState] = useState<{ scene: SceneDocument; fit: number }>({ scene, fit: 1 });
  const measuredFit = fitState.scene === scene ? fitState.fit : 1;
  const fit = fixedFit ?? measuredFit;
  // Motion moves nodes with transforms, so only measure finished (still) frames.
  const measure = autoFit && fixedFit == null && (time == null || time >= scene.durationMs);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!measure || !root || fit <= FIT_FLOOR || !sceneOverflows(root)) return;
    const frame = requestAnimationFrame(() => setFitState({ scene, fit: Math.max(FIT_FLOOR, fit * FIT_STEP) }));
    return () => cancelAnimationFrame(frame);
  }, [measure, fit, scene]);
  const unit = Math.min(width, height) / 100;
  const background =
    scene.background.kind === "brand-preset"
      ? getActiveBackgroundPreset(buildBackgroundPresets(colors), scene.background.presetId).css.background
      : scene.background.kind === "css"
        ? scene.background.value
        : scene.background.color === "surface"
          ? "#ffffff"
          : (color({ colors } as Theme, { text: "", muted: "" }, scene.background.color) ?? "#ffffff");
  const backgroundHex = resolveBackgroundHex(background);
  const ink = inkOn(backgroundHex);
  const theme: Theme = { unit, colors, text: ink.text, muted: ink.muted, fonts: scene.font, typeScale: scene.typeScale * fit, time, props };
  const overlays = (layer: "below" | "above") =>
    scene.overlays
      .filter((overlay) => overlay.layer === layer)
      .map((overlay, index) => (
        <div key={`${layer}-${index}`} style={overlayBox(overlay, theme)}>
          <SceneNodeView node={overlay.node} theme={theme} />
        </div>
      ));

  return (
    <div style={{ width: width * scale, height: height * scale, overflow: "hidden", flex: "0 0 auto" }}>
      <div
        ref={rootRef}
        data-scene-root={scene.origin.id}
        data-scene-fit={fit.toFixed(2)}
        style={{
          width,
          height,
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: "top left",
          position: "relative",
          overflow: "hidden",
          background,
          display: "flex",
        }}
      >
        <InkContext.Provider value={ink}>
          {overlays("below")}
          <div style={{ position: "relative", display: "flex", flex: "1 1 auto", minWidth: 0, minHeight: 0 }}>
            <SceneFrame node={{ ...scene.root, grow: 1 }} theme={theme} />
          </div>
          {overlays("above")}
        </InkContext.Provider>
      </div>
    </div>
  );
}

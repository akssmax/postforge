import type { DesignSessionPersisted } from "@/lib/design/types";
import { createCanvasDesign, createId, type CanvasBrand, type CanvasDesign } from "@/lib/canvas/document";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import type { SceneDocument, SceneNode, SceneOverlay, TextStyle } from "@/lib/scene/schema";
import type { SceneDeck } from "@/lib/scene/deck/masters";
import { getSocialFont } from "@/lib/social-tool/presets";
import type { Deck, SlideBlock } from "@/lib/slides/types";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides/types";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

function brandFromSession(session: DesignSessionPersisted): CanvasBrand {
  return {
    colors: {
      primary: session.brand.colors.primary,
      secondary: session.brand.colors.secondary,
      accent: session.brand.colors.accent,
      neutral: session.brand.colors.neutral,
    },
    logoSvg: session.brand.logo?.svgMarkup ?? null,
    logoSrc: null,
  };
}

/**
 * A saved v2 design (and its variant boards) becomes one page of artboards.
 * Visual blocks are carried along so library visuals keep rendering.
 */
export function canvasFromSessions(
  boards: DesignSessionPersisted[],
  names: Record<string, string> = {},
): { design: CanvasDesign; blocks: VisualBlockRecord[] } {
  const [first] = boards;
  if (!first) throw new Error("Nothing to convert");
  const design = createCanvasDesign({
    title: first.document.copy.heading.replace(/\[\[|\]\]/g, "").trim() || "Untitled design",
    brand: brandFromSession(first),
    artboards: boards.map((board, index) => ({ name: names[board.designId]?.trim() || `Artboard ${index + 1}`, scene: sceneFromDesign(board) })),
  });
  const blocks = boards.flatMap((board) => board.featured.visualBlocks ?? []);
  return { design, blocks };
}

const SLIDE_FONT_HEADING = new Set(["display"]);

function slideTextStyle(sizePx: number): TextStyle {
  if (sizePx >= 90) return "display";
  if (sizePx >= 60) return "headline";
  if (sizePx >= 40) return "title";
  if (sizePx >= 26) return "body";
  return "caption";
}

function slideBlockNode(block: SlideBlock): SceneNode {
  switch (block.type) {
    case "text":
      return {
        type: "text",
        id: block.id,
        role: block.props.size >= 60 ? "headline" : "body",
        style: slideTextStyle(block.props.size),
        text: block.props.content,
        align: block.props.align === "left" ? "start" : block.props.align === "right" ? "end" : "center",
        ...(/^#[0-9a-fA-F]{3,8}$/.test(block.props.color) ? { colorHex: block.props.color } : {}),
        grow: 1,
      };
    case "image":
      return block.props.src
        ? { type: "visual", id: block.id, role: "supporting", source: { kind: "image", url: block.props.src, alt: "" }, fit: block.props.fit, grow: 1 }
        : { type: "visual", id: block.id, role: "supporting", source: { kind: "placeholder" }, fit: "contain", grow: 1 };
    case "product":
      return { type: "visual", id: block.id, role: "hero", source: { kind: "query", query: `${block.props.page} product screen`, visualKind: "ui" }, fit: "contain", grow: 1 };
    case "pattern":
      return { type: "pattern", id: block.id, patternId: block.props.patternId, opacity: block.props.opacity, scale: block.props.scale, grow: 1 };
  }
}

/**
 * A /slides deck becomes one page of 16:9 artboards. Slides are freely
 * positioned, so each block becomes a free-anchored overlay in z-order.
 */
export function canvasFromDeck(deck: Deck, brand: CanvasBrand, title = "Slides"): CanvasDesign {
  const font = { heading: getSocialFont("display").family, body: getSocialFont("body").family };
  return createCanvasDesign({
    title,
    brand,
    artboards: deck.slides.map((slide) => {
      const overlays: SceneOverlay[] = [...slide.blocks]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((block) => ({
          anchor: "free",
          x: block.x / 100,
          y: block.y / 100,
          width: Math.min(1, block.w / 100),
          height: Math.min(1, block.h / 100),
          layer: "above",
          node: slideBlockNode(block),
        }));
      const usesHeadingFont = slide.blocks.some((block) => block.type === "text" && SLIDE_FONT_HEADING.has(block.props.font));
      const scene: SceneDocument = {
        version: 1,
        kind: "deck",
        size: { width: SLIDE_WIDTH, height: SLIDE_HEIGHT },
        origin: { source: "composition", id: `slide-${slide.id}` },
        background: { kind: "css", value: slide.background },
        font: usesHeadingFont ? font : { heading: font.body, body: font.body },
        typeScale: 1,
        durationMs: 0,
        tweaks: [],
        overlays,
        root: { type: "frame", id: "root", layout: "column", children: [] },
      };
      return { name: slide.name, scene };
    }),
  });
}

/** Scenes from /scene (a composed design or a generated deck) become a canvas design. */
export function canvasFromScenes(title: string, brand: CanvasBrand, scenes: SceneDocument[], names?: string[]): CanvasDesign {
  return createCanvasDesign({
    title,
    brand,
    artboards: scenes.map((scene, index) => ({ name: names?.[index] ?? `Artboard ${index + 1}`, scene })),
  });
}

export function canvasFromSceneDeck(deck: SceneDeck, brand: CanvasBrand): CanvasDesign {
  return canvasFromScenes(deck.title, brand, deck.pages, deck.pages.map((_, index) => `${deck.kind === "deck" ? "Slide" : "Page"} ${index + 1}`));
}

export { createId };

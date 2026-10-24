import type { FrameNode, SceneDocument, SceneNode } from "@/lib/scene/schema";
import type { DeckKind, DeckOutline, OutlinePage } from "@/lib/scene/deck/outline";

export type SceneDeck = {
  version: 1;
  kind: DeckKind;
  title: string;
  size: { width: number; height: number };
  pages: SceneDocument[];
};

export const DECK_SIZES: Record<DeckKind, { width: number; height: number }> = {
  deck: { width: 1920, height: 1080 },
  carousel: { width: 1080, height: 1350 },
};

type MasterContext = { kind: DeckKind; index: number; total: number; size: { width: number; height: number }; font: SceneDocument["font"] };

const text = (id: string, role: Extract<SceneNode, { type: "text" }>["role"], style: Extract<SceneNode, { type: "text" }>["style"], value: string, extra: Partial<Extract<SceneNode, { type: "text" }>> = {}): SceneNode =>
  ({ type: "text", id, role, style, text: value, ...extra }) as SceneNode;

function pageFooter(ctx: MasterContext): FrameNode {
  return {
    type: "frame",
    id: "footer",
    layout: "row",
    align: "center",
    justify: "between",
    children: [
      { type: "logo", id: "logo", size: "sm" },
      text("page-number", "caption", "caption", `${ctx.index + 1} / ${ctx.total}`, { color: "text.muted" }),
    ],
  };
}

function visual(id: string, query: string | undefined, extra: Partial<Extract<SceneNode, { type: "visual" }>> = {}): SceneNode[] {
  return query ? [{ type: "visual", id, role: "hero", source: { kind: "query", query, visualKind: "ui" }, fit: "contain", radius: "2", grow: 1, ...extra } as SceneNode] : [];
}

/** One master per page type: structure is fixed, copy comes from the outline. */
function pageRoot(page: OutlinePage, ctx: MasterContext): FrameNode {
  const wide = ctx.size.width > ctx.size.height;
  // A single short sentence carries the slide, so it gets headline type.
  const short = (page.body?.length ?? 0) <= 90;
  const body = page.body ? [text("body", "body", short && page.type !== "title" && page.type !== "cta" ? "headline" : "title", page.body, { color: short && page.type !== "title" && page.type !== "cta" ? "text" : "text.muted", maxLines: 5 })] : [];
  let main: SceneNode[];
  switch (page.type) {
    case "title":
      main = [
        {
          type: "frame", id: "title-row", layout: wide ? "row" : "column", gap: "6", align: "stretch", grow: 1,
          children: [
            { type: "frame", id: "title-copy", layout: "column", gap: "4", justify: "center", basis: wide && page.visual ? 0.55 : undefined, grow: wide && page.visual ? undefined : 1, children: [text("title", "headline", "display", page.title, { maxLines: 4 }), ...body] },
            ...visual("title-visual", page.visual),
          ],
        },
      ];
      break;
    case "metric":
      main = [
        {
          type: "frame", id: "metric", layout: "column", gap: "3", align: "center", justify: "center", grow: 1,
          children: [
            text("title", "title", "label", page.title, { align: "center", color: "brand.accent" }),
            text("stat", "headline", "display", page.stat ? `[[${page.stat.value}]]` : "[Add a number]", { align: "center" }),
            text("stat-label", "subheading", "title", page.stat?.label ?? "", { align: "center", color: "text.muted" }),
          ],
        },
      ];
      break;
    case "quote":
      main = [
        {
          type: "frame", id: "quote", layout: "column", gap: "4", justify: "center", grow: 1,
          children: [text("quote", "headline", "headline", `“${page.quote?.text ?? page.body ?? "[Add a customer quote]"}”`, { maxLines: 6 }), text("author", "caption", "label", page.quote?.author ?? "[Name, role]", { color: "brand.accent" })],
        },
      ];
      break;
    case "features":
      main = [
        text("title", "headline", "headline", page.title, { maxLines: 2 }),
        {
          type: "frame", id: "bullets", layout: wide ? "grid" : "column", columns: wide ? 2 : undefined, gap: "4", grow: 1, justify: "center",
          children: (page.bullets ?? []).map((bullet, i) => ({
            type: "frame", id: `bullet-${i}`, layout: "row", gap: "3", align: "start",
            children: [{ type: "shape", id: `dot-${i}`, shape: "dot", color: "brand.accent" }, text(`bullet-text-${i}`, "body", "title", bullet, { maxLines: 3, grow: 1 })],
          }) as SceneNode),
        },
      ];
      break;
    case "steps":
      main = [
        {
          type: "frame", id: "step", layout: "column", gap: "4", justify: "center", grow: 1,
          children: [text("step-number", "title", "display", `[[${page.title}]]`), text("step-body", "headline", "display", page.body ?? "", { maxLines: 6 })],
        },
      ];
      break;
    case "cta":
      main = [
        {
          type: "frame", id: "cta", layout: "column", gap: "5", align: "center", justify: "center", grow: 1,
          children: [text("title", "headline", "display", page.title, { align: "center", maxLines: 3 }), ...body, ...(page.cta ? [{ type: "button", id: "cta-button", role: "cta", text: page.cta, variant: "solid", align: "center" } as SceneNode] : [])],
        },
      ];
      break;
    default:
      main = [
        text("title", "headline", "headline", page.title, { maxLines: 2 }),
        {
          type: "frame", id: "content", layout: wide ? "row" : "column", gap: "6", align: "stretch", grow: 1,
          children: [{ type: "frame", id: "copy", layout: "column", gap: "3", justify: "center", grow: 1, children: body }, ...visual("visual", page.visual, { basis: wide ? 0.45 : 0.45, grow: undefined })],
        },
      ];
  }
  return {
    type: "frame",
    id: "root",
    layout: "column",
    pad: ctx.kind === "deck" ? "6" : "8",
    gap: "5",
    align: "stretch",
    children: [...main, pageFooter(ctx)],
  };
}

/** Lay out an outline with the masters: one scene per page, shared size and fonts. */
export function deckFromOutline(outline: DeckOutline, kind: DeckKind, font: SceneDocument["font"], size = DECK_SIZES[kind]): SceneDeck {
  const pages = outline.pages.map((page, index): SceneDocument => ({
    version: 1,
    kind: kind === "deck" ? "deck" : "social",
    size,
    origin: { source: "composition", id: `${kind}-${page.type}-${index + 1}` },
    // Title and closing pages use the brand background; content pages a clean surface.
    background: page.type === "title" || page.type === "cta" || page.type === "metric" ? { kind: "brand-preset", presetId: "brand-hero" } : { kind: "color", color: "surface" },
    font,
    typeScale: kind === "deck" ? 0.85 : 1,
    durationMs: 0,
    overlays: [],
    root: pageRoot(page, { kind, index, total: outline.pages.length, size, font }),
  }));
  return { version: 1, kind, title: outline.title, size, pages };
}

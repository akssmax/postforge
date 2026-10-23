import type { DesignSessionPersisted } from "@/lib/design/types";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import type { SceneDocument, SceneNode, TextNode, VisualNode } from "@/lib/scene/schema";
import { walkScene } from "@/lib/scene/schema";

/** The design's content, independent of where a layout puts it. */
export type SceneContent = {
  headline?: TextNode;
  subheading?: TextNode;
  body: TextNode[];
  cta?: { id: string; text: string };
  caption?: TextNode;
  visual?: VisualNode;
  hasLogo: boolean;
};

export function sceneContent(scene: SceneDocument): SceneContent {
  const content: SceneContent = { body: [], hasLogo: false };
  walkScene(scene, (node) => {
    if (node.type === "logo") content.hasLogo = true;
    else if (node.type === "button") content.cta ??= { id: node.id, text: node.text };
    else if (node.type === "visual") content.visual ??= node;
    else if (node.type === "text") {
      if (node.role === "headline" || node.role === "name") content.headline ??= node;
      else if (node.role === "subheading" || node.role === "title") content.subheading ??= node;
      else if (node.role === "cta") content.cta ??= { id: node.id, text: node.text };
      else if (node.role === "caption" || node.role === "contact") content.caption ??= node;
      else content.body.push(node);
    }
  });
  return content;
}

type Composition = {
  id: string;
  name: string;
  summary: string;
  build: (content: SceneContent) => Pick<SceneDocument, "root" | "overlays">;
};

const logo = (align: "start" | "center" | "end" = "start"): SceneNode => ({ type: "logo", id: "logo", size: "md", align });
const cta = (content: SceneContent, align: "start" | "center" | "end" = "start"): SceneNode[] =>
  content.cta ? [{ type: "button", id: content.cta.id, role: "cta", text: content.cta.text, variant: "solid", align }] : [];
const text = (node: TextNode | undefined, patch: Partial<TextNode> = {}): SceneNode[] => (node ? [{ ...node, ...patch }] : []);
const visual = (content: SceneContent, patch: Partial<VisualNode>): SceneNode[] =>
  content.visual ? [{ ...content.visual, ...patch }] : [];

/**
 * Scene-native compositions: placements the slot layouts cannot express, because
 * there a visual can only occupy the layout's featured zone.
 */
export const SCENE_COMPOSITIONS: Composition[] = [
  {
    id: "full-bleed",
    name: "Full-bleed visual",
    summary: "The visual fills the canvas; copy sits on a card at the bottom.",
    build: (content) => ({
      // Photos bleed under everything; UI cards and illustrations take the top 60% so the copy card stays clear.
      overlays: content.visual
        ? [
            content.visual.source.kind === "image"
              ? { anchor: "fill", layer: "below", node: { ...content.visual, role: "background", fit: "cover", radius: undefined, grow: undefined } }
              : { anchor: "top-left", width: 1, height: 0.62, inset: "0", layer: "below", node: { ...content.visual, role: "background", fit: "contain", radius: undefined, grow: undefined } },
          ]
        : [],
      root: {
        type: "frame", id: "root", layout: "column", pad: "6", gap: "4", align: "stretch", justify: "between",
        children: [
          ...(content.hasLogo ? [logo()] : []),
          {
            type: "frame", id: "card", layout: "column", gap: "3", pad: "6", fill: "surface", radius: "3", align: "stretch",
            children: [
              ...text(content.headline, { align: "start", style: "headline", maxLines: 3 }),
              ...text(content.subheading, { align: "start", maxLines: 3 }),
              ...cta(content),
            ],
          },
        ],
      },
    }),
  },
  {
    id: "inline-badge",
    name: "Inline badge",
    summary: "Copy leads; a small visual badge sits above the headline.",
    build: (content) => ({
      overlays: [],
      root: {
        type: "frame", id: "root", layout: "column", pad: "8", gap: "5", align: "stretch",
        children: [
          {
            type: "frame", id: "copy", layout: "column", gap: "4", align: "center", justify: "center", grow: 1,
            children: [
              ...visual(content, { role: "badge", aspect: 1, basis: 0.22, grow: undefined, radius: "4" }),
              ...text(content.headline, { align: "center", style: "display", maxLines: 4 }),
              ...text(content.subheading, { align: "center", maxLines: 3 }),
              ...cta(content, "center"),
            ],
          },
          ...(content.hasLogo ? [logo("center")] : []),
        ],
      },
    }),
  },
  {
    id: "framed-visual",
    name: "Framed visual",
    summary: "The visual sits in an accent card; headline and CTA share a row below.",
    build: (content) => ({
      overlays: [],
      root: {
        type: "frame", id: "root", layout: "column", pad: "6", gap: "5", align: "stretch",
        children: [
          ...(content.hasLogo ? [logo()] : []),
          {
            type: "frame", id: "visual-card", layout: "column", pad: "6", fill: "brand.accent", radius: "4", align: "stretch", grow: 1,
            children: visual(content, { role: "hero", grow: 1 }),
          },
          {
            type: "frame", id: "copy-row", layout: "row", gap: "5", align: "end", justify: "between",
            children: [
              {
                type: "frame", id: "copy", layout: "column", gap: "2", align: "stretch", grow: 1,
                children: [...text(content.headline, { align: "start", style: "headline", maxLines: 3 }), ...text(content.subheading, { align: "start", maxLines: 2 })],
              },
              ...cta(content, "end"),
            ],
          },
        ],
      },
    }),
  },
  {
    id: "headline-sandwich",
    name: "Headline sandwich",
    summary: "Headline on top, visual in the middle, supporting copy and CTA below.",
    build: (content) => ({
      overlays: [],
      root: {
        type: "frame", id: "root", layout: "column", pad: "6", gap: "4", align: "stretch",
        children: [
          ...text(content.headline, { align: "center", style: "display", maxLines: 3 }),
          ...visual(content, { role: "hero", grow: 1 }),
          ...text(content.subheading, { align: "center", maxLines: 2 }),
          {
            type: "frame", id: "footer", layout: "row", gap: "3", align: "center", justify: content.hasLogo && content.cta ? "between" : "center",
            children: [...(content.hasLogo ? [logo()] : []), ...cta(content, "end")],
          },
        ],
      },
    }),
  },
];

/**
 * A layout only shows the slots it has; a composition may want copy the current
 * layout dropped (a CTA on a layout without a footer). Recover it from the design.
 */
function withDesignExtras(content: SceneContent, session: DesignSessionPersisted): SceneContent {
  const doc = session.document;
  const fromSlots = (roles: string[]) =>
    doc.textSlots?.find((slot) => roles.includes(slot.role) && slot.text.trim())?.text.trim();
  const fromExtras = (match: string) =>
    doc.copy.extraFields.find((field) => field.id.includes(match) && field.value.trim())?.value.trim();
  const ctaText = content.cta?.text ?? fromSlots(["cta"]) ?? fromExtras("cta") ?? fromExtras("extras-footer");
  const captionText = content.caption?.text ?? fromSlots(["contact", "caption"]) ?? fromExtras("contact");
  return {
    ...content,
    cta: content.cta ?? (ctaText ? { id: "cta", text: ctaText } : undefined),
    caption:
      content.caption ??
      (captionText ? { type: "text", id: "caption", role: "caption", style: "caption", text: captionText } : undefined),
  };
}

/** Re-compose a design's content with a scene-native composition, keeping size, fonts and background. */
export function composeScene(session: DesignSessionPersisted, compositionId: string): SceneDocument {
  const base = sceneFromDesign(session);
  const composition = SCENE_COMPOSITIONS.find((entry) => entry.id === compositionId);
  if (!composition) return base;
  const { root, overlays } = composition.build(withDesignExtras(sceneContent(base), session));
  return { ...base, origin: { source: "composition", id: composition.id }, root, overlays };
}

import { createCanvasDesign, type CanvasBrand, type CanvasDesign } from "@/lib/canvas/document";
import type { SceneDocument } from "@/lib/scene/schema";

export const DEFAULT_CANVAS_BRAND: CanvasBrand = {
  colors: { primary: "#1f3a5f", secondary: "#14273f", accent: "#f0a35e", neutral: "#0b1726" },
  logoSvg: null,
  logoSrc: null,
};

/** A plain starting artboard: logo, headline, supporting line and a button. */
export function blankScene(size: { width: number; height: number } = { width: 1080, height: 1080 }): SceneDocument {
  return {
    version: 1,
    kind: size.height >= size.width * 1.5 ? "story" : size.width > size.height * 1.4 ? "deck" : "social",
    size,
    origin: { source: "composition", id: "blank" },
    background: { kind: "brand-preset", presetId: null },
    font: { heading: "Inter", body: "Inter" },
    typeScale: 1,
    durationMs: 0,
    tweaks: [],
    overlays: [],
    root: {
      type: "frame",
      id: "root",
      layout: "column",
      gap: "4",
      pad: "8",
      align: "stretch",
      justify: "between",
      children: [
        { type: "logo", id: "logo", size: "md" },
        {
          type: "frame",
          id: "copy",
          layout: "column",
          gap: "4",
          align: "stretch",
          children: [
            { type: "text", id: "headline", role: "headline", style: "headline", text: "Your headline [[here]]" },
            { type: "text", id: "subheading", role: "subheading", style: "title", color: "text.muted", text: "A supporting line about the offer." },
          ],
        },
        { type: "button", id: "cta", role: "cta", text: "Learn more", variant: "solid", align: "start" },
      ],
    },
  };
}

export function blankCanvasDesign(brand: CanvasBrand = DEFAULT_CANVAS_BRAND): CanvasDesign {
  return createCanvasDesign({ title: "Untitled design", brand, artboards: [{ name: "Artboard 1", scene: blankScene() }] });
}

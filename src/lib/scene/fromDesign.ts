import type { DesignSessionPersisted } from "@/lib/design/types";
import { resolveDesignCanvasSize } from "@/lib/design-engine/canvasSpec";
import type { FeaturedSlotContent, SlotDefinition, TextSlotContent } from "@/lib/social-tool/dynamicLayout";
import { textSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";
import { dynamicLayoutAsPostLayout, resolveDocumentLayout } from "@/lib/social-tool/layoutRegistry";
import { layoutFeaturedZoneMode } from "@/lib/social-tool/postLayouts";
import { getSocialFont } from "@/lib/social-tool/presets";
import type {
  FrameNode,
  SceneDocument,
  SceneNode,
  SceneOverlay,
  TextNode,
  TextStyle,
  VisualNode,
} from "@/lib/scene/schema";

type Align = "start" | "center" | "end";

function toAlign(value: "left" | "center" | "right"): Align {
  return value === "left" ? "start" : value === "right" ? "end" : "center";
}

/** Uploaded images live in IndexedDB; the renderer resolves `asset:` urls from its assets prop. */
export function uploadedImageUrl(slotId: string): string {
  return `asset:${slotId}`;
}

export function sceneKindForDesign(session: DesignSessionPersisted): SceneDocument["kind"] {
  const doc = session.document;
  if (doc.rendererId === "slide-deck") return "deck";
  if (doc.artifactCategory === "print" || doc.rendererId === "print-doc") return "print";
  const size = resolveDesignCanvasSize(doc);
  return size.height >= size.width * 1.5 ? "story" : "social";
}

/**
 * Convert a saved design (any catalog or generated layout) into a scene document.
 * Layout zones become auto-layout frames; slot content becomes typed nodes.
 */
export function sceneFromDesign(session: DesignSessionPersisted): SceneDocument {
  const doc = session.document;
  const layout = resolveDocumentLayout(doc);
  const postLayout = dynamicLayoutAsPostLayout(layout);
  const size = resolveDesignCanvasSize(doc);
  const textSlots: TextSlotContent[] = doc.textSlots ?? textSlotsFromCopy(doc.copy, layout);
  const featuredContent = new Map((doc.featuredSlots ?? []).map((slot) => [slot.slotId, slot]));
  const textAlign = toAlign(layout.textAlign);
  const zoneMode = layoutFeaturedZoneMode(postLayout);
  const overlays: SceneOverlay[] = [];

  const headlineStyle: TextStyle =
    postLayout.headlineScaleProfile === "poster" || postLayout.headlineScaleProfile === "display"
      ? "display"
      : "headline";

  function featuredSource(slotId: string): VisualNode["source"] {
    const content: FeaturedSlotContent | undefined = featuredContent.get(slotId);
    if (content?.mode === "image") {
      if (content.unsplash?.url) return { kind: "image", url: content.unsplash.url, alt: content.unsplash.attribution };
      return { kind: "image", url: uploadedImageUrl(slotId), alt: "" };
    }
    const blockId =
      content?.activeBlockId ??
      (slotId === "featured-primary" ? session.featured.activeBlockId : null) ??
      (slotId === "featured-primary" ? session.featured.visualBlocks?.[0]?.id : null);
    if (blockId && (content?.mode ?? session.featured.mode) === "composed") return { kind: "block", blockId };
    if (session.featured.mode === "image" && slotId === "featured-primary") {
      return { kind: "image", url: uploadedImageUrl(slotId), alt: "" };
    }
    return { kind: "placeholder" };
  }

  function textNode(slot: SlotDefinition): SceneNode | null {
    if (!doc.showContent) return null;
    const role = slot.textRole ?? "body";
    const text = textSlots.find((entry) => entry.slotId === slot.id)?.text?.trim() ?? "";
    if (!text) return null;
    if (role === "cta" && postLayout.ctaRenderMode === "button") {
      return { type: "button", id: slot.id, role: "cta", text, variant: "solid", align: textAlign };
    }
    const style: TextStyle =
      role === "headline" || role === "name"
        ? headlineStyle
        : role === "subheading" || role === "title"
          ? "title"
          : role === "caption" || role === "contact"
            ? "caption"
            : role === "cta"
              ? "label"
              : "body";
    const node: TextNode = {
      type: "text",
      id: slot.id,
      role,
      style,
      text,
      align: textAlign,
      ...(role === "cta" ? { color: "brand.accent" as const } : {}),
      ...(role === "subheading" || role === "body" ? { color: "text.muted" as const } : {}),
    };
    return node;
  }

  function slotNode(slot: SlotDefinition): SceneNode | null {
    if (slot.kind === "logo") {
      return doc.showBrand ? { type: "logo", id: slot.id, size: "md", align: toAlign(layout.logoAlign) } : null;
    }
    if (slot.kind === "featured") {
      const content = featuredContent.get(slot.id);
      if (!doc.showFeaturedImage || content?.visible === false) return null;
      const source = featuredSource(slot.id);
      return {
        type: "visual",
        id: slot.id,
        role: "hero",
        source,
        fit: source.kind === "image" ? "cover" : "contain",
        radius: "2",
        grow: 1,
      };
    }
    if (slot.kind === "text" || slot.kind === "cta" || slot.kind === "contact") return textNode(slot);
    return null;
  }

  const zoneSlots = (zone: SlotDefinition["zone"]) =>
    layout.slots.filter((slot) => slot.zone === zone).sort((a, b) => a.order - b.order);

  function copyFrame(id: string, children: SceneNode[], fill: boolean): FrameNode {
    return {
      type: "frame",
      id,
      layout: "column",
      gap: "3",
      align: "stretch",
      justify: layout.textVerticalAlign === "center" ? "center" : "start",
      ...(fill ? { grow: 1 } : {}),
      children,
    };
  }

  /** Group consecutive copy slots into one column; featured slots form their own band. */
  function stackBands(slots: SlotDefinition[], idPrefix: string): SceneNode[] {
    const bands: SceneNode[] = [];
    let copy: SceneNode[] = [];
    let visuals: SceneNode[] = [];
    const flushCopy = () => {
      if (copy.length) bands.push(copyFrame(`${idPrefix}-copy-${bands.length}`, copy, false));
      copy = [];
    };
    const flushVisuals = () => {
      if (visuals.length === 1) bands.push(visuals[0]!);
      else if (visuals.length > 1) {
        bands.push({ type: "frame", id: `${idPrefix}-visuals`, layout: "row", gap: "3", align: "stretch", grow: 1, children: visuals });
      }
      visuals = [];
    };
    for (const slot of slots) {
      const node = slotNode(slot);
      if (!node) continue;
      if (node.type === "visual") {
        flushCopy();
        visuals.push(node);
      } else {
        flushVisuals();
        copy.push(node);
      }
    }
    flushCopy();
    flushVisuals();
    // Without a visual, the copy band takes the space and aligns per the layout.
    if (!bands.some((band) => band.type === "visual" || (band.type === "frame" && band.id.endsWith("-visuals")))) {
      return [copyFrame(`${idPrefix}-copy`, bands.flatMap((band) => (band.type === "frame" ? band.children : [band])), true)];
    }
    return bands;
  }

  /** Corner layouts: copy takes the space; the visual sits in its own bottom-right cell so they never overlap. */
  function cornerVisual(nodes: SceneNode[]): SceneNode[] {
    const visual = nodes.find((node): node is VisualNode => node.type === "visual");
    if (!visual) return nodes;
    const rest = nodes.filter((node) => node !== visual);
    return [
      copyFrame("main-copy", rest.flatMap((node) => (node.type === "frame" ? node.children : [node])), true),
      {
        type: "frame",
        id: "corner",
        layout: "row",
        justify: "end",
        children: [{ ...visual, role: "supporting", grow: undefined, basis: 0.42, aspect: 4 / 3 }],
      },
    ];
  }

  let mainChildren: SceneNode[];
  if (layout.composition === "split" || zoneMode === "portrait-strip") {
    const textSlotsInColumn = layout.composition === "split" ? zoneSlots("textColumn") : zoneSlots("stackMain").filter((slot) => slot.kind !== "featured");
    const visualSlots = layout.composition === "split" ? zoneSlots("featuredColumn") : zoneSlots("stackMain").filter((slot) => slot.kind === "featured");
    const textColumn = copyFrame(
      "text-column",
      textSlotsInColumn.map(slotNode).filter((node): node is SceneNode => !!node),
      false,
    );
    const visualNodes = visualSlots.map(slotNode).filter((node): node is SceneNode => !!node);
    const ratio = zoneMode === "portrait-strip" ? 0.6 : (layout.textColumnRatio ?? 0.45);
    if (visualNodes.length === 0) {
      mainChildren = [{ ...textColumn, grow: 1 }];
    } else {
      const visualColumn: FrameNode = { type: "frame", id: "visual-column", layout: "column", gap: "3", align: "stretch", grow: 1, children: visualNodes };
      const sized = { ...textColumn, basis: ratio };
      mainChildren = [
        {
          type: "frame",
          id: "split",
          layout: "row",
          gap: "6",
          align: "stretch",
          grow: 1,
          children: layout.textSide === "right" ? [visualColumn, sized] : [sized, visualColumn],
        },
      ];
    }
  } else {
    const ordered = [...zoneSlots("hero"), ...zoneSlots("stackMain"), ...zoneSlots("sidebar")];
    mainChildren = stackBands(ordered, "main");
    if (layout.stack === "featured-first") {
      const visualIndex = mainChildren.findIndex((node) => node.type === "visual" || (node.type === "frame" && node.id.endsWith("-visuals")));
      if (visualIndex > 0) mainChildren = [mainChildren[visualIndex]!, ...mainChildren.filter((_, i) => i !== visualIndex)];
    }
    if (zoneMode === "corner") mainChildren = cornerVisual(mainChildren);
  }

  const footerNodes = zoneSlots("footer").map(slotNode).filter((node): node is SceneNode => !!node);
  const children: SceneNode[] = [
    { type: "frame", id: "main", layout: "column", gap: "4", align: "stretch", grow: 1, children: mainChildren },
  ];
  if (footerNodes.length) {
    children.push({
      type: "frame",
      id: "footer",
      layout: "row",
      gap: "3",
      align: "center",
      justify: footerNodes.length > 1 ? "between" : textAlign === "center" ? "center" : textAlign === "end" ? "end" : "start",
      children: footerNodes,
    });
  }

  return {
    version: 1,
    kind: sceneKindForDesign(session),
    size: { width: Math.round(size.width), height: Math.round(size.height) },
    origin: { source: "catalog", id: layout.id },
    background: doc.showBackground
      ? { kind: "brand-preset", presetId: session.brand.activeBackgroundPresetId ?? null }
      : { kind: "color", color: "surface" },
    font: { heading: getSocialFont(doc.headingFont).family, body: getSocialFont(doc.subFont).family },
    typeScale: Math.min(2, Math.max(0.5, doc.typeScale || 1)),
    durationMs: 0,
    overlays,
    root: { type: "frame", id: "root", layout: "column", gap: "4", pad: "6", align: "stretch", children },
  };
}

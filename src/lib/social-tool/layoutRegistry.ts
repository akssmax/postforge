import type { DesignDocument } from "@/lib/design/types";
import type { DynamicLayout, LayoutRef } from "@/lib/social-tool/dynamicLayout";
import {
  catalogLayoutIdFromRef,
  catalogLayoutToDynamic,
  resolveLayoutRef,
} from "@/lib/social-tool/layoutAdapter";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";
import { getPostLayout } from "@/lib/social-tool/postLayouts";

const generatedLayouts = new Map<string, DynamicLayout>();

export function registerGeneratedLayout(layout: DynamicLayout): DynamicLayout {
  const normalized: DynamicLayout = {
    ...layout,
    id: layout.id.startsWith("generated-") ? layout.id : `generated-${layout.id}`,
    source: "generated",
  };
  generatedLayouts.set(normalized.id, normalized);
  return normalized;
}

export function getGeneratedLayout(id: string): DynamicLayout | undefined {
  return generatedLayouts.get(id);
}

export function resolveDocumentLayout(document: DesignDocument): DynamicLayout {
  if (document.version >= 2 && document.layoutRef) {
    if (document.layoutRef.source === "generated") {
      const cached = getGeneratedLayout(document.layoutRef.layout.id);
      return cached ?? document.layoutRef.layout;
    }
    return resolveLayoutRef(document.layoutRef);
  }
  return catalogLayoutToDynamic(getPostLayout(document.layoutId));
}

/** PostLayout-compatible view for hierarchy + zone math */
export function dynamicLayoutAsPostLayout(layout: DynamicLayout): PostLayout {
  const catalogId = layout.source === "catalog" ? (layout.id as PostLayoutId) : "classic-hero";
  const base =
    layout.source === "catalog"
      ? getPostLayout(catalogId)
      : getPostLayout("classic-hero");

  const mainBlocks = layout.slots
    .filter((s) => s.kind === "text" && s.zone !== "footer")
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      if (s.textRole === "headline") return "headline" as const;
      if (s.textRole === "subheading") return "subheading" as const;
      return "extras" as const;
    });

  const footerBlocks = layout.slots
    .filter((s) => s.zone === "footer")
    .sort((a, b) => a.order - b.order)
    .map((s) => (s.kind === "logo" ? ("logo" as const) : ("extras" as const)));

  return {
    ...base,
    id: layout.source === "catalog" ? catalogId : base.id,
    name: layout.name,
    composition: layout.composition,
    textSide: layout.textSide,
    textZoneRatio: layout.textZoneRatio,
    textZoneMax: layout.textZoneMax,
    textColumnRatio: layout.textColumnRatio,
    textColumnMax: layout.textColumnMax,
    stack: layout.stack,
    textVerticalAlign: layout.textVerticalAlign,
    logoPlacement: layout.logoPlacement,
    logoAlign: layout.logoAlign,
    textAlign: layout.textAlign,
    featuredRadius: layout.featuredRadius,
    extrasPlacement: layout.extrasPlacement,
    mainBlocks: mainBlocks.length > 0 ? mainBlocks : base.mainBlocks,
    footerBlocks: footerBlocks.length > 0 ? footerBlocks : base.footerBlocks,
    summary: layout.name,
    description: layout.name,
    tags: layout.source === "generated" ? ["generated"] : base.tags,
    bestFor: base.bestFor,
    promptHints: base.promptHints,
  };
}

export function resolveLayoutRefForPlan(ref: LayoutRef): LayoutRef {
  if (ref.source === "generated") {
    return { source: "generated", layout: registerGeneratedLayout(ref.layout) };
  }
  return ref;
}

export function layoutIdForDocument(document: DesignDocument): PostLayoutId {
  if (document.version >= 2 && document.layoutRef) {
    return catalogLayoutIdFromRef(document.layoutRef);
  }
  return document.layoutId;
}

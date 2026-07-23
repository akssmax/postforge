import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";
import type {
  DynamicLayout,
  FeaturedSlotContent,
  LayoutRef,
  SlotDefinition,
  TextSlotContent,
  TextSlotRole,
} from "@/lib/social-tool/dynamicLayout";
import type { DesignDocument } from "@/lib/design/types";
import { EMPTY_POST_COPY } from "@/lib/design/designSession";
import type { PostContentBlock, PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import type { PostCopy, ProductPageId } from "@/lib/social-tool/presets";
import { normalizeProductPage } from "@/lib/social-tool/presets";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";

function blockToTextRole(block: PostContentBlock): TextSlotRole {
  if (block === "headline") return "headline";
  if (block === "subheading") return "subheading";
  return "body";
}

function blockToSlotId(block: PostContentBlock, index: number): string {
  if (block === "headline") return "headline";
  if (block === "subheading") return "subheading";
  return `extra-${index}`;
}

export function catalogLayoutToDynamic(layout: PostLayout): DynamicLayout {
  const slots: SlotDefinition[] = [];
  let order = 0;

  if (layout.logoPlacement === "top") {
    slots.push({
      id: "logo",
      kind: "logo",
      zone: layout.composition === "split" ? "textColumn" : "stackMain",
      order: order++,
    });
  }

  layout.mainBlocks.forEach((block, index) => {
    if (block === "extras" && layout.extrasPlacement !== "main") return;
    slots.push({
      id: blockToSlotId(block, index),
      kind: "text",
      zone: layout.composition === "split" ? "textColumn" : "stackMain",
      order: order++,
      textRole: blockToTextRole(block),
    });
  });

  slots.push({
    id: "featured-primary",
    kind: "featured",
    zone: layout.composition === "split" ? "featuredColumn" : "stackMain",
    order: order++,
    flexGrow: 1,
  });

  layout.footerBlocks.forEach((block) => {
    if (block === "logo" && layout.logoPlacement === "footer") {
      slots.push({
        id: "logo-footer",
        kind: "logo",
        zone: "footer",
        order: order++,
      });
    }
    if (block === "extras" && layout.extrasPlacement === "footer") {
      slots.push({
        id: "extras-footer",
        kind: "text",
        zone: "footer",
        order: order++,
        textRole: "caption",
      });
    }
  });

  return {
    id: layout.id,
    source: "catalog",
    name: layout.name,
    composition: layout.composition ?? "stack",
    stack: layout.stack,
    textSide: layout.textSide,
    textZoneRatio: layout.textZoneRatio,
    textZoneMax: layout.textZoneMax,
    textColumnRatio: layout.textColumnRatio,
    textColumnMax: layout.textColumnMax,
    textVerticalAlign: layout.textVerticalAlign,
    logoPlacement: layout.logoPlacement,
    logoAlign: layout.logoAlign,
    textAlign: layout.textAlign,
    featuredRadius: layout.featuredRadius,
    extrasPlacement: layout.extrasPlacement,
    slots,
  };
}

export function resolveLayoutRef(ref: LayoutRef): DynamicLayout {
  if (ref.source === "generated") return ref.layout;
  return catalogLayoutToDynamic(getPostLayout(ref.id));
}

export function textSlotsFromCopy(
  copy: PostCopy,
  layout: DynamicLayout,
): TextSlotContent[] {
  const textSlots = layout.slots.filter((slot) => slot.kind === "text");
  const result: TextSlotContent[] = [];

  for (const slot of textSlots) {
    const role = slot.textRole ?? "body";
    if (role === "headline") {
      result.push({ slotId: slot.id, text: copy.heading, role });
    } else if (role === "subheading") {
      result.push({ slotId: slot.id, text: copy.subheading, role });
    } else if (slot.id.startsWith("extra-") || role === "body" || role === "caption") {
      const extraIndex = copy.extraFields.findIndex((_, i) => slot.id === `extra-${i}`);
      const value =
        extraIndex >= 0
          ? copy.extraFields[extraIndex]?.value ?? ""
          : copy.extraFields[0]?.value ?? "";
      result.push({ slotId: slot.id, text: value, role });
    }
  }

  return result;
}

export function copyFromTextSlots(
  textSlots: TextSlotContent[],
  layout: DynamicLayout,
  base: PostCopy = EMPTY_POST_COPY,
): PostCopy {
  const next: PostCopy = {
    heading: base.heading,
    subheading: base.subheading,
    extraFields: [...base.extraFields],
  };

  for (const slot of textSlots) {
    if (slot.role === "headline") next.heading = slot.text;
    else if (slot.role === "subheading") next.subheading = slot.text;
    else {
      const idx = next.extraFields.findIndex((f) => f.id === slot.slotId);
      if (idx >= 0) {
        next.extraFields[idx] = { ...next.extraFields[idx], value: slot.text };
      } else {
        next.extraFields.push({
          id: slot.slotId,
          label: slot.role === "caption" ? "Caption" : "Detail",
          value: slot.text,
        });
      }
    }
  }

  const expectedExtras = layout.slots.filter(
    (s) => s.kind === "text" && s.textRole !== "headline" && s.textRole !== "subheading",
  ).length;
  if (next.extraFields.length < expectedExtras) {
    for (let i = next.extraFields.length; i < expectedExtras; i++) {
      next.extraFields.push({
        id: `extra-${i}`,
        label: "Detail",
        value: "",
      });
    }
  }

  return next;
}

export function featuredSlotsFromLegacy(
  featured: FeaturedBlockPersisted,
  layout: DynamicLayout,
  showFeaturedImage: boolean,
  transform = DEFAULT_FEATURED_TRANSFORM,
): FeaturedSlotContent[] {
  const defs = layout.slots.filter((slot) => slot.kind === "featured");
  if (defs.length === 0) return [];

  if (featured.slots?.length) {
    return defs.map((def, index) => {
      const persisted = featured.slots?.find((s) => s.slotId === def.id) ?? featured.slots?.[index];
      return {
        slotId: def.id,
        mode: persisted?.mode ?? featured.mode,
        productPage: persisted?.productPage ?? featured.productPage,
        transform: persisted?.transform ?? (index === 0 ? transform : transform),
        visible: showFeaturedImage && (persisted?.visible ?? true),
      };
    });
  }

  return defs.map((def, index) => ({
    slotId: def.id,
    mode: featured.mode,
    productPage: featured.productPage,
    transform: index === 0 ? transform : transform,
    visible: showFeaturedImage,
  }));
}

export function migrateDocumentV1ToV2(
  doc: DesignDocument,
  featured?: FeaturedBlockPersisted,
): DesignDocument {
  if (doc.version >= 2 && doc.textSlots && doc.featuredSlots) return doc;

  const layoutRef: LayoutRef = doc.layoutRef ?? { source: "catalog", id: doc.layoutId };
  const layout = resolveLayoutRef(layoutRef);
  const textSlots = doc.textSlots ?? textSlotsFromCopy(doc.copy, layout);
  const featuredBlock = featured ?? {
    mode: "genui" as const,
    productPage: "leads" as const,
    image: null,
  };
  const featuredSlots =
    doc.featuredSlots ??
    featuredSlotsFromLegacy(
      featuredBlock,
      layout,
      doc.showFeaturedImage,
      doc.featuredTransform,
    );

  return {
    ...doc,
    version: 2,
    layoutRef,
    textSlots,
    featuredSlots,
  };
}

export function catalogLayoutIdFromRef(ref: LayoutRef): PostLayoutId {
  if (ref.source === "catalog") return ref.id;
  return "classic-hero";
}

export function defaultProductPageForSlots(slots: FeaturedSlotContent[]): ProductPageId {
  const first = slots.find((s) => s.visible && s.mode === "genui");
  return normalizeProductPage(first?.productPage ?? "leads");
}

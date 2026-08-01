import { DEFAULT_FEATURED_TRANSFORM } from "@/lib/social-tool/featuredTransform";
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
import { resolveEditableSlotLabel } from "@/lib/social-tool/slotLibrary";

export type EditableTextSlot = {
  slotId: string;
  role: TextSlotRole;
  text: string;
  label: string;
};

function disambiguateEditableSlotLabels(slots: EditableTextSlot[]): EditableTextSlot[] {
  const counts = new Map<string, number>();
  for (const slot of slots) {
    counts.set(slot.label, (counts.get(slot.label) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return slots.map((slot) => {
    if ((counts.get(slot.label) ?? 0) <= 1) return slot;
    const index = (seen.get(slot.label) ?? 0) + 1;
    seen.set(slot.label, index);
    return index === 1 ? slot : { ...slot, label: `${slot.label} ${index}` };
  });
}

export function getEditableTextSlots(
  layoutRef: LayoutRef | undefined,
  layoutId: PostLayoutId,
  textSlots: TextSlotContent[] | undefined,
  copy: PostCopy,
  artifactId?: string,
): EditableTextSlot[] {
  const layout = resolveLayoutRef(layoutRef ?? catalogLayoutRef(layoutId));
  const current = textSlots ?? textSlotsFromCopy(copy, layout);

  const slots = layout.slots
    .filter((slot) => slot.kind === "text")
    .map((slot) => {
      const role = slot.textRole ?? "body";
      const content = current.find((s) => s.slotId === slot.id);
      return {
        slotId: slot.id,
        role,
        text: content?.text ?? "",
        label: resolveEditableSlotLabel(slot.id, role, copy, artifactId),
      };
    });

  return disambiguateEditableSlotLabels(slots);
}

export function patchTextSlot(
  textSlots: TextSlotContent[],
  slotId: string,
  text: string,
  role?: TextSlotRole,
): TextSlotContent[] {
  const idx = textSlots.findIndex((s) => s.slotId === slotId);
  if (idx >= 0) {
    return textSlots.map((s, i) => (i === idx ? { ...s, text } : s));
  }
  if (role) {
    return [...textSlots, { slotId, text, role }];
  }
  return textSlots;
}

/** Resolve the layout slot id for headline / subheading roles. */
export function textSlotIdForRole(
  layout: DynamicLayout,
  role: "headline" | "subheading",
): string {
  return (
    layout.slots.find((slot) => slot.kind === "text" && slot.textRole === role)
      ?.id ?? role
  );
}

export function syncDocumentTextSlots(
  doc: Pick<DesignDocument, "layoutRef" | "layoutId" | "copy" | "textSlots">,
  mutator: (slots: TextSlotContent[], layout: DynamicLayout) => TextSlotContent[],
): Pick<DesignDocument, "textSlots" | "copy"> {
  const layout = resolveLayoutRef(
    doc.layoutRef ?? catalogLayoutRef(doc.layoutId as PostLayoutId),
  );
  const base = doc.textSlots ?? textSlotsFromCopy(doc.copy, layout);
  const textSlots = mutator(base, layout);
  const copy = copyFromTextSlots(textSlots, layout, doc.copy);
  return { textSlots, copy };
}

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

export function legacyEditableSlotsFromCopy(copy: PostCopy): EditableTextSlot[] {
  const slots: EditableTextSlot[] = [
    {
      slotId: "headline",
      role: "headline",
      text: copy.heading,
      label: "Headline",
    },
    {
      slotId: "subheading",
      role: "subheading",
      text: copy.subheading,
      label: "Subheading",
    },
  ];
  copy.extraFields.forEach((field, index) => {
    if (!field.value.trim()) return;
    slots.push({
      slotId: field.id,
      role: "body",
      text: field.value,
      label: field.label || `Detail ${index + 1}`,
    });
  });
  return slots;
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

  if (layout.sectionSlotCount) {
    for (let i = 0; i < layout.sectionSlotCount; i++) {
      slots.push({
        id: `section-${i}`,
        kind: "text",
        zone: layout.composition === "split" ? "textColumn" : "stackMain",
        order: order++,
        textRole: "body",
      });
    }
  }

  if (layout.includeFeaturedSlot !== false) {
    slots.push({
      id: "featured-primary",
      kind: "featured",
      zone: layout.composition === "split" ? "featuredColumn" : "stackMain",
      order: order++,
      flexGrow: 1,
    });

    if (layout.secondFeaturedSlot) {
      slots.push({
        id: "featured-secondary",
        kind: "featured",
        zone: layout.composition === "split" ? "featuredColumn" : "stackMain",
        order: order++,
        flexGrow: 1,
      });
    }
  }

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
      const ctaLayout =
        layout.id === "event-poster" ||
        layout.id === "invite-card" ||
        layout.id === "hiring-post" ||
        layout.id === "social-ad" ||
        layout.id === "promotion-hero" ||
        layout.ctaRenderMode === "button";
      const slotId =
        layout.ctaRenderMode === "button" ? "cta-primary" : "extras-footer";
      slots.push({
        id: slotId,
        kind: "text",
        zone: "footer",
        order: order++,
        textRole: ctaLayout ? "cta" : "caption",
      });
    }
    if (block === "contact") {
      slots.push({
        id: "contact-footer",
        kind: "text",
        zone: "footer",
        order: order++,
        textRole: "contact",
      });
    }
  });

  if (layout.footerContact) {
    slots.push({
      id: "contact-footer",
      kind: "text",
      zone: "footer",
      order: order++,
      textRole: "contact",
    });
  }

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

export function repairTextSlotsForLayout(
  textSlots: TextSlotContent[],
  layout: DynamicLayout,
): TextSlotContent[] {
  const defs = layout.slots.filter((slot) => slot.kind === "text");
  const defById = new Map(defs.map((def) => [def.id, def]));
  const used = new Set<string>();
  const repaired: TextSlotContent[] = [];

  const claim = (predicate: (def: SlotDefinition) => boolean): SlotDefinition | undefined => {
    const match = defs.find((def) => !used.has(def.id) && predicate(def));
    if (match) used.add(match.id);
    return match;
  };

  for (const slot of textSlots) {
    if (defById.has(slot.slotId) && !used.has(slot.slotId)) {
      used.add(slot.slotId);
      repaired.push(slot);
      continue;
    }

    const role = slot.role ?? (slot.slotId as TextSlotRole);
    const match =
      claim((def) => def.id === slot.slotId) ??
      claim((def) => (def.textRole ?? "body") === role) ??
      claim((def) => (def.textRole ?? "body") === (slot.slotId as TextSlotRole)) ??
      claim((def) => def.id.includes(slot.slotId));

    if (match) {
      repaired.push({
        slotId: match.id,
        text: slot.text,
        role: match.textRole ?? role,
      });
    }
  }

  for (const def of defs) {
    if (!used.has(def.id)) {
      repaired.push({
        slotId: def.id,
        text: "",
        role: def.textRole ?? "body",
      });
    }
  }

  return defs
    .map((def) => repaired.find((slot) => slot.slotId === def.id))
    .filter((slot): slot is TextSlotContent => Boolean(slot));
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
    } else if (
      slot.id.startsWith("extra-") ||
      slot.id.startsWith("section-") ||
      slot.id === "contact-footer" ||
      role === "body" ||
      role === "caption" ||
      role === "contact" ||
      role === "cta"
    ) {
      const byId = copy.extraFields.find((f) => f.id === slot.id);
      const extraIndex = copy.extraFields.findIndex(
        (_, i) => slot.id === `extra-${i}` || slot.id === `section-${i}`,
      );
      const legacyFooterExtra =
        slot.id === "extras-footer"
          ? copy.extraFields.find(
              (f) =>
                f.id === "extras-footer" ||
                (f.id.startsWith("extra-") && !f.id.startsWith("cta")),
            )
          : undefined;
      const value =
        byId?.value ??
        (extraIndex >= 0 ? copy.extraFields[extraIndex]?.value ?? "" : "") ??
        legacyFooterExtra?.value ??
        "";
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
      if (!slot.text.trim()) {
        if (idx >= 0) next.extraFields.splice(idx, 1);
        continue;
      }
      const existingLabel = idx >= 0 ? next.extraFields[idx]?.label?.trim() : "";
      const label =
        existingLabel ||
        resolveEditableSlotLabel(slot.slotId, slot.role, base);
      if (idx >= 0) {
        next.extraFields[idx] = { ...next.extraFields[idx], value: slot.text, label };
      } else {
        next.extraFields.push({
          id: slot.slotId,
          label,
          value: slot.text,
        });
      }
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

export function catalogLayoutRef(id: PostLayoutId): LayoutRef {
  return { source: "catalog", id };
}

export function defaultProductPageForSlots(slots: FeaturedSlotContent[]): ProductPageId {
  const first = slots.find((s) => s.visible && s.mode === "genui");
  return normalizeProductPage(first?.productPage ?? "leads");
}

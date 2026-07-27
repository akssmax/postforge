import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import type {
  LogoAlign,
  LogoPlacement,
  ProductPageId,
  TextAlign,
} from "@/lib/social-tool/presets";
import type {
  ExtrasPlacement,
  FeaturedFrameRadius,
  PostLayoutComposition,
  PostLayoutId,
  PostLayoutStack,
  PostLayoutTextSide,
} from "@/lib/social-tool/postLayouts";

export type SlotKind =
  | "logo"
  | "text"
  | "featured"
  | "cta"
  | "contact"
  | "photo"
  | "badge"
  | "diagram"
  | "metric";
export type LayoutZone =
  | "textColumn"
  | "featuredColumn"
  | "stackMain"
  | "footer"
  | "hero"
  | "sidebar";

export type TextSlotRole =
  | "headline"
  | "subheading"
  | "body"
  | "caption"
  | "cta"
  | "contact"
  | "name"
  | "title";

export type SlotDefinition = {
  id: string;
  kind: SlotKind;
  zone: LayoutZone;
  order: number;
  textRole?: TextSlotRole;
  flexGrow?: number;
};

export type DynamicLayout = {
  id: string;
  source: "catalog" | "generated";
  name: string;
  composition: PostLayoutComposition;
  stack: PostLayoutStack;
  textSide?: PostLayoutTextSide;
  textZoneRatio: number;
  textZoneMax?: number;
  textColumnRatio?: number;
  textColumnMax?: number;
  textVerticalAlign: "start" | "center";
  logoPlacement: LogoPlacement;
  logoAlign: LogoAlign;
  textAlign: TextAlign;
  featuredRadius: FeaturedFrameRadius;
  extrasPlacement: ExtrasPlacement;
  slots: SlotDefinition[];
};

export type LayoutRef =
  | { source: "catalog"; id: PostLayoutId }
  | { source: "generated"; layout: DynamicLayout };

export type TextSlotContent = {
  slotId: string;
  text: string;
  role: TextSlotRole;
};

export type FeaturedSlotContent = {
  slotId: string;
  mode: "genui" | "image" | "placeholder" | "composed";
  productPage?: ProductPageId;
  activeBlockId?: string | null;
  transform?: FeaturedImageTransform;
  visible: boolean;
  /** Stock photo source when mode is image. */
  imageSource?: "upload" | "unsplash";
  unsplash?: {
    id: string;
    url: string;
    photographer: string;
    attribution: string;
  };
};

export function sortSlots(slots: SlotDefinition[]): SlotDefinition[] {
  return [...slots].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function slotsInZone(
  layout: DynamicLayout,
  zone: LayoutZone,
  kind?: SlotKind,
): SlotDefinition[] {
  return sortSlots(
    layout.slots.filter((slot) => slot.zone === zone && (kind == null || slot.kind === kind)),
  );
}

export function textSlotsForLayout(layout: DynamicLayout): SlotDefinition[] {
  return sortSlots(layout.slots.filter((slot) => slot.kind === "text"));
}

export function featuredSlotsForLayout(layout: DynamicLayout): SlotDefinition[] {
  return sortSlots(layout.slots.filter((slot) => slot.kind === "featured"));
}

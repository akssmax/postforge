import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";

export type SlotNeed =
  | "logo"
  | "headline"
  | "subheading"
  | "body"
  | "caption"
  | "cta"
  | "product_image"
  | "badge";

export type LayoutDensityClass = "visualFirst" | "balanced" | "copyHeavy";

export type LayoutRetrievalMeta = {
  supportedIntents: string[];
  supportedSlots: SlotNeed[];
  visualWeight: "light" | "medium" | "heavy";
  readingPattern: "F" | "Z" | "center";
  contentDensity: "low" | "medium" | "high";
  densityClass: LayoutDensityClass;
};

const INTENT_BY_TAG: Record<string, string[]> = {
  launch: ["product_launch", "announcement"],
  announcement: ["announcement", "product_launch"],
  product: ["product_launch", "advertisement"],
  editorial: ["thought_leadership"],
  quote: ["thought_leadership"],
  event: ["event"],
  webinar: ["event"],
  brand: ["announcement", "advertisement"],
  split: ["advertisement", "product_launch"],
  deck: ["thought_leadership", "event"],
  minimal: ["thought_leadership", "advertisement"],
  visual: ["product_launch", "advertisement"],
  hero: ["product_launch", "announcement"],
};

function inferIntents(layout: PostLayout): string[] {
  const intents = new Set<string>(["announcement"]);

  for (const tag of layout.tags) {
    for (const intent of INTENT_BY_TAG[tag] ?? []) {
      intents.add(intent);
    }
  }

  if (layout.textZoneRatio <= 0.38) intents.add("product_launch");
  if (layout.textZoneRatio >= 0.5) intents.add("thought_leadership");
  if (layout.composition === "split") intents.add("advertisement");
  if (layout.logoPlacement === "footer") intents.add("event");

  return [...intents];
}

function inferSlots(layout: PostLayout): SlotNeed[] {
  const slots: SlotNeed[] = ["logo", "headline"];

  if (layout.mainBlocks.includes("subheading")) slots.push("subheading");
  if (layout.mainBlocks.includes("extras") && layout.extrasPlacement !== "hidden") {
    slots.push("cta");
  }
  if (layout.footerBlocks.includes("extras")) slots.push("caption");
  slots.push("product_image");

  return slots;
}

function inferVisualWeight(layout: PostLayout): LayoutRetrievalMeta["visualWeight"] {
  if (layout.textZoneRatio <= 0.32) return "heavy";
  if (layout.textZoneRatio >= 0.52) return "light";
  return "medium";
}

function inferReadingPattern(layout: PostLayout): LayoutRetrievalMeta["readingPattern"] {
  if (layout.textAlign === "center") return "center";
  if (layout.composition === "split") return "Z";
  return "F";
}

function inferContentDensity(layout: PostLayout): LayoutRetrievalMeta["contentDensity"] {
  if (layout.textZoneRatio >= 0.5) return "high";
  if (layout.textZoneRatio <= 0.35) return "low";
  return "medium";
}

const VISUAL_FIRST_LAYOUTS = new Set<PostLayoutId>([
  "visual-first",
  "product-focus",
  "balanced-split",
  "professional-left",
]);

const COPY_HEAVY_LAYOUTS = new Set<PostLayoutId>([
  "copy-statement",
  "centered-announcement",
]);

function inferDensityClass(layout: PostLayout): LayoutDensityClass {
  if (VISUAL_FIRST_LAYOUTS.has(layout.id)) return "visualFirst";
  if (COPY_HEAVY_LAYOUTS.has(layout.id)) return "copyHeavy";
  if (layout.textZoneRatio <= 0.36) return "visualFirst";
  if (layout.textZoneRatio >= 0.5) return "copyHeavy";
  return "balanced";
}

export function getLayoutRetrievalMeta(layout: PostLayout): LayoutRetrievalMeta {
  return {
    supportedIntents: inferIntents(layout),
    supportedSlots: inferSlots(layout),
    visualWeight: inferVisualWeight(layout),
    readingPattern: inferReadingPattern(layout),
    contentDensity: inferContentDensity(layout),
    densityClass: inferDensityClass(layout),
  };
}

export function layoutSupportsIntent(
  meta: LayoutRetrievalMeta,
  primaryIntent: string,
): boolean {
  return meta.supportedIntents.some(
    (intent) =>
      intent === primaryIntent ||
      primaryIntent.includes(intent) ||
      intent.includes(primaryIntent),
  );
}

export function layoutRetrievalMetaById(): Record<PostLayoutId, LayoutRetrievalMeta> {
  return {} as Record<PostLayoutId, LayoutRetrievalMeta>;
}

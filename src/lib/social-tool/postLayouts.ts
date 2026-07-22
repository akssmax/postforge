import type {
  LogoAlign,
  LogoPlacement,
  PlatformId,
  PostCopy,
  TextAlign,
} from "@/lib/social-tool/presets";

/**
 * Curated post layouts derived from common social-media patterns:
 * hero product shots, centered announcements, footer logo bars,
 * copy-heavy thought leadership, visual-first Instagram cards, etc.
 *
 * Each entry is a rule set the shuffle control (and future AI prompt matcher)
 * can apply without touching canvas rendering code.
 */

export type PostLayoutId =
  | "classic-hero"
  | "centered-announcement"
  | "logo-footer-bar"
  | "product-focus"
  | "copy-statement"
  | "balanced-split"
  | "visual-first"
  | "professional-left"
  | "footer-mark"
  | "brand-stack"
  | "event-footer";

/** Which block stack comes first in the column flex layout */
export type PostLayoutStack = "text-first" | "featured-first";

/** Blocks that can appear in the main copy column */
export type PostContentBlock = "headline" | "subheading" | "extras";

/** Blocks that can appear in the footer strip */
export type PostFooterBlock = "logo" | "extras";

/** Where optional extra copy lines render */
export type ExtrasPlacement = "main" | "footer" | "hidden";

/** Corner radius on the featured image / product frame */
export type FeaturedFrameRadius =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "none";

export type PostLayout = {
  id: PostLayoutId;
  /** Short label shown in the shuffle tooltip */
  name: string;
  /** One-line helper for non-designers */
  summary: string;
  /** Longer description for AI prompt matching */
  description: string;
  /** Search / classification tags */
  tags: string[];
  /** Platforms this layout tends to work well on */
  bestFor: PlatformId[] | "all";
  stack: PostLayoutStack;
  /** Share of canvas height for the copy band (when featured is visible) */
  textZoneRatio: number;
  textZoneMax?: number;
  textVerticalAlign: "start" | "center";
  logoPlacement: LogoPlacement;
  logoAlign: LogoAlign;
  textAlign: TextAlign;
  featuredRadius: FeaturedFrameRadius;
  /** Ordered blocks in the main copy column */
  mainBlocks: PostContentBlock[];
  /** Where additional copy lines appear */
  extrasPlacement: ExtrasPlacement;
  /** Footer strip below the featured block (logo bar, CTA lines, etc.) */
  footerBlocks: PostFooterBlock[];
  /** Phrases users might say in a future AI prompt box */
  promptHints: string[];
};

export const DEFAULT_POST_LAYOUT_ID: PostLayoutId = "classic-hero";

export const POST_LAYOUTS: PostLayout[] = [
  {
    id: "classic-hero",
    name: "Classic hero",
    summary: "Logo top-left, headline centered, product anchored below",
    description:
      "The default SaaS launch layout: brand mark in the upper corner, bold headline in the middle band, and a large product screenshot bleeding to the bottom edge. Common on LinkedIn product posts and startup launch graphics.",
    tags: ["product-launch", "saas", "screenshot", "hero"],
    bestFor: ["linkedin-square", "linkedin-landscape", "twitter"],
    stack: "text-first",
    textZoneRatio: 0.44,
    textZoneMax: 0.58,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "center",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "product launch",
      "hero screenshot",
      "big product image at the bottom",
      "classic linkedin post",
    ],
  },
  {
    id: "centered-announcement",
    name: "Centered announcement",
    summary: "Logo and copy centered — great for milestones",
    description:
      "Symmetric, editorial layout with centered logo and headline. Feels like an announcement card or milestone post. Works when the message matters more than the screenshot.",
    tags: ["announcement", "milestone", "brand", "centered"],
    bestFor: ["instagram-square", "linkedin-square"],
    stack: "text-first",
    textZoneRatio: 0.46,
    textZoneMax: 0.6,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "center",
    textAlign: "center",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "centered announcement",
      "milestone post",
      "symmetrical brand post",
      "company news",
    ],
  },
  {
    id: "logo-footer-bar",
    name: "Logo footer bar",
    summary: "Copy up top, logo anchored in a footer strip",
    description:
      "Headline-led layout with the logo in a footer bar — common in corporate decks, event slides, and polished B2B social posts where the mark should not compete with the message.",
    tags: ["corporate", "footer-logo", "minimal", "b2b"],
    bestFor: ["linkedin-landscape", "event-standee"],
    stack: "text-first",
    textZoneRatio: 0.4,
    textZoneMax: 0.52,
    textVerticalAlign: "start",
    logoPlacement: "footer",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "footer",
    footerBlocks: ["logo", "extras"],
    promptHints: [
      "logo in the footer",
      "corporate layout",
      "headline first with small logo at bottom",
    ],
  },
  {
    id: "product-focus",
    name: "Product focus",
    summary: "Compact copy, oversized product preview",
    description:
      "Minimizes the text band so the product screenshot dominates — ideal for UI demos, feature drops, and 'see it in action' posts.",
    tags: ["product-demo", "ui", "screenshot", "feature"],
    bestFor: ["linkedin-square", "twitter", "instagram-square"],
    stack: "text-first",
    textZoneRatio: 0.32,
    textZoneMax: 0.42,
    textVerticalAlign: "start",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "hidden",
    footerBlocks: [],
    promptHints: [
      "big product screenshot",
      "show the app",
      "minimal text lots of product",
      "feature demo",
    ],
  },
  {
    id: "copy-statement",
    name: "Copy statement",
    summary: "Large headline zone with a smaller product strip",
    description:
      "Thought-leadership and quote-style posts: generous space for the headline with a supporting product visual below. Similar to LinkedIn text-first creator posts.",
    tags: ["thought-leadership", "quote", "headline", "copy-heavy"],
    bestFor: ["linkedin-square", "linkedin-landscape"],
    stack: "text-first",
    textZoneRatio: 0.54,
    textZoneMax: 0.66,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "center",
    textAlign: "center",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "big headline",
      "quote post",
      "thought leadership",
      "more copy less image",
    ],
  },
  {
    id: "balanced-split",
    name: "Balanced split",
    summary: "Even split between message and product",
    description:
      "Fifty-fifty composition between copy and visual — useful for comparisons, before/after stories, and infographic-style posts.",
    tags: ["split", "balanced", "infographic", "comparison"],
    bestFor: "all",
    stack: "text-first",
    textZoneRatio: 0.5,
    textZoneMax: 0.52,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "50 50 split",
      "half text half image",
      "balanced layout",
      "comparison post",
    ],
  },
  {
    id: "visual-first",
    name: "Visual first",
    summary: "Hero image on top, copy tucked underneath",
    description:
      "Instagram-friendly pattern: lead with the visual, follow with headline and logo footer. Common for lifestyle brands, portfolio pieces, and story-style crops.",
    tags: ["instagram", "visual", "image-first", "story"],
    bestFor: ["instagram-square", "instagram-story"],
    stack: "featured-first",
    textZoneRatio: 0.34,
    textZoneMax: 0.42,
    textVerticalAlign: "start",
    logoPlacement: "footer",
    logoAlign: "center",
    textAlign: "center",
    featuredRadius: "bottom-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "footer",
    footerBlocks: ["extras", "logo"],
    promptHints: [
      "image on top",
      "visual first",
      "instagram style",
      "photo then caption",
    ],
  },
  {
    id: "professional-left",
    name: "Professional left",
    summary: "Left-aligned copy — clean LinkedIn editorial",
    description:
      "All elements left-aligned with a structured hierarchy. Matches professional feed posts where scanning starts top-left.",
    tags: ["linkedin", "editorial", "left-aligned", "professional"],
    bestFor: ["linkedin-square", "linkedin-landscape", "twitter"],
    stack: "text-first",
    textZoneRatio: 0.42,
    textZoneMax: 0.55,
    textVerticalAlign: "start",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "left aligned",
      "professional linkedin",
      "editorial layout",
      "clean b2b post",
    ],
  },
  {
    id: "footer-mark",
    name: "Footer mark",
    summary: "Centered copy with a subtle centered logo bar",
    description:
      "Message-centered layout ending in a quiet brand footer — good for events, webinars, and sponsor slides.",
    tags: ["event", "webinar", "sponsor", "footer"],
    bestFor: ["event-standee", "instagram-story"],
    stack: "text-first",
    textZoneRatio: 0.46,
    textZoneMax: 0.58,
    textVerticalAlign: "center",
    logoPlacement: "footer",
    logoAlign: "center",
    textAlign: "center",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "footer",
    footerBlocks: ["extras", "logo"],
    promptHints: [
      "event post",
      "webinar graphic",
      "logo at bottom center",
      "sponsor slide",
    ],
  },
  {
    id: "brand-stack",
    name: "Brand stack",
    summary: "Centered logo with left-aligned copy",
    description:
      "Logo centered above left-aligned headline and subcopy — readable on social feeds without right-ragged text blocks.",
    tags: ["editorial", "brand", "left-aligned", "readable"],
    bestFor: ["instagram-square", "linkedin-landscape"],
    stack: "text-first",
    textZoneRatio: 0.43,
    textZoneMax: 0.56,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "center",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "centered logo left text",
      "readable editorial",
      "brand above headline",
      "left aligned copy",
    ],
  },
  {
    id: "event-footer",
    name: "Event footer",
    summary: "Headline up top, date & URL anchored in the footer",
    description:
      "Event and webinar layout: main message in the upper band, supporting details (date, URL, location) in a footer strip beneath the product visual.",
    tags: ["event", "webinar", "cta", "footer-fields"],
    bestFor: ["linkedin-landscape", "instagram-story", "event-standee"],
    stack: "text-first",
    textZoneRatio: 0.4,
    textZoneMax: 0.5,
    textVerticalAlign: "start",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "footer",
    footerBlocks: ["extras"],
    promptHints: [
      "event date in footer",
      "webinar url at bottom",
      "register link footer",
      "conference post with details",
    ],
  },
];

const layoutById = new Map(POST_LAYOUTS.map((layout) => [layout.id, layout]));

export function getPostLayout(id: PostLayoutId): PostLayout {
  return layoutById.get(id) ?? layoutById.get(DEFAULT_POST_LAYOUT_ID)!;
}

/** Layouts safe for shuffle / AI — excludes hard-to-read alignments */
export function isShuffleableLayout(layout: PostLayout): boolean {
  return layout.textAlign !== "right";
}

/** Pick a different layout at random (for the shuffle control) */
export function getRandomPostLayout(excludeId?: PostLayoutId): PostLayout {
  const pool = POST_LAYOUTS.filter(
    (layout) =>
      isShuffleableLayout(layout) &&
      (excludeId ? layout.id !== excludeId : true),
  );
  return pool[Math.floor(Math.random() * pool.length)] ?? getPostLayout(DEFAULT_POST_LAYOUT_ID);
}

/** State patch applied when a layout is chosen */
export type PostLayoutStatePatch = Pick<
  PostLayout,
  "logoPlacement" | "logoAlign" | "textAlign"
>;

export function getLayoutStatePatch(layout: PostLayout): PostLayoutStatePatch {
  return {
    logoPlacement: layout.logoPlacement,
    logoAlign: layout.logoAlign,
    textAlign: layout.textAlign,
  };
}

/** Resolve text-zone height ratio for the current canvas + type scale */
export function resolveTextZoneRatio(
  layout: PostLayout,
  opts: { showFeaturedImage: boolean; isTallPrint: boolean; typeScale: number },
): number {
  if (!opts.showFeaturedImage) return 0.92;

  const base = layout.textZoneRatio + opts.typeScale * 0.02;
  const max =
    layout.textZoneMax ??
    (opts.isTallPrint ? 0.48 : 0.58);

  return Math.min(base, max);
}

/** Whether this layout renders a footer strip below the featured block */
export function layoutHasFooterStrip(layout: PostLayout): boolean {
  return layout.footerBlocks.length > 0;
}

/** Add a blank extra field when the layout expects footer/main extras */
export function seedCopyForLayout(copy: PostCopy, layout: PostLayout): PostCopy {
  const wantsExtras =
    (layout.extrasPlacement === "footer" &&
      layout.footerBlocks.includes("extras")) ||
    (layout.extrasPlacement === "main" && layout.mainBlocks.includes("extras"));

  if (!wantsExtras || copy.extraFields.length > 0) return copy;

  return {
    ...copy,
    extraFields: [
      {
        id: `extra-${Date.now()}`,
        label: layout.extrasPlacement === "footer" ? "Footer" : "Extra",
        value: "",
      },
    ],
  };
}

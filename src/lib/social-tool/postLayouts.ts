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
  | "event-footer"
  | "split-feature-right"
  | "split-feature-left"
  | "deck-sidebar";

/** Vertical bands vs side-by-side columns */
export type PostLayoutComposition = "stack" | "split";

/** Which side holds logo + copy in split layouts */
export type PostLayoutTextSide = "left" | "right";

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
  /** Vertical stack (default) or horizontal split */
  composition?: PostLayoutComposition;
  /** Copy column side when composition is split */
  textSide?: PostLayoutTextSide;
  /** Share of inner width for copy column (split layouts) */
  textColumnRatio?: number;
  textColumnMax?: number;
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
  {
    id: "split-feature-right",
    name: "Split — feature right",
    summary: "Copy column left, product preview on the right",
    description:
      "Deck-style horizontal split: logo and headline stack in a left column while the product screenshot fills the right side. Common in B2B carousels, LinkedIn landscape posts, and pitch slides.",
    tags: ["split", "deck", "landscape", "product-demo", "b2b"],
    bestFor: ["linkedin-landscape", "twitter", "linkedin-square"],
    composition: "split",
    textSide: "left",
    textColumnRatio: 0.38,
    textColumnMax: 0.42,
    stack: "text-first",
    textZoneRatio: 1,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading", "extras"],
    extrasPlacement: "main",
    footerBlocks: [],
    promptHints: [
      "screenshot on the right",
      "side by side",
      "deck slide",
      "copy left image right",
      "b2b carousel",
    ],
  },
  {
    id: "split-feature-left",
    name: "Split — feature left",
    summary: "Product preview left, copy column on the right",
    description:
      "Visual-first horizontal split: lead with the product or hero image on the left, headline and logo in a right column. Works for UI demos and portfolio-style posts.",
    tags: ["split", "visual", "product-demo", "landscape"],
    bestFor: ["linkedin-landscape", "twitter", "instagram-square"],
    composition: "split",
    textSide: "right",
    textColumnRatio: 0.36,
    textColumnMax: 0.4,
    stack: "text-first",
    textZoneRatio: 1,
    textVerticalAlign: "center",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-right",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "hidden",
    footerBlocks: [],
    promptHints: [
      "image on the left",
      "visual first side by side",
      "product on the left",
      "ui demo split",
    ],
  },
  {
    id: "deck-sidebar",
    name: "Deck sidebar",
    summary: "Narrow copy sidebar with a large feature panel",
    description:
      "Presentation-style layout with a compact left sidebar for logo and headline beside an oversized feature panel. Ideal for webinars, event standees, and landscape deck exports.",
    tags: ["deck", "webinar", "event", "sidebar", "split"],
    bestFor: ["linkedin-landscape", "event-standee", "twitter"],
    composition: "split",
    textSide: "left",
    textColumnRatio: 0.32,
    textColumnMax: 0.36,
    stack: "text-first",
    textZoneRatio: 1,
    textVerticalAlign: "start",
    logoPlacement: "top",
    logoAlign: "left",
    textAlign: "left",
    featuredRadius: "top-left",
    mainBlocks: ["headline", "subheading"],
    extrasPlacement: "hidden",
    footerBlocks: [],
    promptHints: [
      "deck sidebar",
      "webinar slide",
      "narrow text column",
      "presentation layout",
      "event standee",
    ],
  },
];

const layoutById = new Map(POST_LAYOUTS.map((layout) => [layout.id, layout]));

export function getPostLayout(id: PostLayoutId): PostLayout {
  return layoutById.get(id) ?? layoutById.get(DEFAULT_POST_LAYOUT_ID)!;
}

export function layoutUsesSplit(layout: PostLayout): boolean {
  return layout.composition === "split";
}

export function getLayoutTextSide(layout: PostLayout): PostLayoutTextSide {
  return layout.textSide ?? "left";
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

import {
  canvasScaleFactor,
  DEFAULT_POST_LAYOUT_SPACING,
  spacingTokenToPx,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";

/** Min share of canvas height kept for the featured viewport */
function minProductZoneShare(aspect: number): number {
  if (aspect >= 1.8) return 0.2;
  if (aspect < 0.65) return 0.32;
  if (aspect < 0.85) return 0.28;
  return 0.24;
}

const LINKEDIN_PLATFORMS = new Set<PlatformId>([
  "linkedin-square",
  "linkedin-landscape",
]);

function plainHeadingText(heading: string): string {
  return heading.replace(/\[\[(.+?)\]\]/g, "$1").trim();
}

function estimateWrappedLineCount(
  text: string,
  lineWidthPx: number,
  charWidthPx: number,
): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const charsPerLine = Math.max(
    1,
    Math.floor(lineWidthPx / Math.max(charWidthPx, 1)),
  );
  return trimmed.split(/\n/).reduce((total, paragraph) => {
    const len = Math.max(paragraph.length, 1);
    return total + Math.max(1, Math.ceil(len / charsPerLine));
  }, 0);
}

/** Max stacked text band height before the featured zone must shrink */
export function resolveMaxStackedTextZone(opts: {
  width: number;
  height: number;
  footerH: number;
}): number {
  const aspect = opts.height / opts.width;
  const minProductZone = Math.round(opts.height * minProductZoneShare(aspect));
  return Math.max(0, opts.height - opts.footerH - minProductZone);
}

/** Estimate minimum text-band height so wireframe slots fit without overlapping product zone */
export function estimateTextBandMinHeight(opts: {
  width: number;
  height: number;
  layout: PostLayout;
  showTopLogo: boolean;
  spacing?: PostLayoutSpacing;
  isTallPrint: boolean;
  logoScale?: number;
  typeScale?: number;
  copy?: Pick<PostCopy, "heading" | "subheading" | "extraFields">;
  platformId?: PlatformId;
}): number {
  const {
    width,
    height,
    layout,
    showTopLogo,
    isTallPrint,
    logoScale = 1,
    typeScale = 1,
    copy,
    platformId,
  } = opts;
  const spacing = opts.spacing ?? DEFAULT_POST_LAYOUT_SPACING;
  const scale = canvasScaleFactor(width, height);
  const linkedInAd = platformId != null && LINKEDIN_PLATFORMS.has(platformId);

  const layoutPad = spacingTokenToPx(spacing.layoutPad, width, height);
  const textZonePadBottom = spacingTokenToPx(
    spacing.textZonePadBottom,
    width,
    height,
  );
  const logoCopyGap = spacingTokenToPx(spacing.logoCopyGap, width, height);
  const copyBlockGap = spacingTokenToPx(spacing.copyBlockGap, width, height);

  const copyLineWidth = Math.min(
    width - 2 * layoutPad,
    Math.round(920 * scale),
  );
  const charWidthFactor = linkedInAd ? 0.34 : 0.4;
  const headlineFontSize = 52 * scale * typeScale;
  const headlineCharWidth = charWidthFactor * headlineFontSize;
  const subFontSize = 22 * scale * typeScale;
  const subEmWidth = isTallPrint ? 22 : 28;
  const subLineWidth = Math.min(copyLineWidth, subEmWidth * subFontSize);
  const subCharWidth = 0.52 * subFontSize;
  const extraFontSize = 18 * scale * typeScale;
  const extraLineWidth = Math.min(copyLineWidth, subEmWidth * extraFontSize);
  const extraCharWidth = 0.5 * extraFontSize;

  let content = textZonePadBottom;

  if (showTopLogo) {
    content += Math.max(12, Math.round(34 * scale * logoScale));
    content += logoCopyGap;
  }

  const mainBlocks = layout.mainBlocks.filter(
    (block) => block !== "extras" || layout.extrasPlacement === "main",
  );

  mainBlocks.forEach((block, index) => {
    if (index > 0) content += copyBlockGap;
    if (block === "headline") {
      const wireframeH = Math.round((isTallPrint ? 72 : 64) * scale * typeScale);
      const lines = copy?.heading
        ? Math.max(
            1,
            estimateWrappedLineCount(
              plainHeadingText(copy.heading),
              copyLineWidth,
              headlineCharWidth,
            ),
          )
        : 1;
      content += Math.max(
        wireframeH,
        Math.ceil(lines * headlineFontSize * 1.08),
      );
    } else if (block === "subheading") {
      const wireframeH = Math.round((isTallPrint ? 40 : 36) * scale * typeScale);
      const lines = copy?.subheading?.trim()
        ? Math.max(
            1,
            estimateWrappedLineCount(
              copy.subheading,
              subLineWidth,
              subCharWidth,
            ),
          )
        : 1;
      content += Math.max(wireframeH, Math.ceil(lines * subFontSize * 1.4));
    } else if (block === "extras") {
      const fields = copy?.extraFields?.filter((field) => field.value.trim()) ?? [];
      if (fields.length === 0) {
        content += Math.round(28 * scale * typeScale);
      } else {
        for (const field of fields) {
          const lines = Math.max(
            1,
            estimateWrappedLineCount(field.value, extraLineWidth, extraCharWidth),
          );
          content += Math.ceil(lines * extraFontSize * 1.45);
        }
      }
    }
  });

  return layoutPad + content;
}

/** Resolve text-zone height ratio for the current canvas + type scale */
export function resolveTextZoneRatio(
  layout: PostLayout,
  opts: {
    showFeaturedImage: boolean;
    isTallPrint: boolean;
    typeScale: number;
    aspect?: number;
  },
): number {
  if (!opts.showFeaturedImage) return 0.92;

  const base = layout.textZoneRatio + opts.typeScale * 0.02;
  let max =
    layout.textZoneMax ??
    (opts.isTallPrint ? 0.48 : 0.58);

  if (opts.aspect != null && opts.aspect < 0.85) {
    max = Math.min(max, 0.58);
  }

  return Math.min(base, max);
}

/** Split canvas height between copy and featured zones (transform is visual-only). */
export function resolveFeaturedLayoutZones(opts: {
  width: number;
  height: number;
  footerH: number;
  layout: PostLayout;
  showFeaturedImage: boolean;
  isTallPrint: boolean;
  typeScale: number;
  showTopLogo?: boolean;
  spacing?: PostLayoutSpacing;
  logoScale?: number;
  copy?: Pick<PostCopy, "heading" | "subheading" | "extraFields">;
  platformId?: PlatformId;
}): {
  textZone: number;
  productZone: number;
} {
  const {
    width,
    height,
    footerH,
    layout,
    showFeaturedImage,
    isTallPrint,
    typeScale,
    showTopLogo = layout.logoPlacement === "top",
    spacing,
    logoScale = 1,
    copy,
    platformId,
  } = opts;

  const aspect = height / width;

  if (!showFeaturedImage) {
    return {
      textZone: Math.round(
        height *
          resolveTextZoneRatio(layout, {
            showFeaturedImage: false,
            isTallPrint,
            typeScale,
            aspect,
          }),
      ),
      productZone: 0,
    };
  }

  const textRatio = resolveTextZoneRatio(layout, {
    showFeaturedImage: true,
    isTallPrint,
    typeScale,
    aspect,
  });

  const minProductZone = Math.round(height * minProductZoneShare(aspect));
  const maxTextZone = Math.max(0, height - footerH - minProductZone);
  const minTextZone = estimateTextBandMinHeight({
    width,
    height,
    layout,
    showTopLogo,
    spacing,
    isTallPrint,
    logoScale,
    typeScale,
    copy,
    platformId,
  });

  let textZone = Math.round(height * textRatio);
  textZone = Math.max(textZone, minTextZone);
  textZone = Math.min(textZone, maxTextZone);
  const productZone = Math.max(0, height - textZone - footerH);

  return { textZone, productZone };
}

/** Min share of inner width kept for the featured column in split layouts */
function minFeaturedColumnShare(aspect: number): number {
  if (aspect >= 1.8) return 0.5;
  if (aspect < 0.65) return 0.55;
  if (aspect < 0.85) return 0.52;
  return 0.48;
}

/** Estimate minimum copy-column width so wireframe slots fit without overlapping featured column */
export function estimateTextColumnMinWidth(opts: {
  width: number;
  height: number;
  layout: PostLayout;
  showTopLogo: boolean;
  spacing?: PostLayoutSpacing;
  isTallPrint: boolean;
  logoScale?: number;
}): number {
  const { width, height, layout, showTopLogo, isTallPrint, logoScale = 1 } = opts;
  const scale = canvasScaleFactor(width, height);
  const layoutPad = spacingTokenToPx(
    (opts.spacing ?? DEFAULT_POST_LAYOUT_SPACING).layoutPad,
    width,
    height,
  );

  const headlineW = Math.round((isTallPrint ? 480 : 560) * scale);
  const subW = Math.round((isTallPrint ? 360 : 420) * scale);
  const extraW = Math.round((isTallPrint ? 320 : 380) * scale);

  const mainBlocks = layout.mainBlocks.filter(
    (block) => block !== "extras" || layout.extrasPlacement === "main",
  );

  let minW = showTopLogo ? Math.max(80, Math.round(120 * scale * logoScale)) : 0;
  for (const block of mainBlocks) {
    if (block === "headline") minW = Math.max(minW, headlineW);
    else if (block === "subheading") minW = Math.max(minW, subW);
    else if (block === "extras") minW = Math.max(minW, extraW);
  }

  return minW + layoutPad;
}

/** Split inner width between copy column and featured column */
export function resolveSplitLayoutZones(opts: {
  width: number;
  height: number;
  footerH: number;
  layout: PostLayout;
  showFeaturedImage: boolean;
  isTallPrint: boolean;
  showTopLogo?: boolean;
  spacing?: PostLayoutSpacing;
  logoScale?: number;
}): {
  textColumn: number;
  featuredColumn: number;
  rowHeight: number;
  columnGap: number;
} {
  const {
    width,
    height,
    footerH,
    layout,
    showFeaturedImage,
    isTallPrint,
    showTopLogo = layout.logoPlacement === "top",
    spacing,
    logoScale = 1,
  } = opts;

  const spacingResolved = spacing ?? DEFAULT_POST_LAYOUT_SPACING;
  const layoutPad = spacingTokenToPx(spacingResolved.layoutPad, width, height);
  const columnGap = spacingTokenToPx(spacingResolved.copyBlockGap, width, height);
  const innerWidth = width - 2 * layoutPad;
  const rowHeight = Math.max(0, height - layoutPad - footerH);

  if (!showFeaturedImage) {
    return {
      textColumn: innerWidth,
      featuredColumn: 0,
      rowHeight,
      columnGap: 0,
    };
  }

  const aspect = height / width;
  const textRatio = layout.textColumnRatio ?? 0.38;
  const textMax = layout.textColumnMax ?? 0.45;
  const minFeatured = Math.round(innerWidth * minFeaturedColumnShare(aspect));
  const maxTextColumn = Math.max(
    0,
    innerWidth - minFeatured - columnGap,
  );
  const minTextColumn = estimateTextColumnMinWidth({
    width,
    height,
    layout,
    showTopLogo,
    spacing: spacingResolved,
    isTallPrint,
    logoScale,
  });

  let textColumn = Math.round(innerWidth * textRatio);
  textColumn = Math.max(textColumn, minTextColumn);
  textColumn = Math.min(textColumn, Math.round(innerWidth * textMax));
  textColumn = Math.min(textColumn, maxTextColumn);
  const featuredColumn = Math.max(0, innerWidth - textColumn - columnGap);

  return { textColumn, featuredColumn, rowHeight, columnGap };
}

/** Whether this layout renders a footer strip below the featured block */
export function layoutHasFooterStrip(layout: PostLayout): boolean {
  return layout.footerBlocks.length > 0;
}

/** Footer blocks to render — honors user logo placement over layout defaults */
export function resolveFooterBlocks(
  layout: PostLayout,
  showFooterLogo: boolean,
): ("logo" | "extras")[] {
  const blocks = layout.footerBlocks.filter(
    (block) => block !== "logo" || showFooterLogo,
  );
  if (showFooterLogo && !blocks.includes("logo")) {
    blocks.push("logo");
  }
  return blocks;
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

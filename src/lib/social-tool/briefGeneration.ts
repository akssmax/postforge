import type { PlatformId, ProductPageId, PostCopy } from "@/lib/social-tool/presets";
import {
  getLayoutStatePatch,
  getPostLayout,
  seedCopyForLayout,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { EMPTY_POST_COPY } from "@/lib/design/designSession";
import {
  getApprovedShuffleLayouts,
  getCommittedLayoutReviews,
  loadLayoutReviews,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import type { PatternRef } from "@/lib/social-tool/patterns/types";

export type BriefGenerationResult = {
  layoutId: PostLayoutId;
  layoutName: string;
  copy: PostCopy;
  logoPlacement: ReturnType<typeof getLayoutStatePatch>["logoPlacement"];
  logoAlign: ReturnType<typeof getLayoutStatePatch>["logoAlign"];
  textAlign: ReturnType<typeof getLayoutStatePatch>["textAlign"];
  showFeaturedImage: boolean;
  showPattern: boolean;
  showBackground: boolean;
  pattern: PatternRef;
  patternOpacity: number;
  patternScale: number;
  patternAnimated: boolean;
  showContent: boolean;
  productPage: ProductPageId;
  /** Short line for UI feedback after generate */
  rationale: string;
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "with", "our", "your",
  "we", "is", "are", "this", "that", "it", "at", "from", "by", "as", "be", "will", "new",
]);

const FEATURED_ON_PHRASES = [
  "product launch",
  "product screenshot",
  "show the app",
  "feature demo",
  "big product",
  "ui demo",
  "screenshot",
  "see it in action",
  "visual first",
  "image on top",
  "photo then",
  "half text half image",
  "50 50 split",
  "comparison post",
  "hero screenshot",
];

const FEATURED_OFF_PHRASES = [
  "text only",
  "no image",
  "copy only",
  "quote post",
  "thought leadership",
  "more copy less image",
  "big headline",
];

const PATTERN_ON_PHRASES = [
  "brand post",
  "product launch",
  "company news",
  "milestone",
  "announcement",
  "corporate",
  "event post",
  "webinar",
  "sponsor slide",
];

const PATTERN_OFF_PHRASES = [
  "minimal",
  "clean b2b",
  "product demo",
  "ui demo",
  "screenshot",
  "text only",
];

const LAYOUTS_WITH_STRONG_FEATURED = new Set<PostLayoutId>([
  "classic-hero",
  "product-focus",
  "visual-first",
  "balanced-split",
  "professional-left",
  "brand-stack",
  "centered-announcement",
]);

const LAYOUTS_MINIMAL_PATTERN = new Set<PostLayoutId>([
  "product-focus",
  "copy-statement",
  "professional-left",
]);

function normalizeBrief(brief: string): string {
  return brief.toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function countPhraseMatches(brief: string, phrases: string[]): number {
  let score = 0;
  for (const phrase of phrases) {
    if (brief.includes(phrase)) score += 4;
  }
  return score;
}

function scoreLayout(
  brief: string,
  platformId: PlatformId,
  layout: PostLayout,
): number {
  const tokens = tokenize(brief);
  if (tokens.length === 0) return 0;

  const haystack = [
    ...layout.promptHints,
    ...layout.tags,
    layout.name,
    layout.summary,
    layout.description,
  ]
    .join(" ")
    .toLowerCase();

  let score = countPhraseMatches(brief, layout.promptHints);

  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
  }

  if (layout.bestFor !== "all" && layout.bestFor.includes(platformId)) {
    score += 3;
  }

  if (layout.stack === "featured-first" && brief.includes("visual")) score += 2;
  if (layout.logoPlacement === "footer" && brief.includes("footer")) score += 3;
  if (layout.textZoneRatio <= 0.36 && brief.includes("product")) score += 2;
  if (layout.textZoneRatio >= 0.5 && brief.includes("headline")) score += 2;

  if (layout.composition === "split") {
    if (
      brief.includes("side by side") ||
      brief.includes("side-by-side") ||
      brief.includes("split")
    ) {
      score += 4;
    }
    if (brief.includes("deck") || brief.includes("slide") || brief.includes("presentation")) {
      score += 3;
    }
    if (brief.includes("right") && layout.textSide === "left") score += 2;
    if (brief.includes("left") && layout.textSide === "right") score += 2;
    if (brief.includes("sidebar") && layout.id === "deck-sidebar") score += 4;
  }

  return score;
}

function pickLayout(
  brief: string,
  platformId: PlatformId,
  record: LayoutReviewRecord,
): PostLayout {
  const pool = getApprovedShuffleLayouts(record, platformId);
  const normalized = normalizeBrief(brief);
  let best = pool[0] ?? getPostLayout("classic-hero");
  let bestScore = -1;

  for (const layout of pool) {
    const s = scoreLayout(normalized, platformId, layout);
    if (s > bestScore) {
      bestScore = s;
      best = layout;
    }
  }

  if (bestScore <= 0) {
    const fallbackId: PostLayoutId =
      platformId === "instagram-square" || platformId === "instagram-story"
        ? "visual-first"
        : "classic-hero";
    const fallback = pool.find((layout) => layout.id === fallbackId);
    return fallback ?? best;
  }

  return best;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractTopic(brief: string): string {
  const tokens = tokenize(brief);
  if (tokens.length === 0) return "Your Product";
  return capitalize(tokens.slice(0, 3).join(" "));
}

function pickProductPage(brief: string): ProductPageId {
  const lower = normalizeBrief(brief);
  if (
    lower.includes("schedule") ||
    lower.includes("calendar") ||
    lower.includes("meeting") ||
    lower.includes("booking")
  ) {
    return "scheduler";
  }
  if (
    lower.includes("pricing") ||
    lower.includes("plan") ||
    lower.includes("subscription")
  ) {
    return "pricing";
  }
  if (
    lower.includes("stats") ||
    lower.includes("metric") ||
    lower.includes("kpi") ||
    lower.includes("dashboard")
  ) {
    return "stats";
  }
  if (
    lower.includes("profile") ||
    lower.includes("team member") ||
    lower.includes("account")
  ) {
    return "profile";
  }
  if (
    lower.includes("signup") ||
    lower.includes("waitlist") ||
    lower.includes("form")
  ) {
    return "form-card";
  }
  if (
    lower.includes("notification") ||
    lower.includes("inbox") ||
    lower.includes("activity")
  ) {
    return "activity";
  }
  if (
    lower.includes("pipeline") ||
    lower.includes("deal") ||
    lower.includes("kanban") ||
    lower.includes("stage")
  ) {
    return "pipeline";
  }
  return "leads";
}

function pickPattern(
  layout: PostLayout,
  brief: string,
  showPattern: boolean,
): PatternRef {
  if (!showPattern) return legacyPatternRef("monogram");

  const lower = normalizeBrief(brief);

  if (lower.includes("wave") || lower.includes("texture")) {
    return libraryPatternRef("waves");
  }
  if (lower.includes("dot") || lower.includes("polka")) {
    return libraryPatternRef("polka-small");
  }
  if (lower.includes("stripe") || lower.includes("line")) {
    return libraryPatternRef("diagonal-lines");
  }
  if (layout.footerBlocks.length > 0 || layout.logoPlacement === "footer") {
    return legacyPatternRef("footer");
  }
  if (lower.includes("outline") || layout.tags.includes("editorial")) {
    return legacyPatternRef("outline");
  }
  if (lower.includes("milestone") || lower.includes("announcement")) {
    return legacyPatternRef("monogram-soft");
  }
  if (layout.id === "product-focus" || lower.includes("minimal")) {
    return legacyPatternRef("monogram-soft");
  }
  return legacyPatternRef("monogram");
}

function deriveFeaturedVisibility(
  layout: PostLayout,
  brief: string,
): { show: boolean; reason: string } {
  const lower = normalizeBrief(brief);
  const offScore = countPhraseMatches(lower, FEATURED_OFF_PHRASES);
  const onScore = countPhraseMatches(lower, FEATURED_ON_PHRASES);

  if (offScore >= 4 && onScore === 0) {
    return { show: false, reason: "Copy-first brief — featured block hidden" };
  }

  if (onScore >= 4 || LAYOUTS_WITH_STRONG_FEATURED.has(layout.id)) {
    return {
      show: true,
      reason:
        layout.textZoneRatio <= 0.38
          ? "Product-forward layout — featured preview enabled"
          : "Balanced layout — product preview enabled",
    };
  }

  if (layout.textZoneRatio >= 0.52) {
    return {
      show: true,
      reason: "Supporting product strip under headline",
    };
  }

  return { show: true, reason: "Default product preview for this layout" };
}

function derivePatternVisibility(
  layout: PostLayout,
  brief: string,
): { show: boolean; reason: string } {
  const lower = normalizeBrief(brief);
  const offScore = countPhraseMatches(lower, PATTERN_OFF_PHRASES);
  const onScore = countPhraseMatches(lower, PATTERN_ON_PHRASES);

  if (LAYOUTS_MINIMAL_PATTERN.has(layout.id) && onScore === 0) {
    return { show: false, reason: "Clean layout — pattern off for clarity" };
  }

  if (offScore >= 4 && onScore === 0) {
    return { show: false, reason: "Minimal brief — pattern off" };
  }

  if (onScore >= 4 || layout.tags.includes("brand")) {
    return { show: true, reason: "Brand texture added behind copy" };
  }

  return { show: true, reason: "Subtle monogram pattern enabled" };
}

function generateCopyFromBrief(brief: string, layout: PostLayout): PostCopy {
  const topic = extractTopic(brief);
  const lower = normalizeBrief(brief);
  const trimmed = brief.trim();

  let heading = `${topic} — Built for Teams`;
  let subheading =
    trimmed.slice(0, 120) || "Share your message with a clear, on-brand post.";

  if (lower.includes("launch") || lower.includes("announce")) {
    heading = `Introducing ${topic}`;
    subheading = "A new chapter for your brand — share the news with your audience.";
  } else if (lower.includes("webinar") || lower.includes("event")) {
    heading = `Join Us: ${topic}`;
    subheading = "Save the date — register now and bring your team.";
  } else if (lower.includes("crm") || lower.includes("sales")) {
    heading = `${topic} Just Got Smarter`;
    subheading = "Capture every interaction, automate every update.";
  } else if (layout.id === "copy-statement") {
    heading = trimmed.length <= 72 ? capitalize(trimmed) : `${topic}.`;
    subheading = "A message worth sharing — refine the copy in the Content panel.";
  } else if (layout.id === "product-focus") {
    heading = `See ${topic} in Action`;
    subheading = "Explore the workflow your team will use every day.";
  } else if (layout.id === "visual-first") {
    heading = topic;
    subheading = "Lead with the visual — add your hero image in Featured.";
  } else if (trimmed.length > 0 && trimmed.length <= 80) {
    heading = capitalize(trimmed);
    subheading = "Crafted from your brief — refine the copy in the Content panel.";
  }

  if (layout.textAlign === "center" && !heading.includes("[[")) {
    const words = heading.split(/\s+/);
    if (words.length >= 3) {
      const accent = words.slice(-2).join(" ");
      heading = `${words.slice(0, -2).join(" ")} [[${accent}]]`.trim();
    }
  }

  const seeded = seedCopyForLayout(
    { ...EMPTY_POST_COPY, heading, subheading, extraFields: [] },
    layout,
  );

  if (
    layout.extrasPlacement === "footer" &&
    layout.footerBlocks.includes("extras") &&
    seeded.extraFields.length > 0
  ) {
    const footerValue =
      lower.includes("register") || lower.includes("webinar")
        ? "Register at yourcompany.com"
        : lower.includes("event")
          ? "Save the date — details in bio"
          : "";
    if (footerValue) {
      seeded.extraFields = seeded.extraFields.map((field, i) =>
        i === 0 ? { ...field, value: footerValue } : field,
      );
    }
  }

  return seeded;
}

export function generateFromBrief(
  brief: string,
  platformId: PlatformId,
  record?: LayoutReviewRecord,
): BriefGenerationResult {
  const reviews =
    record ??
    (typeof window !== "undefined" ? loadLayoutReviews() : getCommittedLayoutReviews());
  const layout = pickLayout(brief, platformId, reviews);
  const patch = getLayoutStatePatch(layout);
  const copy = generateCopyFromBrief(brief, layout);
  const featured = deriveFeaturedVisibility(layout, brief);
  const patternVis = derivePatternVisibility(layout, brief);
  const showPattern = patternVis.show;
  const pattern = pickPattern(layout, brief, showPattern);

  const rationale = [
    layout.name,
    featured.reason,
    patternVis.reason,
  ].join(" · ");

  return {
    layoutId: layout.id,
    layoutName: layout.name,
    copy,
    logoPlacement: patch.logoPlacement,
    logoAlign: patch.logoAlign,
    textAlign: patch.textAlign,
    showFeaturedImage: featured.show,
    showPattern,
    showBackground: true,
    pattern,
    patternOpacity: showPattern ? (layout.id === "product-focus" ? 0.18 : 0.28) : 0.28,
    patternScale: 1,
    patternAnimated: false,
    showContent: true,
    productPage: pickProductPage(brief),
    rationale,
  };
}

import type { PlatformId } from "@/lib/social-tool/presets";
import {
  getLayoutStatePatch,
  getPostLayout,
  POST_LAYOUTS,
  seedCopyForLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { EMPTY_POST_COPY } from "@/lib/design/designSession";
import type { PostCopy } from "@/lib/social-tool/presets";

export type BriefGenerationResult = {
  layoutId: PostLayoutId;
  copy: PostCopy;
  logoPlacement: ReturnType<typeof getLayoutStatePatch>["logoPlacement"];
  logoAlign: ReturnType<typeof getLayoutStatePatch>["logoAlign"];
  textAlign: ReturnType<typeof getLayoutStatePatch>["textAlign"];
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "for", "to", "of", "in", "on", "with", "our", "your",
  "we", "is", "are", "this", "that", "it", "at", "from", "by", "as", "be", "will",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreLayout(
  brief: string,
  platformId: PlatformId,
  layout: (typeof POST_LAYOUTS)[number],
): number {
  const tokens = tokenize(brief);
  if (tokens.length === 0) return 0;

  const haystack = [
    ...layout.promptHints,
    ...layout.tags,
    layout.name,
    layout.summary,
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
  }

  if (layout.bestFor !== "all" && layout.bestFor.includes(platformId)) {
    score += 3;
  }

  return score;
}

function pickLayout(brief: string, platformId: PlatformId): PostLayoutId {
  let best = POST_LAYOUTS[0];
  let bestScore = -1;
  for (const layout of POST_LAYOUTS) {
    const s = scoreLayout(brief, platformId, layout);
    if (s > bestScore) {
      bestScore = s;
      best = layout;
    }
  }
  return best?.id ?? POST_LAYOUTS[0].id;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function extractTopic(brief: string): string {
  const tokens = tokenize(brief);
  if (tokens.length === 0) return "Your Product";
  const phrase = tokens.slice(0, 3).join(" ");
  return capitalize(phrase);
}

function generateCopyFromBrief(brief: string, layoutId: PostLayoutId): PostCopy {
  const topic = extractTopic(brief);
  const lower = brief.toLowerCase();

  let heading = `${topic} — Built for Teams`;
  let subheading = brief.trim().slice(0, 120) || "Share your message with a clear, on-brand post.";

  if (lower.includes("launch") || lower.includes("announce")) {
    heading = `Introducing ${topic}`;
    subheading = "A new chapter for your brand — share the news with your audience.";
  } else if (lower.includes("webinar") || lower.includes("event")) {
    heading = `Join Us: ${topic}`;
    subheading = "Save the date — register now and bring your team.";
  } else if (lower.includes("crm") || lower.includes("sales")) {
    heading = `${topic} Just Got Smarter`;
    subheading = "Capture every interaction, automate every update.";
  } else if (brief.trim().length > 0 && brief.trim().length <= 80) {
    heading = capitalize(brief.trim());
    subheading = "Crafted from your brief — refine the copy in the Content panel.";
  }

  const layout = getPostLayout(layoutId);
  const seeded = seedCopyForLayout(
    { ...EMPTY_POST_COPY, heading, subheading, extraFields: [] },
    layout,
  );

  return seeded;
}

export function generateFromBrief(
  brief: string,
  platformId: PlatformId,
): BriefGenerationResult {
  const layoutId = pickLayout(brief, platformId);
  const layout = getPostLayout(layoutId);
  const patch = getLayoutStatePatch(layout);
  const copy = generateCopyFromBrief(brief, layoutId);

  return {
    layoutId,
    copy,
    logoPlacement: patch.logoPlacement,
    logoAlign: patch.logoAlign,
    textAlign: patch.textAlign,
  };
}

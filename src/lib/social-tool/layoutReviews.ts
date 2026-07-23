import seedReviews from "@/data/layout-reviews.json";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  SPACING_TOKENS,
  type PostLayoutSpacing,
  type SpacingToken,
} from "@/lib/social-tool/layoutSpacing";
import {
  getPostLayout,
  getLayoutShuffleFamily,
  isShuffleableLayout,
  POST_LAYOUTS,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

export type LayoutReviewDecision = "approved" | "rejected";

export type LayoutReviewEntry = {
  decision?: LayoutReviewDecision;
  spacing?: PostLayoutSpacing;
  updatedAt: string;
};

/** Per-platform layout tuning — paste exports into `src/data/layout-reviews.json` */
export type LayoutReviewRecord = Partial<
  Record<PlatformId, Partial<Record<PostLayoutId, LayoutReviewEntry>>>
>;

export const LAYOUT_PLAYGROUND_PLATFORMS: PlatformId[] = [
  "linkedin-square",
  "linkedin-landscape",
  "twitter",
  "instagram-square",
  "instagram-story",
  "event-standee",
];

const STORAGE_KEY = "postforge:layout-reviews";

const SPACING_KEYS = Object.keys(
  DEFAULT_POST_LAYOUT_SPACING,
) as (keyof PostLayoutSpacing)[];

function isSpacingToken(value: unknown): value is SpacingToken {
  return typeof value === "number" && SPACING_TOKENS.includes(value as SpacingToken);
}

function sanitizeSpacing(value: unknown): PostLayoutSpacing | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as PostLayoutSpacing;
  const spacing = { ...DEFAULT_POST_LAYOUT_SPACING };
  let valid = false;
  for (const key of SPACING_KEYS) {
    if (isSpacingToken(raw[key])) {
      spacing[key] = raw[key];
      valid = true;
    }
  }
  return valid ? spacing : undefined;
}

function sanitizeEntry(value: unknown): LayoutReviewEntry | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as LayoutReviewEntry & { reviewedAt?: string };
  const updatedAt = raw.updatedAt ?? raw.reviewedAt;
  if (typeof updatedAt !== "string") return null;

  const decision =
    raw.decision === "approved" || raw.decision === "rejected"
      ? raw.decision
      : undefined;
  const spacing = sanitizeSpacing(raw.spacing);

  if (!decision && !spacing) return null;

  return {
    decision,
    spacing,
    updatedAt,
  };
}

function sanitizeRecord(raw: unknown): LayoutReviewRecord {
  if (!raw || typeof raw !== "object") return {};
  const out: LayoutReviewRecord = {};
  for (const [platformId, layouts] of Object.entries(raw as LayoutReviewRecord)) {
    if (!layouts || typeof layouts !== "object") continue;
    const platformLayouts: NonNullable<LayoutReviewRecord[PlatformId]> = {};
    for (const [layoutId, entry] of Object.entries(layouts)) {
      const sanitized = sanitizeEntry(entry);
      if (sanitized) {
        platformLayouts[layoutId as PostLayoutId] = sanitized;
      }
    }
    if (Object.keys(platformLayouts).length > 0) {
      out[platformId as PlatformId] = platformLayouts;
    }
  }
  return out;
}

export const LAYOUT_REVIEW_SEED = sanitizeRecord(seedReviews);

export function mergeLayoutReviews(
  base: LayoutReviewRecord,
  overlay: LayoutReviewRecord,
): LayoutReviewRecord {
  const merged: LayoutReviewRecord = { ...base };
  for (const [platformId, layouts] of Object.entries(overlay)) {
    merged[platformId as PlatformId] = {
      ...merged[platformId as PlatformId],
      ...layouts,
    };
  }
  return merged;
}

export function loadLayoutReviews(): LayoutReviewRecord {
  if (typeof window === "undefined") {
    return sanitizeRecord(LAYOUT_REVIEW_SEED);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sanitizeRecord(LAYOUT_REVIEW_SEED);
    return mergeLayoutReviews(
      sanitizeRecord(LAYOUT_REVIEW_SEED),
      sanitizeRecord(JSON.parse(raw)),
    );
  } catch {
    return sanitizeRecord(LAYOUT_REVIEW_SEED);
  }
}

/** Server-safe read of committed playground config */
export function getCommittedLayoutReviews(): LayoutReviewRecord {
  return sanitizeRecord(LAYOUT_REVIEW_SEED);
}

export function saveLayoutReviews(record: LayoutReviewRecord): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function mergeEntry(
  existing: LayoutReviewEntry | undefined,
  patch: Partial<LayoutReviewEntry>,
): LayoutReviewEntry {
  return {
    decision: patch.decision ?? existing?.decision,
    spacing: patch.spacing ?? existing?.spacing,
    updatedAt: new Date().toISOString(),
  };
}

export function setLayoutSpacing(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
  spacing: PostLayoutSpacing,
): LayoutReviewRecord {
  const next: LayoutReviewRecord = {
    ...record,
    [platformId]: {
      ...record[platformId],
      [layoutId]: mergeEntry(record[platformId]?.[layoutId], { spacing }),
    },
  };
  saveLayoutReviews(next);
  return next;
}

export function clearLayoutSpacing(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
): LayoutReviewRecord {
  const existing = record[platformId]?.[layoutId];
  if (!existing?.spacing) return record;

  const { spacing: _removed, ...rest } = existing;
  const platformLayouts = { ...record[platformId] };

  if (!rest.decision) {
    delete platformLayouts[layoutId];
  } else {
    platformLayouts[layoutId] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
  }

  const next: LayoutReviewRecord = {
    ...record,
    [platformId]: platformLayouts,
  };
  saveLayoutReviews(next);
  return next;
}

export function getLayoutReviewEntry(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
): LayoutReviewEntry | undefined {
  return record[platformId]?.[layoutId];
}

/** Missing decision defaults to approved */
export function getLayoutDecision(
  entry: LayoutReviewEntry | undefined,
): LayoutReviewDecision {
  return entry?.decision ?? "approved";
}

export function setLayoutDecision(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
  decision: LayoutReviewDecision,
): LayoutReviewRecord {
  const next: LayoutReviewRecord = {
    ...record,
    [platformId]: {
      ...record[platformId],
      [layoutId]: mergeEntry(record[platformId]?.[layoutId], { decision }),
    },
  };
  saveLayoutReviews(next);
  return next;
}

/** Reset to pending review — keeps spacing overrides if any */
export function clearLayoutDecision(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
): LayoutReviewRecord {
  const existing = record[platformId]?.[layoutId];
  if (!existing?.decision) return record;

  const { decision: _removed, ...rest } = existing;
  const platformLayouts = { ...record[platformId] };

  if (!rest.spacing) {
    delete platformLayouts[layoutId];
  } else {
    platformLayouts[layoutId] = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };
  }

  const next: LayoutReviewRecord = {
    ...record,
    [platformId]: platformLayouts,
  };
  saveLayoutReviews(next);
  return next;
}

export function getLayoutReviewProgress(
  record: LayoutReviewRecord,
  platformId: PlatformId,
): { reviewed: number; approved: number; total: number } {
  const total = POST_LAYOUTS.length;
  let reviewed = 0;
  let approved = 0;

  for (const layout of POST_LAYOUTS) {
    const entry = getLayoutReviewEntry(record, platformId, layout.id);
    if (entry?.decision) reviewed += 1;
    if (getLayoutDecision(entry) === "approved") approved += 1;
  }

  return { reviewed, approved, total };
}

export function resolveLayoutSpacing(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
): PostLayoutSpacing {
  const saved = getLayoutReviewEntry(record, platformId, layoutId)?.spacing;
  return saved ? { ...DEFAULT_POST_LAYOUT_SPACING, ...saved } : { ...DEFAULT_POST_LAYOUT_SPACING };
}

export function getPlaygroundLayouts(
  record: LayoutReviewRecord,
  platformId: PlatformId,
): PostLayout[] {
  return POST_LAYOUTS.filter((layout) => {
    const entry = getLayoutReviewEntry(record, platformId, layout.id);
    return getLayoutDecision(entry) !== "rejected";
  });
}

export function getSpacingTuneProgress(
  record: LayoutReviewRecord,
  platformId: PlatformId,
): { tuned: number; total: number } {
  const layouts = getPlaygroundLayouts(record, platformId);
  const tuned = layouts.filter(
    (layout) => !!getLayoutReviewEntry(record, platformId, layout.id)?.spacing,
  ).length;
  return { tuned, total: layouts.length };
}

export function layoutMatchesPlatform(layout: PostLayout, platformId: PlatformId): boolean {
  return layout.bestFor === "all" || layout.bestFor.includes(platformId);
}

export function getApprovedLayoutIds(
  record: LayoutReviewRecord,
  platformId: PlatformId,
): PostLayoutId[] {
  return getApprovedShuffleLayouts(record, platformId).map((layout) => layout.id);
}

/** Approved, shuffle-safe layouts for a platform (excludes rejected) */
export function getApprovedShuffleLayouts(
  record: LayoutReviewRecord,
  platformId: PlatformId,
): PostLayout[] {
  return POST_LAYOUTS.filter((layout) => {
    if (!isShuffleableLayout(layout)) return false;
    if (!layoutMatchesPlatform(layout, platformId)) return false;
    return (
      getLayoutDecision(getLayoutReviewEntry(record, platformId, layout.id)) ===
      "approved"
    );
  });
}

function buildShuffleLayoutPool(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  excludeId?: PostLayoutId,
): PostLayout[] {
  const approved = getApprovedShuffleLayouts(record, platformId).filter(
    (layout) => layout.id !== excludeId,
  );
  if (approved.length > 0) return approved;

  return POST_LAYOUTS.filter(
    (layout) =>
      isShuffleableLayout(layout) &&
      layout.id !== excludeId &&
      getLayoutDecision(getLayoutReviewEntry(record, platformId, layout.id)) ===
        "approved",
  );
}

export function isLayoutApprovedForPlatform(
  record: LayoutReviewRecord,
  platformId: PlatformId,
  layoutId: PostLayoutId,
): boolean {
  return (
    getLayoutDecision(getLayoutReviewEntry(record, platformId, layoutId)) ===
    "approved"
  );
}

export function getRandomPlaygroundLayout(
  platformId: PlatformId,
  excludeId?: PostLayoutId,
  record: LayoutReviewRecord = getCommittedLayoutReviews(),
): PostLayout {
  const current = excludeId ? getPostLayout(excludeId) : undefined;
  const currentFamily = current ? getLayoutShuffleFamily(current) : undefined;
  let pool = buildShuffleLayoutPool(record, platformId, excludeId);

  if (currentFamily && pool.length > 1) {
    const alternateFamilies = pool.filter(
      (layout) => getLayoutShuffleFamily(layout) !== currentFamily,
    );
    if (alternateFamilies.length > 0) {
      pool = alternateFamilies;
    }
  }

  return (
    pool[Math.floor(Math.random() * pool.length)] ??
    getPostLayout(excludeId ?? "classic-hero")
  );
}

export function formatLayoutReviewsForExport(record: LayoutReviewRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export const LAYOUT_SPACING_LABELS: Record<keyof PostLayoutSpacing, string> = {
  layoutPad: "Layout padding",
  textZonePadBottom: "Text zone bottom",
  logoCopyGap: "Logo → copy",
  copyBlockGap: "Copy blocks",
  footerPad: "Footer padding",
  footerBlockGap: "Footer gap",
};

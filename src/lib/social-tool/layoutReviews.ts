import seedReviews from "@/data/layout-reviews.json";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  SPACING_TOKENS,
  SPACING_TOKEN_KEYS,
  type PostLayoutSpacing,
  type SpacingToken,
  type SpacingTokenKey,
} from "@/lib/social-tool/layoutSpacing";
import {
  getPostLayout,
  getLayoutShuffleFamily,
  isShuffleableLayout,
  layoutUsesSplit,
  POST_LAYOUTS,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";
import { platformAllowsHorizontalSplit } from "@/lib/social-tool/presets";

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

let layoutReviewsMemoryCache: LayoutReviewRecord | null = null;

export function invalidateLayoutReviewsCache(): void {
  layoutReviewsMemoryCache = null;
}

const SPACING_KEYS = SPACING_TOKEN_KEYS;

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
  if (
    typeof raw.splitTextColumnShare === "number" &&
    raw.splitTextColumnShare >= 0.32 &&
    raw.splitTextColumnShare <= 0.52
  ) {
    spacing.splitTextColumnShare = raw.splitTextColumnShare;
    valid = true;
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
  if (layoutReviewsMemoryCache) return layoutReviewsMemoryCache;

  if (typeof window === "undefined") {
    layoutReviewsMemoryCache = sanitizeRecord(LAYOUT_REVIEW_SEED);
    return layoutReviewsMemoryCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      layoutReviewsMemoryCache = sanitizeRecord(LAYOUT_REVIEW_SEED);
      return layoutReviewsMemoryCache;
    }
    layoutReviewsMemoryCache = mergeLayoutReviews(
      sanitizeRecord(LAYOUT_REVIEW_SEED),
      sanitizeRecord(JSON.parse(raw)),
    );
    return layoutReviewsMemoryCache;
  } catch {
    layoutReviewsMemoryCache = sanitizeRecord(LAYOUT_REVIEW_SEED);
    return layoutReviewsMemoryCache;
  }
}

/** Server-safe read of committed playground config */
export function getCommittedLayoutReviews(): LayoutReviewRecord {
  return sanitizeRecord(LAYOUT_REVIEW_SEED);
}

export function saveLayoutReviews(record: LayoutReviewRecord): void {
  layoutReviewsMemoryCache = record;
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
  if (!platformAllowsHorizontalSplit(platformId) && layoutUsesSplit(layout)) {
    return false;
  }
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
  excludeIds: ReadonlySet<PostLayoutId> = new Set(),
): PostLayout[] {
  const approved = getApprovedShuffleLayouts(record, platformId).filter(
    (layout) => !excludeIds.has(layout.id),
  );
  if (approved.length > 0) return approved;

  return POST_LAYOUTS.filter(
    (layout) =>
      isShuffleableLayout(layout) &&
      !excludeIds.has(layout.id) &&
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
  options?: {
    excludeIds?: readonly PostLayoutId[];
    excludeFamilies?: readonly string[];
  },
): PostLayout {
  const excludeIds = new Set<PostLayoutId>(options?.excludeIds ?? []);
  if (excludeId) excludeIds.add(excludeId);

  const current = excludeId ? getPostLayout(excludeId) : undefined;
  const currentFamily = current ? getLayoutShuffleFamily(current) : undefined;
  const excludeFamilies = new Set(options?.excludeFamilies ?? []);
  if (currentFamily) excludeFamilies.add(currentFamily);

  let pool = buildShuffleLayoutPool(record, platformId, excludeIds);

  if (excludeFamilies.size > 0 && pool.length > 1) {
    const alternateFamilies = pool.filter(
      (layout) => !excludeFamilies.has(getLayoutShuffleFamily(layout)),
    );
    if (alternateFamilies.length > 0) {
      pool = alternateFamilies;
    }
  }

  const fallbackId =
    excludeId ?? options?.excludeIds?.[0] ?? ("classic-hero" as PostLayoutId);

  return (
    pool[Math.floor(Math.random() * pool.length)] ?? getPostLayout(fallbackId)
  );
}

export function formatLayoutReviewsForExport(record: LayoutReviewRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

export const LAYOUT_SPACING_LABELS: Record<SpacingTokenKey, string> = {
  layoutPad: "Layout padding",
  textZonePadBottom: "Text zone bottom",
  logoCopyGap: "Logo → copy",
  copyBlockGap: "Copy blocks",
  splitColumnGap: "Split column gap",
  featuredSlotGap: "Visual slots",
  footerPad: "Footer padding",
  footerBlockGap: "Footer gap",
};

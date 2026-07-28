import {
  cloneDesignSession,
  createEmptyVariantGroup,
  loadBoardSessions,
  loadVariantGroup,
  MAX_VARIANT_BOARDS,
  persistBoardSession,
  saveVariantGroup,
  VARIANT_BATCH_SIZE,
  type DesignVariantGroup,
} from "@/lib/design/variantGroup";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { createDesignId } from "@/lib/design/ids";
import { applyShuffleToSession } from "@/lib/social-tool/applyShuffle";
import { applyFeaturedVisualBlockToSession } from "@/lib/social-tool/applyFeaturedVisualBlock";
import { withShuffleAll, seedShufflePreferencesAllOn } from "@/lib/social-tool/shufflePreferences";
import { getLayoutShuffleFamily, type PostLayoutId } from "@/lib/social-tool/postLayouts";
import { layoutIdForDocument } from "@/lib/social-tool/layoutRegistry";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { inferFeaturedVisualKind, isFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { FeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { pickShuffleFeaturedVisualBrowser } from "@/lib/social-tool/shuffleFeaturedVisualBrowser";
import { buildBackgroundPresets } from "@/lib/brand/backgroundPresets";
import {
  defaultBackgroundPresetIdForColors,
  isUnbrandedKit,
  pickStarterPalette,
} from "@/lib/brand/starterPalettes";

export type GenerateVariantsPhase =
  | "idle"
  | "preparing"
  | "revealing"
  | "ready";

export type GenerateDesignVariantsResult = {
  group: DesignVariantGroup;
  boards: DesignSessionPersisted[];
  /** Newly created variant board ids (not including origin / prior options). */
  variantIds: string[];
  batchSize: number;
};

export function buildFeaturedVisualPickInput(
  session: DesignSessionPersisted,
  activeKind: FeaturedVisualKind,
  copy?: { headline?: string; subheading?: string },
) {
  const headline = copy?.headline ?? session.document.copy.heading;
  const subheading = copy?.subheading ?? session.document.copy.subheading;
  return {
    headline,
    subheading,
    theme: headline,
    brief: [headline, subheading].filter(Boolean).join(" "),
    brandColors: {
      primary: session.brand.colors.primary,
      accent: session.brand.colors.accent,
    },
    preferredKind: activeKind,
    intent: { featuredVisualKind: activeKind },
    semantic: {
      featuredKind: activeKind,
      platformId: session.document.platformId,
    },
  };
}

export async function shuffleFeaturedVisualForSession(
  session: DesignSessionPersisted,
  excludeLibraryIds: string[] = [],
): Promise<{ session: DesignSessionPersisted; libraryId?: string }> {
  if (session.featured.mode !== "composed") {
    return { session };
  }
  const blocks = session.featured.visualBlocks ?? [];
  if (blocks.length === 0) return { session };

  const active = activeVisualBlock(blocks, session.featured.activeBlockId);
  const activeKind: FeaturedVisualKind =
    (isFeaturedVisualKind(active?.kind)
      ? active.kind
      : session.document.featuredVisualKind) ??
    inferFeaturedVisualKind(session.document.copy.heading);

  const localExclude = [
    ...new Set([
      ...excludeLibraryIds,
      ...blocks
        .filter((b) => b.kind === activeKind)
        .map((b) => b.libraryId)
        .filter((id): id is string => Boolean(id)),
    ]),
  ];

  try {
    let newBlock: VisualBlockRecord | null = null;

    if (typeof window !== "undefined") {
      newBlock = await pickShuffleFeaturedVisualBrowser(
        buildFeaturedVisualPickInput(session, activeKind),
        localExclude,
      );
    } else {
      const response = await fetch("/api/visual-blocks/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...buildFeaturedVisualPickInput(session, activeKind),
          pickFeatured: true,
          excludeLibraryIds: localExclude,
          source: "library",
        }),
      });
      if (response.ok) {
        const payload = (await response.json()) as { blocks: VisualBlockRecord[] };
        newBlock = payload.blocks[0] ?? null;
      }
    }

    if (!newBlock) return { session };

    return {
      session: applyFeaturedVisualBlockToSession(session, newBlock, activeKind),
      libraryId: newBlock.libraryId,
    };
  } catch {
    return { session };
  }
}

export function nextVariantBatchSize(currentBoardCount: number): number {
  return Math.max(
    0,
    Math.min(VARIANT_BATCH_SIZE, MAX_VARIANT_BOARDS - currentBoardCount),
  );
}

/**
 * Append up to VARIANT_BATCH_SIZE shuffled clones of the origin (capped at
 * MAX_VARIANT_BOARDS total). Existing options are kept.
 */
export async function generateDesignVariants(
  originSession: DesignSessionPersisted,
  options?: { existingBoards?: DesignSessionPersisted[] },
): Promise<GenerateDesignVariantsResult> {
  const originId = originSession.designId;
  let group = loadVariantGroup(originId);

  persistBoardSession(originSession);

  const existingFromStorage = loadBoardSessions(
    group.boardIds.length > 0 ? group.boardIds : [originId],
  );
  const existing =
    options?.existingBoards && options.existingBoards.length > 0
      ? options.existingBoards.map((board) =>
          board.designId === originId ? originSession : board,
        )
      : existingFromStorage.map((board) =>
          board.designId === originId ? originSession : board,
        );

  // Ensure origin is first and up to date
  const prior = existing.filter((b) => b.designId !== originId);
  const baseBoards = [originSession, ...prior];
  const batchSize = nextVariantBatchSize(baseBoards.length);

  if (batchSize <= 0) {
    const boardIds = baseBoards.map((b) => b.designId);
    group = {
      ...(group.groupId ? group : createEmptyVariantGroup(originId)),
      originDesignId: originId,
      boardIds,
      activeDesignId: group.activeDesignId ?? originId,
      updatedAt: Date.now(),
    };
    saveVariantGroup(group);
    return { group, boards: baseBoards, variantIds: [], batchSize: 0 };
  }

  const usedLayoutIds: PostLayoutId[] = [];
  const usedFamilies: string[] = [];
  const usedLibraryIds: string[] = [];

  for (const board of baseBoards) {
    const layoutId = layoutIdForDocument(board.document);
    usedLayoutIds.push(layoutId);
    usedFamilies.push(getLayoutShuffleFamily(getPostLayout(layoutId)));
    const block = activeVisualBlock(
      board.featured.visualBlocks ?? [],
      board.featured.activeBlockId,
    );
    if (block?.libraryId) usedLibraryIds.push(block.libraryId);
  }

  const prefs = withShuffleAll(true);
  // Keep origin shuffle panel fully enabled when exploring variants.
  seedShufflePreferencesAllOn(originId);
  const variantSessions: DesignSessionPersisted[] = [];
  const usedPaletteIds: string[] = [];
  const pendingVisualShuffles: Array<{
    index: number;
    session: DesignSessionPersisted;
    excludeLibraryIds: string[];
  }> = [];

  for (let i = 0; i < batchSize; i++) {
    const clone = cloneDesignSession(originSession, createDesignId());
    let sessionForShuffle = clone;
    if (isUnbrandedKit(clone.brand)) {
      const palette = pickStarterPalette({
        seed: `${clone.designId}:${i}`,
        excludeIds: usedPaletteIds,
      });
      usedPaletteIds.push(palette.id);
      sessionForShuffle = {
        ...clone,
        brand: {
          ...clone.brand,
          colors: palette.colors,
          activeBackgroundPresetId: defaultBackgroundPresetIdForColors(palette.colors),
        },
      };
    }

    const backgrounds = buildBackgroundPresets(sessionForShuffle.brand.colors);
    const shuffled = applyShuffleToSession(sessionForShuffle, {
      prefs,
      excludeLayoutIds: usedLayoutIds,
      excludeFamilies: usedFamilies,
      backgrounds,
    });

    usedLayoutIds.push(shuffled.layoutId);
    usedFamilies.push(shuffled.layoutFamily);

    if (shuffled.shouldShuffleFeaturedVisual) {
      pendingVisualShuffles.push({
        index: i,
        session: shuffled.session,
        excludeLibraryIds: [...usedLibraryIds],
      });
      variantSessions.push(shuffled.session);
    } else {
      variantSessions.push(shuffled.session);
    }
  }

  if (pendingVisualShuffles.length > 0) {
    const visualResults = await Promise.all(
      pendingVisualShuffles.map(async (entry) => {
        const visual = await shuffleFeaturedVisualForSession(
          entry.session,
          entry.excludeLibraryIds,
        );
        return { index: entry.index, ...visual };
      }),
    );
    for (const visual of visualResults) {
      variantSessions[visual.index] = visual.session;
      if (visual.libraryId) usedLibraryIds.push(visual.libraryId);
    }
  }

  for (const next of variantSessions) {
    persistBoardSession(next);
    seedShufflePreferencesAllOn(next.designId);
  }

  const boards = [...baseBoards, ...variantSessions];
  const boardIds = boards.map((b) => b.designId);
  const activeDesignId = variantSessions[0]?.designId ?? originId;
  group = {
    ...(group.groupId ? group : createEmptyVariantGroup(originId)),
    originDesignId: originId,
    boardIds,
    activeDesignId,
    updatedAt: Date.now(),
  };
  saveVariantGroup(group);

  return {
    group,
    boards,
    variantIds: variantSessions.map((s) => s.designId),
    batchSize,
  };
}

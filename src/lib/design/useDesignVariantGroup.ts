"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { createDesignId } from "@/lib/design/ids";
import {
  cloneDesignSession,
  createEmptyVariantGroup,
  loadBoardSessions,
  loadBoardSessionsAsync,
  loadVariantGroup,
  MAX_VARIANT_BOARDS,
  persistBoardSession,
  saveVariantGroup,
  withBoardName,
  type DesignVariantGroup,
} from "@/lib/design/variantGroup";
import { designRepository } from "@/lib/design/repository";
import {
  buildPlannedVariantBoards,
  generateDesignVariants,
  generateSimilarVariants,
  nextVariantBatchSize,
  plannedVariantSetKey,
  SIMILAR_VARIANT_BATCH_SIZE,
  type GenerateVariantsPhase,
  type PlannedBoardInput,
} from "@/lib/social-tool/generateDesignVariants";
import { seedShufflePreferencesAllOn } from "@/lib/social-tool/shufflePreferences";

export type UseDesignVariantGroupResult = {
  group: DesignVariantGroup;
  boards: DesignSessionPersisted[];
  phase: GenerateVariantsPhase;
  generating: boolean;
  /** Skeletons to show while a batch is generating */
  pendingBatchSize: number;
  canGenerateMore: boolean;
  activeDesignId: string;
  setActiveDesignId: (id: string) => void;
  /** Set or clear a custom artboard name (empty clears → falls back to index). */
  setBoardName: (designId: string, name: string) => void;
  /** Delete a non-origin variant board. Returns the next active board id. */
  removeBoard: (designId: string) => Promise<string | null>;
  /** Clone a board and append it next to the source. Returns the new board id. */
  duplicateBoard: (sourceDesignId: string) => string | null;
  syncBoard: (session: DesignSessionPersisted) => void;
  /** Update cached board state without an extra persist write. */
  mirrorBoard: (session: DesignSessionPersisted) => void;
  generateVariants: (originSession: DesignSessionPersisted) => Promise<void>;
  /** "More like this": close variations of one board, inserted after it. */
  generateSimilar: (sourceSession: DesignSessionPersisted) => Promise<void>;
  /**
   * Add AI chat variants as artboards cloned from `base`. A set already added
   * (e.g. a restored chat) is skipped. Returns board ids keyed by theme.
   */
  addPlannedBoards: (
    base: DesignSessionPersisted,
    variants: PlannedBoardInput[],
    options?: {
      setKey?: string;
      /** The base board is being edited live (e.g. it took the first variant): don't persist it or switch away. */
      baseIsLive?: boolean;
      /** Name for the base board, saved in the same group write as the new boards. */
      baseName?: string;
    },
  ) => Promise<{ boardIdsByTheme: Record<string, string>; skipped: number } | null>;
  /** Whether a chat variant set (plannedVariantSetKey) was already turned into boards. */
  isVariantSetImported: (setKey: string) => boolean;
  /** User-facing message about the last variant action (cap reached, failure). */
  notice: string | null;
  clearNotice: () => void;
  patchBoardDocument: (
    boardId: string,
    partial: Partial<DesignSessionPersisted["document"]>,
  ) => void;
  replaceBoard: (session: DesignSessionPersisted) => void;
  /** Sync logo + colors across boards; keeps each board's background preset. */
  broadcastBrandIdentity: (brand: DesignSessionPersisted["brand"]) => void;
  broadcastPlatform: (platformId: DesignSessionPersisted["document"]["platformId"]) => void;
};

export function useDesignVariantGroup(
  originDesignId: string,
): UseDesignVariantGroupResult {
  const [group, setGroup] = useState<DesignVariantGroup>(() =>
    createEmptyVariantGroup(originDesignId),
  );
  const [boards, setBoards] = useState<DesignSessionPersisted[]>([]);
  const [phase, setPhase] = useState<GenerateVariantsPhase>("idle");
  const [pendingBatchSize, setPendingBatchSize] = useState(0);
  const [notice, setNoticeState] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearNotice = useCallback(() => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = null;
    setNoticeState(null);
  }, []);
  /** Notices clear themselves, like the canvas toasts that show them. */
  const setNotice = useCallback((message: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNoticeState(message);
    noticeTimerRef.current = setTimeout(() => {
      setNoticeState(null);
      noticeTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = loadVariantGroup(originDesignId);
      const boards = await loadBoardSessionsAsync(loaded.boardIds);
      if (cancelled) return;
      setGroup(loaded);
      setBoards(boards);
      setPhase(loaded.boardIds.length > 1 ? "ready" : "idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [originDesignId]);

  const setActiveDesignId = useCallback(
    (id: string) => {
      setGroup((prev) => {
        if (!prev.boardIds.includes(id)) return prev;
        const next = { ...prev, activeDesignId: id, updatedAt: Date.now() };
        saveVariantGroup(next);
        return next;
      });
    },
    [],
  );

  const setBoardName = useCallback((designId: string, name: string) => {
    setGroup((prev) => {
      const next = withBoardName(prev, designId, name);
      if (next === prev) return prev;
      saveVariantGroup(next);
      return next;
    });
  }, []);

  const removeBoard = useCallback(
    async (designId: string): Promise<string | null> => {
      const nextActiveId = await designRepository.deleteVariantBoard(designId);
      if (!nextActiveId) return null;

      const nextGroup = loadVariantGroup(originDesignId);
      setGroup(nextGroup);
      setBoards(await loadBoardSessionsAsync(nextGroup.boardIds));
      setPhase(nextGroup.boardIds.length > 1 ? "ready" : "idle");
      return nextActiveId;
    },
    [originDesignId],
  );

  const duplicateBoard = useCallback(
    (sourceDesignId: string): string | null => {
      if (boards.length >= MAX_VARIANT_BOARDS) return null;

      const source =
        boards.find((board) => board.designId === sourceDesignId) ?? null;
      if (!source) return null;

      const clone = cloneDesignSession(source, createDesignId());
      persistBoardSession(clone);
      seedShufflePreferencesAllOn(clone.designId);

      setGroup((prev) => {
        const insertAt = Math.max(0, prev.boardIds.indexOf(sourceDesignId) + 1);
        const boardIds = [...prev.boardIds];
        if (!boardIds.includes(sourceDesignId)) {
          boardIds.push(clone.designId);
        } else {
          boardIds.splice(insertAt, 0, clone.designId);
        }
        const next: DesignVariantGroup = {
          ...(prev.groupId ? prev : createEmptyVariantGroup(originDesignId)),
          originDesignId,
          boardIds,
          activeDesignId: clone.designId,
          boardNames: prev.boardNames,
          updatedAt: Date.now(),
        };
        saveVariantGroup(next);
        return next;
      });

      setBoards((prev) => {
        const insertAt = Math.max(
          0,
          prev.findIndex((board) => board.designId === sourceDesignId) + 1,
        );
        const next = [...prev];
        if (insertAt <= 0 || insertAt > next.length) {
          next.push(clone);
        } else {
          next.splice(insertAt, 0, clone);
        }
        return next;
      });
      setPhase("ready");
      return clone.designId;
    },
    [boards, originDesignId],
  );

  const syncBoard = useCallback((session: DesignSessionPersisted) => {
    // Snapshot + persist immediately so switching boards can't drop featured/shuffle state
    const snapshot = structuredClone(session) as DesignSessionPersisted;
    persistBoardSession(snapshot);
    setBoards((prev) => {
      const idx = prev.findIndex((b) => b.designId === snapshot.designId);
      if (idx === -1) {
        if (snapshot.designId === originDesignId) return [snapshot, ...prev];
        return prev;
      }
      const next = [...prev];
      next[idx] = snapshot;
      return next;
    });
  }, [originDesignId]);

  const mirrorBoard = useCallback((session: DesignSessionPersisted) => {
    const snapshot = structuredClone(session) as DesignSessionPersisted;
    setBoards((prev) => {
      const idx = prev.findIndex((b) => b.designId === snapshot.designId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = snapshot;
      return next;
    });
  }, []);

  const replaceBoard = useCallback((session: DesignSessionPersisted) => {
    const snapshot = structuredClone(session) as DesignSessionPersisted;
    persistBoardSession(snapshot);
    setBoards((prev) => {
      const idx = prev.findIndex((b) => b.designId === snapshot.designId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = snapshot;
      return next;
    });
  }, []);

  const patchBoardDocument = useCallback(
    (
      boardId: string,
      partial: Partial<DesignSessionPersisted["document"]>,
    ) => {
      setBoards((prev) => {
        const idx = prev.findIndex((b) => b.designId === boardId);
        if (idx === -1) return prev;
        const updated: DesignSessionPersisted = {
          ...prev[idx],
          document: { ...prev[idx].document, ...partial },
          updatedAt: Date.now(),
        };
        persistBoardSession(updated);
        const next = [...prev];
        next[idx] = updated;
        return next;
      });
    },
    [],
  );

  const broadcastBrandIdentity = useCallback(
    (brand: DesignSessionPersisted["brand"]) => {
      setBoards((prev) =>
        prev.map((board) => {
          const updated = {
            ...board,
            brand: {
              ...board.brand,
              logo: structuredClone(brand.logo),
              logos: structuredClone(brand.logos),
              colors: { ...brand.colors },
            },
            updatedAt: Date.now(),
          };
          persistBoardSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const broadcastPlatform = useCallback(
    (platformId: DesignSessionPersisted["document"]["platformId"]) => {
      setBoards((prev) =>
        prev.map((board) => {
          const updated = {
            ...board,
            document: { ...board.document, platformId },
            updatedAt: Date.now(),
          };
          persistBoardSession(updated);
          return updated;
        }),
      );
    },
    [],
  );

  const generateVariants = useCallback(
    async (originSession: DesignSessionPersisted) => {
      const currentCount = Math.max(boards.length, 1);
      const batchSize = nextVariantBatchSize(currentCount);
      if (batchSize <= 0) return;

      setPhase("preparing");
      setPendingBatchSize(batchSize);
      // Keep existing boards when appending; only reset list on first batch
      if (boards.length <= 1) {
        setBoards([originSession]);
        setGroup((prev) => ({
          ...prev,
          boardIds: [originDesignId],
          activeDesignId: originDesignId,
          updatedAt: Date.now(),
        }));
      } else {
        setBoards((prev) =>
          prev.map((b) =>
            b.designId === originDesignId ? originSession : b,
          ),
        );
      }

      try {
        const result = await generateDesignVariants(originSession, {
          existingBoards:
            boards.length > 1
              ? boards.map((b) =>
                  b.designId === originDesignId ? originSession : b,
                )
              : [originSession],
        });
        setPhase("revealing");
        setGroup(result.group);
        setBoards(result.boards);
        setPendingBatchSize(0);
        // Keep a single /designs card on the origin; bump its updatedAt.
        const originBoard =
          result.boards.find((b) => b.designId === originDesignId) ??
          originSession;
        void designRepository.upsert(originBoard).catch(() => {});
        await new Promise((r) => setTimeout(r, 120));
        setPhase("ready");
      } catch (err) {
        console.warn("[postforge] generate variants failed", err);
        setPendingBatchSize(0);
        setPhase(boards.length > 1 ? "ready" : "idle");
        setNotice("Couldn't generate variants. Try again.");
      }
    },
    [originDesignId, boards, setNotice],
  );

  /** Current boards with the live session swapped in (the cache can lag the editor). */
  const boardsWithLive = useCallback(
    (live: DesignSessionPersisted) => {
      if (boards.length === 0) return [live];
      return boards.map((board) => (board.designId === live.designId ? live : board));
    },
    [boards],
  );

  const commitBoards = useCallback(
    async (nextGroup: DesignVariantGroup, nextBoards: DesignSessionPersisted[]) => {
      setPhase("revealing");
      setGroup(nextGroup);
      setBoards(nextBoards);
      setPendingBatchSize(0);
      const originBoard = nextBoards.find((b) => b.designId === originDesignId);
      if (originBoard) void designRepository.upsert(originBoard).catch(() => {});
      await new Promise((r) => setTimeout(r, 120));
      setPhase("ready");
    },
    [originDesignId],
  );

  const generateSimilar = useCallback(
    async (sourceSession: DesignSessionPersisted) => {
      const current = boardsWithLive(sourceSession);
      const batchSize = Math.min(SIMILAR_VARIANT_BATCH_SIZE, MAX_VARIANT_BOARDS - current.length);
      if (batchSize <= 0) {
        setNotice(`You've reached ${MAX_VARIANT_BOARDS} artboards. Delete one to make room.`);
        return;
      }
      persistBoardSession(sourceSession);
      setPhase("preparing");
      setPendingBatchSize(batchSize);
      try {
        const result = await generateSimilarVariants(sourceSession, current, originDesignId);
        await commitBoards(result.group, result.boards);
      } catch (err) {
        console.warn("[postforge] more like this failed", err);
        setPendingBatchSize(0);
        setPhase(current.length > 1 ? "ready" : "idle");
        setNotice("Couldn't make more like this. Try again.");
      }
    },
    [boardsWithLive, commitBoards, originDesignId, setNotice],
  );

  const addPlannedBoards = useCallback(
    async (
      base: DesignSessionPersisted,
      variants: PlannedBoardInput[],
      options?: { setKey?: string; baseIsLive?: boolean; baseName?: string },
    ) => {
      const key = options?.setKey ?? plannedVariantSetKey(variants);
      const stored = loadVariantGroup(originDesignId);
      if (stored.importedVariantSets?.includes(key)) return null;
      if (variants.length === 0) {
        const next = {
          ...stored,
          importedVariantSets: [...(stored.importedVariantSets ?? []), key].slice(-20),
        };
        saveVariantGroup(next);
        setGroup((prev) => ({ ...prev, importedVariantSets: next.importedVariantSets }));
        return { boardIdsByTheme: {}, skipped: 0 };
      }

      const current = boardsWithLive(base);
      const room = Math.max(0, MAX_VARIANT_BOARDS - current.length);
      const accepted = variants.slice(0, room);
      const skipped = variants.length - accepted.length;
      if (skipped > 0) {
        setNotice(
          accepted.length
            ? `Added ${accepted.length} of ${variants.length} variants. The canvas holds ${MAX_VARIANT_BOARDS} artboards.`
            : `You've reached ${MAX_VARIANT_BOARDS} artboards. Delete one, then pick a variant below.`,
        );
      }
      if (accepted.length === 0) return { boardIdsByTheme: {}, skipped };

      if (!options?.baseIsLive) persistBoardSession(base);
      setPhase("preparing");
      setPendingBatchSize(accepted.length);
      try {
        const created = await buildPlannedVariantBoards(base, accepted, current);
        const boardNames = { ...(stored.boardNames ?? {}) };
        if (options?.baseName) boardNames[base.designId] = options.baseName;
        const boardIdsByTheme: Record<string, string> = {};
        created.forEach((board, i) => {
          boardNames[board.designId] = accepted[i]!.theme;
          boardIdsByTheme[accepted[i]!.theme] = board.designId;
        });
        const nextBoards = [...current, ...created];
        const nextGroup: DesignVariantGroup = {
          ...(stored.groupId ? stored : createEmptyVariantGroup(originDesignId)),
          originDesignId,
          boardIds: nextBoards.map((board) => board.designId),
          activeDesignId: options?.baseIsLive
            ? base.designId
            : (created[0]?.designId ?? stored.activeDesignId),
          boardNames,
          importedVariantSets: [...(stored.importedVariantSets ?? []), key].slice(-20),
          updatedAt: Date.now(),
        };
        saveVariantGroup(nextGroup);
        await commitBoards(nextGroup, nextBoards);
        return { boardIdsByTheme, skipped };
      } catch (err) {
        console.warn("[postforge] adding chat variants failed", err);
        setPendingBatchSize(0);
        setPhase(current.length > 1 ? "ready" : "idle");
        setNotice("Couldn't add the variants as artboards. Pick one below to apply it.");
        return null;
      }
    },
    [boardsWithLive, commitBoards, originDesignId, setNotice],
  );

  const isVariantSetImported = useCallback(
    (setKey: string) => Boolean(loadVariantGroup(originDesignId).importedVariantSets?.includes(setKey)),
    [originDesignId],
  );

  return {
    group,
    boards,
    phase,
    generating: phase === "preparing" || phase === "revealing",
    pendingBatchSize,
    canGenerateMore: boards.length < MAX_VARIANT_BOARDS,
    activeDesignId: group.activeDesignId,
    setActiveDesignId,
    setBoardName,
    removeBoard,
    duplicateBoard,
    syncBoard,
    mirrorBoard,
    generateVariants,
    generateSimilar,
    addPlannedBoards,
    isVariantSetImported,
    notice,
    clearNotice,
    patchBoardDocument,
    replaceBoard,
    broadcastBrandIdentity,
    broadcastPlatform,
  };
}

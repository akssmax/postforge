"use client";

import { useCallback, useEffect, useState } from "react";
import type { DesignSessionPersisted } from "@/lib/design/types";
import {
  createEmptyVariantGroup,
  loadBoardSessions,
  loadVariantGroup,
  MAX_VARIANT_BOARDS,
  persistBoardSession,
  saveVariantGroup,
  type DesignVariantGroup,
} from "@/lib/design/variantGroup";
import {
  generateDesignVariants,
  nextVariantBatchSize,
  type GenerateVariantsPhase,
} from "@/lib/social-tool/generateDesignVariants";

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
  syncBoard: (session: DesignSessionPersisted) => void;
  generateVariants: (originSession: DesignSessionPersisted) => Promise<void>;
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

  useEffect(() => {
    const loaded = loadVariantGroup(originDesignId);
    setGroup(loaded);
    setBoards(loadBoardSessions(loaded.boardIds));
    setPhase(loaded.boardIds.length > 1 ? "ready" : "idle");
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

  const syncBoard = useCallback((session: DesignSessionPersisted) => {
    setBoards((prev) => {
      const idx = prev.findIndex((b) => b.designId === session.designId);
      if (idx === -1) {
        if (session.designId === originDesignId) return [session, ...prev];
        return prev;
      }
      const next = [...prev];
      next[idx] = session;
      return next;
    });
  }, [originDesignId]);

  const replaceBoard = useCallback((session: DesignSessionPersisted) => {
    persistBoardSession(session);
    setBoards((prev) => {
      const idx = prev.findIndex((b) => b.designId === session.designId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = session;
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
        await new Promise((r) => setTimeout(r, 120));
        setPhase("ready");
      } catch (err) {
        console.warn("[postforge] generate variants failed", err);
        setPendingBatchSize(0);
        setPhase(boards.length > 1 ? "ready" : "idle");
      }
    },
    [originDesignId, boards],
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
    syncBoard,
    generateVariants,
    patchBoardDocument,
    replaceBoard,
    broadcastBrandIdentity,
    broadcastPlatform,
  };
}

import { createDesignId } from "@/lib/design/ids";
import {
  designSessionStorageKey,
  loadDesignSession,
  saveDesignSession,
} from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";

export const VARIANT_BATCH_SIZE = 3;
/** Total artboards allowed per design (original + options). */
export const MAX_VARIANT_BOARDS = 7;
/** @deprecated use VARIANT_BATCH_SIZE */
export const VARIANT_COUNT = VARIANT_BATCH_SIZE;

export type DesignVariantGroup = {
  groupId: string;
  originDesignId: string;
  boardIds: string[];
  activeDesignId: string;
  updatedAt: number;
};

export function variantGroupStorageKey(originDesignId: string): string {
  return `postforge:design-variant-group:${originDesignId}`;
}

export function createEmptyVariantGroup(
  originDesignId: string,
): DesignVariantGroup {
  return {
    groupId: createDesignId(),
    originDesignId,
    boardIds: [originDesignId],
    activeDesignId: originDesignId,
    updatedAt: Date.now(),
  };
}

export function loadVariantGroup(
  originDesignId: string,
): DesignVariantGroup {
  if (typeof window === "undefined") {
    return createEmptyVariantGroup(originDesignId);
  }
  try {
    const raw = localStorage.getItem(variantGroupStorageKey(originDesignId));
    if (!raw) return createEmptyVariantGroup(originDesignId);
    const parsed = JSON.parse(raw) as DesignVariantGroup;
    const boardIds =
      Array.isArray(parsed.boardIds) && parsed.boardIds.length > 0
        ? parsed.boardIds
        : [originDesignId];
    if (boardIds[0] !== originDesignId) {
      boardIds[0] = originDesignId;
    }
    const activeDesignId = boardIds.includes(parsed.activeDesignId)
      ? parsed.activeDesignId
      : originDesignId;
    return {
      groupId: parsed.groupId || createDesignId(),
      originDesignId,
      boardIds,
      activeDesignId,
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return createEmptyVariantGroup(originDesignId);
  }
}

export function saveVariantGroup(group: DesignVariantGroup): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    variantGroupStorageKey(group.originDesignId),
    JSON.stringify({ ...group, updatedAt: Date.now() }),
  );
}

export function deleteDesignSessionKey(designId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(designSessionStorageKey(designId));
}

/** Deep-clone a session under a new design id (brand/featured blobs stay shared by key). */
export function cloneDesignSession(
  source: DesignSessionPersisted,
  newDesignId: string = createDesignId(),
): DesignSessionPersisted {
  const cloned = structuredClone(source) as DesignSessionPersisted;
  return {
    ...cloned,
    designId: newDesignId,
    updatedAt: Date.now(),
    document: {
      ...cloned.document,
      copy: {
        ...cloned.document.copy,
        extraFields: [...(cloned.document.copy.extraFields ?? [])],
      },
      copyVariants: cloned.document.copyVariants
        ? cloned.document.copyVariants.map((v) => ({ ...v }))
        : undefined,
      layoutSpacing: { ...cloned.document.layoutSpacing },
      featuredTransform: { ...cloned.document.featuredTransform },
      textSlots: cloned.document.textSlots
        ? cloned.document.textSlots.map((s) => ({ ...s }))
        : undefined,
      featuredSlots: cloned.document.featuredSlots
        ? cloned.document.featuredSlots.map((s) => ({ ...s }))
        : undefined,
      onboarding: { ...cloned.document.onboarding },
    },
    featured: {
      ...cloned.featured,
      visualBlocks: cloned.featured.visualBlocks
        ? cloned.featured.visualBlocks.map((b) => ({ ...b }))
        : undefined,
      slots: cloned.featured.slots
        ? cloned.featured.slots.map((s) => ({ ...s }))
        : undefined,
    },
    brand: structuredClone(cloned.brand),
  };
}

export function loadBoardSessions(
  boardIds: string[],
): DesignSessionPersisted[] {
  return boardIds.map((id) => loadDesignSession(id));
}

export function persistBoardSession(session: DesignSessionPersisted): void {
  saveDesignSession(session);
}

export function removeVariantBoards(
  group: DesignVariantGroup,
): DesignVariantGroup {
  const originId = group.originDesignId;
  for (const id of group.boardIds) {
    if (id !== originId) deleteDesignSessionKey(id);
  }
  const next: DesignVariantGroup = {
    ...group,
    boardIds: [originId],
    activeDesignId: originId,
    updatedAt: Date.now(),
  };
  saveVariantGroup(next);
  return next;
}

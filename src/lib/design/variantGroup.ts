import { createDesignId } from "@/lib/design/ids";
import {
  deleteDesignSessionStorage,
  ensureDesignSessionLoaded,
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
  /** Optional custom display names keyed by board designId. Empty/whitespace falls back to index. */
  boardNames?: Record<string, string>;
  updatedAt: number;
};

/** 1-based index label used by the artboard switcher and as rename fallback. */
export function artboardIndexLabel(index: number): string {
  return String(index + 1);
}

/** Resolve a board's canvas label: custom name if set, else index string. */
export function resolveArtboardDisplayName(
  boardNames: Record<string, string> | undefined,
  designId: string,
  index: number,
): string {
  const custom = boardNames?.[designId]?.trim();
  return custom || artboardIndexLabel(index);
}

/** Normalize a rename draft — empty/whitespace clears the custom name. */
export function normalizeArtboardName(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export const VARIANT_GROUP_KEY_PREFIX = "postforge:design-variant-group:";

export function variantGroupStorageKey(originDesignId: string): string {
  return `${VARIANT_GROUP_KEY_PREFIX}${originDesignId}`;
}

/** All stored variant groups (origins that have a group key). */
export function listStoredVariantGroups(): DesignVariantGroup[] {
  if (typeof window === "undefined") return [];
  const groups: DesignVariantGroup[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(VARIANT_GROUP_KEY_PREFIX)) continue;
    const originId = key.slice(VARIANT_GROUP_KEY_PREFIX.length);
    if (!originId) continue;
    groups.push(loadVariantGroup(originId));
  }
  return groups;
}

/** Board ids that belong to a group but are not the origin (should not appear in /designs). */
export function collectNonOriginBoardIds(): Set<string> {
  const ids = new Set<string>();
  for (const group of listStoredVariantGroups()) {
    for (const id of group.boardIds) {
      if (id !== group.originDesignId) ids.add(id);
    }
  }
  return ids;
}

/** Find the variant group that contains this board (as origin or option). */
export function findVariantGroupForBoard(
  designId: string,
): DesignVariantGroup | null {
  if (typeof window === "undefined") return null;
  if (localStorage.getItem(variantGroupStorageKey(designId))) {
    return loadVariantGroup(designId);
  }
  for (const group of listStoredVariantGroups()) {
    if (group.boardIds.includes(designId)) return group;
  }
  return null;
}

export function isNonOriginVariantBoard(designId: string): boolean {
  const group = findVariantGroupForBoard(designId);
  return Boolean(group && group.originDesignId !== designId);
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
    const boardNames = sanitizeBoardNames(parsed.boardNames, boardIds);
    return {
      groupId: parsed.groupId || createDesignId(),
      originDesignId,
      boardIds,
      activeDesignId,
      ...(boardNames ? { boardNames } : {}),
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return createEmptyVariantGroup(originDesignId);
  }
}

function sanitizeBoardNames(
  raw: unknown,
  boardIds: string[],
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const idSet = new Set(boardIds);
  const next: Record<string, string> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!idSet.has(id) || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) next[id] = trimmed;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function saveVariantGroup(group: DesignVariantGroup): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    variantGroupStorageKey(group.originDesignId),
    JSON.stringify({ ...group, updatedAt: Date.now() }),
  );
}

export function deleteDesignSessionKey(designId: string): void {
  deleteDesignSessionStorage(designId);
}

/** Deep-clone a session under a new design id (brand/featured blobs stay shared by key). */
export function cloneDesignSession(
  source: DesignSessionPersisted,
  newDesignId: string = createDesignId(),
): DesignSessionPersisted {
  const cloned = structuredClone(source) as DesignSessionPersisted;
  const { briefChatMessages: _chat, ...rest } = cloned;
  return {
    ...rest,
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

export async function loadBoardSessionsAsync(
  boardIds: string[],
): Promise<DesignSessionPersisted[]> {
  return Promise.all(boardIds.map((id) => ensureDesignSessionLoaded(id)));
}

export function persistBoardSession(session: DesignSessionPersisted): void {
  if (isNonOriginVariantBoard(session.designId) && session.briefChatMessages?.length) {
    const { briefChatMessages: _chat, ...rest } = session;
    saveDesignSession(rest as DesignSessionPersisted);
    return;
  }
  saveDesignSession(session);
}

/** Remove a non-origin variant board from the group. Returns null if not allowed. */
export function removeBoardFromGroup(
  group: DesignVariantGroup,
  designId: string,
): DesignVariantGroup | null {
  if (group.boardIds.length <= 1) return null;
  if (designId === group.originDesignId) return null;
  if (!group.boardIds.includes(designId)) return null;

  const boardIds = group.boardIds.filter((id) => id !== designId);
  const boardNames = group.boardNames ? { ...group.boardNames } : undefined;
  if (boardNames) delete boardNames[designId];

  const activeDesignId = boardIds.includes(group.activeDesignId)
    ? group.activeDesignId
    : group.originDesignId;

  return {
    ...group,
    boardIds,
    activeDesignId,
    boardNames:
      boardNames && Object.keys(boardNames).length > 0 ? boardNames : undefined,
    updatedAt: Date.now(),
  };
}

export function removeVariantBoards(
  group: DesignVariantGroup,
): DesignVariantGroup {
  const originId = group.originDesignId;
  for (const id of group.boardIds) {
    if (id !== originId) deleteDesignSessionKey(id);
  }
  const originName = group.boardNames?.[originId]?.trim();
  const next: DesignVariantGroup = {
    ...group,
    boardIds: [originId],
    activeDesignId: originId,
    boardNames: originName ? { [originId]: originName } : undefined,
    updatedAt: Date.now(),
  };
  saveVariantGroup(next);
  return next;
}

/** Set or clear a board's custom display name. Does not persist — caller should save. */
export function withBoardName(
  group: DesignVariantGroup,
  designId: string,
  name: string | undefined,
): DesignVariantGroup {
  if (!group.boardIds.includes(designId)) return group;
  const previous = group.boardNames?.[designId];
  const normalized = name === undefined ? undefined : normalizeArtboardName(name);
  if ((previous ?? undefined) === normalized) return group;
  const boardNames = { ...(group.boardNames ?? {}) };
  if (normalized) {
    boardNames[designId] = normalized;
  } else {
    delete boardNames[designId];
  }
  return {
    ...group,
    boardNames: Object.keys(boardNames).length > 0 ? boardNames : undefined,
    updatedAt: Date.now(),
  };
}

import { BRAND_LOGO_VARIANTS, getLogoRecord } from "@/lib/brand/logoVariants";
import { deleteLogoBlob } from "@/lib/brand/storage";
import {
  designSessionStorageKey,
  loadDesignSession,
  saveDesignSession,
} from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { deleteFeaturedImageBlob } from "@/lib/social-tool/featuredBlock";
import {
  captureDesignThumbnail,
  deleteDesignThumbnail,
  thumbnailBlobKey,
} from "@/lib/design/thumbnail";
import {
  collectNonOriginBoardIds,
  findVariantGroupForBoard,
  isNonOriginVariantBoard,
  removeBoardFromGroup,
  saveVariantGroup,
  variantGroupStorageKey,
} from "@/lib/design/variantGroup";
import {
  readDesignIndex,
  removeDesignIndexEntry,
  upsertDesignIndexEntry,
  writeDesignIndex,
} from "./indexStorage";
import {
  isMeaningfulSession,
  sessionToSummary,
} from "./summary";
import type { DesignRepository, DesignSummary } from "./types";

const SESSION_KEY_PREFIX = "postforge:design:";
const DESIGN_PATTERN_KEY_PREFIX = "postforge:patterns:design:";

let migrationDone = false;

function scanLocalDesignSessions(): DesignSummary[] {
  if (typeof window === "undefined") return [];

  const variantBoardIds = collectNonOriginBoardIds();
  const summaries: DesignSummary[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SESSION_KEY_PREFIX)) continue;
    if (key === "postforge:design-index") continue;

    const designId = key.slice(SESSION_KEY_PREFIX.length);
    if (!designId || variantBoardIds.has(designId)) continue;

    try {
      const session = loadDesignSession(designId);
      if (!isMeaningfulSession(session)) continue;
      summaries.push(
        sessionToSummary(session, session.updatedAt, thumbnailBlobKey(designId)),
      );
    } catch {
      // Skip corrupt sessions during migration.
    }
  }

  return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Drop stray variant-board cards from the index (one file per origin). */
function pruneVariantBoardsFromIndex(entries: DesignSummary[]): DesignSummary[] {
  const variantBoardIds = collectNonOriginBoardIds();
  if (variantBoardIds.size === 0) return entries;

  const next = entries.filter((entry) => !variantBoardIds.has(entry.id));
  if (next.length !== entries.length) {
    writeDesignIndex(next);
  }
  return next;
}

function ensureMigratedIndex(): DesignSummary[] {
  if (migrationDone) {
    return pruneVariantBoardsFromIndex(readDesignIndex());
  }

  const existing = readDesignIndex();
  if (existing.length > 0) {
    migrationDone = true;
    return pruneVariantBoardsFromIndex(existing);
  }

  const migrated = scanLocalDesignSessions();
  if (migrated.length > 0) {
    writeDesignIndex(migrated);
  }
  migrationDone = true;
  return migrated;
}

async function deleteSessionBlobs(session: DesignSessionPersisted): Promise<void> {
  const { designId, brand, featured } = session;

  for (const variant of BRAND_LOGO_VARIANTS) {
    const record = getLogoRecord(brand, variant);
    if (record?.blobKey) {
      await deleteLogoBlob(record.blobKey);
    }
  }

  if (featured.image?.blobKey) {
    await deleteFeaturedImageBlob(featured.image.blobKey);
  }

  await deleteDesignThumbnail(designId);
}

function removeDesignPatterns(designId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${DESIGN_PATTERN_KEY_PREFIX}${designId}`);
}

export class LocalDesignRepository implements DesignRepository {
  async list(): Promise<DesignSummary[]> {
    return ensureMigratedIndex();
  }

  async get(id: string): Promise<DesignSessionPersisted | null> {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(designSessionStorageKey(id));
    if (!raw) return null;
    return loadDesignSession(id);
  }

  async upsert(session: DesignSessionPersisted): Promise<DesignSummary | null> {
    if (typeof window === "undefined") return null;
    if (!isMeaningfulSession(session)) return null;

    saveDesignSession(session);

    // Variant artboards share one dashboard card keyed by the origin design.
    if (isNonOriginVariantBoard(session.designId)) {
      removeDesignIndexEntry(session.designId);
      const group = findVariantGroupForBoard(session.designId);
      const originId = group?.originDesignId;
      if (!originId) return null;

      const originSession = loadDesignSession(originId);
      if (!isMeaningfulSession(originSession)) return null;

      const existing = readDesignIndex().find((item) => item.id === originId);
      const createdAt = existing?.createdAt ?? Date.now();
      const bumped: DesignSessionPersisted = {
        ...originSession,
        updatedAt: Math.max(originSession.updatedAt ?? 0, session.updatedAt ?? 0, Date.now()),
      };
      saveDesignSession(bumped);
      const summary = sessionToSummary(
        bumped,
        createdAt,
        thumbnailBlobKey(originId),
      );
      upsertDesignIndexEntry(summary);
      return summary;
    }

    const existing = readDesignIndex().find((item) => item.id === session.designId);
    const createdAt = existing?.createdAt ?? Date.now();
    const thumbnailKey = thumbnailBlobKey(session.designId);

    const summary = sessionToSummary(session, createdAt, thumbnailKey);
    upsertDesignIndexEntry(summary);
    return summary;
  }

  async delete(id: string): Promise<void> {
    if (typeof window === "undefined") return;

    const group = findVariantGroupForBoard(id);
    const boardIds = group
      ? [...new Set(group.boardIds)]
      : [id];
    const originId = group?.originDesignId ?? id;

    for (const boardId of boardIds) {
      const session = await this.get(boardId);
      if (session) {
        await deleteSessionBlobs(session);
      } else {
        await deleteDesignThumbnail(boardId);
      }
      localStorage.removeItem(designSessionStorageKey(boardId));
      removeDesignPatterns(boardId);
      removeDesignIndexEntry(boardId);
    }

    localStorage.removeItem(variantGroupStorageKey(originId));
  }

  async deleteVariantBoard(boardId: string): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const group = findVariantGroupForBoard(boardId);
    if (!group) return null;

    const nextGroup = removeBoardFromGroup(group, boardId);
    if (!nextGroup) return null;

    const session = await this.get(boardId);
    if (session) {
      await deleteSessionBlobs(session);
    } else {
      await deleteDesignThumbnail(boardId);
    }

    localStorage.removeItem(designSessionStorageKey(boardId));
    removeDesignPatterns(boardId);
    saveVariantGroup(nextGroup);

    return nextGroup.activeDesignId;
  }

  async captureThumbnail(id: string, node: HTMLElement): Promise<void> {
    const group = findVariantGroupForBoard(id);
    const indexId =
      group && group.originDesignId !== id ? group.originDesignId : id;

    const session = await this.get(indexId);
    if (!session) return;

    await captureDesignThumbnail(indexId, node, session.document.platformId);

    const existing = readDesignIndex().find((item) => item.id === indexId);
    if (existing) {
      upsertDesignIndexEntry({
        ...existing,
        thumbnailKey: thumbnailBlobKey(indexId),
        updatedAt: existing.updatedAt,
      });
    }
  }
}

export const designRepository: DesignRepository = new LocalDesignRepository();

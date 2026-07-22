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

  const summaries: DesignSummary[] = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(SESSION_KEY_PREFIX)) continue;
    if (key === "postforge:design-index") continue;

    const designId = key.slice(SESSION_KEY_PREFIX.length);
    if (!designId) continue;

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

function ensureMigratedIndex(): DesignSummary[] {
  if (migrationDone) return readDesignIndex();

  const existing = readDesignIndex();
  if (existing.length > 0) {
    migrationDone = true;
    return existing;
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

  if (brand.logo?.blobKey) {
    await deleteLogoBlob(brand.logo.blobKey);
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

    const existing = readDesignIndex().find((item) => item.id === session.designId);
    const createdAt = existing?.createdAt ?? Date.now();
    const thumbnailKey = thumbnailBlobKey(session.designId);

    const summary = sessionToSummary(session, createdAt, thumbnailKey);
    upsertDesignIndexEntry(summary);
    return summary;
  }

  async delete(id: string): Promise<void> {
    if (typeof window === "undefined") return;

    const session = await this.get(id);
    if (session) {
      await deleteSessionBlobs(session);
    } else {
      await deleteDesignThumbnail(id);
    }

    localStorage.removeItem(designSessionStorageKey(id));
    removeDesignPatterns(id);
    removeDesignIndexEntry(id);
  }

  async captureThumbnail(id: string, node: HTMLElement): Promise<void> {
    const session = await this.get(id);
    if (!session) return;

    await captureDesignThumbnail(id, node, session.document.platformId);

    const existing = readDesignIndex().find((item) => item.id === id);
    if (existing) {
      upsertDesignIndexEntry({
        ...existing,
        thumbnailKey: thumbnailBlobKey(id),
        updatedAt: existing.updatedAt,
      });
    }
  }
}

export const designRepository: DesignRepository = new LocalDesignRepository();

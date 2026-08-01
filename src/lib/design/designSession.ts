import type { UIMessage } from "ai";
import { defaultKit } from "@/lib/brand/storage";
import { normalizeBrandKit } from "@/lib/brand/logoVariants";
import { DEFAULT_FEATURED_TRANSFORM } from "@/lib/social-tool/featuredTransform";
import {
  DEFAULT_POST_LAYOUT_SPACING,
} from "@/lib/social-tool/layoutSpacing";
import {
  DEFAULT_POST_LAYOUT_ID,
} from "@/lib/social-tool/postLayouts";
import { defaultFeaturedBlock, normalizeFeaturedPersisted } from "@/lib/social-tool/featuredBlock";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import { DEFAULT_PATTERN_REF } from "@/lib/social-tool/patterns/types";
import { migratePatternRef } from "@/lib/social-tool/patterns/migratePatternRef";
import type { PostCopy } from "@/lib/social-tool/presets";
import type {
  DesignDocument,
  DesignSessionPersisted,
} from "@/lib/design/types";
import { migrateDocumentV1ToV2 } from "@/lib/social-tool/layoutAdapter";
import { migrateFeaturedSlotBlockIds } from "@/lib/social-tool/featuredSlots";
import {
  deleteCachedSession,
  peekCachedSession,
  readChatFromIdb,
  readSessionFromIdb,
  setCachedSession,
  writeChatToIdb,
  writeSessionToIdb,
} from "@/lib/design/sessionIdb";

export const EMPTY_POST_COPY: PostCopy = {
  heading: "",
  subheading: "",
  extraFields: [],
};

export function designSessionStorageKey(designId: string): string {
  return `postforge:design:${designId}`;
}

export function scopedBlobKey(
  designId: string,
  kind: "logo" | "featured",
  recordId: string,
): string {
  return `${designId}:${kind}:${recordId}`;
}

export function createBlankDocument(): DesignDocument {
  const base = migrateDocumentV1ToV2({
    version: 1,
    templateId: "product-shot",
    platformId: "linkedin-square",
    theme: "dark",
    layoutId: DEFAULT_POST_LAYOUT_ID,
    layoutSpacing: { ...DEFAULT_POST_LAYOUT_SPACING },
    copy: { ...EMPTY_POST_COPY, extraFields: [] },
    pattern: DEFAULT_PATTERN_REF,
    patternOpacity: 0.28,
    patternScale: 1,
    patternAnimated: false,
    showPattern: false,
    showBackground: true,
    typeScale: 1,
    logoScale: 1,
    logoAlign: "left",
    logoPlacement: "top",
    showBrand: true,
    showContent: false,
    showFeaturedImage: false,
    textAlign: "center",
    headingFont: "sans",
    subFont: "sans",
    featuredTransform: { ...DEFAULT_FEATURED_TRANSFORM },
    logoBackdrop: false,
    logoInvert: false,
    textContrastBoost: false,
    onboarding: {
      phase: "needsLogo",
      briefSkipped: false,
    },
    canvasShapes: [],
    canvasIcons: [],
  });
  return base;
}

export function createBlankSession(designId: string): DesignSessionPersisted {
  return {
    designId,
    updatedAt: Date.now(),
    brand: defaultKit(),
    featured: defaultFeaturedBlock(),
    document: createBlankDocument(),
  };
}

function normalizeDocument(
  raw: Partial<DesignDocument> | undefined,
  featured?: FeaturedBlockPersisted,
): DesignDocument {
  const blank = createBlankDocument();
  if (!raw) return blank;
  const merged: DesignDocument = {
    ...blank,
    ...raw,
    version: raw.version === 2 ? 2 : 1,
      copy: {
        ...EMPTY_POST_COPY,
        ...raw.copy,
        extraFields: raw.copy?.extraFields ?? [],
      },
      copyVariants: raw.copyVariants,
      copyVariantIndex: raw.copyVariantIndex ?? 0,
      layoutSpacing: {
      ...DEFAULT_POST_LAYOUT_SPACING,
      ...raw.layoutSpacing,
    },
    featuredTransform: {
      ...DEFAULT_FEATURED_TRANSFORM,
      ...raw.featuredTransform,
    },
    onboarding: {
      phase: raw.onboarding?.phase ?? blank.onboarding.phase,
      briefSkipped: raw.onboarding?.briefSkipped ?? false,
    },
    pattern: migratePatternRef(
      typeof raw.pattern === "string" ? raw.pattern : undefined,
    ),
    canvasShapes: Array.isArray(raw.canvasShapes) ? raw.canvasShapes : [],
    canvasIcons: Array.isArray(raw.canvasIcons) ? raw.canvasIcons : [],
  };
  return migrateDocumentV1ToV2(merged, featured);
}

function normalizeBriefChatMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (message): message is UIMessage =>
      message != null &&
      typeof message === "object" &&
      typeof (message as UIMessage).id === "string" &&
      ((message as UIMessage).role === "user" ||
        (message as UIMessage).role === "assistant" ||
        (message as UIMessage).role === "system"),
  );
}

function normalizeLoadedSession(
  designId: string,
  parsed: DesignSessionPersisted,
): DesignSessionPersisted {
  const featured = normalizeFeaturedPersisted(parsed.featured);
  const document = normalizeDocument(parsed.document, featured);
  return {
    designId,
    updatedAt: parsed.updatedAt ?? Date.now(),
    brand: normalizeBrandKit(parsed.brand),
    featured,
    document: {
      ...document,
      featuredSlots: migrateFeaturedSlotBlockIds(
        document.featuredSlots,
        featured.activeBlockId,
      ),
    },
    briefChatMessages: normalizeBriefChatMessages(parsed.briefChatMessages),
  };
}

function readLegacyLocalStorageSession(
  designId: string,
): DesignSessionPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(designSessionStorageKey(designId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DesignSessionPersisted;
    return normalizeLoadedSession(designId, parsed);
  } catch {
    return null;
  }
}

function writeLegacyLocalStorageSession(session: DesignSessionPersisted): void {
  if (typeof window === "undefined") return;
  const { briefChatMessages: _chat, ...body } = session;
  localStorage.setItem(
    designSessionStorageKey(session.designId),
    JSON.stringify({ ...body, updatedAt: Date.now() }),
  );
}

function removeLegacyLocalStorageSession(designId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(designSessionStorageKey(designId));
}

function warnPersistFailure(designId: string, err: unknown): void {
  console.warn(`[postforge] failed to persist design session ${designId}`, err);
}

/** Sync read — returns cache, legacy localStorage, or blank. Prefer ensureDesignSessionLoaded for IDB. */
export function loadDesignSession(designId: string): DesignSessionPersisted {
  const cached = peekCachedSession(designId);
  if (cached) return cached;

  const legacy = readLegacyLocalStorageSession(designId);
  if (legacy) {
    setCachedSession(legacy);
    void migrateLegacySession(legacy);
    return legacy;
  }

  return createBlankSession(designId);
}

/** Load from IndexedDB (with legacy migration). Use on editor mount and board preload. */
export async function ensureDesignSessionLoaded(
  designId: string,
): Promise<DesignSessionPersisted> {
  const result = await ensureDesignSessionLoadedWithMeta(designId);
  return result.session;
}

export async function ensureDesignSessionLoadedWithMeta(
  designId: string,
): Promise<{ session: DesignSessionPersisted; existed: boolean }> {
  const cached = peekCachedSession(designId);
  if (cached) return { session: cached, existed: true };

  const fromIdb = await readSessionFromIdb(designId);
  if (fromIdb) return { session: fromIdb, existed: true };

  const legacy = readLegacyLocalStorageSession(designId);
  if (legacy) {
    await migrateLegacySession(legacy);
    return { session: legacy, existed: true };
  }

  const blank = createBlankSession(designId);
  setCachedSession(blank);
  return { session: blank, existed: false };
}

async function migrateLegacySession(session: DesignSessionPersisted): Promise<void> {
  setCachedSession(session);
  removeLegacyLocalStorageSession(session.designId);
  try {
    await writeSessionToIdb(session);
    if (session.briefChatMessages?.length) {
      await writeChatToIdb(session.designId, session.briefChatMessages);
    }
  } catch (err) {
    warnPersistFailure(session.designId, err);
    try {
      writeLegacyLocalStorageSession(session);
    } catch (legacyErr) {
      warnPersistFailure(session.designId, legacyErr);
    }
  }
}

export function hasStoredDesignSession(designId: string): boolean {
  if (typeof window === "undefined") return false;
  if (peekCachedSession(designId)) return true;
  return localStorage.getItem(designSessionStorageKey(designId)) != null;
}

export function saveDesignSession(session: DesignSessionPersisted): void {
  if (typeof window === "undefined") return;

  const next: DesignSessionPersisted = {
    ...session,
    updatedAt: Date.now(),
  };
  setCachedSession(next);

  void (async () => {
    try {
      await writeSessionToIdb(next);
      removeLegacyLocalStorageSession(next.designId);
    } catch (err) {
      warnPersistFailure(next.designId, err);
      try {
        writeLegacyLocalStorageSession(next);
      } catch (legacyErr) {
        warnPersistFailure(next.designId, legacyErr);
      }
    }
  })();
}

export function loadBriefChatMessages(designId: string): UIMessage[] {
  const cached = peekCachedSession(designId);
  if (cached?.briefChatMessages?.length) {
    return cached.briefChatMessages;
  }
  return [];
}

export async function ensureBriefChatMessagesLoaded(
  designId: string,
): Promise<UIMessage[]> {
  const cached = peekCachedSession(designId);
  if (cached?.briefChatMessages?.length) {
    return cached.briefChatMessages;
  }

  const legacy = readLegacyLocalStorageSession(designId);
  if (legacy?.briefChatMessages?.length) {
    setCachedSession(legacy);
    return legacy.briefChatMessages;
  }

  const messages = await readChatFromIdb(designId);
  if (messages.length > 0 && cached) {
    setCachedSession({ ...cached, briefChatMessages: messages });
  }
  return messages;
}

export function saveBriefChatMessages(
  designId: string,
  messages: UIMessage[],
): void {
  if (typeof window === "undefined") return;

  const cached = peekCachedSession(designId) ?? loadDesignSession(designId);
  setCachedSession({ ...cached, briefChatMessages: messages });

  void (async () => {
    try {
      await writeChatToIdb(designId, messages);
      await writeSessionToIdb({ ...cached, briefChatMessages: undefined });
      removeLegacyLocalStorageSession(designId);
    } catch (err) {
      warnPersistFailure(designId, err);
      try {
        writeLegacyLocalStorageSession({ ...cached, briefChatMessages: messages });
      } catch (legacyErr) {
        warnPersistFailure(designId, legacyErr);
      }
    }
  })();
}

export function deleteDesignSessionStorage(designId: string): void {
  if (typeof window === "undefined") return;
  removeLegacyLocalStorageSession(designId);
  deleteCachedSession(designId);
  void import("@/lib/design/sessionIdb").then(({ deleteSessionFromIdb }) =>
    deleteSessionFromIdb(designId).catch((err) => {
      warnPersistFailure(designId, err);
    }),
  );
}

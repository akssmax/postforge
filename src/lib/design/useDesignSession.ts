"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FEATURED_TRANSFORM } from "@/lib/social-tool/featuredTransform";
import {
  buildBackgroundPresets,
  buildGradientBackgroundPresets,
  buildSolidBackgroundPresets,
  getActiveBackgroundPreset,
} from "@/lib/brand/backgroundPresets";
import { suggestHarmonySwatches } from "@/lib/brand/colorHarmony";
import {
  extractColorsFromImageBlob,
  extractColorsFromSvgMarkup,
} from "@/lib/brand/extractColors";
import {
  fixLogoSvgContrast as applyLogoSvgContrastFix,
  restoreLogoSvgOriginal,
  withLogoSvgOriginal,
} from "@/lib/brand/logoContrastFix";
import { resolveLayoutHierarchy } from "@/lib/social-tool/layoutHierarchy";
import { adaptSessionToPlatform } from "@/lib/social-tool/adaptPlatformChange";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import {
  catalogLayoutToDynamic,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import { getPlatform } from "@/lib/social-tool/presets";
import {
  resolveVisualBlockDimensions,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import {
  getLogoRecord,
  kitHasAnyLogo,
  setLogoInKit,
  syncPrimaryAlias,
} from "@/lib/brand/logoVariants";
import { parseLogoFile } from "@/lib/brand/parseLogoFile";
import {
  createLogoRecord,
  defaultKit,
  deleteLogoBlob,
  hydrateAllLogoSrcs,
  logoBlobKey,
  resolveLogoSrc,
  saveLogoBlob,
} from "@/lib/brand/storage";
import type {
  BrandColors,
  BrandKitPersisted,
  BrandKitRuntime,
  BrandLogoVariant,
} from "@/lib/brand/types";
import {
  createBlankSession,
  ensureDesignSessionLoaded,
  ensureDesignSessionLoadedWithMeta,
  loadDesignSession,
  saveDesignSession,
  scopedBlobKey,
} from "@/lib/design/designSession";
import { designRepository, isMeaningfulSession } from "@/lib/design/repository";
import { seedShufflePreferencesAllOn } from "@/lib/social-tool/shufflePreferences";
import type {
  DesignDocument,
  DesignOnboardingPhase,
  DesignSessionPersisted,
} from "@/lib/design/types";
import {
  defaultBackgroundPresetIdForColors,
  pickStarterPalette,
} from "@/lib/brand/starterPalettes";
import { artifactWantsLogoPlaceholderById } from "@/lib/design-engine/artifactRules";
import {
  createFeaturedImageRecord,
  defaultFeaturedBlock,
  deleteFeaturedImageBlob,
  loadFeaturedImageBlob,
  parseFeaturedImageFile,
  resolveFeaturedImageSrc,
  saveFeaturedImageBlob,
  type FeaturedBlockPersisted,
} from "@/lib/social-tool/featuredBlock";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { ProductPageId } from "@/lib/social-tool/presets";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";
import { validatedPlanFromBriefResult } from "@/lib/llm/briefResultAdapter";
import { buildCopyVariantsForBrief } from "@/lib/llm/stages/copyVariantWriter";
import { applyDesignPlanToSession, type DesignPlanApplyOptions } from "@/lib/llm/services/applyDesignPlan";
import { applyCanvasPatchToSession, repairDesignDocument } from "@/lib/llm/services/applyCanvasPatch";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { useDesignHistory } from "@/lib/design/useDesignHistory";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { VisualBlockRecord, VisualBlockGenerateInput } from "@/lib/social-tool/visualBlocks/types";
import { buildVisualPickIntentFromText } from "@/lib/social-tool/visualBlocks/library/scoring";
import { inferFeaturedVisualKind, isFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { FeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";
import {
  FEATURED_PRIMARY_SLOT_ID,
  addFeaturedSlot,
  ensureFeaturedSlots,
  patchFeaturedSlot,
  removeFeaturedSlot,
  reorderFeaturedSlot,
  withAssignedVisualBlock,
} from "@/lib/social-tool/featuredSlots";
import { instantiateShape, type InstantiateShapeOptions } from "@/lib/social-tool/shapes/instantiate";
import {
  canAddCanvasShape,
  patchCanvasShape,
  removeCanvasShape as removeShapeFromList,
  upsertCanvasShape,
} from "@/lib/social-tool/shapes/storage";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type { CanvasIconRecord } from "@/lib/social-tool/icons/types";
import { resolveLayoutHierarchyFromIds } from "@/lib/social-tool/layoutHierarchy";
import { getIconCatalogEntry } from "@/lib/social-tool/icons/catalog";
import { createCanvasIconRecord } from "@/lib/social-tool/icons/instantiate";
import { MAX_CANVAS_ICONS } from "@/lib/social-tool/icons/types";
import { buildFeaturedVisualPickInput } from "@/lib/social-tool/generateDesignVariants";
import { pickShuffleFeaturedVisualBrowser } from "@/lib/social-tool/shuffleFeaturedVisualBrowser";
import {
  activeVisualBlock,
  appendVisualBlocks,
  findVisualBlock,
  upsertVisualBlock,
} from "@/lib/social-tool/visualBlocks/storage";

const PERSIST_DEBOUNCE_MS = 300;

function sessionMediaKey(snapshot: DesignSessionPersisted): string {
  const logos = snapshot.brand.logos;
  return JSON.stringify({
    featuredImageId: snapshot.featured.image?.id ?? null,
    logoIds: Object.fromEntries(
      Object.entries(logos ?? {}).map(([variant, record]) => [
        variant,
        record?.id ?? null,
      ]),
    ),
  });
}

function visualBlockPickPayload(
  session: DesignSessionPersisted,
  input?: {
    headline?: string;
    subheading?: string;
    theme?: string;
    brief?: string;
    preferredKind?: "ui" | "illustration" | "3d";
  },
) {
  const headline = input?.headline ?? session.document.copy.heading;
  const subheading = input?.subheading ?? session.document.copy.subheading;
  const theme = input?.theme ?? headline;
  const brief = input?.brief ?? [headline, subheading, theme].filter(Boolean).join(" ");
  const featuredVisualKind =
    input?.preferredKind ??
    session.document.featuredVisualKind ??
    inferFeaturedVisualKind(brief, {
      artifactCategory: session.document.artifactCategory,
    });

  // Derive semantic pick context from brief (campaign-first block retrieval)
  let semantic: VisualBlockGenerateInput["semantic"];
  try {
    const plan = campaignPlanFromBrief(brief, session.document.platformId);
    const system = retrieveDesignSystem(plan);
    const { recipe, pattern } = resolveRecipe(plan, system);
    semantic = {
      campaignType: plan.campaign.type,
      recipeId: recipe.id,
      patternId: pattern.id,
      designSystemId: system.id,
      contentDensity: plan.communication.contentDensity,
      readingPattern: plan.communication.readingPattern,
      colorMood: plan.visual.colorMood,
      brandTone: plan.brand.tone,
      featuredKind: featuredVisualKind,
      proof: plan.visual.proof,
      platformId: session.document.platformId,
      artifactId: session.document.artifactId,
      artifactCategory: session.document.artifactCategory,
      bundleId: session.document.bundleId,
    };
  } catch {
    semantic = {
      featuredKind: featuredVisualKind,
      platformId: session.document.platformId,
      artifactId: session.document.artifactId,
      artifactCategory: session.document.artifactCategory,
      bundleId: session.document.bundleId,
    };
  }

  return {
    headline,
    subheading,
    theme,
    brief,
    brandColors: {
      primary: session.brand.colors.primary,
      accent: session.brand.colors.accent,
    },
    preferredKind: featuredVisualKind,
    intent: {
      ...buildVisualPickIntentFromText(headline, subheading, theme, brief),
      featuredVisualKind,
    },
    semantic,
  };
}

function withLogoAwareShowBrand(
  document: DesignDocument,
  brand: BrandKitPersisted,
): DesignDocument {
  if (kitHasAnyLogo(brand)) return document;
  if (artifactWantsLogoPlaceholderById(document.artifactId)) return document;
  if (!document.showBrand) return document;
  return { ...document, showBrand: false };
}

export type UseDesignSessionResult = {
  ready: boolean;
  session: DesignSessionPersisted | null;
  document: DesignDocument;
  onboardingPhase: DesignOnboardingPhase;
  kit: BrandKitRuntime;
  backgroundPresets: ReturnType<typeof buildBackgroundPresets>;
  solidBackgroundPresets: ReturnType<typeof buildSolidBackgroundPresets>;
  gradientBackgroundPresets: ReturnType<typeof buildGradientBackgroundPresets>;
  activeBackground: ReturnType<typeof getActiveBackgroundPreset>;
  harmonySwatches: ReturnType<typeof suggestHarmonySwatches>;
  featured: FeaturedBlockPersisted;
  featuredImageSrc: string | null;
  brandUploading: boolean;
  brandError: string | null;
  featuredUploading: boolean;
  featuredError: string | null;
  patchDocument: (
    partial: Partial<DesignDocument>,
    options?: { recordHistory?: boolean },
  ) => void;
  setPlatformId: (platformId: PlatformId) => void;
  changePlatformId: (platformId: PlatformId) => void;
  uploadLogo: (file: File) => Promise<void>;
  uploadLogoVariant: (variant: BrandLogoVariant, file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
  removeLogoVariant: (variant: BrandLogoVariant) => Promise<void>;
  fixLogoSvgContrast: (backgroundCss: string, logoBackdrop: boolean) => void;
  restoreLogoSvg: () => void;
  setColor: (role: keyof BrandColors, hex: string) => void;
  resetColor: (role: keyof BrandColors) => void;
  applySwatch: (hex: string, role: keyof BrandColors) => void;
  setBackgroundPreset: (id: string | null) => void;
  setFeaturedMode: (mode: FeaturedBlockMode) => void;
  setFeaturedProductPage: (productPage: ProductPageId) => void;
  applyBriefGeneration: (result: BriefGenerationResult) => void;
  applyDesignPlan: (plan: ValidatedDesignPlan, options?: DesignPlanApplyOptions) => void;
  applyCanvasPatch: (patch: CanvasPatchResult) => boolean;
  uploadFeaturedImage: (file: File, slotId?: string) => Promise<void>;
  applyUnsplashPhoto: (
    photo: {
      id: string;
      url: string;
      photographer: string;
      attribution: string;
      downloadUrl?: string;
    },
    slotId?: string,
  ) => void;
  removeFeaturedImage: (slotId?: string) => Promise<void>;
  generateVisualBlocks: (input?: {
    theme?: string;
    brief?: string;
    source?: "library" | "generate";
    libraryIds?: string[];
    pickFeatured?: boolean;
    preferredKind?: "ui" | "illustration" | "3d";
    slotId?: string;
  }) => Promise<void>;
  selectVisualBlock: (blockId: string, slotId?: string) => void;
  modifyVisualBlock: (blockId: string, instruction: string) => Promise<void>;
  shuffleFeaturedVisualBlock: (copy?: {
    headline?: string;
    subheading?: string;
    preferredKind?: "ui" | "illustration" | "3d";
    slotId?: string;
  }) => Promise<void>;
  addFeaturedVisualSlot: () => string | null;
  removeFeaturedVisualSlot: (slotId: string) => void;
  reorderFeaturedVisualSlots: (
    slotId: string,
    direction: "left" | "right",
  ) => void;
  addCanvasShape: (libraryId: string, options?: InstantiateShapeOptions) => string | null;
  updateCanvasShape: (id: string, patch: Partial<CanvasShapeRecord>) => void;
  removeCanvasShape: (id: string) => void;
  setCanvasShapes: (shapes: CanvasShapeRecord[]) => void;
  addCanvasIcon: (iconName: string) => string | null;
  updateCanvasIcon: (id: string, patch: Partial<CanvasIconRecord>) => void;
  removeCanvasIcon: (id: string) => void;
  setCanvasIcons: (icons: CanvasIconRecord[]) => void;
  generatingVisualBlocks: boolean;
  advanceOnboarding: (phase: DesignOnboardingPhase) => void;
  skipLogo: () => void;
  skipBrief: () => void;
  /** Replace the in-memory session from a board snapshot (multi-artboard shuffle). */
  adoptSession: (next: DesignSessionPersisted) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  /** True briefly when a new edit exceeds the 11-step undo cap. */
  historyLimitToast: boolean;
  beginHistoryCoalesce: (key: string) => void;
  endHistoryCoalesce: (key?: string) => void;
  /** Active history coalesce key, or null when not coalescing. */
  getActiveCoalesceKey: () => string | null;
};

export type UseDesignSessionOptions = {
  /**
   * Prefer this in-memory snapshot when `designId` matches (multi-artboard cache).
   * Read via ref so board switches don't re-init on every sync.
   */
  getSeedSession?: () => DesignSessionPersisted | null | undefined;
};

export function useDesignSession(
  designId: string,
  options?: UseDesignSessionOptions,
): UseDesignSessionResult {
  const [session, setSession] = useState<DesignSessionPersisted | null>(null);
  const [ready, setReady] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoSrcs, setLogoSrcs] = useState<
    Partial<Record<BrandLogoVariant, string | null>>
  >({});
  const [featuredImageSrc, setFeaturedImageSrc] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [generatingVisualBlocks, setGeneratingVisualBlocks] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuredBlobUrlRef = useRef<string | null>(null);
  const logoBlobUrlsRef = useRef<string[]>([]);
  const sessionRef = useRef<DesignSessionPersisted | null>(null);
  const lastHydratedMediaRef = useRef<string>("");
  const getSeedSessionRef = useRef(options?.getSeedSession);
  getSeedSessionRef.current = options?.getSeedSession;
  const {
    canUndo,
    canRedo,
    historyLimitToast,
    pushBeforeChange,
    beginCoalesce,
    endCoalesce,
    getActiveCoalesceKey,
    undo: popUndo,
    redo: popRedo,
    runWithoutRecording,
  } = useDesignHistory(designId);

  const revokeLogoBlob = useCallback(() => {
    for (const url of logoBlobUrlsRef.current) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    logoBlobUrlsRef.current = [];
  }, []);

  const revokeFeaturedBlob = useCallback(() => {
    if (featuredBlobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(featuredBlobUrlRef.current);
    }
    featuredBlobUrlRef.current = null;
  }, []);

  const hydrateBrandLogos = useCallback(
    async (brand: BrandKitPersisted) => {
      revokeLogoBlob();
      const srcs = await hydrateAllLogoSrcs(brand);
      logoBlobUrlsRef.current = Object.values(srcs).filter(
        (src): src is string => !!src?.startsWith("blob:"),
      );
      setLogoSrcs(srcs);
      setLogoSrc(srcs.primary ?? null);
    },
    [revokeLogoBlob],
  );

  const flushPersist = useCallback((next: DesignSessionPersisted) => {
    if (persistTimer.current) {
      clearTimeout(persistTimer.current);
      persistTimer.current = null;
    }
    // Meaningful sessions: upsert persists session + index (avoid double saveDesignSession).
    if (isMeaningfulSession(next)) {
      void designRepository.upsert(next).catch((err) => {
        console.warn("[postforge] design index upsert failed", err);
      });
      return;
    }
    saveDesignSession(next);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Flush the board we're leaving so featured/shuffle edits aren't lost
    const previous = sessionRef.current;
    if (previous && previous.designId !== designId) {
      flushPersist(previous);
    }

    // Important: do NOT setReady(false) on board switches. Unmounting the
    // workspace tears down artboards mid-activate and breaks switcher + pan.
    async function init() {
      try {
        const seed = getSeedSessionRef.current?.();
        const { session: loaded, existed: hadStoredSession } =
          seed?.designId === designId
            ? { session: seed, existed: true }
            : await ensureDesignSessionLoadedWithMeta(designId);
        const next = {
          ...loaded,
          designId,
          document: repairDesignDocument(loaded.document),
        };
        // First visit to a new design: enable every shuffle toggle by default.
        if (!hadStoredSession && seed?.designId !== designId) {
          seedShufflePreferencesAllOn(designId);
        }
        // Keep storage aligned with the hydrated snapshot
        saveDesignSession(next);

        // Apply in-memory seed immediately so the active artboard's live
        // session matches without waiting on logo/featured hydrate.
        if (seed?.designId === designId) {
          sessionRef.current = next;
          setSession(next);
        }

        const srcs = await hydrateAllLogoSrcs(next.brand);

        let resolvedFeatured: string | null = null;
        const unsplashSlot = next.document.featuredSlots?.find(
          (slot) => slot.imageSource === "unsplash" && slot.unsplash?.url,
        );
        if (unsplashSlot?.unsplash?.url) {
          resolvedFeatured = unsplashSlot.unsplash.url;
        } else if (next.featured.image) {
          resolvedFeatured = await resolveFeaturedImageSrc(next.featured.image);
          if (resolvedFeatured?.startsWith("blob:")) {
            featuredBlobUrlRef.current = resolvedFeatured;
          }
        }

        if (cancelled) return;

        logoBlobUrlsRef.current = Object.values(srcs).filter(
          (src): src is string => !!src?.startsWith("blob:"),
        );
        sessionRef.current = next;
        setSession(next);
        setLogoSrcs(srcs);
        setLogoSrc(srcs.primary ?? null);
        setFeaturedImageSrc(resolvedFeatured);
        setReady(true);
      } catch (err) {
        console.error("[postforge] design session init failed", err);
        if (cancelled) return;
        const fallback = createBlankSession(designId);
        sessionRef.current = fallback;
        setSession(fallback);
        setReady(true);
      }
    }

    void init();
    return () => {
      cancelled = true;
      revokeLogoBlob();
      revokeFeaturedBlob();
    };
  }, [designId, flushPersist, revokeFeaturedBlob, revokeLogoBlob]);

  const schedulePersist = useCallback((next: DesignSessionPersisted) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      flushPersist(next);
    }, PERSIST_DEBOUNCE_MS);
  }, [flushPersist]);

  const hydrateSessionMedia = useCallback(async (snapshot: DesignSessionPersisted) => {
    const srcs = await hydrateAllLogoSrcs(snapshot.brand);
    setLogoSrcs(srcs);
    setLogoSrc(srcs.primary ?? null);
    if (snapshot.featured.image) {
      const src = await resolveFeaturedImageSrc(snapshot.featured.image);
      setFeaturedImageSrc(src);
    } else {
      setFeaturedImageSrc(null);
    }
  }, []);

  const applySessionSnapshot = useCallback(
    (next: DesignSessionPersisted, options?: { persistImmediate?: boolean }) => {
      const snapshot = {
        ...next,
        designId,
        document: repairDesignDocument(next.document),
        updatedAt: Date.now(),
      };
      sessionRef.current = snapshot;
      if (options?.persistImmediate) {
        flushPersist(snapshot);
      } else {
        schedulePersist(snapshot);
      }
      setSession(snapshot);
      const mediaKey = sessionMediaKey(snapshot);
      if (mediaKey !== lastHydratedMediaRef.current) {
        lastHydratedMediaRef.current = mediaKey;
        void hydrateSessionMedia(snapshot);
      }
      return snapshot;
    },
    [designId, flushPersist, hydrateSessionMedia, schedulePersist],
  );

  const updateSession = useCallback(
    (
      updater: (prev: DesignSessionPersisted) => DesignSessionPersisted,
      options?: { recordHistory?: boolean },
    ) => {
      const prev = sessionRef.current;
      if (!prev || prev.designId !== designId) return;
      const next = updater(prev);
      if (next === prev) return;
      if (options?.recordHistory !== false) {
        pushBeforeChange(prev);
      }
      sessionRef.current = next;
      schedulePersist(next);
      setSession(next);
    },
    [designId, pushBeforeChange, schedulePersist],
  );

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const patchDocument = useCallback(
    (
      partial: Partial<DesignDocument>,
      options?: { recordHistory?: boolean },
    ) => {
      updateSession((prev) => {
        const document = { ...prev.document, ...partial };
        const unchanged = (Object.keys(partial) as (keyof DesignDocument)[]).every(
          (key) => prev.document[key] === document[key],
        );
        if (unchanged) return prev;
        return {
          ...prev,
          document,
          updatedAt: Date.now(),
        };
      }, options);
    },
    [updateSession],
  );

  const adoptSession = useCallback(
    (next: DesignSessionPersisted) => {
      if (next.designId !== designId) return;
      const prev = sessionRef.current;
      if (prev && prev.designId === designId) pushBeforeChange(prev);
      applySessionSnapshot(next, { persistImmediate: true });
    },
    [applySessionSnapshot, designId, pushBeforeChange],
  );

  const undo = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.designId !== designId) return false;
    const previous = popUndo(current);
    if (!previous) return false;
    runWithoutRecording(() => {
      applySessionSnapshot(previous, { persistImmediate: true });
    });
    return true;
  }, [applySessionSnapshot, designId, popUndo, runWithoutRecording]);

  const redo = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.designId !== designId) return false;
    const next = popRedo(current);
    if (!next) return false;
    runWithoutRecording(() => {
      applySessionSnapshot(next, { persistImmediate: true });
    });
    return true;
  }, [applySessionSnapshot, designId, popRedo, runWithoutRecording]);

  const setPlatformId = useCallback(
    (platformId: PlatformId) => patchDocument({ platformId }),
    [patchDocument],
  );

  const changePlatformId = useCallback(
    (platformId: PlatformId) => {
      updateSession((prev) => {
        if (prev.document.platformId === platformId) return prev;
        return adaptSessionToPlatform(prev, platformId);
      });
    },
    [updateSession],
  );

  const advanceOnboarding = useCallback(
    (phase: DesignOnboardingPhase) => {
      updateSession((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          onboarding: {
            phase,
            briefSkipped:
              phase === "ready"
                ? prev.document.onboarding.briefSkipped
                : prev.document.onboarding.briefSkipped,
          },
        },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const skipLogo = useCallback(() => {
    const palette = pickStarterPalette({ seed: designId });
    updateSession((prev) => ({
      ...prev,
      brand: {
        ...prev.brand,
        colors: palette.colors,
        activeBackgroundPresetId: defaultBackgroundPresetIdForColors(palette.colors),
      },
      document: {
        ...prev.document,
        onboarding: { phase: "needsBrief", briefSkipped: false },
        showContent: true,
        showBrand: false,
      },
      updatedAt: Date.now(),
    }));
  }, [designId, updateSession]);

  const skipBrief = useCallback(() => {
    patchDocument({
      onboarding: { phase: "ready", briefSkipped: true },
      showContent: true,
      showFeaturedImage: true,
      showPattern: false,
    });
  }, [patchDocument]);

  const uploadLogoVariant = useCallback(
    async (variant: BrandLogoVariant, file: File) => {
      setBrandUploading(true);
      setBrandError(null);
      try {
        const parsed = await parseLogoFile(file);
        const record = createLogoRecord(parsed, file.name, {
          blobKey:
            parsed.kind === "png" ? logoBlobKey(variant, designId) : undefined,
        });
        const brand = session?.brand ?? defaultKit();
        const previous = getLogoRecord(brand, variant);
        if (previous?.blobKey) await deleteLogoBlob(previous.blobKey);

        if (parsed.kind === "png" && record.blobKey) {
          await saveLogoBlob(record.blobKey, parsed.blob);
        }

        const extractedColors =
          parsed.kind === "svg"
            ? extractColorsFromSvgMarkup(parsed.svgMarkup)
            : await extractColorsFromImageBlob(parsed.blob);

        let nextBrand = syncPrimaryAlias(setLogoInKit(brand, variant, record));
        if (variant === "primary" || !getLogoRecord(brand, "primary")) {
          nextBrand = {
            ...nextBrand,
            colors: extractedColors,
            activeBackgroundPresetId:
              nextBrand.activeBackgroundPresetId ?? "brand-hero",
          };
        }

        await hydrateBrandLogos(nextBrand);

        updateSession((prev) => {
          const enteringBrief =
            prev.document.onboarding.phase === "needsLogo" && variant === "primary";
          const nextPhase: DesignOnboardingPhase = enteringBrief
            ? "needsBrief"
            : prev.document.onboarding.phase;

          return {
            ...prev,
            brand: nextBrand,
            document: {
              ...prev.document,
              showBrand: true,
              ...(enteringBrief ? { showContent: true } : {}),
              onboarding: { ...prev.document.onboarding, phase: nextPhase },
            },
            updatedAt: Date.now(),
          };
        });
      } catch (err) {
        setBrandError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setBrandUploading(false);
      }
    },
    [designId, hydrateBrandLogos, session?.brand, updateSession],
  );

  const uploadLogo = useCallback(
    async (file: File) => {
      await uploadLogoVariant("primary", file);
    },
    [uploadLogoVariant],
  );

  const removeLogoVariant = useCallback(
    async (variant: BrandLogoVariant) => {
      const brand = session?.brand;
      if (!brand) return;
      const previous = getLogoRecord(brand, variant);
      if (previous?.blobKey) await deleteLogoBlob(previous.blobKey);
      const nextBrand = syncPrimaryAlias(setLogoInKit(brand, variant, null));
      await hydrateBrandLogos(nextBrand);
      updateSession((prev) => ({
        ...prev,
        brand: nextBrand,
        document: {
          ...prev.document,
          onboarding: kitHasAnyLogo(nextBrand)
            ? prev.document.onboarding
            : { ...prev.document.onboarding, phase: "needsLogo" },
        },
        updatedAt: Date.now(),
      }));
    },
    [hydrateBrandLogos, session?.brand, updateSession],
  );

  const removeLogo = useCallback(async () => {
    await removeLogoVariant("primary");
  }, [removeLogoVariant]);

  const fixLogoSvgContrast = useCallback(
    (backgroundCss: string, logoBackdrop: boolean, variant: BrandLogoVariant = "primary") => {
      const brand = session?.brand;
      const logo = brand ? getLogoRecord(brand, variant) : null;
      if (!logo?.svgMarkup || !brand) return;
      const base = withLogoSvgOriginal(logo);
      const source = base.svgMarkupOriginal ?? base.svgMarkup;
      if (!source) return;
      const { markup, fixes, usesExplicitColors } = applyLogoSvgContrastFix(
        source,
        backgroundCss,
        { logoBackdrop },
      );
      if (fixes.length === 0) return;
      let nextBrand = syncPrimaryAlias(
        setLogoInKit(brand, variant, {
          ...base,
          svgMarkup: markup,
          usesExplicitColors,
        }),
      );
      if (variant === "primary") {
        nextBrand = { ...nextBrand, colors: extractColorsFromSvgMarkup(markup) };
      }
      void hydrateBrandLogos(nextBrand);
      updateSession((prev) => ({
        ...prev,
        brand: nextBrand,
        document: {
          ...prev.document,
          logoInvert: false,
        },
        updatedAt: Date.now(),
      }));
    },
    [hydrateBrandLogos, session?.brand, updateSession],
  );

  const restoreLogoSvg = useCallback(
    (variant: BrandLogoVariant = "primary") => {
      const brand = session?.brand;
      const logo = brand ? getLogoRecord(brand, variant) : null;
      if (!logo?.svgMarkupOriginal || !brand) return;
      const restored = restoreLogoSvgOriginal(logo);
      let nextBrand = syncPrimaryAlias(setLogoInKit(brand, variant, restored));
      if (variant === "primary" && restored.svgMarkup) {
        nextBrand = {
          ...nextBrand,
          colors: extractColorsFromSvgMarkup(restored.svgMarkup),
        };
      }
      void hydrateBrandLogos(nextBrand);
      updateSession((prev) => ({
        ...prev,
        brand: nextBrand,
        document: {
          ...prev.document,
          logoInvert: false,
        },
        updatedAt: Date.now(),
      }));
    },
    [hydrateBrandLogos, session?.brand, updateSession],
  );

  const setColor = useCallback(
    (role: keyof BrandColors, hex: string) => {
      if (role === "extracted") return;
      updateSession((prev) => ({
        ...prev,
        brand: {
          ...prev.brand,
          colors: { ...prev.brand.colors, [role]: hex },
        },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const resetColor = useCallback(
    (role: keyof BrandColors) => {
      updateSession((prev) => {
        const extracted = prev.brand.colors.extracted?.[role];
        if (!extracted || role === "extracted") return prev;
        return {
          ...prev,
          brand: {
            ...prev.brand,
            colors: { ...prev.brand.colors, [role]: extracted },
          },
          updatedAt: Date.now(),
        };
      });
    },
    [updateSession],
  );

  const applySwatch = useCallback(
    (hex: string, role: keyof BrandColors) => {
      if (role === "extracted") return;
      updateSession((prev) => ({
        ...prev,
        brand: {
          ...prev.brand,
          colors: { ...prev.brand.colors, [role]: hex },
        },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const setBackgroundPreset = useCallback(
    (id: string | null) => {
      updateSession((prev) => ({
        ...prev,
        brand: { ...prev.brand, activeBackgroundPresetId: id },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const setFeaturedMode = useCallback(
    (mode: FeaturedBlockMode) => {
      updateSession((prev) => ({
        ...prev,
        featured: { ...prev.featured, mode },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const setFeaturedProductPage = useCallback(
    (productPage: ProductPageId) => {
      updateSession((prev) => {
        const platform = getPlatform(prev.document.platformId);
        const layout = getPostLayout(prev.document.layoutId);
        const featuredMode =
          prev.featured.mode === "image" && prev.featured.image ? "image" : "genui";
        const featuredTransform = resolveLayoutHierarchy({
          width: platform.width,
          height: platform.height,
          platformId: prev.document.platformId,
          layout,
          copy: prev.document.copy,
          spacing: prev.document.layoutSpacing,
          showLogo: prev.document.showBrand,
          showFeaturedImage: prev.document.showFeaturedImage,
          featuredMode,
          productPage,
        }).featuredTransform;

        return {
          ...prev,
          featured: { ...prev.featured, productPage },
          document: {
            ...prev.document,
            featuredTransform,
          },
          updatedAt: Date.now(),
        };
      });
    },
    [updateSession],
  );

  const composedFeaturedTransform = useCallback(
    (prev: DesignSessionPersisted, activeBlockId: string | null) => {
      const block = activeBlockId
        ? findVisualBlock(prev.featured.visualBlocks ?? [], activeBlockId)
        : null;
      const platform = getPlatform(prev.document.platformId);
      const layout = getPostLayout(prev.document.layoutId);
      const featuredSlotCount = Math.max(
        1,
        (prev.document.featuredSlots ?? []).length,
      );

      return resolveLayoutHierarchy({
        width: platform.width,
        height: platform.height,
        platformId: prev.document.platformId,
        layout,
        copy: prev.document.copy,
        spacing: prev.document.layoutSpacing,
        showLogo: prev.document.showBrand,
        showFeaturedImage: prev.document.showFeaturedImage,
        featuredMode: "composed",
        productPage: prev.featured.productPage,
        visualBlockDimensions: block
          ? resolveVisualBlockDimensions(block)
          : VISUAL_LIBRARY_FRAME,
        featuredSlotCount,
      }).featuredTransform;
    },
    [],
  );

  const syncComposedFeaturedSlots = useCallback(
    (
      prev: DesignSessionPersisted,
      activeBlockId: string | null,
      options?: { slotId?: string },
    ) => {
      const slotId = options?.slotId ?? FEATURED_PRIMARY_SLOT_ID;
      const featuredTransform = composedFeaturedTransform(prev, activeBlockId);

      return {
        ...prev,
        featured: {
          ...prev.featured,
          mode: "composed" as const,
          activeBlockId,
        },
        document: {
          ...prev.document,
          showFeaturedImage: true,
          featuredTransform,
          featuredSlots: patchFeaturedSlot(prev.document.featuredSlots, slotId, {
            mode: "composed",
            visible: true,
            activeBlockId,
            transform: featuredTransform,
          }),
        },
        updatedAt: Date.now(),
      };
    },
    [composedFeaturedTransform],
  );

  const applyDesignPlan = useCallback(
    (plan: ValidatedDesignPlan, options?: DesignPlanApplyOptions) => {
      const needsFeaturedLibrary =
        !options?.stockPhoto &&
        plan.featuredSlots.some(
          (slot) => slot.visible && slot.mode === "composed",
        );
      const featuredVisualKind = inferFeaturedVisualKind(
        [plan.copy.heading, plan.copy.subheading, plan.rationale].filter(Boolean).join(" "),
        {
          artifactCategory:
            options?.artifactCategory ?? sessionRef.current?.document.artifactCategory,
        },
      );

      updateSession((prev) => {
        const applied = applyDesignPlanToSession(plan, prev.document, {
          ...options,
          currentBackgroundPresetId: prev.brand.activeBackgroundPresetId,
          designId: options?.designId ?? prev.designId,
          brandColors: options?.brandColors ?? prev.brand.colors,
          existingVisualBlocks: prev.featured.visualBlocks ?? [],
          brief: [plan.copy.heading, plan.copy.subheading, plan.rationale]
            .filter(Boolean)
            .join(" "),
        });
        const document = withLogoAwareShowBrand(
          { ...prev.document, ...applied.document, featuredVisualKind },
          prev.brand,
        );
        if (applied.featuredImageSrc) {
          revokeFeaturedBlob();
          featuredBlobUrlRef.current = applied.featuredImageSrc;
          setFeaturedImageSrc(applied.featuredImageSrc);
        }
        return {
          ...prev,
          brand: applied.brand
            ? { ...prev.brand, ...applied.brand }
            : prev.brand,
          featured: {
            ...prev.featured,
            ...applied.featured,
            image: applied.featuredImageSrc ? null : prev.featured.image,
            visualBlocks:
              applied.visualBlocks ??
              (needsFeaturedLibrary ? [] : prev.featured.visualBlocks),
          },
          document,
          updatedAt: Date.now(),
        };
      });

      if (!needsFeaturedLibrary) return;

      void (async () => {
        const currentSession = sessionRef.current;
        if (!currentSession) return;
        setGeneratingVisualBlocks(true);
        setFeaturedError(null);
        try {
          const response = await fetch("/api/visual-blocks/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...visualBlockPickPayload(currentSession, {
                headline: plan.copy.heading,
                subheading: plan.copy.subheading,
                theme: plan.rationale,
                brief: [plan.copy.heading, plan.copy.subheading, plan.rationale]
                  .filter(Boolean)
                  .join(" "),
                preferredKind: featuredVisualKind,
              }),
              pickFeatured: true,
              source: "library",
            }),
          });
          if (!response.ok) {
            const payload = (await response.json()) as { error?: string };
            throw new Error(payload.error ?? "Featured visual pick failed");
          }
          const payload = (await response.json()) as { blocks: VisualBlockRecord[] };
          const block = payload.blocks[0];
          if (!block) {
            setFeaturedError(
              "No matching visual found in the library. Try Shuffle or browse visuals.",
            );
            return;
          }
          updateSession((prev) =>
            syncComposedFeaturedSlots(
              {
                ...prev,
                featured: {
                  ...prev.featured,
                  visualBlocks: [block],
                },
              },
              block.id,
            ),
          );
        } catch (err) {
          setFeaturedError(
            err instanceof Error ? err.message : "Featured visual pick failed.",
          );
        } finally {
          setGeneratingVisualBlocks(false);
        }
      })();
    },
    [revokeFeaturedBlob, syncComposedFeaturedSlots, updateSession],
  );

  const applyUnsplashPhoto = useCallback(
    (photo: {
      id: string;
      url: string;
      photographer: string;
      attribution: string;
      downloadUrl?: string;
    }, slotId?: string) => {
      if (photo.downloadUrl) {
        void fetch("/api/stock/unsplash/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloadUrl: photo.downloadUrl }),
        });
      }
      revokeFeaturedBlob();
      featuredBlobUrlRef.current = photo.url;
      setFeaturedImageSrc(photo.url);
      updateSession((prev) => {
        const targetSlotId =
          slotId ??
          prev.document.featuredSlots?.find((s) => s.visible)?.slotId ??
          "featured-primary";
        const hierarchy = resolveLayoutHierarchyFromIds({
          platformId: prev.document.platformId,
          layoutId: prev.document.layoutId,
          copy: prev.document.copy,
          spacing: prev.document.layoutSpacing,
          showLogo: prev.document.showBrand,
          showFeaturedImage: true,
          featuredMode: "image",
          productPage: prev.featured.productPage,
          hasUploadedFeaturedImage: true,
        });
        const featuredSlots = (prev.document.featuredSlots ?? []).map((slot) =>
          slot.slotId === targetSlotId
            ? {
                ...slot,
                mode: "image" as const,
                visible: true,
                imageSource: "unsplash" as const,
                unsplash: photo,
                transform: hierarchy.featuredTransform,
              }
            : slot,
        );
        return {
          ...prev,
          featured: {
            ...prev.featured,
            mode: "image",
            image: null,
            slots: (prev.featured.slots ?? []).map((slot) =>
              slot.slotId === targetSlotId
                ? { ...slot, mode: "image" as const, visible: true }
                : slot,
            ),
          },
          document: {
            ...prev.document,
            showFeaturedImage: true,
            featuredTransform: hierarchy.featuredTransform,
            featuredSlots,
          },
          updatedAt: Date.now(),
        };
      });
    },
    [revokeFeaturedBlob, updateSession],
  );

  const applyCanvasPatch = useCallback(
    (patch: CanvasPatchResult) => {
      if (!patch.success) return false;
      updateSession((prev) => {
        const next = applyCanvasPatchToSession(prev, patch);
        return {
          ...next,
          document: withLogoAwareShowBrand(next.document, next.brand),
        };
      });
      return true;
    },
    [updateSession],
  );

  const applyBriefGeneration = useCallback(
    (result: BriefGenerationResult) => {
      const platformId = session?.document.platformId ?? "linkedin-square";
      const plan = validatedPlanFromBriefResult(result, platformId);
      if (plan) {
        applyDesignPlan(plan);
        return;
      }
      updateSession((prev) => {
        const layout = catalogLayoutToDynamic(getPostLayout(result.layoutId));
        return {
          ...prev,
          featured: {
            ...prev.featured,
            mode: "genui",
            productPage: result.productPage,
          },
          document: withLogoAwareShowBrand(
            {
              ...prev.document,
              copy: result.copy,
              textSlots: textSlotsFromCopy(result.copy, layout),
              copyVariants: buildCopyVariantsForBrief(
                result.sourceBrief,
                {
                  heading: result.copy.heading,
                  subheading: result.copy.subheading,
                },
                platformId,
              ),
              copyVariantIndex: 0,
              layoutId: result.layoutId,
              logoPlacement: result.logoPlacement,
              logoAlign: result.logoAlign,
              textAlign: result.textAlign,
              showContent: result.showContent,
              showFeaturedImage: result.showFeaturedImage,
              showPattern: result.showPattern,
              showBackground: result.showBackground,
              pattern: result.pattern,
              patternOpacity: result.patternOpacity,
              patternScale: result.patternScale,
              patternAnimated: result.patternAnimated,
              typeScale: result.typeScale,
              logoScale: result.logoScale,
              featuredTransform: result.featuredTransform,
              onboarding: { phase: "ready", briefSkipped: false },
            },
            prev.brand,
          ),
          updatedAt: Date.now(),
        };
      });
    },
    [applyDesignPlan, session?.document.platformId, updateSession],
  );

  const uploadFeaturedImage = useCallback(
    async (file: File, slotId?: string) => {
      setFeaturedUploading(true);
      setFeaturedError(null);
      try {
        const parsed = await parseFeaturedImageFile(file);
        const recordBase = createFeaturedImageRecord(parsed, file.name);
        const record =
          parsed.kind === "raster"
            ? {
                ...recordBase,
                blobKey: scopedBlobKey(designId, "featured", recordBase.id),
              }
            : recordBase;

        const prevImage = session?.featured.image;
        if (prevImage?.blobKey) await deleteFeaturedImageBlob(prevImage.blobKey);

        if (parsed.kind === "raster" && record.blobKey) {
          await saveFeaturedImageBlob(record.blobKey, parsed.blob);
        }

        revokeFeaturedBlob();
        const src = await resolveFeaturedImageSrc(record);
        if (src?.startsWith("blob:")) featuredBlobUrlRef.current = src;
        setFeaturedImageSrc(src);

        updateSession((prev) => {
          const targetSlotId = slotId ?? FEATURED_PRIMARY_SLOT_ID;
          const platform = getPlatform(prev.document.platformId);
          const layout = getPostLayout(prev.document.layoutId);
          const featuredTransform = resolveLayoutHierarchy({
            width: platform.width,
            height: platform.height,
            platformId: prev.document.platformId,
            layout,
            copy: prev.document.copy,
            spacing: prev.document.layoutSpacing,
            showLogo: prev.document.showBrand,
            showFeaturedImage: true,
            featuredMode: "image",
            productPage: prev.featured.productPage,
            featuredSlotCount: Math.max(1, (prev.document.featuredSlots ?? []).length),
          }).featuredTransform;

          return {
            ...prev,
            featured: {
              ...prev.featured,
              mode: "image",
              image: record,
            },
            document: {
              ...prev.document,
              showFeaturedImage: true,
              featuredTransform,
              featuredSlots: patchFeaturedSlot(prev.document.featuredSlots, targetSlotId, {
                mode: "image",
                visible: true,
                transform: featuredTransform,
              }),
            },
            updatedAt: Date.now(),
          };
        });
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setFeaturedUploading(false);
      }
    },
    [designId, revokeFeaturedBlob, session?.featured.image, updateSession],
  );

  const removeFeaturedImage = useCallback(async (slotId?: string) => {
    const blobKey = session?.featured.image?.blobKey;
    if (blobKey) await deleteFeaturedImageBlob(blobKey);
    revokeFeaturedBlob();
    setFeaturedImageSrc(null);
    updateSession((prev) => {
      const targetSlotId = slotId ?? FEATURED_PRIMARY_SLOT_ID;
      const slot = ensureFeaturedSlots(prev.document.featuredSlots).find(
        (entry) => entry.slotId === targetSlotId,
      );
      const activeBlockId =
        slot?.activeBlockId ?? prev.featured.activeBlockId ?? null;
      const hasSlotBlock =
        !!activeBlockId &&
        !!findVisualBlock(prev.featured.visualBlocks ?? [], activeBlockId);
      const hasBlocks = (prev.featured.visualBlocks?.length ?? 0) > 0;
      const nextMode = hasSlotBlock || hasBlocks ? "composed" : "placeholder";

      return {
        ...prev,
        featured: {
          ...prev.featured,
          image: null,
          mode: nextMode,
        },
        document: {
          ...prev.document,
          featuredSlots: patchFeaturedSlot(prev.document.featuredSlots, targetSlotId, {
            mode: nextMode,
            activeBlockId: nextMode === "composed" ? activeBlockId : null,
          }),
        },
        updatedAt: Date.now(),
      };
    });
  }, [revokeFeaturedBlob, session?.featured.image?.blobKey, updateSession]);

  const generateVisualBlocks = useCallback(
    async (input?: {
      theme?: string;
      brief?: string;
      source?: "library" | "generate";
      libraryIds?: string[];
      pickFeatured?: boolean;
      preferredKind?: "ui" | "illustration" | "3d";
      slotId?: string;
    }) => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
      const targetSlotId = input?.slotId ?? FEATURED_PRIMARY_SLOT_ID;
      setGeneratingVisualBlocks(true);
      setFeaturedError(null);
      try {
        const pickFeatured = input?.pickFeatured ?? false;
        const response = await fetch("/api/visual-blocks/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...visualBlockPickPayload(currentSession, {
              theme: input?.theme,
              brief: input?.brief,
              preferredKind: input?.preferredKind,
            }),
            count: pickFeatured ? 1 : 3,
            pickFeatured,
            source: input?.source ?? "library",
            libraryIds: input?.libraryIds,
          }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Generation failed");
        }
        const payload = (await response.json()) as { blocks: VisualBlockRecord[] };

        if (pickFeatured) {
          const block = payload.blocks[0];
          if (!block) {
            setFeaturedError("No matching visual found in the library.");
            return;
          }
          const nextKind =
            input?.preferredKind ??
            (isFeaturedVisualKind(block.kind) ? block.kind : undefined);
          updateSession((prev) =>
            syncComposedFeaturedSlots(
              {
                ...prev,
                document: {
                  ...prev.document,
                  ...(nextKind ? { featuredVisualKind: nextKind } : {}),
                },
                featured: {
                  ...prev.featured,
                  visualBlocks: withAssignedVisualBlock(
                    prev.featured.visualBlocks ?? [],
                    prev.document.featuredSlots,
                    block,
                    targetSlotId,
                  ),
                },
              },
              block.id,
              { slotId: targetSlotId },
            ),
          );
          return;
        }

        updateSession((prev) => {
          const visualBlocks = appendVisualBlocks(
            prev.featured.visualBlocks ?? [],
            payload.blocks,
          );
          const activeBlockId = payload.blocks[0]?.id ?? visualBlocks[0]?.id ?? null;
          return syncComposedFeaturedSlots(
            {
              ...prev,
              featured: {
                ...prev.featured,
                visualBlocks,
              },
            },
            activeBlockId,
            { slotId: targetSlotId },
          );
        });
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : "Generation failed.");
      } finally {
        setGeneratingVisualBlocks(false);
      }
    },
    [syncComposedFeaturedSlots, updateSession],
  );

  const selectVisualBlock = useCallback(
    (blockId: string, slotId?: string) => {
      updateSession((prev) => {
        const block = (prev.featured.visualBlocks ?? []).find((b) => b.id === blockId);
        const kind =
          block?.kind === "ui" ||
          block?.kind === "illustration" ||
          block?.kind === "3d"
            ? block.kind
            : undefined;
        return syncComposedFeaturedSlots(
          kind
            ? {
                ...prev,
                document: { ...prev.document, featuredVisualKind: kind },
              }
            : prev,
          blockId,
          { slotId: slotId ?? FEATURED_PRIMARY_SLOT_ID },
        );
      });
    },
    [syncComposedFeaturedSlots, updateSession],
  );

  const modifyVisualBlock = useCallback(
    async (blockId: string, instruction: string) => {
      if (!session) return;
      const block = session.featured.visualBlocks?.find((entry) => entry.id === blockId);
      if (!block) {
        setFeaturedError("Visual block not found.");
        return;
      }
      setGeneratingVisualBlocks(true);
      setFeaturedError(null);
      try {
        const response = await fetch("/api/visual-blocks/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId,
            instruction,
            block,
            brandColors: {
              primary: session.brand.colors.primary,
              accent: session.brand.colors.accent,
            },
          }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Modification failed");
        }
        const payload = (await response.json()) as { block: VisualBlockRecord };
        updateSession((prev) =>
          syncComposedFeaturedSlots(
            {
              ...prev,
              featured: {
                ...prev.featured,
                visualBlocks: upsertVisualBlock(
                  prev.featured.visualBlocks ?? [],
                  payload.block,
                ),
              },
            },
            payload.block.id,
            {
              slotId:
                (prev.document.featuredSlots ?? []).find(
                  (slot) => slot.activeBlockId === blockId,
                )?.slotId ?? FEATURED_PRIMARY_SLOT_ID,
            },
          ),
        );
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : "Modification failed.");
      } finally {
        setGeneratingVisualBlocks(false);
      }
    },
    [session, syncComposedFeaturedSlots, updateSession],
  );

  const addCanvasShape = useCallback(
    (libraryId: string, options?: InstantiateShapeOptions): string | null => {
      let createdId: string | null = null;
      updateSession((prev) => {
        const shapes = prev.document.canvasShapes ?? [];
        if (!canAddCanvasShape(shapes)) return prev;
        const shape = instantiateShape(
          libraryId,
          {
            primary: prev.brand.colors.primary,
            accent: prev.brand.colors.accent,
          },
          options,
        );
        if (!shape) return prev;
        createdId = shape.id;
        return {
          ...prev,
          document: {
            ...prev.document,
            canvasShapes: [...shapes, shape],
          },
        };
      });
      return createdId;
    },
    [updateSession],
  );

  const updateCanvasShape = useCallback(
    (id: string, patch: Partial<CanvasShapeRecord>) => {
      updateSession((prev) => {
        const shapes = prev.document.canvasShapes ?? [];
        if (!shapes.some((shape) => shape.id === id)) return prev;
        return {
          ...prev,
          document: {
            ...prev.document,
            canvasShapes: patchCanvasShape(shapes, id, patch),
          },
        };
      });
    },
    [updateSession],
  );

  const removeCanvasShape = useCallback(
    (id: string) => {
      updateSession((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          canvasShapes: removeShapeFromList(prev.document.canvasShapes ?? [], id),
        },
      }));
    },
    [updateSession],
  );

  const setCanvasShapes = useCallback(
    (shapes: CanvasShapeRecord[]) => {
      updateSession((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          canvasShapes: shapes,
        },
      }));
    },
    [updateSession],
  );

  const addCanvasIcon = useCallback(
    (iconName: string): string | null => {
      let createdId: string | null = null;
      updateSession((prev) => {
        const icons = prev.document.canvasIcons ?? [];
        if (icons.length >= MAX_CANVAS_ICONS) return prev;
        const entry = getIconCatalogEntry(iconName);
        if (!entry) return prev;
        const icon = createCanvasIconRecord({
          iconName,
          label: entry.label,
          category: entry.category,
          color: prev.brand.colors.accent,
        });
        if (!icon) return prev;
        createdId = icon.id;
        return {
          ...prev,
          document: {
            ...prev.document,
            canvasIcons: [...icons, icon],
          },
        };
      });
      return createdId;
    },
    [updateSession],
  );

  const updateCanvasIcon = useCallback(
    (id: string, patch: Partial<CanvasIconRecord>) => {
      updateSession((prev) => {
        const icons = prev.document.canvasIcons ?? [];
        if (!icons.some((icon) => icon.id === id)) return prev;
        return {
          ...prev,
          document: {
            ...prev.document,
            canvasIcons: icons.map((icon) =>
              icon.id === id ? { ...icon, ...patch } : icon,
            ),
          },
        };
      });
    },
    [updateSession],
  );

  const removeCanvasIcon = useCallback(
    (id: string) => {
      updateSession((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          canvasIcons: (prev.document.canvasIcons ?? []).filter(
            (icon) => icon.id !== id,
          ),
        },
      }));
    },
    [updateSession],
  );

  const setCanvasIcons = useCallback(
    (icons: CanvasIconRecord[]) => {
      updateSession((prev) => ({
        ...prev,
        document: {
          ...prev.document,
          canvasIcons: icons,
        },
      }));
    },
    [updateSession],
  );

  const shuffleFeaturedVisualBlock = useCallback(
    async (copyOverride?: {
      headline?: string;
      subheading?: string;
      preferredKind?: "ui" | "illustration" | "3d";
      slotId?: string;
    }) => {
      if (!session) return;
      const { featured } = session;
      if (featured.mode !== "composed" && featured.mode !== "placeholder") return;

      const targetSlotId = copyOverride?.slotId ?? FEATURED_PRIMARY_SLOT_ID;
      const slot = (session.document.featuredSlots ?? []).find(
        (entry) => entry.slotId === targetSlotId,
      );
      const blocks = featured.visualBlocks ?? [];
      const active = activeVisualBlock(
        blocks,
        slot?.activeBlockId ?? featured.activeBlockId,
      );
      const activeKind: FeaturedVisualKind =
        copyOverride?.preferredKind ??
        (isFeaturedVisualKind(active?.kind)
          ? active.kind
          : session.document.featuredVisualKind) ??
        inferFeaturedVisualKind(session.document.copy.heading);

      // Always re-rank against the brief for the active kind — do not cycle stale
      // same-kind blocks that may have been picked under a different intent.
      const excludeLibraryIds = [
        ...new Set(
          blocks
            .filter((block) => block.kind === activeKind)
            .map((block) => block.libraryId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      setGeneratingVisualBlocks(true);
      setFeaturedError(null);
      try {
        const doc = session.document;
        const headline = copyOverride?.headline ?? doc.copy.heading;
        const subheading = copyOverride?.subheading ?? doc.copy.subheading;
        const newBlock = await pickShuffleFeaturedVisualBrowser(
          buildFeaturedVisualPickInput(session, activeKind, {
            headline,
            subheading,
          }),
          excludeLibraryIds,
        );

        if (!newBlock) {
          setFeaturedError(
            `No matching ${
              activeKind === "illustration"
                ? "illustration"
                : activeKind === "3d"
                  ? "3D element"
                  : "UI"
            } found for this brief.`,
          );
          return;
        }
        if (
          (activeKind === "illustration" && newBlock.kind !== "illustration") ||
          (activeKind === "3d" && newBlock.kind !== "3d") ||
          (activeKind === "ui" &&
            (newBlock.kind === "illustration" || newBlock.kind === "3d"))
        ) {
          setFeaturedError("Shuffle returned the wrong visual kind. Try again.");
          return;
        }

        updateSession((prev) => {
          const visualBlocks = withAssignedVisualBlock(
            prev.featured.visualBlocks ?? [],
            prev.document.featuredSlots,
            newBlock,
            targetSlotId,
          );
          return syncComposedFeaturedSlots(
            {
              ...prev,
              document: {
                ...prev.document,
                featuredVisualKind: activeKind,
              },
              featured: {
                ...prev.featured,
                visualBlocks,
              },
            },
            newBlock.id,
            { slotId: targetSlotId },
          );
        });
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : "Shuffle visual failed.");
      } finally {
        setGeneratingVisualBlocks(false);
      }
    },
    [session, syncComposedFeaturedSlots, updateSession],
  );

  const addFeaturedVisualSlot = useCallback(() => {
    let createdId: string | null = null;
    updateSession((prev) => {
      const nextSlots = addFeaturedSlot(prev.document.featuredSlots, {
        transform: prev.document.featuredTransform,
      });
      if (!nextSlots) return prev;
      createdId = nextSlots[nextSlots.length - 1]?.slotId ?? null;
      return {
        ...prev,
        document: {
          ...prev.document,
          showFeaturedImage: true,
          featuredSlots: nextSlots,
        },
        updatedAt: Date.now(),
      };
    });
    return createdId;
  }, [updateSession]);

  const removeFeaturedVisualSlot = useCallback(
    (slotId: string) => {
      updateSession((prev) => {
        const prevSlots = ensureFeaturedSlots(prev.document.featuredSlots);
        const nextSlots = removeFeaturedSlot(prevSlots, slotId);
        const unchanged =
          nextSlots.length === prevSlots.length &&
          nextSlots.every((slot, i) => {
            const before = prevSlots[i]!;
            return (
              slot.slotId === before.slotId &&
              slot.mode === before.mode &&
              slot.activeBlockId === before.activeBlockId
            );
          });
        if (unchanged) return prev;

        const primary =
          nextSlots.find((slot) => slot.slotId === FEATURED_PRIMARY_SLOT_ID) ??
          nextSlots[0];
        const clearedSoleSlot =
          prevSlots.length === 1 &&
          nextSlots.length === 1 &&
          nextSlots[0]?.mode === "placeholder" &&
          !nextSlots[0]?.activeBlockId;

        return {
          ...prev,
          featured: {
            ...prev.featured,
            activeBlockId: clearedSoleSlot
              ? null
              : (primary?.activeBlockId ?? null),
            mode: clearedSoleSlot
              ? ("placeholder" as const)
              : (primary?.mode ?? prev.featured.mode),
          },
          document: {
            ...prev.document,
            featuredSlots: nextSlots,
            featuredTransform:
              primary?.transform ?? prev.document.featuredTransform,
          },
          updatedAt: Date.now(),
        };
      });
    },
    [updateSession],
  );

  const reorderFeaturedVisualSlots = useCallback(
    (slotId: string, direction: "left" | "right") => {
      updateSession((prev) => {
        const nextSlots = reorderFeaturedSlot(
          prev.document.featuredSlots,
          slotId,
          direction,
        );
        return {
          ...prev,
          document: {
            ...prev.document,
            featuredSlots: nextSlots,
          },
          updatedAt: Date.now(),
        };
      });
    },
    [updateSession],
  );

  const brand = session?.brand ?? defaultKit();
  const featured = session?.featured ?? defaultFeaturedBlock();
  const document = session?.document ?? createBlankSession(designId).document;

  const backgroundPresets = useMemo(
    () => buildBackgroundPresets(brand.colors),
    [brand.colors],
  );
  const solidBackgroundPresets = useMemo(
    () => buildSolidBackgroundPresets(brand.colors),
    [brand.colors],
  );
  const gradientBackgroundPresets = useMemo(
    () => buildGradientBackgroundPresets(brand.colors),
    [brand.colors],
  );
  const activeBackground = useMemo(
    () => getActiveBackgroundPreset(backgroundPresets, brand.activeBackgroundPresetId),
    [backgroundPresets, brand.activeBackgroundPresetId],
  );
  const harmonySwatches = useMemo(
    () => suggestHarmonySwatches(brand.colors.primary),
    [brand.colors.primary],
  );

  const kit: BrandKitRuntime = useMemo(
    () => ({ ...brand, logoSrc, logoSrcs }),
    [brand, logoSrc, logoSrcs],
  );

  return useMemo(
    () => ({
      ready,
      session,
      document,
      onboardingPhase: document.onboarding.phase,
      kit,
      backgroundPresets,
      solidBackgroundPresets,
      gradientBackgroundPresets,
      activeBackground,
      harmonySwatches,
      featured,
      featuredImageSrc,
      brandUploading,
      brandError,
      featuredUploading,
      featuredError,
      patchDocument,
      setPlatformId,
      changePlatformId,
      uploadLogo,
      uploadLogoVariant,
      removeLogo,
      removeLogoVariant,
      fixLogoSvgContrast,
      restoreLogoSvg,
      setColor,
      resetColor,
      applySwatch,
      setBackgroundPreset,
      setFeaturedMode,
      setFeaturedProductPage,
      applyBriefGeneration,
      applyDesignPlan,
      applyCanvasPatch,
      uploadFeaturedImage,
      applyUnsplashPhoto,
      removeFeaturedImage,
      generateVisualBlocks,
      selectVisualBlock,
      modifyVisualBlock,
      shuffleFeaturedVisualBlock,
      addFeaturedVisualSlot,
      removeFeaturedVisualSlot,
      reorderFeaturedVisualSlots,
      addCanvasShape,
      updateCanvasShape,
      removeCanvasShape,
      setCanvasShapes,
      addCanvasIcon,
      updateCanvasIcon,
      removeCanvasIcon,
      setCanvasIcons,
      generatingVisualBlocks,
      advanceOnboarding,
      skipLogo,
      skipBrief,
      adoptSession,
      undo,
      redo,
      canUndo,
      canRedo,
      historyLimitToast,
      beginHistoryCoalesce: beginCoalesce,
      endHistoryCoalesce: endCoalesce,
      getActiveCoalesceKey,
    }),
    [
      ready,
      session,
      document,
      kit,
      backgroundPresets,
      solidBackgroundPresets,
      gradientBackgroundPresets,
      activeBackground,
      harmonySwatches,
      featured,
      featuredImageSrc,
      brandUploading,
      brandError,
      featuredUploading,
      featuredError,
      patchDocument,
      setPlatformId,
      changePlatformId,
      uploadLogo,
      uploadLogoVariant,
      removeLogo,
      removeLogoVariant,
      fixLogoSvgContrast,
      restoreLogoSvg,
      setColor,
      resetColor,
      applySwatch,
      setBackgroundPreset,
      setFeaturedMode,
      setFeaturedProductPage,
      applyBriefGeneration,
      applyDesignPlan,
      applyCanvasPatch,
      uploadFeaturedImage,
      applyUnsplashPhoto,
      removeFeaturedImage,
      generateVisualBlocks,
      selectVisualBlock,
      modifyVisualBlock,
      shuffleFeaturedVisualBlock,
      addFeaturedVisualSlot,
      removeFeaturedVisualSlot,
      reorderFeaturedVisualSlots,
      addCanvasShape,
      updateCanvasShape,
      removeCanvasShape,
      setCanvasShapes,
      addCanvasIcon,
      updateCanvasIcon,
      removeCanvasIcon,
      setCanvasIcons,
      generatingVisualBlocks,
      advanceOnboarding,
      skipLogo,
      skipBrief,
      adoptSession,
      undo,
      redo,
      canUndo,
      canRedo,
      historyLimitToast,
      beginCoalesce,
      endCoalesce,
      getActiveCoalesceKey,
    ],
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { parseLogoFile } from "@/lib/brand/parseLogoFile";
import {
  createLogoRecord,
  defaultKit,
  deleteLogoBlob,
  loadLogoBlob,
  resolveLogoSrc,
  saveLogoBlob,
} from "@/lib/brand/storage";
import type { BrandColors, BrandKitPersisted, BrandKitRuntime } from "@/lib/brand/types";
import {
  createBlankSession,
  loadDesignSession,
  saveDesignSession,
  scopedBlobKey,
} from "@/lib/design/designSession";
import type {
  DesignDocument,
  DesignOnboardingPhase,
  DesignSessionPersisted,
} from "@/lib/design/types";
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
import type { FeaturedBlockMode } from "@/lib/social-tool/featuredBlock";

const PERSIST_DEBOUNCE_MS = 300;

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
  patchDocument: (partial: Partial<DesignDocument>) => void;
  setPlatformId: (platformId: PlatformId) => void;
  uploadLogo: (file: File) => Promise<void>;
  removeLogo: () => Promise<void>;
  setColor: (role: keyof BrandColors, hex: string) => void;
  resetColor: (role: keyof BrandColors) => void;
  applySwatch: (hex: string, role: keyof BrandColors) => void;
  setBackgroundPreset: (id: string | null) => void;
  setFeaturedMode: (mode: FeaturedBlockMode) => void;
  setFeaturedProductPage: (productPage: ProductPageId) => void;
  uploadFeaturedImage: (file: File) => Promise<void>;
  removeFeaturedImage: () => Promise<void>;
  advanceOnboarding: (phase: DesignOnboardingPhase) => void;
  skipBrief: () => void;
};

export function useDesignSession(designId: string): UseDesignSessionResult {
  const [session, setSession] = useState<DesignSessionPersisted | null>(null);
  const [ready, setReady] = useState(false);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [featuredImageSrc, setFeaturedImageSrc] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoBlobUrlRef = useRef<string | null>(null);
  const featuredBlobUrlRef = useRef<string | null>(null);

  const revokeLogoBlob = useCallback(() => {
    if (logoBlobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(logoBlobUrlRef.current);
    }
    logoBlobUrlRef.current = null;
  }, []);

  const revokeFeaturedBlob = useCallback(() => {
    if (featuredBlobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(featuredBlobUrlRef.current);
    }
    featuredBlobUrlRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const loaded = loadDesignSession(designId);
      const next = loaded ?? createBlankSession(designId);

      let resolvedLogo: string | null = null;
      if (next.brand.logo) {
        resolvedLogo = await resolveLogoSrc(next.brand.logo);
        if (resolvedLogo?.startsWith("blob:")) logoBlobUrlRef.current = resolvedLogo;
      }

      let resolvedFeatured: string | null = null;
      if (next.featured.image) {
        resolvedFeatured = await resolveFeaturedImageSrc(next.featured.image);
        if (resolvedFeatured?.startsWith("blob:")) {
          featuredBlobUrlRef.current = resolvedFeatured;
        }
      }

      if (cancelled) return;

      setSession(next);
      setLogoSrc(resolvedLogo);
      setFeaturedImageSrc(resolvedFeatured);
      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
      revokeLogoBlob();
      revokeFeaturedBlob();
    };
  }, [designId, revokeFeaturedBlob, revokeLogoBlob]);

  const schedulePersist = useCallback((next: DesignSessionPersisted) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      saveDesignSession(next);
    }, PERSIST_DEBOUNCE_MS);
  }, []);

  const updateSession = useCallback(
    (updater: (prev: DesignSessionPersisted) => DesignSessionPersisted) => {
      setSession((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        schedulePersist(next);
        return next;
      });
    },
    [schedulePersist],
  );

  const patchDocument = useCallback(
    (partial: Partial<DesignDocument>) => {
      updateSession((prev) => ({
        ...prev,
        document: { ...prev.document, ...partial },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const setPlatformId = useCallback(
    (platformId: PlatformId) => patchDocument({ platformId }),
    [patchDocument],
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

  const skipBrief = useCallback(() => {
    patchDocument({
      onboarding: { phase: "ready", briefSkipped: true },
      showContent: true,
    });
  }, [patchDocument]);

  const uploadLogo = useCallback(
    async (file: File) => {
      setBrandUploading(true);
      setBrandError(null);
      try {
        const parsed = await parseLogoFile(file);
        const recordBase = createLogoRecord(parsed, file.name);
        const record =
          parsed.kind === "png"
            ? {
                ...recordBase,
                blobKey: scopedBlobKey(designId, "logo", recordBase.id),
              }
            : recordBase;

        const prevLogo = session?.brand.logo;
        if (prevLogo?.blobKey) await deleteLogoBlob(prevLogo.blobKey);

        if (parsed.kind === "png" && record.blobKey) {
          await saveLogoBlob(record.blobKey, parsed.blob);
        }

        const colors =
          parsed.kind === "svg"
            ? extractColorsFromSvgMarkup(parsed.svgMarkup)
            : await extractColorsFromImageBlob(parsed.blob);

        revokeLogoBlob();
        const src = await resolveLogoSrc(record);
        if (src?.startsWith("blob:")) logoBlobUrlRef.current = src;
        setLogoSrc(src);

        updateSession((prev) => {
          const nextPhase: DesignOnboardingPhase =
            prev.document.onboarding.phase === "needsLogo"
              ? "needsBrief"
              : prev.document.onboarding.phase;

          return {
            ...prev,
            brand: {
              ...prev.brand,
              logo: record,
              colors,
              activeBackgroundPresetId: "brand-hero",
            },
            document: {
              ...prev.document,
              showBrand: true,
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
    [designId, revokeLogoBlob, session?.brand.logo, updateSession],
  );

  const removeLogo = useCallback(async () => {
    const logo = session?.brand.logo;
    if (logo?.blobKey) await deleteLogoBlob(logo.blobKey);
    revokeLogoBlob();
    setLogoSrc(null);
    updateSession((prev) => ({
      ...prev,
      brand: { ...prev.brand, logo: null },
      document: {
        ...prev.document,
        onboarding: { ...prev.document.onboarding, phase: "needsLogo" },
      },
      updatedAt: Date.now(),
    }));
  }, [revokeLogoBlob, session?.brand.logo, updateSession]);

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
      updateSession((prev) => ({
        ...prev,
        featured: { ...prev.featured, productPage },
        updatedAt: Date.now(),
      }));
    },
    [updateSession],
  );

  const uploadFeaturedImage = useCallback(
    async (file: File) => {
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

        updateSession((prev) => ({
          ...prev,
          featured: {
            ...prev.featured,
            mode: "image",
            image: record,
          },
          updatedAt: Date.now(),
        }));
      } catch (err) {
        setFeaturedError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setFeaturedUploading(false);
      }
    },
    [designId, revokeFeaturedBlob, session?.featured.image, updateSession],
  );

  const removeFeaturedImage = useCallback(async () => {
    const blobKey = session?.featured.image?.blobKey;
    if (blobKey) await deleteFeaturedImageBlob(blobKey);
    revokeFeaturedBlob();
    setFeaturedImageSrc(null);
    updateSession((prev) => ({
      ...prev,
      featured: { ...prev.featured, image: null, mode: "genui" },
      updatedAt: Date.now(),
    }));
  }, [revokeFeaturedBlob, session?.featured.image?.blobKey, updateSession]);

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
    () => ({ ...brand, logoSrc }),
    [brand, logoSrc],
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
      uploadLogo,
      removeLogo,
      setColor,
      resetColor,
      applySwatch,
      setBackgroundPreset,
      setFeaturedMode,
      setFeaturedProductPage,
      uploadFeaturedImage,
      removeFeaturedImage,
      advanceOnboarding,
      skipBrief,
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
      uploadLogo,
      removeLogo,
      setColor,
      resetColor,
      applySwatch,
      setBackgroundPreset,
      setFeaturedMode,
      setFeaturedProductPage,
      uploadFeaturedImage,
      removeFeaturedImage,
      advanceOnboarding,
      skipBrief,
    ],
  );
}

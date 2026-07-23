"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";
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
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { getPlatform } from "@/lib/social-tool/presets";
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
  loadDesignSession,
  saveDesignSession,
  scopedBlobKey,
} from "@/lib/design/designSession";
import { designRepository, isMeaningfulSession } from "@/lib/design/repository";
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
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
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
  uploadFeaturedImage: (file: File) => Promise<void>;
  removeFeaturedImage: () => Promise<void>;
  advanceOnboarding: (phase: DesignOnboardingPhase) => void;
  skipBrief: () => void;
};

export function useDesignSession(designId: string): UseDesignSessionResult {
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
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuredBlobUrlRef = useRef<string | null>(null);
  const logoBlobUrlsRef = useRef<string[]>([]);

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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const loaded = loadDesignSession(designId);
      const next = loaded ?? createBlankSession(designId);
      const srcs = await hydrateAllLogoSrcs(next.brand);

      let resolvedFeatured: string | null = null;
      if (next.featured.image) {
        resolvedFeatured = await resolveFeaturedImageSrc(next.featured.image);
        if (resolvedFeatured?.startsWith("blob:")) {
          featuredBlobUrlRef.current = resolvedFeatured;
        }
      }

      if (cancelled) return;

      logoBlobUrlsRef.current = Object.values(srcs).filter(
        (src): src is string => !!src?.startsWith("blob:"),
      );
      setSession(next);
      setLogoSrcs(srcs);
      setLogoSrc(srcs.primary ?? null);
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
      if (isMeaningfulSession(next)) {
        void designRepository.upsert(next).catch((err) => {
          console.warn("[postforge] design index upsert failed", err);
        });
      }
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

  const applyBriefGeneration = useCallback(
    (result: BriefGenerationResult) => {
      updateSession((prev) => ({
        ...prev,
        featured: {
          ...prev.featured,
          mode: "genui",
          productPage: result.productPage,
        },
        document: {
          ...prev.document,
          copy: result.copy,
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
      uploadFeaturedImage,
      removeFeaturedImage,
      advanceOnboarding,
      skipBrief,
    ],
  );
}

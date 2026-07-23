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
import {
  fixLogoSvgContrast as applyLogoSvgContrastFix,
  restoreLogoSvgOriginal,
  withLogoSvgOriginal,
} from "@/lib/brand/logoContrastFix";
import {
  getLogoRecord,
  getMonogramMarkup,
  getPrimaryLogo,
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
  loadBrandKitPersisted,
  logoBlobKey,
  resolveLogoSrc,
  saveBrandKitPersisted,
  saveLogoBlob,
} from "@/lib/brand/storage";
import type {
  BackgroundPreset,
  BrandColors,
  BrandKitPersisted,
  BrandKitRuntime,
  BrandLogoVariant,
} from "@/lib/brand/types";

export type UseBrandKitOptions = {
  /** When set, brand kit persists under a design-scoped key instead of global. */
  storageScope?: string;
};

export function useBrandKit(options: UseBrandKitOptions = {}) {
  const { storageScope } = options;
  const [kit, setKit] = useState<BrandKitPersisted>(() => defaultKit());
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoSrcs, setLogoSrcs] = useState<
    Partial<Record<BrandLogoVariant, string | null>>
  >({});
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const revokeBlobUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
  }, []);

  const hydrateLogos = useCallback(
    async (nextKit: BrandKitPersisted) => {
      revokeBlobUrls();
      const srcs = await hydrateAllLogoSrcs(nextKit);
      const blobUrls = Object.values(srcs).filter(
        (src): src is string => !!src?.startsWith("blob:"),
      );
      blobUrlsRef.current = blobUrls;
      setLogoSrcs(srcs);
      setLogoSrc(srcs.primary ?? null);
    },
    [revokeBlobUrls],
  );

  useEffect(() => {
    const persisted = loadBrandKitPersisted(storageScope);
    setKit(persisted);
    hydrateLogos(persisted).finally(() => setReady(true));
    return () => revokeBlobUrls();
  }, [hydrateLogos, revokeBlobUrls, storageScope]);

  const persist = useCallback(
    (next: BrandKitPersisted) => {
      const normalized = syncPrimaryAlias(next);
      setKit(normalized);
      saveBrandKitPersisted(normalized, storageScope);
    },
    [storageScope],
  );

  const backgroundPresets = useMemo(
    () => buildBackgroundPresets(kit.colors),
    [kit.colors],
  );

  const solidBackgroundPresets = useMemo(
    () => buildSolidBackgroundPresets(kit.colors),
    [kit.colors],
  );

  const gradientBackgroundPresets = useMemo(
    () => buildGradientBackgroundPresets(kit.colors),
    [kit.colors],
  );

  const activeBackground = useMemo(
    () => getActiveBackgroundPreset(backgroundPresets, kit.activeBackgroundPresetId),
    [backgroundPresets, kit.activeBackgroundPresetId],
  );

  const harmonySwatches = useMemo(
    () => suggestHarmonySwatches(kit.colors.primary),
    [kit.colors.primary],
  );

  const uploadLogoVariant = useCallback(
    async (variant: BrandLogoVariant, file: File) => {
      setUploading(true);
      setError(null);
      try {
        const parsed = await parseLogoFile(file);
        const record = createLogoRecord(parsed, file.name, {
          blobKey:
            parsed.kind === "png"
              ? logoBlobKey(variant, storageScope)
              : undefined,
        });

        const previous = getLogoRecord(kit, variant);
        if (previous?.blobKey) {
          await deleteLogoBlob(previous.blobKey);
        }

        if (parsed.kind === "png" && record.blobKey) {
          await saveLogoBlob(record.blobKey, parsed.blob);
        }

        const extractedColors =
          parsed.kind === "svg"
            ? extractColorsFromSvgMarkup(parsed.svgMarkup)
            : await extractColorsFromImageBlob(parsed.blob);

        let next = setLogoInKit(kit, variant, record);
        if (variant === "primary" || !getPrimaryLogo(kit)) {
          next = {
            ...next,
            colors: extractedColors,
            activeBackgroundPresetId: next.activeBackgroundPresetId ?? "brand-hero",
          };
        }

        persist(next);
        await hydrateLogos(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [hydrateLogos, kit, persist, storageScope],
  );

  const uploadLogo = useCallback(
    async (file: File, variant: BrandLogoVariant = "primary") => {
      await uploadLogoVariant(variant, file);
    },
    [uploadLogoVariant],
  );

  const removeLogoVariant = useCallback(
    async (variant: BrandLogoVariant) => {
      const previous = getLogoRecord(kit, variant);
      if (previous?.blobKey) {
        await deleteLogoBlob(previous.blobKey);
      }
      const next = setLogoInKit(kit, variant, null);
      persist(next);
      await hydrateLogos(next);
    },
    [hydrateLogos, kit, persist],
  );

  const removeLogo = useCallback(
    async (variant: BrandLogoVariant = "primary") => {
      await removeLogoVariant(variant);
    },
    [removeLogoVariant],
  );

  const fixLogoSvgContrast = useCallback(
    (backgroundCss: string, logoBackdrop: boolean, variant: BrandLogoVariant = "primary") => {
      const logo = getLogoRecord(kit, variant);
      if (!logo?.svgMarkup) return;
      const base = withLogoSvgOriginal(logo);
      const source = base.svgMarkupOriginal ?? base.svgMarkup;
      if (!source) return;
      const { markup, fixes, usesExplicitColors } = applyLogoSvgContrastFix(
        source,
        backgroundCss,
        { logoBackdrop },
      );
      if (fixes.length === 0) return;
      let next = setLogoInKit(kit, variant, {
        ...base,
        svgMarkup: markup,
        usesExplicitColors,
      });
      if (variant === "primary") {
        next = { ...next, colors: extractColorsFromSvgMarkup(markup) };
      }
      persist(next);
      void hydrateLogos(next);
    },
    [hydrateLogos, kit, persist],
  );

  const restoreLogoSvg = useCallback(
    (variant: BrandLogoVariant = "primary") => {
      const logo = getLogoRecord(kit, variant);
      if (!logo?.svgMarkupOriginal) return;
      const restored = restoreLogoSvgOriginal(logo);
      let next = setLogoInKit(kit, variant, restored);
      if (variant === "primary" && restored.svgMarkup) {
        next = { ...next, colors: extractColorsFromSvgMarkup(restored.svgMarkup) };
      }
      persist(next);
      void hydrateLogos(next);
    },
    [hydrateLogos, kit, persist],
  );

  const setColor = useCallback(
    (role: keyof BrandColors, hex: string) => {
      if (role === "extracted") return;
      persist({
        ...kit,
        colors: { ...kit.colors, [role]: hex },
      });
    },
    [kit, persist],
  );

  const resetColor = useCallback(
    (role: keyof BrandColors) => {
      const extracted = kit.colors.extracted?.[role];
      if (!extracted || role === "extracted") return;
      persist({
        ...kit,
        colors: { ...kit.colors, [role]: extracted },
      });
    },
    [kit, persist],
  );

  const applySwatch = useCallback(
    (hex: string, role: keyof BrandColors) => {
      if (role === "extracted") return;
      persist({
        ...kit,
        colors: { ...kit.colors, [role]: hex },
      });
    },
    [kit, persist],
  );

  const setBackgroundPreset = useCallback(
    (id: string | null) => {
      persist({ ...kit, activeBackgroundPresetId: id });
    },
    [kit, persist],
  );

  const runtime: BrandKitRuntime = useMemo(
    () => ({ ...kit, logoSrc, logoSrcs }),
    [kit, logoSrc, logoSrcs],
  );

  return {
    ready,
    uploading,
    error,
    kit: runtime,
    backgroundPresets,
    solidBackgroundPresets,
    gradientBackgroundPresets,
    activeBackground,
    harmonySwatches,
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
    kitHasAnyLogo: kitHasAnyLogo(kit),
    monogramMarkup: getMonogramMarkup(kit),
  };
}

export type UseBrandKitReturn = ReturnType<typeof useBrandKit>;

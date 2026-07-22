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
  loadBrandKitPersisted,
  resolveLogoSrc,
  saveBrandKitPersisted,
  saveLogoBlob,
} from "@/lib/brand/storage";
import type {
  BackgroundPreset,
  BrandColors,
  BrandKitPersisted,
  BrandKitRuntime,
} from "@/lib/brand/types";

export type UseBrandKitOptions = {
  /** When set, brand kit persists under a design-scoped key instead of global. */
  storageScope?: string;
};

export function useBrandKit(options: UseBrandKitOptions = {}) {
  const { storageScope } = options;
  const [kit, setKit] = useState<BrandKitPersisted>(() => defaultKit());
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = null;
  }, []);

  const hydrateLogo = useCallback(
    async (logo: BrandKitPersisted["logo"]) => {
      revokeBlob();
      const src = await resolveLogoSrc(logo);
      if (src?.startsWith("blob:")) blobUrlRef.current = src;
      setLogoSrc(src);
    },
    [revokeBlob],
  );

  useEffect(() => {
    const persisted = loadBrandKitPersisted(storageScope);
    setKit(persisted);
    hydrateLogo(persisted.logo).finally(() => setReady(true));
    return () => revokeBlob();
  }, [hydrateLogo, revokeBlob, storageScope]);

  const persist = useCallback(
    (next: BrandKitPersisted) => {
      setKit(next);
      saveBrandKitPersisted(next, storageScope);
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

  const uploadLogo = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const parsed = await parseLogoFile(file);
        const record = createLogoRecord(parsed, file.name, {
          blobKey: storageScope ? `${storageScope}:logo:${Date.now()}` : undefined,
        });

        if (kit.logo?.blobKey) {
          await deleteLogoBlob(kit.logo.blobKey);
        }

        if (parsed.kind === "png") {
          await saveLogoBlob(record.blobKey!, parsed.blob);
        }

        const colors =
          parsed.kind === "svg"
            ? extractColorsFromSvgMarkup(parsed.svgMarkup)
            : await extractColorsFromImageBlob(parsed.blob);

        const next: BrandKitPersisted = {
          ...kit,
          logo: record,
          colors,
          activeBackgroundPresetId: "brand-hero",
        };
        persist(next);
        await hydrateLogo(record);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [hydrateLogo, kit, persist, storageScope],
  );

  const removeLogo = useCallback(async () => {
    if (kit.logo?.blobKey) {
      await deleteLogoBlob(kit.logo.blobKey);
    }
    revokeBlob();
    setLogoSrc(null);
    persist({ ...kit, logo: null });
  }, [kit, persist, revokeBlob]);

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
    () => ({ ...kit, logoSrc }),
    [kit, logoSrc],
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
    removeLogo,
    setColor,
    resetColor,
    applySwatch,
    setBackgroundPreset,
  };
}

export type UseBrandKitReturn = ReturnType<typeof useBrandKit>;

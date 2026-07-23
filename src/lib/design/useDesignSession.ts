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
import { validatedPlanFromBriefResult } from "@/lib/llm/briefResultAdapter";
import { buildCopyVariantsForBrief } from "@/lib/llm/stages/copyVariantWriter";
import { applyDesignPlanToSession } from "@/lib/llm/services/applyDesignPlan";
import { applyCanvasPatchToSession, repairDesignDocument } from "@/lib/llm/services/applyCanvasPatch";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { VisualBlockRecord, VisualBlockGenerateInput } from "@/lib/social-tool/visualBlocks/types";
import { buildVisualPickIntentFromText } from "@/lib/social-tool/visualBlocks/library/scoring";
import { inferFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";
import {
  activeVisualBlock,
  appendVisualBlocks,
  findVisualBlock,
  upsertVisualBlock,
} from "@/lib/social-tool/visualBlocks/storage";

const PERSIST_DEBOUNCE_MS = 300;

function visualBlockPickPayload(
  session: DesignSessionPersisted,
  input?: {
    headline?: string;
    subheading?: string;
    theme?: string;
    brief?: string;
    preferredKind?: "ui" | "illustration";
  },
) {
  const headline = input?.headline ?? session.document.copy.heading;
  const subheading = input?.subheading ?? session.document.copy.subheading;
  const theme = input?.theme ?? headline;
  const brief = input?.brief ?? [headline, subheading, theme].filter(Boolean).join(" ");
  const featuredVisualKind =
    input?.preferredKind ??
    session.document.featuredVisualKind ??
    inferFeaturedVisualKind(brief);

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
    };
  } catch {
    semantic = {
      featuredKind: featuredVisualKind,
      platformId: session.document.platformId,
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
  applyDesignPlan: (plan: ValidatedDesignPlan) => void;
  applyCanvasPatch: (patch: CanvasPatchResult) => boolean;
  uploadFeaturedImage: (file: File) => Promise<void>;
  removeFeaturedImage: () => Promise<void>;
  generateVisualBlocks: (input?: {
    theme?: string;
    brief?: string;
    source?: "library" | "generate";
    libraryIds?: string[];
    pickFeatured?: boolean;
    preferredKind?: "ui" | "illustration";
  }) => Promise<void>;
  selectVisualBlock: (blockId: string) => void;
  modifyVisualBlock: (blockId: string, instruction: string) => Promise<void>;
  shuffleFeaturedVisualBlock: (copy?: { headline?: string; subheading?: string }) => Promise<void>;
  generatingVisualBlocks: boolean;
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
  const [generatingVisualBlocks, setGeneratingVisualBlocks] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const featuredBlobUrlRef = useRef<string | null>(null);
  const logoBlobUrlsRef = useRef<string[]>([]);
  const sessionRef = useRef<DesignSessionPersisted | null>(null);

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
      const base = loaded ?? createBlankSession(designId);
      const next = {
        ...base,
        document: repairDesignDocument(base.document),
      };
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

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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

  const composedFeaturedTransform = useCallback(
    (prev: DesignSessionPersisted, activeBlockId: string | null) => {
      const block = activeBlockId
        ? findVisualBlock(prev.featured.visualBlocks ?? [], activeBlockId)
        : null;
      const platform = getPlatform(prev.document.platformId);
      const layout = getPostLayout(prev.document.layoutId);

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
      }).featuredTransform;
    },
    [],
  );

  const syncComposedFeaturedSlots = useCallback(
    (prev: DesignSessionPersisted, activeBlockId: string | null) => {
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
          featuredSlots: [
            {
              slotId: "featured-primary",
              mode: "composed" as const,
              visible: true,
              transform: featuredTransform,
            },
          ],
        },
        updatedAt: Date.now(),
      };
    },
    [composedFeaturedTransform],
  );

  const applyDesignPlan = useCallback(
    (plan: ValidatedDesignPlan) => {
      const needsFeaturedLibrary = plan.featuredSlots.some(
        (slot) => slot.visible && slot.mode === "composed",
      );
      const featuredVisualKind = inferFeaturedVisualKind(
        [plan.copy.heading, plan.copy.subheading, plan.rationale].filter(Boolean).join(" "),
      );

      updateSession((prev) => {
        const applied = applyDesignPlanToSession(plan, prev.document);
        return {
          ...prev,
          brand: applied.brand
            ? { ...prev.brand, ...applied.brand }
            : prev.brand,
          featured: {
            ...prev.featured,
            ...applied.featured,
            image: prev.featured.image,
            visualBlocks: needsFeaturedLibrary ? [] : prev.featured.visualBlocks,
          },
          document: {
            ...prev.document,
            ...applied.document,
            featuredVisualKind,
          },
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
    [syncComposedFeaturedSlots, updateSession],
  );

  const applyCanvasPatch = useCallback(
    (patch: CanvasPatchResult) => {
      if (!patch.success) return false;
      updateSession((prev) => applyCanvasPatchToSession(prev, patch));
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
        updatedAt: Date.now(),
      }));
    },
    [applyDesignPlan, session?.document.platformId, updateSession],
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
    updateSession((prev) => {
      const hasBlocks = (prev.featured.visualBlocks?.length ?? 0) > 0;
      return {
        ...prev,
        featured: {
          ...prev.featured,
          image: null,
          mode: hasBlocks ? "composed" : "placeholder",
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
      preferredKind?: "ui" | "illustration";
    }) => {
      const currentSession = sessionRef.current;
      if (!currentSession) return;
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
    (blockId: string) => {
      updateSession((prev) => syncComposedFeaturedSlots(prev, blockId));
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

  const shuffleFeaturedVisualBlock = useCallback(
    async (copyOverride?: { headline?: string; subheading?: string }) => {
      if (!session) return;
      const { featured } = session;
      if (featured.mode !== "composed") return;

      const blocks = featured.visualBlocks ?? [];
      if (blocks.length === 0) return;

      const active = activeVisualBlock(blocks, featured.activeBlockId);
      const activeId = active?.id ?? null;
      const activeKind: "ui" | "illustration" | undefined =
        active?.kind === "ui" || active?.kind === "illustration"
          ? active.kind
          : session.document.featuredVisualKind ??
            inferFeaturedVisualKind(session.document.copy.heading);

      const sameKindBlocks = activeKind
        ? blocks.filter((block) => block.kind === activeKind)
        : blocks;

      if (sameKindBlocks.length > 1 && activeId) {
        const activeIndex = sameKindBlocks.findIndex((block) => block.id === activeId);
        const next = sameKindBlocks[(activeIndex + 1) % sameKindBlocks.length]!;
        updateSession((prev) => syncComposedFeaturedSlots(prev, next.id));
        return;
      }

      setGeneratingVisualBlocks(true);
      setFeaturedError(null);
      try {
        const doc = session.document;
        const headline = copyOverride?.headline ?? doc.copy.heading;
        const subheading = copyOverride?.subheading ?? doc.copy.subheading;
        const response = await fetch("/api/visual-blocks/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...visualBlockPickPayload(session, {
              headline,
              subheading,
              theme: headline,
              brief: [headline, subheading].filter(Boolean).join(" "),
              preferredKind: activeKind,
            }),
            pickFeatured: true,
            excludeLibraryIds: active?.libraryId ? [active.libraryId] : [],
            source: "library",
          }),
        });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Shuffle visual failed");
        }
        const payload = (await response.json()) as { blocks: VisualBlockRecord[] };
        const newBlock = payload.blocks[0];
        if (!newBlock) return;

        updateSession((prev) => {
          const prevBlocks = prev.featured.visualBlocks ?? [];
          const visualBlocks = activeId
            ? prevBlocks.map((block) => (block.id === activeId ? newBlock : block))
            : appendVisualBlocks(prevBlocks, [newBlock]);
          return syncComposedFeaturedSlots(
            {
              ...prev,
              featured: {
                ...prev.featured,
                visualBlocks,
              },
            },
            newBlock.id,
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
      applyDesignPlan,
      applyCanvasPatch,
      uploadFeaturedImage,
      removeFeaturedImage,
      generateVisualBlocks,
      selectVisualBlock,
      modifyVisualBlock,
      shuffleFeaturedVisualBlock,
      generatingVisualBlocks,
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
      applyDesignPlan,
      applyCanvasPatch,
      uploadFeaturedImage,
      removeFeaturedImage,
      generateVisualBlocks,
      selectVisualBlock,
      modifyVisualBlock,
      shuffleFeaturedVisualBlock,
      generatingVisualBlocks,
      advanceOnboarding,
      skipBrief,
    ],
  );
}

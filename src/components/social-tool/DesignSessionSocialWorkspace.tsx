"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";
import { DesignInspector } from "@/components/social-tool/DesignInspector";
import { DesignToolHeader } from "@/components/social-tool/DesignToolHeader";
import { CanvasPlatformPicker } from "@/components/social-tool/CanvasPlatformPicker";
import { CanvasDesignOverlay } from "@/components/social-tool/CanvasDesignOverlay";
import { ContrastIssuesToggle } from "@/components/social-tool/ContrastIssuesToggle";
import {
  ProductShotPost,
  type FeaturedImageTransform,
} from "@/components/social-tool/templates/ProductShotPost";
import {
  getPlatform,
  getTemplate,
  type PlatformId,
  type PostCopy,
} from "@/lib/social-tool/presets";
import { exportPost, type ExportFormat } from "@/lib/social-tool/exportPost";
import { useBrandToolTheme } from "@/lib/brand/useBrandToolTheme";
import { LayoutPreviewEmptyState } from "@/components/social-tool/LayoutPreviewEmptyState";
import { LayoutShuffleButton } from "@/components/social-tool/LayoutShuffleButton";
import { LayoutSpacingToggle } from "@/components/social-tool/LayoutSpacingToggle";
import {
  getLayoutStatePatch,
  getPostLayout,
  seedCopyForLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import {
  getRandomPlaygroundLayout,
  loadLayoutReviews,
  resolveLayoutSpacing,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import { pickRandomShuffleSurface } from "@/lib/social-tool/shuffleSurface";
import { pickNextCopyVariant } from "@/lib/social-tool/shuffleCopy";
import type { ShufflePreferences } from "@/lib/social-tool/shufflePreferences";
import { resolveLayoutHierarchyFromIds } from "@/lib/social-tool/layoutHierarchy";
import {
  resolveVisualBlockDimensions,
  parseSvgViewBox,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import {
  canvasSelectionFromContrastBlock,
  isCanvasSelectableTarget,
  type CanvasSelectionId,
} from "@/lib/social-tool/canvasSelection";
import {
  evaluateCanvasContrast,
  readableSubTextOnBackground,
  readableTextOnBackground,
  resolveBackgroundHex,
  suggestHighContrastBackgroundId,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import {
  canFixLogoSvgContrast,
  hasLogoSvgContrastFix,
} from "@/lib/brand/logoContrastFix";
import {
  getMonogramOnlyMarkup,
  hasMonogramSvg,
  kitHasAnyLogo,
  logoVariantColorMode,
  resolveCanvasLogo,
} from "@/lib/brand/logoVariants";
import { useDesignSession } from "@/lib/design/useDesignSession";
import { designRepository } from "@/lib/design/repository";
import type { DesignDocument } from "@/lib/design/types";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import { resolveDocumentLayout, layoutIdForDocument } from "@/lib/social-tool/layoutRegistry";
import { catalogLayoutRef, catalogLayoutToDynamic, textSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";
import { useBriefChat } from "@/lib/llm/useBriefChat";
import { buildDesignSnapshot } from "@/lib/design/buildDesignSnapshot";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { FloatingBriefComposer } from "@/components/social-tool/FloatingBriefComposer";
import { VariantPicker } from "@/components/social-tool/VariantPicker";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";

type Props = {
  designId: string;
};

export function DesignSessionSocialWorkspace({ designId }: Props) {
  const session = useDesignSession(designId);
  const doc = session.document;

  const [exportScale, setExportScale] = useState<1 | 2>(2);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.45);
  const [selectedBlock, setSelectedBlock] = useState<DesignBlockId | null>(null);
  const [adjustSpacing, setAdjustSpacing] = useState(false);
  const [contrastPanelOpen, setContrastPanelOpen] = useState(false);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelectionId | null>(
    null,
  );

  const toolThemeRef = useBrandToolTheme({
    colors: session.kit.colors,
    active: kitHasAnyLogo(session.kit),
  });

  const logoRevision = session.kit.logo?.id ?? "none";
  const isReady = doc.onboarding.phase === "ready";
  const isNeedsLogo = doc.onboarding.phase === "needsLogo";
  const isNeedsBrief = doc.onboarding.phase === "needsBrief";
  const resolvedLayout = useMemo(
    () => resolveDocumentLayout(doc),
    [doc],
  );

  const showCanvasBlocks = !isNeedsLogo;
  const template = getTemplate(doc.templateId);
  const platform = getPlatform(doc.platformId);
  const activeLayout = getPostLayout(layoutIdForDocument(doc));

  useEffect(() => {
    setSelectedBlock(null);
    setContrastPanelOpen(false);
    setCanvasSelection(null);
    session.patchDocument({
      logoBackdrop: false,
      logoInvert: false,
      textContrastBoost: false,
    });
  }, [logoRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearInspectorSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (exporting || !session.ready) return;

    const node = canvasRef.current;
    if (!node) return;

    const shouldCapture = isReady || !!session.kit.logo;
    if (!shouldCapture) return;

    if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);
    thumbnailTimerRef.current = setTimeout(() => {
      void designRepository.captureThumbnail(designId, node).catch((err) => {
        console.warn("[postforge] thumbnail capture failed", err);
      });
    }, 450);

    return () => {
      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);
    };
  }, [
    designId,
    doc.copy.heading,
    doc.layoutId,
    doc.platformId,
    doc.theme,
    doc.showBackground,
    exporting,
    isReady,
    session.kit.logo,
    session.ready,
    session.session?.updatedAt,
  ]);

  function clearInspectorSelection() {
    setCanvasSelection(null);
    setSelectedBlock(null);
    setContrastPanelOpen(false);
  }

  function handleStagePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isReady) return;
    if (isCanvasSelectableTarget(e.target)) return;
    clearInspectorSelection();
  }

  const canvasRef = useRef<HTMLDivElement>(null);
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [canvasRoot, setCanvasRoot] = useState<HTMLElement | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null,
  );

  const patchDocument = session.patchDocument;

  const composedBlockDimensions = useMemo(() => {
    if (session.featured.mode !== "composed") return undefined;
    const block = activeVisualBlock(
      session.featured.visualBlocks ?? [],
      session.featured.activeBlockId,
    );
    return block ? resolveVisualBlockDimensions(block) : VISUAL_LIBRARY_FRAME;
  }, [session.featured.mode, session.featured.visualBlocks, session.featured.activeBlockId]);

  const applyPostLayout = useCallback(
    (nextId: PostLayoutId, record: LayoutReviewRecord = loadLayoutReviews()) => {
      const layout = getPostLayout(nextId);
      const patch = getLayoutStatePatch(layout);
      const nextSpacing = resolveLayoutSpacing(record, doc.platformId, nextId);
      const nextCopy = seedCopyForLayout(doc.copy, layout);
      const hierarchy = resolveLayoutHierarchyFromIds({
        platformId: doc.platformId,
        layoutId: nextId,
        copy: nextCopy,
        spacing: nextSpacing,
        showLogo: doc.showBrand,
        showFeaturedImage: doc.showFeaturedImage,
        featuredMode: session.featured.mode,
        productPage: session.featured.productPage,
        hasUploadedFeaturedImage: !!session.featured.image,
        visualBlockDimensions: composedBlockDimensions,
      });
      patchDocument({
        layoutId: nextId,
        layoutRef: catalogLayoutRef(nextId),
        logoPlacement: patch.logoPlacement,
        logoAlign: patch.logoAlign,
        textAlign: patch.textAlign,
        layoutSpacing: nextSpacing,
        copy: nextCopy,
        typeScale: hierarchy.typeScale,
        logoScale: hierarchy.logoScale,
        featuredTransform: hierarchy.featuredTransform,
      });
    },
    [
      composedBlockDimensions,
      doc.copy,
      doc.platformId,
      doc.showBrand,
      doc.showFeaturedImage,
      patchDocument,
      session.featured.mode,
      session.featured.productPage,
    ],
  );

  function shufflePostLayout(prefs: ShufflePreferences) {
    const record = loadLayoutReviews();
    const currentLayoutId = layoutIdForDocument(doc);
    const nextLayout = prefs.layout
      ? getRandomPlaygroundLayout(doc.platformId, currentLayoutId, record)
      : getPostLayout(currentLayoutId);
    const layout = nextLayout;
    const patch = getLayoutStatePatch(layout);
    const nextSpacing = prefs.layout
      ? resolveLayoutSpacing(record, doc.platformId, nextLayout.id)
      : doc.layoutSpacing;
    let nextCopy = seedCopyForLayout(doc.copy, layout);
    let nextCopyVariantIndex = doc.copyVariantIndex ?? 0;
    if (prefs.content) {
      const shuffled = pickNextCopyVariant(
        doc.copy,
        layout,
        doc.copyVariants,
        doc.copyVariantIndex,
      );
      nextCopy = shuffled.copy;
      nextCopyVariantIndex = shuffled.nextIndex;
    }
    const hierarchy = resolveLayoutHierarchyFromIds({
      platformId: doc.platformId,
      layoutId: nextLayout.id,
      copy: nextCopy,
      spacing: nextSpacing,
      showLogo: doc.showBrand,
      showFeaturedImage: doc.showFeaturedImage,
      featuredMode: session.featured.mode,
      productPage: session.featured.productPage,
      hasUploadedFeaturedImage: !!session.featured.image,
      visualBlockDimensions: composedBlockDimensions,
    });
    const surface = pickRandomShuffleSurface({
      backgrounds: session.backgroundPresets,
      currentBackgroundId: session.kit.activeBackgroundPresetId,
      currentPattern: doc.pattern,
      currentShowPattern: doc.showPattern,
      currentPatternOpacity: doc.patternOpacity,
      currentPatternScale: doc.patternScale,
      layoutId: nextLayout.id,
      shuffleBackground: prefs.background,
      shufflePattern: prefs.pattern,
      includeBrandPatterns: hasMonogramSvg(session.kit),
    });

    if (prefs.background) {
      session.setBackgroundPreset(surface.backgroundPresetId);
    }

    patchDocument({
      ...(prefs.layout
        ? {
            layoutId: nextLayout.id,
            layoutRef: catalogLayoutRef(nextLayout.id),
            logoPlacement: patch.logoPlacement,
            logoAlign: patch.logoAlign,
            textAlign: patch.textAlign,
            layoutSpacing: nextSpacing,
            textSlots: textSlotsFromCopy(nextCopy, catalogLayoutToDynamic(nextLayout)),
          }
        : {}),
      copy: nextCopy,
      copyVariantIndex: nextCopyVariantIndex,
      typeScale: hierarchy.typeScale,
      logoScale: hierarchy.logoScale,
      ...(prefs.featuredPosition || session.featured.mode === "composed"
        ? { featuredTransform: hierarchy.featuredTransform }
        : {}),
      ...(prefs.pattern
        ? {
            pattern: surface.pattern,
            showPattern: surface.showPattern,
            patternOpacity: surface.patternOpacity,
            patternScale: surface.patternScale,
          }
        : {}),
      ...(prefs.background ? { showBackground: true } : {}),
    });

    if (
      prefs.featuredPosition &&
      session.featured.mode === "composed" &&
      (session.featured.visualBlocks?.length ?? 0) > 0
    ) {
      void session.shuffleFeaturedVisualBlock({
        headline: nextCopy.heading,
        subheading: nextCopy.subheading,
      });
    }
  }

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportOpen]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const pad = 48;
      const availW = Math.max(el.clientWidth - pad, 200);
      const availH = Math.max(el.clientHeight - pad, 200);
      const sx = availW / platform.width;
      const sy = availH / platform.height;
      setPreviewScale(Math.min(sx, sy, 1));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [platform.width, platform.height]);

  useEffect(() => {
    setOverlayContainer(viewportRef.current);
    setCanvasRoot(
      canvasRef.current?.querySelector<HTMLElement>(".social-post") ?? null,
    );
  }, [
    previewScale,
    doc.showBrand,
    doc.logoPlacement,
    session.kit.logo,
    doc.copy,
    doc.textContrastBoost,
    session.activeBackground.id,
    platform.width,
    platform.height,
  ]);

  const filename = useMemo(() => {
    return `postforge-${doc.templateId}-${platform.width}x${platform.height}`;
  }, [doc.templateId, platform.width, platform.height]);

  const activeBgCss = session.activeBackground.css.background;
  const bgHex = resolveBackgroundHex(activeBgCss);
  const canvasLogo = useMemo(
    () => resolveCanvasLogo(session.kit, activeBgCss),
    [session.kit, activeBgCss],
  );
  const canvasLogoSrc = canvasLogo
    ? (session.kit.logoSrcs?.[canvasLogo.variant] ??
      (canvasLogo.variant === "primary" ? session.kit.logoSrc : null))
    : null;
  const canvasLogoColorMode = canvasLogo
    ? logoVariantColorMode(canvasLogo.variant, canvasLogo.record)
    : "inherit";
  const patternLogoSvgMarkup = getMonogramOnlyMarkup(session.kit);
  const textColor =
    doc.showBrand && (session.kit.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableTextOnBackground(bgHex)
        : session.activeBackground.css.textOnBrand
      : undefined;
  const subTextColor =
    doc.showBrand && (session.kit.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableSubTextOnBackground(bgHex)
        : session.activeBackground.css.subText
      : undefined;

  const contrastEnabled =
    isReady && doc.showBrand && !!canvasLogo && !exporting;
  const contrastResults = useMemo(
    () =>
      evaluateCanvasContrast({
        enabled: contrastEnabled,
        backgroundCss: activeBgCss,
        logoSvgMarkup: canvasLogo?.record.svgMarkup,
        showLogo: doc.showBrand,
        textColor: textColor ?? session.activeBackground.css.textOnBrand,
        subTextColor: subTextColor ?? session.activeBackground.css.subText,
        logoBackdrop: doc.logoBackdrop,
        logoInvert: doc.logoInvert,
      }),
    [
      contrastEnabled,
      activeBgCss,
      canvasLogo?.record.svgMarkup,
      doc.showBrand,
      textColor,
      subTextColor,
      session.activeBackground.css.textOnBrand,
      session.activeBackground.css.subText,
      doc.logoBackdrop,
      doc.logoInvert,
    ],
  );

  const contrastFailingCount = contrastResults.filter((r) => !r.passes).length;
  const canFixLogoSvg = useMemo(
    () =>
      canvasLogo?.record.svgMarkup
        ? canFixLogoSvgContrast(canvasLogo.record.svgMarkup, activeBgCss, {
            logoBackdrop: doc.logoBackdrop,
          })
        : false,
    [canvasLogo?.record.svgMarkup, activeBgCss, doc.logoBackdrop],
  );
  const hasLogoSvgFix = canvasLogo
    ? hasLogoSvgContrastFix(canvasLogo.record)
    : false;
  const showContrastOverlay =
    contrastEnabled && contrastPanelOpen && contrastFailingCount > 0;

  useEffect(() => {
    if (contrastFailingCount === 0) {
      setContrastPanelOpen(false);
      setSelectedBlock(null);
    }
  }, [contrastFailingCount]);

  const inspectorSelection: CanvasSelectionId | null = isReady
    ? canvasSelection ??
      (contrastPanelOpen && selectedBlock
        ? canvasSelectionFromContrastBlock(selectedBlock)
        : null)
    : null;

  function handleCanvasSelect(id: CanvasSelectionId | null) {
    if (!isReady) return;
    if (id === null) {
      clearInspectorSelection();
      return;
    }
    setCanvasSelection(id);
    if (id === "copy") patchDocument({ showContent: true });
    if (id === "logo") patchDocument({ showBrand: true });
    if (id === "featured") patchDocument({ showFeaturedImage: true });
    if (id === "pattern") patchDocument({ showPattern: true });
  }

  function handleShowContentChange(next: boolean) {
    patchDocument({ showContent: next });
    if (!next && canvasSelection === "copy") setCanvasSelection(null);
  }

  async function handleExport(format: ExportFormat) {
    const node = canvasRef.current;
    if (!node || exporting) return;
    setExporting(format);
    setExportOpen(false);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await exportPost({
        node,
        format,
        width: platform.width,
        height: platform.height,
        scale: exportScale,
        filename,
        backgroundColor: doc.showBackground
          ? doc.theme === "light"
            ? "#f8faf9"
            : "#040c0b"
          : undefined,
        printInches: platform.printInches,
      });
    } catch (err) {
      console.error(err);
      alert("Export failed. Try again or use a smaller scale.");
    } finally {
      setExporting(null);
    }
  }

  function updateField<K extends keyof PostCopy>(key: K, value: PostCopy[K]) {
    patchDocument({ copy: { ...doc.copy, [key]: value } });
  }

  function addExtraField() {
    const n = doc.copy.extraFields.length + 1;
    patchDocument({
      copy: {
        ...doc.copy,
        extraFields: [
          ...doc.copy.extraFields,
          {
            id: `field-${Date.now()}`,
            label: `Field ${n}`,
            value: "",
          },
        ],
      },
    });
  }

  function updateExtraField(id: string, value: string) {
    patchDocument({
      copy: {
        ...doc.copy,
        extraFields: doc.copy.extraFields.map((f) =>
          f.id === id ? { ...f, value } : f,
        ),
      },
    });
  }

  function removeExtraField(id: string) {
    patchDocument({
      copy: {
        ...doc.copy,
        extraFields: doc.copy.extraFields.filter((f) => f.id !== id),
      },
    });
  }

  function handleBriefGenerate(result: BriefGenerationResult) {
    session.applyBriefGeneration(result);
  }

  function handleBriefApplyPlan(plan: ValidatedDesignPlan) {
    session.applyDesignPlan(plan);
  }

  function handleApplyCanvasPatch(patch: CanvasPatchResult) {
    return session.applyCanvasPatch(patch);
  }

  const brandSummary = useMemo(
    () => ({
      primary: session.kit.colors.primary,
      secondary: session.kit.colors.secondary,
      accent: session.kit.colors.accent,
    }),
    [
      session.kit.colors.primary,
      session.kit.colors.secondary,
      session.kit.colors.accent,
    ],
  );

  const designSnapshot = useMemo(() => {
    if (!session.session) return null;
    return buildDesignSnapshot({
      session: session.session,
      backgroundPresets: session.backgroundPresets,
      selection: inspectorSelection,
    });
  }, [
    session.session,
    session.backgroundPresets,
    inspectorSelection,
    doc.copy,
    doc.layoutId,
    doc.textSlots,
    doc.pattern,
    doc.showPattern,
    doc.showBackground,
    doc.showFeaturedImage,
    session.kit.activeBackgroundPresetId,
    session.featured.mode,
    session.featured.productPage,
    session.featured.image,
  ]);

  const briefChat = useBriefChat({
    platformId: doc.platformId,
    brandSummary,
    designSnapshot,
    onApplyPlan: handleBriefApplyPlan,
    onApplyCanvasPatch: handleApplyCanvasPatch,
    onFallbackGenerate: handleBriefGenerate,
    onOpenFeaturedUpload: () => {
      patchDocument({ showFeaturedImage: true });
      handleCanvasSelect("featured");
    },
  });

  const showFloatingComposer = isReady && inspectorSelection === null;

  const activeComposedBlock = useMemo(
    () =>
      activeVisualBlock(
        session.featured.visualBlocks ?? [],
        session.featured.activeBlockId,
      ),
    [session.featured.visualBlocks, session.featured.activeBlockId],
  );

  function handlePlatformChange(next: PlatformId) {
    const patch: Partial<DesignDocument> = { platformId: next };
    if (next === "event-standee") {
      patch.textAlign = "left";
      patch.logoAlign = "left";
    }
    patchDocument(patch);
  }

  function handleFeaturedTransformChange(value: FeaturedImageTransform) {
    patchDocument({
      featuredTransform: value,
      featuredSlots: (doc.featuredSlots ?? []).map((slot) => ({
        ...slot,
        transform: value,
      })),
    });
  }

  if (!session.ready) {
    return (
      <div className="social-tool flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-text-tertiary" aria-label="Loading design" />
      </div>
    );
  }

  return (
    <div ref={toolThemeRef} className="social-tool flex flex-col">
      <DesignToolHeader
        center={
          <CanvasPlatformPicker
            value={doc.platformId}
            onChange={handlePlatformChange}
          />
        }
      >
        <div ref={exportMenuRef} className="relative">
          <Button
            variant="primary"
            isDisabled={!!exporting || !isReady}
            onPress={() => setExportOpen((o) => !o)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
          {exportOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-leap-line bg-surface-primary p-2 shadow-lg shadow-black/20"
            >
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                Scale
              </p>
              <div className="mb-2 flex gap-1 px-1">
                {([1, 2] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportScale(s)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      exportScale === s
                        ? "bg-brand-100 text-brand-950 dark:bg-brand-800 dark:text-brand-100"
                        : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                Format
              </p>
              {(["png", "jpg", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  role="menuitem"
                  disabled={!!exporting}
                  onClick={() => handleExport(fmt)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-primary transition hover:bg-surface-secondary disabled:opacity-60"
                >
                  <Download className="size-3.5 text-text-tertiary" />
                  Download {fmt.toUpperCase()}
                </button>
              ))}
              <p className="mt-1 border-t border-leap-line px-2 pt-2 text-[11px] leading-4 text-text-tertiary">
                {platform.width}×{platform.height}
                {exportScale > 1 ? ` @ ${exportScale}x` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </DesignToolHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside
          className={`social-tool-aside flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-b border-leap-line lg:h-full lg:w-[360px] lg:border-r lg:border-b-0${
            isNeedsBrief ? " social-tool-aside--brief" : ""
          }`}
        >
          <DesignInspector
            phase={doc.onboarding.phase}
            platformId={doc.platformId}
            inspectorSelection={inspectorSelection}
            showContent={doc.showContent}
            onShowContentChange={handleShowContentChange}
            copy={doc.copy}
            onUpdateField={updateField}
            onAddExtraField={addExtraField}
            onRemoveExtraField={removeExtraField}
            onUpdateExtraField={updateExtraField}
            textAlign={doc.textAlign}
            onTextAlignChange={(v) => patchDocument({ textAlign: v })}
            headingFont={doc.headingFont}
            onHeadingFontChange={(v) => patchDocument({ headingFont: v })}
            subFont={doc.subFont}
            onSubFontChange={(v) => patchDocument({ subFont: v })}
            typeScale={doc.typeScale}
            onTypeScaleChange={(v) => patchDocument({ typeScale: v })}
            showBrand={doc.showBrand}
            onShowBrandChange={(v) => patchDocument({ showBrand: v })}
            logoScale={doc.logoScale}
            onLogoScaleChange={(v) => patchDocument({ logoScale: v })}
            logoPlacement={doc.logoPlacement}
            onLogoPlacementChange={(v) => patchDocument({ logoPlacement: v })}
            logoAlign={doc.logoAlign}
            onLogoAlignChange={(v) => patchDocument({ logoAlign: v })}
            showFeaturedImage={doc.showFeaturedImage}
            onShowFeaturedImageChange={(v) => patchDocument({ showFeaturedImage: v })}
            featuredTransform={doc.featuredTransform}
            onFeaturedTransformChange={handleFeaturedTransformChange}
            pattern={doc.pattern}
            onPatternChange={(v) => patchDocument({ pattern: v })}
            patternTint={session.activeBackground.css.patternTint}
            designId={designId}
            showPattern={doc.showPattern}
            onShowPatternChange={(v) => patchDocument({ showPattern: v })}
            showBackground={doc.showBackground}
            onShowBackgroundChange={(v) => patchDocument({ showBackground: v })}
            patternOpacity={doc.patternOpacity}
            onPatternOpacityChange={(v) => patchDocument({ patternOpacity: v })}
            patternScale={doc.patternScale}
            onPatternScaleChange={(v) => patchDocument({ patternScale: v })}
            patternAnimated={doc.patternAnimated}
            onPatternAnimatedChange={(v) => patchDocument({ patternAnimated: v })}
            brand={{
              kit: session.kit,
              uploading: session.brandUploading,
              error: session.brandError,
              uploadLogo: session.uploadLogo,
              uploadLogoVariant: session.uploadLogoVariant,
              removeLogoVariant: session.removeLogoVariant,
              setColor: session.setColor,
              resetColor: session.resetColor,
              applySwatch: session.applySwatch,
              solidBackgroundPresets: session.solidBackgroundPresets,
              gradientBackgroundPresets: session.gradientBackgroundPresets,
              activeBackground: session.activeBackground,
              harmonySwatches: session.harmonySwatches,
              setBackgroundPreset: session.setBackgroundPreset,
            }}
            featured={{
              mode: session.featured.mode,
              visualBlocks: session.featured.visualBlocks ?? [],
              activeBlockId: session.featured.activeBlockId,
              generatingVisualBlocks: session.generatingVisualBlocks,
              featuredVisualKind: doc.featuredVisualKind,
              brandColors: {
                primary: session.kit.colors.primary,
                accent: session.kit.colors.accent,
              },
              onGenerateVisualBlocks: (source, options) =>
                void session.generateVisualBlocks({
                  source,
                  pickFeatured: options?.pickFeatured,
                  preferredKind: options?.preferredKind,
                }),
              onShuffleVisualBlock: () => void session.shuffleFeaturedVisualBlock(),
              onSelectVisualBlock: session.selectVisualBlock,
              image: session.featured.image,
              imageSrc: session.featuredImageSrc,
              uploading: session.featuredUploading,
              error: session.featuredError,
              onUploadImage: session.uploadFeaturedImage,
              onRemoveImage: session.removeFeaturedImage,
            }}
            onBriefGenerate={handleBriefGenerate}
            onBriefApplyPlan={handleBriefApplyPlan}
            onBriefSkip={session.skipBrief}
            briefChat={briefChat}
            brandSummary={brandSummary}
          />
        </aside>

        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto overscroll-contain bg-[color-mix(in_oklab,var(--gray-950)_6%,var(--surface-primary))] p-6 dark:bg-[color-mix(in_oklab,var(--white)_4%,var(--surface-primary))]"
          onPointerDown={handleStagePointerDown}
        >
          <div className="flex w-full max-w-full flex-col items-center gap-3">
            <div
              className="canvas-preview-stack"
              style={{ width: platform.width * previewScale }}
            >
              {isReady ? (
                <div className="canvas-preview-toolbar">
                  <LayoutShuffleButton
                    layoutName={activeLayout.name}
                    onShuffle={shufflePostLayout}
                  />
                  <div className="canvas-preview-toolbar-end">
                    <LayoutSpacingToggle
                      enabled={adjustSpacing}
                      onToggle={() => setAdjustSpacing((on) => !on)}
                    />
                    {contrastEnabled && contrastFailingCount > 0 ? (
                      <ContrastIssuesToggle
                        results={contrastResults}
                        open={contrastPanelOpen}
                        onOpenChange={setContrastPanelOpen}
                        selectedBlock={selectedBlock}
                        onSelectBlock={(id) => {
                          setSelectedBlock(id);
                          if (id) {
                            handleCanvasSelect(canvasSelectionFromContrastBlock(id));
                          }
                        }}
                        logoBackdrop={doc.logoBackdrop}
                        logoInvert={doc.logoInvert}
                        hasSvgLogo={canvasLogo?.record.mime === "image/svg+xml"}
                        canFixLogoSvg={canFixLogoSvg}
                        hasLogoSvgFix={hasLogoSvgFix}
                        onFixLogoBackdrop={() => patchDocument({ logoBackdrop: true })}
                        onFixLogoInvert={() =>
                          patchDocument({ logoInvert: !doc.logoInvert })
                        }
                        onFixLogoSvgContrast={() =>
                          session.fixLogoSvgContrast(activeBgCss, doc.logoBackdrop)
                        }
                        onRestoreLogoSvg={() => session.restoreLogoSvg()}
                        onFixBackground={() => {
                          session.setBackgroundPreset(suggestHighContrastBackgroundId());
                          patchDocument({ logoBackdrop: false });
                        }}
                        onFixTextContrast={() => {
                          session.setBackgroundPreset(suggestHighContrastBackgroundId());
                          patchDocument({ textContrastBoost: true });
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
              {briefChat.pendingVariants?.length ? (
                <VariantPicker
                  variants={briefChat.pendingVariants}
                  activeTheme={briefChat.activeVariantTheme}
                  onApply={briefChat.applyVariant}
                />
              ) : null}
              <div
                ref={viewportRef}
                className="relative overflow-hidden"
                style={{
                  width: platform.width * previewScale,
                  height: platform.height * previewScale,
                }}
              >
                <div
                  className="origin-top-left"
                  style={{
                    width: platform.width,
                    height: platform.height,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div
                    className="relative"
                    style={{ width: platform.width, height: platform.height }}
                  >
                    <div ref={canvasRef}>
                      {isNeedsLogo ? (
                        <LayoutPreviewEmptyState
                          width={platform.width}
                          height={platform.height}
                          previewScale={previewScale}
                        />
                      ) : (
                      <ProductShotPost
                        width={platform.width}
                        height={platform.height}
                        copy={doc.copy}
                        pattern={doc.pattern}
                        designId={designId}
                        showPattern={doc.showPattern && showCanvasBlocks}
                        showBackground={doc.showBackground && showCanvasBlocks}
                        exporting={!!exporting}
                        patternOpacity={doc.patternOpacity}
                        patternScale={doc.patternScale}
                        patternAnimated={doc.patternAnimated && !exporting && isReady}
                        productPage={session.featured.productPage}
                        featuredMode={session.featured.mode}
                        composedSvgMarkup={
                          session.featured.mode === "composed"
                            ? activeComposedBlock?.svgMarkup ?? null
                            : null
                        }
                        composedBlock={
                          session.featured.mode === "composed" ? activeComposedBlock ?? null : null
                        }
                        brandColors={{
                          primary: session.kit.colors.primary,
                          accent: session.kit.colors.accent,
                        }}
                        visualBlocks={session.featured.visualBlocks ?? []}
                        activeVisualBlockId={session.featured.activeBlockId}
                        generatingVisualBlocks={session.generatingVisualBlocks}
                        onGenerateVisualBlocks={(source, options) =>
                          void session.generateVisualBlocks({
                            source,
                            pickFeatured: options?.pickFeatured,
                          })
                        }
                        onSelectVisualBlock={session.selectVisualBlock}
                        featuredImageSrc={session.featuredImageSrc}
                        featuredSvgMarkup={session.featured.image?.svgMarkup ?? null}
                        hasFeaturedImage={!!session.featured.image}
                        typeScale={doc.typeScale}
                        logoScale={doc.logoScale}
                        logoAlign={doc.logoAlign}
                        logoPlacement={doc.logoPlacement}
                        showLogo={doc.showBrand}
                        showFeaturedImage={doc.showFeaturedImage && showCanvasBlocks}
                        featuredTransform={doc.featuredTransform}
                        onFeaturedTransformChange={handleFeaturedTransformChange}
                        previewScale={previewScale}
                        interactive={!exporting && isReady}
                        textAlign={doc.textAlign}
                        headingFont={doc.headingFont}
                        subFont={doc.subFont}
                        accentPeriod={template.accentPeriod}
                        logoSrc={canvasLogoSrc}
                        logoSvgMarkup={canvasLogo?.record.svgMarkup ?? null}
                        patternLogoSvgMarkup={patternLogoSvgMarkup}
                        hasUploadedLogo={!!canvasLogo}
                        backgroundPreset={
                          doc.showBackground && session.kit.activeBackgroundPresetId
                            ? session.activeBackground.css
                            : undefined
                        }
                        designMode={showContrastOverlay}
                        onSelectBlock={setSelectedBlock}
                        logoBackdrop={doc.logoBackdrop}
                        logoInvert={doc.logoInvert}
                        logoUsesExplicitColors={
                          canvasLogo?.record.usesExplicitColors ?? false
                        }
                        logoColorMode={canvasLogoColorMode}
                        textColorOverride={textColor}
                        subTextColorOverride={subTextColor}
                        layoutId={doc.layoutId}
                        dynamicLayout={resolvedLayout}
                        textSlots={doc.textSlots}
                        featuredSlots={doc.featuredSlots}
                        spacing={doc.layoutSpacing}
                        onSpacingChange={(v) => patchDocument({ layoutSpacing: v })}
                        showSpacingControls={adjustSpacing && isReady}
                        canvasSelection={inspectorSelection}
                        onCanvasSelect={handleCanvasSelect}
                        showContent={
                          (doc.showContent || isNeedsBrief) && showCanvasBlocks
                        }
                      />
                      )}
                    </div>
                  </div>
                </div>
                {showContrastOverlay ? (
                  <CanvasDesignOverlay
                    containerRoot={overlayContainer}
                    canvasRoot={canvasRoot}
                    enabled={contrastEnabled}
                    results={contrastResults}
                    selectedBlock={selectedBlock}
                    onSelectBlock={setSelectedBlock}
                  />
                ) : null}
              </div>
            </div>
          </div>
          {showFloatingComposer ? (
            <FloatingBriefComposer {...briefChat} mode="follow-up" />
          ) : null}
        </div>
      </div>
    </div>
  );
}

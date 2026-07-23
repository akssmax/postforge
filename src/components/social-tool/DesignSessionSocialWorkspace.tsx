"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown, Download, Loader2, PanelLeft } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import {
  DesignInspector,
  type AsideTab,
} from "@/components/social-tool/DesignInspector";
import { DesignToolHeader } from "@/components/social-tool/DesignToolHeader";
import { CanvasPlatformPicker } from "@/components/social-tool/CanvasPlatformPicker";
import { CanvasDesignOverlay } from "@/components/social-tool/CanvasDesignOverlay";
import { ContrastIssuesToggle } from "@/components/social-tool/ContrastIssuesToggle";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import {
  getPlatform,
  type PlatformId,
  type PostCopy,
} from "@/lib/social-tool/presets";
import { exportPost, type ExportFormat } from "@/lib/social-tool/exportPost";
import { useBrandToolTheme } from "@/lib/brand/useBrandToolTheme";
import { LayoutPreviewEmptyState } from "@/components/social-tool/LayoutPreviewEmptyState";
import { CanvasZoomControls } from "@/components/social-tool/CanvasZoomControls";
import { CanvasHistoryControls } from "@/components/social-tool/CanvasHistoryControls";
import { CanvasArtboardSwitcher } from "@/components/social-tool/CanvasArtboardSwitcher";
import {
  AnimatePresence as VariantAnimatePresence,
  CanvasVariantArtboard,
  CanvasVariantSkeleton,
} from "@/components/social-tool/CanvasVariantArtboard";
import {
  ASIDE_PANEL_WIDTH_PX,
  asidePanelSpring,
} from "@/components/social-tool/asidePanelMotion";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useCanvasPreviewViewport } from "@/lib/social-tool/useCanvasPreviewViewport";
import type { ShufflePreferences } from "@/lib/social-tool/shufflePreferences";
import { applyShuffleToSession } from "@/lib/social-tool/applyShuffle";
import { shuffleFeaturedVisualForSession } from "@/lib/social-tool/generateDesignVariants";
import { useDesignVariantGroup } from "@/lib/design/useDesignVariantGroup";
import { loadDesignSession } from "@/lib/design/designSession";
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
  kitHasAnyLogo,
  resolveCanvasLogo,
} from "@/lib/brand/logoVariants";
import { useDesignSession } from "@/lib/design/useDesignSession";
import { designRepository } from "@/lib/design/repository";
import type { DesignDocument, DesignSessionPersisted } from "@/lib/design/types";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import { useBriefChat } from "@/lib/llm/useBriefChat";
import { buildDesignSnapshot } from "@/lib/design/buildDesignSnapshot";
import type {
  ArtboardTarget,
  CanvasPatchResult,
} from "@/lib/llm/schemas/canvasTools";
import { applyCanvasPatchToSession } from "@/lib/llm/services/applyCanvasPatch";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { VariantPicker } from "@/components/social-tool/VariantPicker";

type Props = {
  designId: string;
};

export function DesignSessionSocialWorkspace({ designId }: Props) {
  const originDesignId = designId;
  const variantGroup = useDesignVariantGroup(originDesignId);
  const boardsRef = useRef(variantGroup.boards);
  boardsRef.current = variantGroup.boards;
  const session = useDesignSession(variantGroup.activeDesignId, {
    getSeedSession: () =>
      boardsRef.current.find((b) => b.designId === variantGroup.activeDesignId) ??
      null,
  });
  const doc = session.document;

  const [exportScale, setExportScale] = useState<1 | 2>(2);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<DesignBlockId | null>(null);
  const [adjustSpacing, setAdjustSpacing] = useState(false);
  const [contrastPanelOpen, setContrastPanelOpen] = useState(false);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelectionId | null>(
    null,
  );
  const [asideTab, setAsideTab] = useState<AsideTab>("chat");
  const [asideCollapsed, setAsideCollapsed] = useState(false);
  const reduceMotion = useReducedMotion();
  const asideTransition = reduceMotion ? { duration: 0 } : asidePanelSpring;

  useEffect(() => {
    if (session.session) variantGroup.syncBoard(session.session);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync live active session into board list
  }, [session.session]);

  const toolThemeRef = useBrandToolTheme({
    colors: session.kit.colors,
    active: kitHasAnyLogo(session.kit),
  });

  const logoRevision = session.kit.logo?.id ?? "none";
  const isReady = doc.onboarding.phase === "ready";
  const isNeedsLogo = doc.onboarding.phase === "needsLogo";
  const isNeedsBrief = doc.onboarding.phase === "needsBrief";
  const showCanvasBlocks = !isNeedsLogo;
  const platform = getPlatform(doc.platformId);

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

  const undoRef = useRef(session.undo);
  const redoRef = useRef(session.redo);
  undoRef.current = session.undo;
  redoRef.current = session.redo;

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        target.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        !!target.closest("[contenteditable='true']")
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearInspectorSelection();
        return;
      }

      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.code === "KeyZ" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        undoRef.current();
        return;
      }
      if (
        (e.code === "KeyZ" && e.shiftKey && !e.altKey) ||
        (e.code === "KeyY" && !e.shiftKey && !e.altKey)
      ) {
        e.preventDefault();
        redoRef.current();
      }
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
      if (variantGroup.activeDesignId !== originDesignId) return;
      void designRepository.captureThumbnail(originDesignId, node).catch((err) => {
        console.warn("[postforge] thumbnail capture failed", err);
      });
    }, 450);

    return () => {
      if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current);
    };
  }, [
    originDesignId,
    variantGroup.activeDesignId,
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
    if (e.button === 1 || spaceDown || handActive) return;
    if (!isReady) return;
    if (isCanvasSelectableTarget(e.target)) return;
    clearInspectorSelection();
  }

  const canvasRef = useRef<HTMLDivElement>(null);
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  const [canvasRoot, setCanvasRoot] = useState<HTMLElement | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null,
  );

  const {
    previewScale,
    panStyle,
    zoomPercent,
    canActualSize,
    spaceDown,
    handMode,
    handActive,
    zoomIn,
    zoomOut,
    resetZoom,
    setActualSize,
    toggleHandMode,
    nudgePan,
    panElementIntoView,
    stagePanProps,
  } = useCanvasPreviewViewport({
    stageEl,
    platformWidth: platform.width,
    platformHeight: platform.height,
  });

  const artboardSwitcherItems = useMemo(() => {
    const boards =
      variantGroup.boards.length > 0
        ? variantGroup.boards
        : session.session
          ? [session.session]
          : [];
    const boardNames = variantGroup.group.boardNames;
    return boards.map((board, i) => ({
      id: board.designId,
      // Switcher always shows fixed 1–7 indices (never custom names)
      label: String(i + 1),
      name: boardNames?.[board.designId],
    }));
  }, [variantGroup.boards, variantGroup.group.boardNames, session.session]);

  useEffect(() => {
    if (variantGroup.phase !== "revealing") return;
    // Nudge stage so newly revealed variants sit in view
    nudgePan({ x: -(platform.width * previewScale * 0.35) });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- settle pan once per generate reveal
  }, [variantGroup.phase]);

  useEffect(() => {
    if (!session.session?.brand || variantGroup.boards.length <= 1) return;
    variantGroup.broadcastBrandIdentity(session.session.brand);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keep logos/colors shared across artboards
  }, [logoRevision]);

  const patchDocument = session.patchDocument;

  function boardSessionFor(boardId: string): DesignSessionPersisted | null {
    if (
      boardId === variantGroup.activeDesignId &&
      session.session
    ) {
      return session.session;
    }
    return (
      variantGroup.boards.find((b) => b.designId === boardId) ??
      (boardId === originDesignId ? loadDesignSession(originDesignId) : null)
    );
  }

  async function shuffleBoard(boardId: string, prefs: ShufflePreferences) {
    const source = boardSessionFor(boardId);
    if (!source) return;
    const result = applyShuffleToSession(source, {
      prefs,
      backgrounds: session.backgroundPresets,
    });

    let next = result.session;
    if (result.shouldShuffleFeaturedVisual) {
      next = (await shuffleFeaturedVisualForSession(next)).session;
    }

    // Persist only this artboard's snapshot
    variantGroup.replaceBoard(next);

    if (boardId === variantGroup.activeDesignId) {
      session.adoptSession(next);
    }
  }

  async function handleGenerateVariants() {
    const originLive =
      variantGroup.activeDesignId === originDesignId && session.session
        ? session.session
        : (variantGroup.boards.find((b) => b.designId === originDesignId) ??
          loadDesignSession(originDesignId));
    setAdjustSpacing(false);
    clearInspectorSelection();
    await variantGroup.generateVariants(originLive);
  }

  function handleActivateBoard(boardId: string) {
    if (boardId !== variantGroup.activeDesignId) {
      // Flush the leaving board into the variant cache + storage before switch
      if (session.session) {
        variantGroup.syncBoard(session.session);
      }
      setAdjustSpacing(false);
      clearInspectorSelection();
      variantGroup.setActiveDesignId(boardId);
    }
    // Bring the artboard into the stage center (works even when off-screen)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const node = stageEl?.querySelector<HTMLElement>(
          `[data-artboard-id="${boardId}"]`,
        );
        if (node) panElementIntoView(node);
      });
    });
  }

  // Keys 1–7 select artboards 1–7 (matches switcher pills)
  useEffect(() => {
    if (!isReady || artboardSwitcherItems.length <= 1) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          target.isContentEditable ||
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.closest("[contenteditable='true']")
        ) {
          return;
        }
      }

      const digit =
        e.code.match(/^Digit([1-7])$/)?.[1] ??
        e.code.match(/^Numpad([1-7])$/)?.[1];
      if (digit == null) return;
      const index = Number(digit) - 1;
      const board = artboardSwitcherItems[index];
      if (!board) return;
      e.preventDefault();
      handleActivateBoard(board.id);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activate via latest handleActivateBoard
  }, [isReady, artboardSwitcherItems, stageEl, variantGroup.activeDesignId]);

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

  useEffect(() => {
    if (inspectorSelection !== null) {
      setAsideTab("design");
      setAsideCollapsed(false);
    }
  }, [inspectorSelection]);

  useEffect(() => {
    if (!isReady) setAsideCollapsed(false);
  }, [isReady]);

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
    const node =
      stageEl?.querySelector<HTMLElement>(
        `[data-artboard-id="${variantGroup.activeDesignId}"] .social-post`,
      ) ??
      canvasRef.current?.querySelector<HTMLElement>(".social-post") ??
      canvasRef.current;
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

  function resolveTargetBoardIds(target: ArtboardTarget | undefined): string[] {
    const boards =
      variantGroup.boards.length > 0
        ? variantGroup.boards
        : session.session
          ? [session.session]
          : [];
    if (boards.length === 0) return [variantGroup.activeDesignId];

    if (!target || target === "active") {
      return [variantGroup.activeDesignId];
    }
    if (target === "all") {
      return boards.map((board) => board.designId);
    }
    return target
      .map((index) => boards[index - 1]?.designId)
      .filter((id): id is string => Boolean(id));
  }

  function handleApplyCanvasPatch(patch: CanvasPatchResult) {
    if (!patch.success) return false;

    const boardIds = resolveTargetBoardIds(patch.targetArtboards);
    let applied = false;

    for (const boardId of boardIds) {
      if (boardId === variantGroup.activeDesignId) {
        if (session.applyCanvasPatch(patch)) applied = true;
        continue;
      }

      const board =
        variantGroup.boards.find((b) => b.designId === boardId) ??
        loadDesignSession(boardId);
      if (!board) continue;
      const next = applyCanvasPatchToSession(board, patch);
      variantGroup.replaceBoard(next);
      applied = true;
    }

    return applied;
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
    const boards =
      variantGroup.boards.length > 0
        ? variantGroup.boards
        : [session.session];
    const activeIndex = Math.max(
      1,
      boards.findIndex((b) => b.designId === variantGroup.activeDesignId) + 1,
    );
    return buildDesignSnapshot({
      session: session.session,
      backgroundPresets: session.backgroundPresets,
      selection: inspectorSelection,
      artboards: {
        activeIndex,
        count: Math.min(7, boards.length),
        boards: boards.slice(0, 7).map((board, index) => ({
          index: index + 1,
          designId: board.designId,
          layoutName: getPostLayout(board.document.layoutId).name,
          headline: board.document.copy.heading,
        })),
      },
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
    variantGroup.boards,
    variantGroup.activeDesignId,
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

  function handlePlatformChange(next: PlatformId) {
    const patch: Partial<DesignDocument> = { platformId: next };
    if (next === "event-standee") {
      patch.textAlign = "left";
      patch.logoAlign = "left";
    }
    patchDocument(patch);
    variantGroup.broadcastPlatform(next);
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

      <LayoutGroup id="design-aside-panel">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <AnimatePresence initial={false} mode="sync">
        {!asideCollapsed ? (
        <motion.aside
          key="design-aside"
          initial={
            reduceMotion
              ? false
              : { opacity: 0, x: -36, width: 0 }
          }
          animate={{
            opacity: 1,
            x: 0,
            width: ASIDE_PANEL_WIDTH_PX,
          }}
          exit={
            reduceMotion
              ? { opacity: 0, width: 0 }
              : { opacity: 0, x: -28, width: 0 }
          }
          transition={asideTransition}
          className={`social-tool-aside social-tool-aside--motion flex min-h-0 shrink-0 flex-col overflow-hidden border-b border-leap-line lg:h-full lg:border-r lg:border-b-0${
            isNeedsBrief || isReady ? " social-tool-aside--brief" : ""
          }`}
        >
          <div className="social-tool-aside__inner flex min-h-0 w-full min-w-[min(100%,360px)] flex-1 flex-col overflow-y-auto overscroll-contain lg:w-[360px]">
          <DesignInspector
            phase={doc.onboarding.phase}
            platformId={doc.platformId}
            inspectorSelection={inspectorSelection}
            asideTab={asideTab}
            onAsideTabChange={setAsideTab}
            onCollapseAside={
              isReady ? () => setAsideCollapsed(true) : undefined
            }
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
              onShuffleVisualBlock: (preferredKind) =>
                void session.shuffleFeaturedVisualBlock({ preferredKind }),
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
          </div>
        </motion.aside>
        ) : null}
        </AnimatePresence>

        <div
          ref={setStageEl}
          className="social-tool-canvas-stage relative flex min-h-0 flex-1 items-center justify-center overflow-hidden overscroll-none bg-[color-mix(in_oklab,var(--gray-950)_6%,var(--surface-primary))] p-6 dark:bg-[color-mix(in_oklab,var(--white)_4%,var(--surface-primary))]"
          onPointerDown={handleStagePointerDown}
          {...stagePanProps}
        >
          <CanvasZoomControls
            zoomPercent={zoomPercent}
            canActualSize={canActualSize}
            handActive={handActive}
            handMode={handMode}
            onToggleHand={toggleHandMode}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
            onActualSize={setActualSize}
            leading={
              asideCollapsed ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <Button
                      variant="secondary"
                      size="sm"
                      isIconOnly
                      aria-label="Show sidebar"
                      className="canvas-tool-pill-btn canvas-zoom-icon-btn"
                      onPress={() => setAsideCollapsed(false)}
                    >
                      <PanelLeft className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    <p className="layout-shuffle-tooltip-title">Show sidebar</p>
                    <p className="layout-shuffle-tooltip-body">
                      Open Design and Chat controls
                    </p>
                  </Tooltip.Content>
                </Tooltip>
              ) : null
            }
          />
          <CanvasHistoryControls
            canUndo={session.canUndo}
            canRedo={session.canRedo}
            onUndo={() => {
              session.undo();
            }}
            onRedo={() => {
              session.redo();
            }}
            historyLimitToast={session.historyLimitToast}
          />
          <CanvasArtboardSwitcher
            boards={artboardSwitcherItems}
            activeId={variantGroup.activeDesignId}
            onSelect={handleActivateBoard}
          />
          <div
            className="canvas-pan-layer flex w-max max-w-none shrink-0 flex-col items-center gap-3"
            style={panStyle}
          >
            {isNeedsLogo ? (
              <div
                className="canvas-preview-stack"
                style={{ width: platform.width * previewScale }}
              >
                <div
                  ref={viewportRef}
                  className="relative overflow-hidden"
                  style={{
                    width: platform.width * previewScale,
                    height: platform.height * previewScale,
                  }}
                >
                  <div ref={canvasRef}>
                    <LayoutPreviewEmptyState
                      width={platform.width}
                      height={platform.height}
                      previewScale={previewScale}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="canvas-artboard-row flex items-start gap-8">
                {(variantGroup.boards.length > 0
                  ? variantGroup.boards
                  : session.session
                    ? [session.session]
                    : []
                ).map((board, index) => {
                  const isActive = board.designId === variantGroup.activeDesignId;
                  const isOrigin = board.designId === originDesignId;
                  const liveBoard =
                    isActive &&
                    session.session?.designId === board.designId
                      ? session.session
                      : board;

                  return (
                    <CanvasVariantArtboard
                      key={board.designId}
                      board={liveBoard}
                      originDesignId={originDesignId}
                      index={index}
                      isActive={isActive}
                      isOrigin={isOrigin}
                      previewScale={previewScale}
                      adjustSpacing={adjustSpacing}
                      onToggleSpacing={() => setAdjustSpacing((on) => !on)}
                      onActivate={() => handleActivateBoard(board.designId)}
                      artboardName={
                        variantGroup.group.boardNames?.[board.designId]
                      }
                      onRenameArtboard={(name) => {
                        variantGroup.setBoardName(board.designId, name);
                      }}
                      onShuffle={(prefs) => {
                        void shuffleBoard(board.designId, prefs);
                      }}
                      onGenerateVariants={() => {
                        void handleGenerateVariants();
                      }}
                      generatingVariants={variantGroup.generating}
                      canGenerate={isReady}
                      showGenerateButton={
                        isReady &&
                        variantGroup.canGenerateMore &&
                        (variantGroup.boards.length <= 1
                          ? isOrigin
                          : board.designId ===
                            variantGroup.boards[variantGroup.boards.length - 1]
                              ?.designId)
                      }
                      liveFeaturedImageSrc={
                        isActive ? session.featuredImageSrc : undefined
                      }
                      liveLogoSrc={isActive ? canvasLogoSrc : undefined}
                      interactive={!exporting && isReady && !handActive}
                      handActive={handActive}
                      exporting={!!exporting}
                      canvasSelection={inspectorSelection}
                      onCanvasSelect={handleCanvasSelect}
                      onFeaturedTransformChange={handleFeaturedTransformChange}
                      onHistoryCoalesceBegin={session.beginHistoryCoalesce}
                      onHistoryCoalesceEnd={session.endHistoryCoalesce}
                      onSpacingChange={(v) =>
                        patchDocument({ layoutSpacing: v })
                      }
                      onSelectVisualBlock={session.selectVisualBlock}
                      onGenerateVisualBlocks={(source, options) =>
                        void session.generateVisualBlocks({
                          source,
                          pickFeatured: options?.pickFeatured,
                        })
                      }
                      generatingVisualBlocks={session.generatingVisualBlocks}
                      canvasRef={isActive ? canvasRef : undefined}
                      viewportRef={isActive ? viewportRef : undefined}
                      reveal={variantGroup.phase === "ready" || variantGroup.phase === "revealing"}
                      showContent={
                        (liveBoard.document.showContent || isNeedsBrief) &&
                        showCanvasBlocks
                      }
                      toolbarEndExtra={
                        isActive &&
                        contrastEnabled &&
                        contrastFailingCount > 0 ? (
                          <ContrastIssuesToggle
                            results={contrastResults}
                            open={contrastPanelOpen}
                            onOpenChange={setContrastPanelOpen}
                            selectedBlock={selectedBlock}
                            onSelectBlock={(id) => {
                              setSelectedBlock(id);
                              if (id) {
                                handleCanvasSelect(
                                  canvasSelectionFromContrastBlock(id),
                                );
                              }
                            }}
                            logoBackdrop={doc.logoBackdrop}
                            logoInvert={doc.logoInvert}
                            hasSvgLogo={
                              canvasLogo?.record.mime === "image/svg+xml"
                            }
                            canFixLogoSvg={canFixLogoSvg}
                            hasLogoSvgFix={hasLogoSvgFix}
                            onFixLogoBackdrop={() =>
                              patchDocument({ logoBackdrop: true })
                            }
                            onFixLogoInvert={() =>
                              patchDocument({ logoInvert: !doc.logoInvert })
                            }
                            onFixLogoSvgContrast={() =>
                              session.fixLogoSvgContrast(
                                activeBgCss,
                                doc.logoBackdrop,
                              )
                            }
                            onRestoreLogoSvg={() => session.restoreLogoSvg()}
                            onFixBackground={() => {
                              session.setBackgroundPreset(
                                suggestHighContrastBackgroundId(),
                              );
                              patchDocument({ logoBackdrop: false });
                            }}
                            onFixTextContrast={() => {
                              session.setBackgroundPreset(
                                suggestHighContrastBackgroundId(),
                              );
                              patchDocument({ textContrastBoost: true });
                            }}
                          />
                        ) : null
                      }
                    />
                  );
                })}

                <VariantAnimatePresence>
                  {variantGroup.phase === "preparing" &&
                  variantGroup.pendingBatchSize > 0
                    ? Array.from(
                        { length: variantGroup.pendingBatchSize },
                        (_, i) => (
                          <CanvasVariantSkeleton
                            key={`skeleton-${i}`}
                            width={platform.width}
                            height={platform.height}
                            previewScale={previewScale}
                            index={
                              Math.max(0, variantGroup.boards.length - 1) + i + 1
                            }
                          />
                        ),
                      )
                    : null}
                </VariantAnimatePresence>

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
            )}

            {briefChat.pendingVariants?.length ? (
              <VariantPicker
                variants={briefChat.pendingVariants}
                activeTheme={briefChat.activeVariantTheme}
                onApply={briefChat.applyVariant}
              />
            ) : null}
          </div>
        </div>
      </div>
      </LayoutGroup>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown, Download, Loader2, PanelLeft } from "lucide-react";
import { Button, Modal, Tooltip, useOverlayState } from "@heroui/react";
import {
  DesignInspector,
  type AsideTab,
} from "@/components/social-tool/DesignInspector";
import { DesignToolHeader } from "@/components/social-tool/DesignToolHeader";
import { ExportMenu } from "@/components/social-tool/ExportMenu";
import { ExportProgressOverlay } from "@/components/social-tool/ExportProgressOverlay";
import { CanvasPlatformBadgePicker } from "@/components/social-tool/CanvasPlatformPicker";
import { ContrastIssuesToggle } from "@/components/social-tool/ContrastIssuesToggle";
import {
  DEFAULT_FEATURED_TRANSFORM,
  type FeaturedImageTransform,
} from "@/components/social-tool/templates/ProductShotPost";
import {
  catalogLayoutRef,
  getEditableTextSlots,
  patchTextSlot,
  resolveLayoutRef,
  syncDocumentTextSlots,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import {
  getPlatform,
  type PlatformId,
  type PostCopy,
} from "@/lib/social-tool/presets";
import { adaptSessionToPlatform } from "@/lib/social-tool/adaptPlatformChange";
import type { ExportFormat } from "@/lib/social-tool/exportPost";
import { resolveDesignCanvasSize } from "@/lib/design-engine/canvasSpec";
import {
  buildCampaignSlug,
  exportArtboards,
  resolveArtboardExportTargets,
  resolveExportTargetIds,
  waitForExportPaint,
  type ExportScope,
} from "@/lib/social-tool/exportArtboards";
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
import { DesignRendererArtboard } from "@/components/social-tool/DesignRendererArtboard";
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
  featuredSlotIdFromSelection,
  isCanvasSelectableTarget,
  canvasSelectionKind,
  type CanvasSelectionId,
} from "@/lib/social-tool/canvasSelection";
import { imageFileFromDataTransfer } from "@/lib/social-tool/featuredImageDrop";
import {
  FEATURED_PRIMARY_SLOT_ID,
  ensureFeaturedSlots,
  findFeaturedSlot,
  patchFeaturedSlot,
} from "@/lib/social-tool/featuredSlots";
import {
  evaluateCanvasContrast,
  readableSubTextOnBackground,
  readableTextOnBackground,
  resolveBackgroundHex,
  suggestHighContrastBackgroundId,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import {
  resolveFeaturedSvgForContrast,
  suggestVisualBalanceFix,
} from "@/lib/brand/designQuality";
import {
  buildAccentContrastFix,
  buildContrastIssueChatPrompt,
} from "@/lib/brand/contrastFixes";
import type { ContrastResult } from "@/lib/brand/contrast";
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
import {
  shouldSpreadCopyAcrossArtboards,
  spreadCopyPatchForArtboard,
} from "@/lib/llm/services/spreadCopyPatch";
import { recordHistorySnapshot } from "@/lib/design/useDesignHistory";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { pickCopyVariantByDelta } from "@/lib/social-tool/shuffleCopy";
import { VariantPicker } from "@/components/social-tool/VariantPicker";
import { EditorShortcutsPopover } from "@/components/social-tool/EditorShortcutsPopover";

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
  const [exportScope, setExportScope] = useState<ExportScope>("active");
  const [selectedBoardIds, setSelectedBoardIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [exportProgress, setExportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [exportTargetIds, setExportTargetIds] = useState<Set<string>>(
    () => new Set(),
  );
  const exportAbortRef = useRef<AbortController | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<DesignBlockId | null>(null);
  const [adjustSpacing, setAdjustSpacing] = useState(false);
  const [contrastPanelOpen, setContrastPanelOpen] = useState(false);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelectionId | null>(
    null,
  );
  const [asideTab, setAsideTab] = useState<AsideTab>("chat");
  const [asideCollapsed, setAsideCollapsed] = useState(false);
  const [editingCopyField, setEditingCopyField] = useState<
    import("@/lib/social-tool/copyEdit").EditingCopyField | null
  >(null);
  const copyEditBaselineRef = useRef<string>("");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const pendingDeleteBoardRef = useRef<string | null>(null);
  const [pendingDeleteBoardId, setPendingDeleteBoardId] = useState<string | null>(
    null,
  );
  const deleteBoardModal = useOverlayState({
    onOpenChange: (isOpen) => {
      if (!isOpen) {
        pendingDeleteBoardRef.current = null;
        setPendingDeleteBoardId(null);
      }
    },
  });
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
  const showLayoutPreview = isNeedsLogo || isNeedsBrief;
  const showCanvasBlocks = !isNeedsLogo;
  const platform = getPlatform(doc.platformId);
  const canvasSize = useMemo(
    () => resolveDesignCanvasSize(doc),
    [doc],
  );

  const handlePlatformChange = useCallback(
    (nextPlatformId: PlatformId) => {
      const active = session.session;
      if (!active || active.document.platformId === nextPlatformId) return;

      const adaptedActive = adaptSessionToPlatform(active, nextPlatformId);
      session.adoptSession(adaptedActive);
      variantGroup.replaceBoard(adaptedActive);

      for (const board of boardsRef.current) {
        if (board.designId === adaptedActive.designId) continue;
        variantGroup.replaceBoard(adaptSessionToPlatform(board, nextPlatformId));
      }
    },
    [session, variantGroup],
  );

  useEffect(() => {
    setSelectedBlock(null);
    setContrastPanelOpen(false);
    setCanvasSelection(null);
    // Reset contrast chrome without polluting undo history.
    session.patchDocument(
      {
        logoBackdrop: false,
        logoInvert: false,
        textContrastBoost: false,
      },
      { recordHistory: false },
    );
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
        !!target.closest("[contenteditable='true']") ||
        !!target.closest(".canvas-copy-editor")
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        clearInspectorSelection();
        return;
      }

      if (isEditableTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
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
          return;
        }
        if (e.code === "Backslash" && !e.shiftKey && !e.altKey && isReady) {
          e.preventDefault();
          setAsideCollapsed((collapsed) => !collapsed);
          return;
        }
        return;
      }

      if (e.altKey) return;

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (!isReady || exporting) return;

      const selectionKind = canvasSelectionKind(canvasSelection);

      if (
        (e.key === "[" || e.key === "]") &&
        selectionKind === "copy" &&
        !editingCopyField &&
        (doc.copyVariants?.length ?? 0) > 1
      ) {
        e.preventDefault();
        cycleCopyVariant(e.key === "]" ? 1 : -1);
        return;
      }

      if (e.key === "Enter" && selectionKind === "copy" && !editingCopyField) {
        e.preventDefault();
        handleCopyFieldEditStart({ kind: "heading" });
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectionKind === "featured"
      ) {
        e.preventDefault();
        const slotId =
          featuredSlotIdFromSelection(canvasSelection) ??
          FEATURED_PRIMARY_SLOT_ID;
        session.removeFeaturedVisualSlot(slotId);
        if (slotId !== FEATURED_PRIMARY_SLOT_ID) {
          handleCanvasSelect("featured");
        }
        return;
      }

      if (
        selectionKind === "featured" &&
        (e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown")
      ) {
        e.preventDefault();
        const slotId =
          featuredSlotIdFromSelection(canvasSelection) ??
          FEATURED_PRIMARY_SLOT_ID;
        const slots = ensureFeaturedSlots(doc.featuredSlots, {
          mode: session.featured.mode,
          visible: doc.showFeaturedImage,
          activeBlockId: session.featured.activeBlockId,
          transform: doc.featuredTransform,
        });
        const slot = findFeaturedSlot(slots, slotId);
        const base =
          slot?.transform ?? doc.featuredTransform ?? DEFAULT_FEATURED_TRANSFORM;
        const step = e.shiftKey ? 5 : 2;
        const next: FeaturedImageTransform = {
          ...base,
          x:
            e.key === "ArrowLeft"
              ? Math.max(-100, base.x - step)
              : e.key === "ArrowRight"
                ? Math.min(100, base.x + step)
                : base.x,
          y:
            e.key === "ArrowUp"
              ? Math.max(-100, base.y - step)
              : e.key === "ArrowDown"
                ? Math.min(100, base.y + step)
                : base.y,
        };
        handleFeaturedTransformChange(next, slotId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // Handlers close over latest doc/session; keep deps aligned with shortcut inputs.
  }, [
    isReady,
    exporting,
    canvasSelection,
    editingCopyField,
    shortcutsOpen,
    doc.copy,
    doc.copyVariants,
    doc.copyVariantIndex,
    doc.layoutId,
    doc.featuredSlots,
    doc.featuredTransform,
    doc.showFeaturedImage,
    session,
  ]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!isReady || exporting) return;
      if (canvasSelectionKind(canvasSelection) !== "featured") return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLElement &&
        (target.closest("input, textarea, [contenteditable='true']") ||
          target.closest(".canvas-copy-editor"))
      ) {
        return;
      }
      const file = imageFileFromDataTransfer(e.clipboardData);
      if (!file) return;
      e.preventDefault();
      const slotId =
        featuredSlotIdFromSelection(canvasSelection) ?? FEATURED_PRIMARY_SLOT_ID;
      void session.uploadFeaturedImage(file, slotId);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [isReady, exporting, canvasSelection, session]);

  useEffect(() => {
    if (exporting || !session.ready) return;

    const node = canvasRef.current;
    if (!node) return;

    const shouldCapture = isReady || !!session.kit.logo;
    if (!shouldCapture) return;
    if (editingCopyField) return;

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
    editingCopyField,
    session.kit.logo,
    session.ready,
    session.session?.updatedAt,
  ]);

  function clearInspectorSelection() {
    if (editingCopyField) {
      session.endHistoryCoalesce("copy");
      setEditingCopyField(null);
    }
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

  const {
    fitScale,
    previewScale,
    panStyle,
    zoomStyle,
    panLayerRef,
    zoomLayerRef,
    zoomPercent,
    spaceDown,
    handMode,
    handActive,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleHandMode,
    nudgePan,
    panElementIntoView,
    stagePanProps,
  } = useCanvasPreviewViewport({
    stageEl,
    platformWidth: canvasSize.width,
    platformHeight: canvasSize.height,
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

  const exportBoardTargets = useMemo(() => {
    const boards =
      variantGroup.boards.length > 0
        ? variantGroup.boards
        : session.session
          ? [session.session]
          : [];
    return boards.map((board, index) => {
      const platformForBoard = getPlatform(board.document.platformId);
      const boardCanvas = resolveDesignCanvasSize(board.document);
      return {
        boardId: board.designId,
        index: index + 1,
        name: variantGroup.group.boardNames?.[board.designId],
        platformId: board.document.platformId,
        width: boardCanvas.width,
        height: boardCanvas.height,
        printInches: platformForBoard.printInches,
      };
    });
  }, [session.session, variantGroup.boards, variantGroup.group.boardNames]);

  const deleteBoardMessage = useMemo(() => {
    if (!pendingDeleteBoardId) {
      return "This artboard will be removed. This cannot be undone.";
    }
    const index = variantGroup.boards.findIndex(
      (b) => b.designId === pendingDeleteBoardId,
    );
    const name =
      variantGroup.group.boardNames?.[pendingDeleteBoardId]?.trim() ||
      (index >= 0 ? `Artboard ${index + 1}` : "This artboard");
    const heading = (
      variantGroup.boards.find((b) => b.designId === pendingDeleteBoardId) ??
      (session.session?.designId === pendingDeleteBoardId ? session.session : null)
    )?.document.copy.heading
      ?.trim()
      .replace(/\[\[(.+?)\]\]/g, "$1");
    if (heading) {
      return (
        <>
          <span className="font-semibold text-text-primary">{name}</span> with copy
          &ldquo;{heading}&rdquo; will be removed. This cannot be undone.
        </>
      );
    }
    return (
      <>
        <span className="font-semibold text-text-primary">{name}</span> will be removed.
        This cannot be undone.
      </>
    );
  }, [
    pendingDeleteBoardId,
    variantGroup.boards,
    variantGroup.group.boardNames,
    session.session,
  ]);

  useEffect(() => {
    if (variantGroup.phase !== "revealing") return;
    // Nudge stage so newly revealed variants sit in view
    nudgePan({ x: -(canvasSize.width * previewScale * 0.35) });
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

  function boardSessionForDelete(boardId: string) {
    return (
      variantGroup.boards.find((b) => b.designId === boardId) ??
      (session.session?.designId === boardId ? session.session : null)
    );
  }

  function requestDeleteBoard(boardId: string) {
    if (variantGroup.boards.length <= 1) return;
    if (boardId === originDesignId) return;

    const board = boardSessionForDelete(boardId);
    const heading = board?.document.copy.heading?.trim() ?? "";
    const hasVisual =
      !!board &&
      (board.featured.mode !== "placeholder" ||
        !!board.featured.image ||
        (board.featured.visualBlocks?.length ?? 0) > 0);

    if (heading || hasVisual) {
      pendingDeleteBoardRef.current = boardId;
      setPendingDeleteBoardId(boardId);
      window.requestAnimationFrame(() => deleteBoardModal.open());
      return;
    }

    void performDeleteBoard(boardId);
  }

  async function performDeleteBoard(boardId: string) {
    if (variantGroup.boards.length <= 1) return;
    if (boardId === originDesignId) return;

    if (session.session) {
      variantGroup.syncBoard(session.session);
    }

    const wasActive = boardId === variantGroup.activeDesignId;
    const nextActiveId = await variantGroup.removeBoard(boardId);
    if (!nextActiveId) return;

    deleteBoardModal.close();
    setAdjustSpacing(false);
    clearInspectorSelection();

    if (wasActive) {
      requestAnimationFrame(() => handleActivateBoard(nextActiveId));
    }
  }

  function confirmDeleteBoard() {
    const boardId = pendingDeleteBoardRef.current ?? pendingDeleteBoardId;
    if (!boardId) return;
    void performDeleteBoard(boardId);
  }

  function handleDuplicateBoard(boardId: string) {
    if (!variantGroup.canGenerateMore) return;
    if (session.session?.designId === boardId) {
      variantGroup.syncBoard(session.session);
    }
    const nextId = variantGroup.duplicateBoard(boardId);
    if (!nextId) return;
    setAdjustSpacing(false);
    clearInspectorSelection();
    requestAnimationFrame(() => handleActivateBoard(nextId));
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
    doc.showBackground &&
    doc.showBrand &&
    (session.kit.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableTextOnBackground(bgHex)
        : session.activeBackground.css.textOnBrand
      : undefined;
  const subTextColor =
    doc.showBackground &&
    doc.showBrand &&
    (session.kit.activeBackgroundPresetId || doc.textContrastBoost)
      ? doc.textContrastBoost
        ? readableSubTextOnBackground(bgHex)
        : session.activeBackground.css.subText
      : undefined;

  const contrastEnabled = isReady && doc.showBrand && !exporting;
  const featuredSvgMarkup = resolveFeaturedSvgForContrast({
    mode: session.featured.mode,
    visualBlocks: session.featured.visualBlocks,
    activeBlockId: session.featured.activeBlockId,
    image: session.featured.image,
  });
  const contrastResults = useMemo(
    () =>
      evaluateCanvasContrast({
        enabled: contrastEnabled,
        backgroundCss: activeBgCss,
        logoSvgMarkup: canvasLogo?.record.svgMarkup,
        showLogo: doc.showBrand,
        textColor: textColor ?? session.activeBackground.css.textOnBrand,
        subTextColor: subTextColor ?? session.activeBackground.css.subText,
        accentColor: session.activeBackground.css.accentDot,
        headingText: doc.copy.heading,
        logoBackdrop: doc.logoBackdrop,
        logoInvert: doc.logoInvert,
        showFeaturedImage: doc.showFeaturedImage,
        featuredMode: session.featured.mode,
        featuredSvgMarkup,
        featuredScale: doc.featuredTransform.scale,
        showPattern: doc.showPattern,
        patternOpacity: doc.patternOpacity,
        showContent: doc.showContent,
        layoutId: doc.layoutId,
        typeScale: doc.typeScale,
        brandAccent: session.kit.colors.accent,
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
      session.activeBackground.css.accentDot,
      doc.copy.heading,
      doc.logoBackdrop,
      doc.logoInvert,
      doc.showFeaturedImage,
      session.featured.mode,
      featuredSvgMarkup,
      doc.featuredTransform.scale,
      doc.showPattern,
      doc.patternOpacity,
      doc.showContent,
      doc.layoutId,
      doc.typeScale,
      doc.layoutSpacing,
      doc.textContrastBoost,
      session.kit.colors.accent,
      session.kit.activeBackgroundPresetId,
    ],
  );

  const contrastFailingCount = contrastResults.filter((r) => !r.passes).length;

  function handleFixVisualBalance() {
    const fix = suggestVisualBalanceFix({
      backgroundCss: activeBgCss,
      accentColor: session.activeBackground.css.accentDot,
      headingText: doc.copy.heading,
      showFeaturedImage: doc.showFeaturedImage,
      featuredMode: session.featured.mode,
      featuredSvgMarkup,
      featuredScale: doc.featuredTransform.scale,
      showPattern: doc.showPattern,
      patternOpacity: doc.patternOpacity,
      showContent: doc.showContent,
      layoutId: doc.layoutId,
      typeScale: doc.typeScale,
      brandAccent: session.kit.colors.accent,
      layoutSpacing: doc.layoutSpacing,
    });

    const nextTransform =
      fix.featuredTransformScale != null
        ? {
            ...doc.featuredTransform,
            scale: fix.featuredTransformScale,
          }
        : null;

    patchDocument({
      ...(fix.typeScale != null ? { typeScale: fix.typeScale } : {}),
      ...(fix.layoutSpacing ? { layoutSpacing: fix.layoutSpacing } : {}),
      ...(fix.patternOpacity != null ? { patternOpacity: fix.patternOpacity } : {}),
      ...(nextTransform
        ? {
            featuredTransform: nextTransform,
            featuredSlots: doc.featuredSlots?.map((slot) => ({
              ...slot,
              transform: {
                ...(slot.transform ?? doc.featuredTransform),
                scale: fix.featuredTransformScale!,
              },
            })),
          }
        : {}),
    });
  }

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

  useEffect(() => {
    if (contrastFailingCount === 0) {
      setContrastPanelOpen(false);
      setSelectedBlock(null);
    }
  }, [contrastFailingCount]);

  const inspectorSelection: CanvasSelectionId | null = isReady
    ? canvasSelection
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
    if (id === "copy" || id.startsWith("copy:")) patchDocument({ showContent: true });
    if (id === "logo") patchDocument({ showBrand: true });
    if (id === "featured" || id.startsWith("featured:")) {
      patchDocument({ showFeaturedImage: true });
    }
    if (id === "pattern") patchDocument({ showPattern: true });
  }

  function handleShowContentChange(next: boolean) {
    patchDocument({ showContent: next });
    if (!next && canvasSelection === "copy") setCanvasSelection(null);
  }

  function exportBackgroundForBoard(board: DesignSessionPersisted): string | undefined {
    if (!board.document.showBackground) return undefined;
    return board.document.theme === "light" ? "#f8faf9" : "#040c0b";
  }

  async function handleExport(format: ExportFormat) {
    if (!stageEl || exporting) return;

    if (session.session) {
      variantGroup.syncBoard(session.session);
    }

    const allBoardIds = exportBoardTargets.map((target) => target.boardId);
    const targetIds = resolveExportTargetIds({
      scope: exportScope,
      activeBoardId: variantGroup.activeDesignId,
      allBoardIds,
      selectedBoardIds,
    });

    if (targetIds.length === 0) {
      alert("Select at least one artboard to export.");
      return;
    }

    const targets = resolveArtboardExportTargets(exportBoardTargets, targetIds);
    const originBoard =
      variantGroup.boards.find((board) => board.designId === originDesignId) ??
      variantGroup.boards[0] ??
      session.session;
    const campaignSlug = buildCampaignSlug(
      originBoard?.document.copy.heading,
      originDesignId,
    );

    const controller = new AbortController();
    exportAbortRef.current = controller;
    setExportTargetIds(new Set(targetIds));
    setExporting(format);
    setExportOpen(false);
    setExportProgress({ current: 0, total: targets.length });

    await waitForExportPaint();

    try {
      const result = await exportArtboards({
        stageEl,
        targets,
        format,
        scale: exportScale,
        campaignSlug,
        backgroundColorForBoard: (target) => {
          const board = boardSessionFor(target.boardId);
          if (!board) return "#040c0b";
          return exportBackgroundForBoard(board) ?? "#040c0b";
        },
        onProgress: (progress) => {
          setExportProgress({
            current: progress.current,
            total: progress.total,
          });
        },
        signal: controller.signal,
      });
      if (result.cancelled) return;
    } catch (err) {
      console.error(err);
      alert("Export failed. Try again or use a smaller scale.");
    } finally {
      setExporting(null);
      setExportProgress(null);
      setExportTargetIds(new Set());
      exportAbortRef.current = null;
    }
  }

  function handleCancelExport() {
    exportAbortRef.current?.abort();
  }

  function updateField<K extends keyof PostCopy>(key: K, value: PostCopy[K]) {
    const nextCopy = { ...doc.copy, [key]: value };
    const layout = resolveLayoutRef(doc.layoutRef ?? catalogLayoutRef(doc.layoutId));
    patchDocument({
      copy: nextCopy,
      textSlots: textSlotsFromCopy(nextCopy, layout),
    });
  }

  function updateTextSlot(slotId: string, text: string) {
    const synced = syncDocumentTextSlots(doc, (slots) =>
      patchTextSlot(slots, slotId, text),
    );
    patchDocument(synced);
  }

  const editableTextSlots = useMemo(
    () =>
      getEditableTextSlots(doc.layoutRef, doc.layoutId, doc.textSlots, doc.copy, doc.artifactId),
    [doc.layoutRef, doc.layoutId, doc.textSlots, doc.copy],
  );

  const showFeaturedInspector = useMemo(() => {
    return getPostLayout(doc.layoutId).includeFeaturedSlot !== false;
  }, [doc.layoutId]);

  function handleBriefCategoryChange(
    category: import("@/lib/design-config/schemas").ArtifactCategoryId | null,
  ) {
    patchDocument({ artifactCategory: category ?? undefined });
  }

  function cycleCopyVariant(delta: 1 | -1) {
    const layout = getPostLayout(doc.layoutId);
    const next = pickCopyVariantByDelta(
      doc.copy,
      layout,
      doc.copyVariants,
      doc.copyVariantIndex,
      delta,
    );
    patchDocument({
      copy: next.copy,
      copyVariantIndex: next.nextIndex,
      copyVariants: doc.copyVariants?.length ? doc.copyVariants : next.pool,
    });
  }

  function readCopyFieldValue(
    field: import("@/lib/social-tool/copyEdit").EditingCopyField,
  ): string {
    if (field.kind === "heading") return doc.copy.heading;
    if (field.kind === "subheading") return doc.copy.subheading;
    return doc.copy.extraFields.find((f) => f.id === field.id)?.value ?? "";
  }

  function handleCopyFieldEditStart(
    field: import("@/lib/social-tool/copyEdit").EditingCopyField,
  ) {
    copyEditBaselineRef.current = readCopyFieldValue(field);
    session.beginHistoryCoalesce("copy");
    setAsideCollapsed(false);
    setAsideTab("design");
    setEditingCopyField(field);
  }

  function handleCopyFieldChange(
    field: import("@/lib/social-tool/copyEdit").EditingCopyField,
    value: string,
  ) {
    if (field.kind === "heading") {
      updateField("heading", value);
      return;
    }
    if (field.kind === "subheading") {
      updateField("subheading", value);
      return;
    }
    updateExtraField(field.id, value);
  }

  function handleCopyFieldCommit() {
    session.endHistoryCoalesce("copy");
    setEditingCopyField(null);
  }

  function handleCopyFieldCancel() {
    const field = editingCopyField;
    const baseline = copyEditBaselineRef.current;
    if (field) {
      if (field.kind === "heading") updateField("heading", baseline);
      else if (field.kind === "subheading") updateField("subheading", baseline);
      else updateExtraField(field.id, baseline);
    }
    session.endHistoryCoalesce("copy");
    setEditingCopyField(null);
  }

  function updateExtraField(id: string, value: string) {
    updateTextSlot(id, value);
  }

  function addExtraField() {
    const n = doc.copy.extraFields.length + 1;
    const id = `extra-${n - 1}`;
    updateTextSlot(id, "");
  }

  function removeExtraField(id: string) {
    const synced = syncDocumentTextSlots(doc, (slots) =>
      slots.filter((s) => s.slotId !== id),
    );
    patchDocument({
      ...synced,
      copy: {
        ...synced.copy,
        extraFields: synced.copy.extraFields.filter((f) => f.id !== id),
      },
    });
  }

  function handleBriefGenerate(result: BriefGenerationResult) {
    session.applyBriefGeneration(result);
  }

  function handleBriefApplyPlan(
    plan: ValidatedDesignPlan,
    options?: import("@/lib/llm/services/applyDesignPlan").DesignPlanApplyOptions,
  ) {
    session.applyDesignPlan(plan, options);
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
    const spreadCopy = shouldSpreadCopyAcrossArtboards(patch, boardIds.length);
    let applied = false;

    for (let i = 0; i < boardIds.length; i++) {
      const boardId = boardIds[i]!;
      const board =
        boardId === variantGroup.activeDesignId && session.session
          ? session.session
          : (variantGroup.boards.find((b) => b.designId === boardId) ??
            loadDesignSession(boardId));

      const boardPatch =
        spreadCopy && board
          ? spreadCopyPatchForArtboard(patch, board, i)
          : patch;

      if (boardId === variantGroup.activeDesignId) {
        if (session.applyCanvasPatch(boardPatch)) applied = true;
        continue;
      }

      if (!board) continue;
      recordHistorySnapshot(boardId, board);
      const next = applyCanvasPatchToSession(board, boardPatch);
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
    doc.featuredSlots,
    doc.canvasShapes,
    session.kit.activeBackgroundPresetId,
    session.featured.mode,
    session.featured.productPage,
    session.featured.image,
    session.featured.activeBlockId,
    session.featured.visualBlocks,
    variantGroup.boards,
    variantGroup.activeDesignId,
  ]);

  const briefChat = useBriefChat({
    designId: originDesignId,
    platformId: doc.platformId,
    artifactCategory: doc.artifactCategory,
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

  function handleExplainContrastInChat(result: ContrastResult) {
    setAsideTab("chat");
    setAsideCollapsed(false);
    setContrastPanelOpen(false);
    setSelectedBlock(null);
    briefChat.submitText(buildContrastIssueChatPrompt(result));
  }

  function handleFeaturedTransformChange(
    value: FeaturedImageTransform,
    slotId?: string,
  ) {
    const targetSlotId =
      slotId ??
      featuredSlotIdFromSelection(inspectorSelection) ??
      FEATURED_PRIMARY_SLOT_ID;
    patchDocument({
      featuredTransform: value,
      featuredSlots: patchFeaturedSlot(doc.featuredSlots, targetSlotId, {
        transform: value,
      }),
    });
  }

  const selectedFeaturedSlotId =
    featuredSlotIdFromSelection(inspectorSelection) ?? FEATURED_PRIMARY_SLOT_ID;
  const featuredSlotList = ensureFeaturedSlots(doc.featuredSlots, {
    mode: session.featured.mode,
    visible: doc.showFeaturedImage,
    activeBlockId: session.featured.activeBlockId,
    transform: doc.featuredTransform,
  });
  const selectedFeaturedSlot =
    findFeaturedSlot(featuredSlotList, selectedFeaturedSlotId) ??
    featuredSlotList[0];
  const selectedSlotActiveBlockId =
    selectedFeaturedSlot?.activeBlockId ?? session.featured.activeBlockId;
  const selectedSlotTransform =
    selectedFeaturedSlot?.transform ?? doc.featuredTransform;

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
          isReady ? (
            <CanvasPlatformBadgePicker
              value={doc.platformId}
              canvasSpec={doc.canvasSpec}
              artifactId={doc.artifactId}
              onChange={handlePlatformChange}
            />
          ) : null
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
            <ExportMenu
              open={exportOpen}
              boards={artboardSwitcherItems}
              scope={exportScope}
              onScopeChange={setExportScope}
              selectedBoardIds={selectedBoardIds}
              onSelectedBoardIdsChange={setSelectedBoardIds}
              exportScale={exportScale}
              onExportScaleChange={setExportScale}
              platformLabel={`${canvasSize.width}×${canvasSize.height}`}
              exporting={exporting}
              disabled={!isReady}
              onExport={handleExport}
            />
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
            editableTextSlots={editableTextSlots}
            onUpdateTextSlot={updateTextSlot}
            onUpdateField={updateField}
            artifactId={doc.artifactId}
            artifactCategory={doc.artifactCategory}
            layoutId={doc.layoutId}
            platformReason={doc.platformReason}
            showFeaturedInspector={showFeaturedInspector}
            briefArtifactCategory={doc.artifactCategory ?? null}
            onBriefArtifactCategoryChange={handleBriefCategoryChange}
            textAlign={doc.textAlign}
            onTextAlignChange={(v) => patchDocument({ textAlign: v })}
            headingFont={doc.headingFont}
            onHeadingFontChange={(v) => patchDocument({ headingFont: v })}
            subFont={doc.subFont}
            onSubFontChange={(v) => patchDocument({ subFont: v })}
            typeScale={doc.typeScale}
            onTypeScaleChange={(v) => patchDocument({ typeScale: v })}
            copyVariantIndex={doc.copyVariantIndex ?? 0}
            copyVariantCount={
              doc.copyVariants && doc.copyVariants.length > 0
                ? doc.copyVariants.length
                : 0
            }
            onCycleCopyVariant={
              doc.copyVariants && doc.copyVariants.length > 1
                ? cycleCopyVariant
                : undefined
            }
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
            featuredTransform={selectedSlotTransform}
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
              mode: selectedFeaturedSlot?.mode ?? session.featured.mode,
              visualBlocks: session.featured.visualBlocks ?? [],
              activeBlockId: selectedSlotActiveBlockId,
              generatingVisualBlocks: session.generatingVisualBlocks,
              featuredVisualKind: doc.featuredVisualKind,
              brandColors: {
                primary: session.kit.colors.primary,
                accent: session.kit.colors.accent,
              },
              selectedSlotId: selectedFeaturedSlotId,
              featuredSlotIds: featuredSlotList.map((slot) => slot.slotId),
              onSelectFeaturedSlot: (slotId) => {
                handleCanvasSelect(
                  slotId === FEATURED_PRIMARY_SLOT_ID
                    ? "featured"
                    : `featured:${slotId}`,
                );
              },
              onGenerateVisualBlocks: (source, options) =>
                void session.generateVisualBlocks({
                  source,
                  pickFeatured: options?.pickFeatured,
                  preferredKind: options?.preferredKind,
                  slotId: options?.slotId ?? selectedFeaturedSlotId,
                }),
              onShuffleVisualBlock: (preferredKind, slotId) =>
                void session.shuffleFeaturedVisualBlock({
                  preferredKind,
                  slotId: slotId ?? selectedFeaturedSlotId,
                }),
              onSelectVisualBlock: (blockId, slotId) =>
                session.selectVisualBlock(
                  blockId,
                  slotId ?? selectedFeaturedSlotId,
                ),
              image: session.featured.image,
              imageSrc: session.featuredImageSrc,
              uploading: session.featuredUploading,
              error: session.featuredError,
              onUploadImage: (file) =>
                session.uploadFeaturedImage(file, selectedFeaturedSlotId),
              onRemoveImage: () =>
                session.removeFeaturedImage(selectedFeaturedSlotId),
              onApplyStockPhoto: (photo, slotId) =>
                session.applyUnsplashPhoto(photo, slotId ?? selectedFeaturedSlotId),
              stockAttribution:
                doc.featuredSlots?.find(
                  (slot) =>
                    slot.slotId === selectedFeaturedSlotId &&
                    slot.imageSource === "unsplash",
                )?.unsplash?.attribution ?? null,
            }}
            onBriefGenerate={handleBriefGenerate}
            onBriefApplyPlan={handleBriefApplyPlan}
            onBriefSkip={session.skipBrief}
            onSkipLogo={session.skipLogo}
            briefChat={briefChat}
            brandSummary={brandSummary}
            canvasShapes={doc.canvasShapes ?? []}
            onAddCanvasShape={(libraryId) => {
              const shapeId = session.addCanvasShape(libraryId);
              if (shapeId) handleCanvasSelect(`shape:${shapeId}`);
            }}
            onUpdateCanvasShape={(id, patch) =>
              session.updateCanvasShape(id, patch)
            }
            onRemoveCanvasShape={(id) => {
              session.removeCanvasShape(id);
              if (canvasSelection === `shape:${id}`) {
                handleCanvasSelect(null);
              }
            }}
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
          <ExportProgressOverlay
            open={exportProgress !== null}
            current={exportProgress?.current ?? 0}
            total={exportProgress?.total ?? 0}
            onCancel={handleCancelExport}
            container={stageEl}
          />
          <CanvasZoomControls
            zoomPercent={zoomPercent}
            handActive={handActive}
            handMode={handMode}
            onToggleHand={toggleHandMode}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onReset={resetZoom}
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
            trailing={
              <EditorShortcutsPopover
                isOpen={shortcutsOpen}
                onOpenChange={setShortcutsOpen}
              />
            }
          />
          <CanvasArtboardSwitcher
            boards={artboardSwitcherItems}
            activeId={variantGroup.activeDesignId}
            onSelect={handleActivateBoard}
          />
          <div
            ref={panLayerRef}
            className="canvas-pan-layer flex w-max max-w-none shrink-0 flex-col items-center gap-3"
            style={panStyle}
          >
            <div
              ref={zoomLayerRef}
              className="canvas-zoom-layer flex w-max max-w-none shrink-0 flex-col items-center gap-3"
              style={zoomStyle}
            >
            {showLayoutPreview ? (
              <div
                ref={viewportRef}
                className="canvas-preview-viewport layout-preview-viewport relative overflow-visible"
              >
                <div ref={canvasRef}>
                  <LayoutPreviewEmptyState
                    width={canvasSize.width}
                    height={canvasSize.height}
                    previewScale={previewScale}
                    layoutScale={fitScale}
                  />
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
                    <DesignRendererArtboard
                      key={board.designId}
                      board={liveBoard}
                      originDesignId={originDesignId}
                      index={index}
                      isActive={isActive}
                      isOrigin={isOrigin}
                      previewScale={previewScale}
                      layoutScale={fitScale}
                      adjustSpacing={adjustSpacing}
                      onToggleSpacing={() => setAdjustSpacing((on) => !on)}
                      onActivate={() => handleActivateBoard(board.designId)}
                      artboardName={
                        variantGroup.group.boardNames?.[board.designId]
                      }
                      onRenameArtboard={(name) => {
                        variantGroup.setBoardName(board.designId, name);
                      }}
                      canDuplicateArtboard={
                        isReady && variantGroup.canGenerateMore
                      }
                      onDuplicateArtboard={() =>
                        handleDuplicateBoard(board.designId)
                      }
                      canDeleteArtboard={
                        isReady &&
                        !isOrigin &&
                        variantGroup.boards.length > 1
                      }
                      onDeleteArtboard={() => {
                        requestDeleteBoard(board.designId);
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
                      exporting={exportTargetIds.has(board.designId)}
                      canvasSelection={inspectorSelection}
                      onCanvasSelect={handleCanvasSelect}
                      onTypeScaleChange={(v) => patchDocument({ typeScale: v })}
                      onLogoScaleChange={(v) => patchDocument({ logoScale: v })}
                      onTextAlignChange={(v) => patchDocument({ textAlign: v })}
                      showPropertyPills={
                        !asideCollapsed && asideTab === "design"
                      }
                      onFeaturedTransformChange={handleFeaturedTransformChange}
                      onHistoryCoalesceBegin={session.beginHistoryCoalesce}
                      onHistoryCoalesceEnd={session.endHistoryCoalesce}
                      editingCopyField={editingCopyField}
                      onCopyFieldEditStart={handleCopyFieldEditStart}
                      onCopyFieldChange={handleCopyFieldChange}
                      onCopyFieldCommit={handleCopyFieldCommit}
                      onCopyFieldCancel={handleCopyFieldCancel}
                      onSpacingChange={(v) =>
                        patchDocument({ layoutSpacing: v })
                      }
                      onCanvasShapesChange={(shapes) =>
                        session.setCanvasShapes(shapes)
                      }
                      onSelectVisualBlock={(blockId, slotId) =>
                        session.selectVisualBlock(
                          blockId,
                          slotId ?? selectedFeaturedSlotId,
                        )
                      }
                      onGenerateVisualBlocks={(source, options) =>
                        void session.generateVisualBlocks({
                          source,
                          pickFeatured: options?.pickFeatured,
                          slotId: options?.slotId ?? selectedFeaturedSlotId,
                        })
                      }
                      onAddFeaturedSlot={() => {
                        const created = session.addFeaturedVisualSlot();
                        if (created) {
                          handleCanvasSelect(
                            created === FEATURED_PRIMARY_SLOT_ID
                              ? "featured"
                              : `featured:${created}`,
                          );
                        }
                      }}
                      onReorderFeaturedSlot={(slotId, direction) =>
                        session.reorderFeaturedVisualSlots(slotId, direction)
                      }
                      onRemoveFeaturedSlot={(slotId) => {
                        session.removeFeaturedVisualSlot(slotId);
                        if (selectedFeaturedSlotId === slotId) {
                          handleCanvasSelect("featured");
                        }
                      }}
                      onShuffleFeaturedSlot={(slotId) =>
                        void session.shuffleFeaturedVisualBlock({ slotId })
                      }
                      onUploadFeaturedImage={(file, slotId) =>
                        void session.uploadFeaturedImage(file, slotId)
                      }
                      generatingVisualBlocks={session.generatingVisualBlocks}
                      canvasRef={isActive ? canvasRef : undefined}
                      viewportRef={isActive ? viewportRef : undefined}
                      reveal={variantGroup.phase === "revealing"}
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
                            onSelectBlock={setSelectedBlock}
                            logoBackdrop={doc.logoBackdrop}
                            hasSvgLogo={
                              canvasLogo?.record.mime === "image/svg+xml"
                            }
                            canFixLogoSvg={canFixLogoSvg}
                            hasLogoSvgFix={hasLogoSvgFix}
                            onFixLogoBackdrop={() =>
                              patchDocument({ logoBackdrop: true })
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
                            onFixAccentContrast={() => {
                              const fix = buildAccentContrastFix(
                                bgHex,
                                session.activeBackground.css.accentDot,
                                session.kit.colors,
                              );
                              session.setColor(fix.role, fix.hex);
                            }}
                            onFixPatternOpacity={() => {
                              patchDocument({
                                patternOpacity: Math.min(doc.patternOpacity, 0.16),
                              });
                            }}
                            onFixVisualBalance={handleFixVisualBalance}
                            onExplainInChat={handleExplainContrastInChat}
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
                            width={canvasSize.width}
                            height={canvasSize.height}
                            previewScale={previewScale}
                            layoutScale={fitScale}
                            index={
                              Math.max(0, variantGroup.boards.length - 1) + i + 1
                            }
                          />
                        ),
                      )
                    : null}
                </VariantAnimatePresence>
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
      </div>
      </LayoutGroup>

      <Modal state={deleteBoardModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Delete artboard?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-text-secondary">{deleteBoardMessage}</p>
              </Modal.Body>
              <Modal.Footer className="gap-2">
                <Button variant="secondary" onPress={deleteBoardModal.close}>
                  Cancel
                </Button>
                <Button variant="danger" onPress={confirmDeleteBoard}>
                  Delete artboard
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

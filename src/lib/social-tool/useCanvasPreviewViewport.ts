"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

const MIN_USER_ZOOM = 0.5;
const MAX_USER_ZOOM = 3;
const ZOOM_STEP = 1.15;
const FIT_PAD = 48;
/** Mouse wheels send large deltaY; pinches stay small — cap so zoom feels like trackpad pinch. */
const MAX_ZOOM_WHEEL_DELTA = 10;
const LINE_DELTA_PX = 16;
/** Debounce React sync after wheel gestures settle. */
const WHEEL_SYNC_MS = 120;
/** Debounce React fitScale sync after stage resize (e.g. sidebar open/close). */
const FIT_SYNC_MS = 140;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Wheel deltaMode 0 = px, 1 = lines, 2 = pages (Figma-style pan input). */
function normalizeWheelDelta(
  delta: number,
  deltaMode: number,
  axisSize: number,
): number {
  if (deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * LINE_DELTA_PX;
  if (deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * axisSize;
  return delta;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    Boolean(target.closest("button, a, [role='button'], [contenteditable='true']"))
  );
}

/** Block canvas wheel-pan only on text fields — toolbar/labels should still pan (Figma-style). */
function isWheelPanBlocked(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    target.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    Boolean(target.closest("[contenteditable='true']"))
  );
}

function isChromeTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        ".canvas-stage-chrome, .canvas-bottom-chrome, .canvas-preview-toolbar, .canvas-artboard-label-btn, .canvas-artboard-label-input",
      ),
    )
  );
}

export type CanvasPan = { x: number; y: number };

export type UseCanvasPreviewViewportArgs = {
  /** Mounted stage element from a callback ref. Null until the stage is in the DOM. */
  stageEl: HTMLElement | null;
  platformWidth: number;
  platformHeight: number;
};

export function useCanvasPreviewViewport({
  stageEl,
  platformWidth,
  platformHeight,
}: UseCanvasPreviewViewportArgs) {
  const [fitScale, setFitScale] = useState(0.45);
  const [userZoom, setUserZoom] = useState(1);
  const [pan, setPan] = useState<CanvasPan>({ x: 0, y: 0 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [handMode, setHandMode] = useState(false);

  const panLayerRef = useRef<HTMLDivElement>(null);
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const fitScaleRef = useRef(fitScale);
  const liveFitRef = useRef(fitScale);
  const userZoomRef = useRef(userZoom);
  const panRef = useRef(pan);
  const handModeRef = useRef(handMode);
  const spaceDownRef = useRef(spaceDown);
  const stageElRef = useRef(stageEl);
  const focusedElRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const viewportRafRef = useRef<number | null>(null);
  const wheelSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fitSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fittingRef = useRef(false);

  fitScaleRef.current = fitScale;
  userZoomRef.current = userZoom;
  panRef.current = pan;
  handModeRef.current = handMode;
  spaceDownRef.current = spaceDown;
  stageElRef.current = stageEl;

  const previewScale = fitScale * userZoom;
  const zoomPercent = Math.round(userZoom * 100);
  const handActive = handMode || spaceDown;

  /**
   * Apply pan/zoom to DOM. While the stage is resizing (sidebar), multiply zoom by
   * liveFit/committedFit so artboards scale via compositor instead of React fitScale.
   */
  const applyViewportToDom = useCallback((nextPan: CanvasPan, nextZoom: number) => {
    panRef.current = nextPan;
    userZoomRef.current = nextZoom;
    const panEl = panLayerRef.current;
    const zoomEl = zoomLayerRef.current;
    if (panEl) {
      panEl.style.transform = `translate3d(${nextPan.x}px, ${nextPan.y}px, 0)`;
    }
    if (zoomEl) {
      const committedFit = fitScaleRef.current || 1;
      const liveFit = liveFitRef.current || committedFit;
      const fitRatio =
        fittingRef.current && committedFit > 0 ? liveFit / committedFit : 1;
      zoomEl.style.transform = `scale(${nextZoom * fitRatio})`;
      // Keep chrome counter-scale in sync during live zoom/fit (no React churn).
      const screenPreview =
        (fittingRef.current ? liveFit : committedFit) * nextZoom;
      zoomEl.style.setProperty(
        "--canvas-preview-scale",
        String(screenPreview > 0 ? screenPreview : 1),
      );
    }
  }, []);

  const scheduleViewportDomApply = useCallback(() => {
    if (viewportRafRef.current !== null) return;
    viewportRafRef.current = requestAnimationFrame(() => {
      viewportRafRef.current = null;
      applyViewportToDom(panRef.current, userZoomRef.current);
    });
  }, [applyViewportToDom]);

  const scheduleWheelStateSync = useCallback(() => {
    if (wheelSyncTimerRef.current) clearTimeout(wheelSyncTimerRef.current);
    wheelSyncTimerRef.current = setTimeout(() => {
      wheelSyncTimerRef.current = null;
      stageElRef.current?.removeAttribute("data-canvas-wheeling");
      setPan({ ...panRef.current });
      setUserZoom(userZoomRef.current);
    }, WHEEL_SYNC_MS);
  }, []);

  const commitViewportGesture = useCallback(
    (nextPan: CanvasPan, nextZoom: number, fromWheel: boolean) => {
      panRef.current = nextPan;
      userZoomRef.current = nextZoom;
      if (fromWheel) {
        stageElRef.current?.setAttribute("data-canvas-wheeling", "true");
        scheduleWheelStateSync();
      }
      scheduleViewportDomApply();
    },
    [scheduleViewportDomApply, scheduleWheelStateSync],
  );

  // Sync committed pan/zoom/fit to DOM. During sidebar resize, live fit is
  // applied separately via scheduleViewportDomApply (no React fitScale churn).
  useLayoutEffect(() => {
    if (
      fittingRef.current &&
      Math.abs(fitScale - liveFitRef.current) < 0.0005
    ) {
      fittingRef.current = false;
      stageElRef.current?.removeAttribute("data-canvas-fitting");
    }
    applyViewportToDom(pan, userZoom);
  }, [pan, userZoom, fitScale, applyViewportToDom]);

  useEffect(() => {
    return () => {
      if (viewportRafRef.current !== null) {
        cancelAnimationFrame(viewportRafRef.current);
      }
      if (wheelSyncTimerRef.current) clearTimeout(wheelSyncTimerRef.current);
      if (fitSyncTimerRef.current) clearTimeout(fitSyncTimerRef.current);
    };
  }, []);

  /** Nudge pan so `el` is centered. Safe to call again after paint for residuals. */
  const centerElementInStage = useCallback((el: HTMLElement) => {
    const stage = stageElRef.current;
    if (!stage || !el.isConnected) return;
    const stageRect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    if (elRect.width < 1 || elRect.height < 1) return;
    const dx =
      stageRect.left + stageRect.width / 2 - (elRect.left + elRect.width / 2);
    const dy =
      stageRect.top + stageRect.height / 2 - (elRect.top + elRect.height / 2);
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  useEffect(() => {
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
    focusedElRef.current = null;
    liveFitRef.current = fitScaleRef.current;
  }, [platformWidth, platformHeight]);

  useEffect(() => {
    const el = stageEl;
    if (!el) return;

    const settleFit = () => {
      fitSyncTimerRef.current = null;
      const nextFit = liveFitRef.current;
      // Commit React fitScale once; useLayoutEffect clears fit-ratio compensation
      // in the same frame as artboards adopt the new size.
      setFitScale(nextFit);
      const focused = focusedElRef.current;
      if (!focused?.isConnected) return;
      requestAnimationFrame(() => {
        centerElementInStage(focused);
        requestAnimationFrame(() => centerElementInStage(focused));
      });
    };

    const update = () => {
      const availW = Math.max(el.clientWidth - FIT_PAD, 200);
      const availH = Math.max(el.clientHeight - FIT_PAD, 200);
      const sx = availW / platformWidth;
      const sy = availH / platformHeight;
      const nextFit = Math.min(sx, sy, 1);
      liveFitRef.current = nextFit;

      const committed = fitScaleRef.current;
      const diverged = Math.abs(nextFit - committed) > 0.0005;

      if (diverged) {
        fittingRef.current = true;
        el.setAttribute("data-canvas-fitting", "true");
        scheduleViewportDomApply();
        if (fitSyncTimerRef.current) clearTimeout(fitSyncTimerRef.current);
        fitSyncTimerRef.current = setTimeout(settleFit, FIT_SYNC_MS);
        return;
      }

      // Already matched — still settle any in-flight fitting flag.
      if (fittingRef.current) {
        if (fitSyncTimerRef.current) clearTimeout(fitSyncTimerRef.current);
        fitSyncTimerRef.current = setTimeout(settleFit, FIT_SYNC_MS);
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (fitSyncTimerRef.current) clearTimeout(fitSyncTimerRef.current);
      fittingRef.current = false;
      el.removeAttribute("data-canvas-fitting");
    };
  }, [
    stageEl,
    platformWidth,
    platformHeight,
    centerElementInStage,
    scheduleViewportDomApply,
  ]);

  useEffect(() => {
    const el = stageEl;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (isWheelPanBlocked(e.target)) return;

      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        const oldZoom = userZoomRef.current;
        const oldScale = fitScaleRef.current * oldZoom;
        if (oldScale <= 0) return;

        const zoomDelta = clamp(
          e.deltaY,
          -MAX_ZOOM_WHEEL_DELTA,
          MAX_ZOOM_WHEEL_DELTA,
        );
        const factor = Math.exp(-zoomDelta * 0.0025);
        const nextZoom = clamp(oldZoom * factor, MIN_USER_ZOOM, MAX_USER_ZOOM);
        if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

        const newScale = fitScaleRef.current * nextZoom;
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left - rect.width / 2;
        const my = e.clientY - rect.top - rect.height / 2;
        const p = panRef.current;
        const ratio = newScale / oldScale;

        focusedElRef.current = null;
        commitViewportGesture(
          {
            x: mx - (mx - p.x) * ratio,
            y: my - (my - p.y) * ratio,
          },
          nextZoom,
          true,
        );
        return;
      }

      e.preventDefault();

      const rect = el.getBoundingClientRect();
      let dx = normalizeWheelDelta(e.deltaX, e.deltaMode, rect.width);
      let dy = normalizeWheelDelta(e.deltaY, e.deltaMode, rect.height);

      if (e.shiftKey && Math.abs(dy) > Math.abs(dx)) {
        dx += dy;
        dy = 0;
      }

      if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;

      focusedElRef.current = null;
      const p = panRef.current;
      commitViewportGesture(
        { x: p.x - dx, y: p.y - dy },
        userZoomRef.current,
        true,
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stageEl, commitViewportGesture]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const stage = stageElRef.current;
      const overStage = stage?.matches(":hover") ?? false;
      const inTool =
        e.target instanceof Element &&
        Boolean(e.target.closest(".social-tool"));

      if (e.code === "KeyH" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!inTool && !overStage && !handModeRef.current) return;
        e.preventDefault();
        setHandMode((on) => !on);
        return;
      }

      if (e.code !== "Space" || e.repeat) return;
      if (!overStage && !dragRef.current && !spaceDownRef.current) return;
      e.preventDefault();
      setSpaceDown(true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      setSpaceDown(false);
    };

    const clearSpace = () => setSpaceDown(false);
    const onVisibility = () => {
      if (document.hidden) clearSpace();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearSpace);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearSpace);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const el = stageEl;
    if (!el) return;
    if (handActive) {
      el.dataset.canvasHandTool = "true";
    } else {
      delete el.dataset.canvasHandTool;
      if (!dragRef.current) delete el.dataset.canvasPanning;
    }
    return () => {
      delete el.dataset.canvasHandTool;
    };
  }, [stageEl, handActive]);

  const onPointerDownCapture = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      if (isChromeTarget(e.target)) return;

      const middle = e.button === 1;
      const primary = e.button === 0;
      if (!middle && !primary) return;
      if (primary && !(spaceDownRef.current || handModeRef.current)) return;

      e.preventDefault();
      e.stopPropagation();

      focusedElRef.current = null;

      const stage = stageElRef.current;
      if (stage) {
        stage.scrollTop = 0;
        stage.scrollLeft = 0;
        stage.dataset.canvasPanning = "true";
      }

      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = panRef.current.x;
      const originY = panRef.current.y;
      dragRef.current = { pointerId, startX, startY, originX, originY };

      const move = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        ev.preventDefault();
        commitViewportGesture(
          {
            x: drag.originX + (ev.clientX - drag.startX),
            y: drag.originY + (ev.clientY - drag.startY),
          },
          userZoomRef.current,
          false,
        );
      };

      const up = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        dragRef.current = null;
        const s = stageElRef.current;
        if (s) delete s.dataset.canvasPanning;
        setPan({ ...panRef.current });
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [commitViewportGesture],
  );

  function zoomBy(factor: number) {
    setUserZoom((z) => clamp(z * factor, MIN_USER_ZOOM, MAX_USER_ZOOM));
  }

  function zoomIn() {
    zoomBy(ZOOM_STEP);
  }

  function zoomOut() {
    zoomBy(1 / ZOOM_STEP);
  }

  function resetZoom() {
    focusedElRef.current = null;
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function toggleHandMode() {
    setHandMode((on) => !on);
  }

  function nudgePan(delta: { x?: number; y?: number }) {
    setPan((p) => ({
      x: p.x + (delta.x ?? 0),
      y: p.y + (delta.y ?? 0),
    }));
  }

  const panElementIntoView = useCallback(
    (el: HTMLElement) => {
      focusedElRef.current = el;
      centerElementInStage(el);
      window.setTimeout(() => centerElementInStage(el), 100);
    },
    [centerElementInStage],
  );

  return {
    fitScale,
    userZoom,
    previewScale,
    pan,
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
    panLayerRef,
    zoomLayerRef,
    stagePanProps: {
      onPointerDownCapture,
    },
    // Transforms are applied via refs (see applyViewportToDom) so Framer
    // re-renders during sidebar motion don't thrash React style props.
    panStyle: undefined,
    zoomStyle: undefined,
  };
}

export type CanvasPreviewViewportPanLayerRef = RefObject<HTMLDivElement | null>;
export type CanvasPreviewViewportZoomLayerRef = RefObject<HTMLDivElement | null>;

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const MIN_USER_ZOOM = 0.5;
const MAX_USER_ZOOM = 3;
const ZOOM_STEP = 1.15;
const FIT_PAD = 48;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
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

function isChromeTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        ".canvas-stage-chrome, .canvas-preview-toolbar, .canvas-artboard-label-btn",
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

  const fitScaleRef = useRef(fitScale);
  const userZoomRef = useRef(userZoom);
  const panRef = useRef(pan);
  const handModeRef = useRef(handMode);
  const spaceDownRef = useRef(spaceDown);
  const stageElRef = useRef(stageEl);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  fitScaleRef.current = fitScale;
  userZoomRef.current = userZoom;
  panRef.current = pan;
  handModeRef.current = handMode;
  spaceDownRef.current = spaceDown;
  stageElRef.current = stageEl;

  const previewScale = fitScale * userZoom;
  const zoomPercent = Math.round(userZoom * 100);
  const canActualSize = fitScale < 0.995;
  const handActive = handMode || spaceDown;

  useEffect(() => {
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  }, [platformWidth, platformHeight]);

  useEffect(() => {
    const el = stageEl;
    if (!el) return;

    const update = () => {
      const availW = Math.max(el.clientWidth - FIT_PAD, 200);
      const availH = Math.max(el.clientHeight - FIT_PAD, 200);
      const sx = availW / platformWidth;
      const sy = availH / platformHeight;
      setFitScale(Math.min(sx, sy, 1));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageEl, platformWidth, platformHeight]);

  useEffect(() => {
    const el = stageEl;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();

      const oldZoom = userZoomRef.current;
      const oldScale = fitScaleRef.current * oldZoom;
      if (oldScale <= 0) return;

      const factor = Math.exp(-e.deltaY * 0.0025);
      const nextZoom = clamp(oldZoom * factor, MIN_USER_ZOOM, MAX_USER_ZOOM);
      if (Math.abs(nextZoom - oldZoom) < 0.0001) return;

      const newScale = fitScaleRef.current * nextZoom;
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      const p = panRef.current;
      const ratio = newScale / oldScale;

      setUserZoom(nextZoom);
      setPan({
        x: mx - (mx - p.x) * ratio,
        y: my - (my - p.y) * ratio,
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stageEl]);

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
        setPan({
          x: drag.originX + (ev.clientX - drag.startX),
          y: drag.originY + (ev.clientY - drag.startY),
        });
      };

      const up = (ev: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag || ev.pointerId !== drag.pointerId) return;
        dragRef.current = null;
        const s = stageElRef.current;
        if (s) delete s.dataset.canvasPanning;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
      };

      window.addEventListener("pointermove", move, { passive: false });
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    },
    [],
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
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function setActualSize() {
    if (fitScale <= 0) return;
    setUserZoom(clamp(1 / fitScale, MIN_USER_ZOOM, MAX_USER_ZOOM));
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

  /** Center an element (e.g. artboard) in the stage viewport. */
  function panElementIntoView(el: HTMLElement) {
    const stage = stageElRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const stageCx = stageRect.left + stageRect.width / 2;
    const stageCy = stageRect.top + stageRect.height / 2;
    const elCx = elRect.left + elRect.width / 2;
    const elCy = elRect.top + elRect.height / 2;
    setPan((p) => ({
      x: p.x + (stageCx - elCx),
      y: p.y + (stageCy - elCy),
    }));
  }

  return {
    fitScale,
    userZoom,
    previewScale,
    pan,
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
    stagePanProps: {
      onPointerDownCapture,
    },
    panStyle: {
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
    } as const,
  };
}

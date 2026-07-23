"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

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

export type CanvasPan = { x: number; y: number };

export type UseCanvasPreviewViewportArgs = {
  stageRef: RefObject<HTMLElement | null>;
  platformWidth: number;
  platformHeight: number;
};

export function useCanvasPreviewViewport({
  stageRef,
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
  const panningRef = useRef(false);
  fitScaleRef.current = fitScale;
  userZoomRef.current = userZoom;
  panRef.current = pan;
  handModeRef.current = handMode;
  spaceDownRef.current = spaceDown;

  const previewScale = fitScale * userZoom;
  const zoomPercent = Math.round(userZoom * 100);
  const canActualSize = fitScale < 0.995;
  const handActive = handMode || spaceDown;

  useEffect(() => {
    setUserZoom(1);
    setPan({ x: 0, y: 0 });
  }, [platformWidth, platformHeight]);

  useEffect(() => {
    const el = stageRef.current;
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
  }, [stageRef, platformWidth, platformHeight]);

  useEffect(() => {
    const el = stageRef.current;
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
  }, [stageRef]);

  // Space (hold) / H (toggle) — restore normal pointer on Space up or hand off
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;

      const stage = stageRef.current;
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
      // Hold-to-pan while over the stage, or keep Space while mid-drag
      if (!overStage && !panningRef.current && !spaceDownRef.current) return;
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
  }, [stageRef]);

  // Capture-phase pan so hand tool wins over canvas selection / featured drag.
  // Pan is transform-based (infinite canvas) — stage must not use native scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let pointerId = 0;
    let startX = 0;
    let startY = 0;
    let origin = { x: 0, y: 0 };

    const shouldPan = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest(".canvas-stage-chrome")) {
        return false;
      }
      if (e.button === 1) return true;
      if (e.button !== 0) return false;
      return spaceDownRef.current || handModeRef.current;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!shouldPan(e)) return;
      e.preventDefault();
      e.stopPropagation();
      // Kill any leftover native scroll from older overflow-auto stages
      el.scrollTop = 0;
      el.scrollLeft = 0;
      panningRef.current = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      origin = { ...panRef.current };
      el.dataset.canvasPanning = "true";
      try {
        el.setPointerCapture(pointerId);
      } catch {
        /* capture unsupported */
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panningRef.current || e.pointerId !== pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      setPan({
        x: origin.x + (e.clientX - startX),
        y: origin.y + (e.clientY - startY),
      });
    };

    const endDrag = (e: PointerEvent) => {
      if (!panningRef.current || e.pointerId !== pointerId) return;
      e.preventDefault();
      e.stopPropagation();
      panningRef.current = false;
      delete el.dataset.canvasPanning;
      try {
        if (el.hasPointerCapture(pointerId)) {
          el.releasePointerCapture(pointerId);
        }
      } catch {
        /* already released */
      }
    };

    // lostpointercapture: release ended elsewhere (browser / OS)
    const onLostCapture = (e: PointerEvent) => {
      if (!panningRef.current || e.pointerId !== pointerId) return;
      panningRef.current = false;
      delete el.dataset.canvasPanning;
    };

    el.addEventListener("pointerdown", onPointerDown, { capture: true });
    el.addEventListener("pointermove", onPointerMove, { capture: true });
    el.addEventListener("pointerup", endDrag, { capture: true });
    el.addEventListener("pointercancel", endDrag, { capture: true });
    el.addEventListener("lostpointercapture", onLostCapture);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, { capture: true });
      el.removeEventListener("pointermove", onPointerMove, { capture: true });
      el.removeEventListener("pointerup", endDrag, { capture: true });
      el.removeEventListener("pointercancel", endDrag, { capture: true });
      el.removeEventListener("lostpointercapture", onLostCapture);
      panningRef.current = false;
      delete el.dataset.canvasPanning;
    };
  }, [stageRef]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    if (handActive) {
      el.dataset.canvasHandTool = "true";
    } else {
      delete el.dataset.canvasHandTool;
      // Ensure pan cursor doesn't stick after Space release / hand toggle off
      if (!panningRef.current) delete el.dataset.canvasPanning;
    }
    return () => {
      delete el.dataset.canvasHandTool;
    };
  }, [stageRef, handActive]);

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
    panStyle: {
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
    } as const,
  };
}

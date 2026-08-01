"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import { shapeIdFromSelection } from "@/lib/social-tool/canvasSelection";
import type {
  CanvasShapeRecord,
  CanvasShapeTransform,
} from "@/lib/social-tool/shapes/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildTransformStyle(
  shape: CanvasShapeRecord,
  canvasShortSide: number,
  preview?: { x: number; y: number } | null,
): React.CSSProperties {
  const x = preview?.x ?? shape.transform.x;
  const y = preview?.y ?? shape.transform.y;
  const { scale, rotateZ, flipX, flipY } = shape.transform;
  const baseSize = Math.max(48, canvasShortSide * 0.22);
  const flip = `${flipX ? "scaleX(-1)" : ""} ${flipY ? "scaleY(-1)" : ""}`.trim();
  const transform = [
    "translate(-50%, -50%)",
    flip,
    `rotate(${rotateZ}deg)`,
    `scale(${scale})`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    left: `${x}%`,
    top: `${y}%`,
    width: baseSize,
    height: baseSize,
    opacity: shape.opacity ?? 0.25,
    zIndex: shape.zIndex,
    transform,
  };
}

type Props = {
  shapes: CanvasShapeRecord[];
  canvasWidth: number;
  canvasHeight: number;
  previewScale?: number;
  interactive?: boolean;
  exporting?: boolean;
  canvasSelection?: CanvasSelectionId | null;
  onCanvasSelect?: (id: CanvasSelectionId | null) => void;
  onShapesChange?: (shapes: CanvasShapeRecord[]) => void;
  onHistoryCoalesceBegin?: () => void;
  onHistoryCoalesceEnd?: () => void;
  tier: "back" | "front";
};

function CanvasShapeLayerInner({
  shapes,
  canvasWidth,
  canvasHeight,
  previewScale = 1,
  interactive = false,
  exporting = false,
  canvasSelection,
  onCanvasSelect,
  onShapesChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
  tier,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<{
    shapeId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragPreviewRef = useRef(dragPreview);
  dragPreviewRef.current = dragPreview;
  const shapesRef = useRef(shapes);
  shapesRef.current = shapes;

  const canvasShortSide = Math.min(canvasWidth, canvasHeight);
  const filtered = shapes.filter((shape) =>
    tier === "back" ? shape.zIndex < 6 : shape.zIndex >= 6,
  );

  useEffect(() => {
    if (!interactive) {
      setDraggingId(null);
      setDragPreview(null);
      dragRef.current = null;
    }
  }, [interactive]);

  function commitTransform(id: string, transform: Partial<CanvasShapeTransform>) {
    if (!onShapesChange) return;
    onShapesChange(
      shapesRef.current.map((shape) =>
        shape.id === id
          ? { ...shape, transform: { ...shape.transform, ...transform } }
          : shape,
      ),
    );
  }

  function onPointerDown(shape: CanvasShapeRecord, ev: React.PointerEvent) {
    if (!interactive || shape.locked || !onShapesChange) return;
    ev.preventDefault();
    ev.stopPropagation();
    onCanvasSelect?.(`shape:${shape.id}`);
    onHistoryCoalesceBegin?.();
    setDraggingId(shape.id);
    dragRef.current = {
      shapeId: shape.id,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: shape.transform.x,
      originY: shape.transform.y,
    };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  }

  const handlePointerMove = useCallback(
    (ev: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const scaleFactor = previewScale > 0 ? previewScale : 1;
      const dxPx = (ev.clientX - drag.startX) / scaleFactor;
      const dyPx = (ev.clientY - drag.startY) / scaleFactor;
      const nextX = clamp(
        drag.originX + (dxPx / Math.max(canvasWidth, 1)) * 100,
        0,
        100,
      );
      const nextY = clamp(
        drag.originY + (dyPx / Math.max(canvasHeight, 1)) * 100,
        0,
        100,
      );
      const preview = {
        id: drag.shapeId,
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
      };
      dragPreviewRef.current = preview;
      setDragPreview(preview);
    },
    [canvasHeight, canvasWidth, previewScale],
  );

  const handlePointerUp = useCallback(
    (ev: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const preview = dragPreviewRef.current;
      if (preview && preview.id === drag.shapeId) {
        commitTransform(preview.id, { x: preview.x, y: preview.y });
      }

      dragRef.current = null;
      dragPreviewRef.current = null;
      setDraggingId(null);
      setDragPreview(null);
      onHistoryCoalesceEnd?.();
      try {
        (ev.currentTarget as HTMLElement).releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
    },
    [onHistoryCoalesceEnd, onShapesChange],
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className={`canvas-shape-layer canvas-shape-layer--${tier}${exporting ? " canvas-shape-layer--exporting" : ""}`}
      aria-hidden={filtered.every((s) => (s.opacity ?? 0) <= 0)}
    >
      {filtered.map((shape) => {
        const selected =
          shapeIdFromSelection(canvasSelection ?? null) === shape.id;
        const preview =
          dragPreview?.id === shape.id
            ? { x: dragPreview.x, y: dragPreview.y }
            : null;
        return (
          <div
            key={shape.id}
            className={`canvas-shape${selected && !exporting ? " is-selected" : ""}${draggingId === shape.id ? " is-dragging" : ""}${interactive && !shape.locked ? " is-interactive" : ""}`}
            data-canvas-select={`shape:${shape.id}`}
            style={buildTransformStyle(shape, canvasShortSide, preview)}
            onPointerDown={(ev) => onPointerDown(shape, ev)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? shape.label : undefined}
          >
            <div
              className="canvas-shape-svg"
              dangerouslySetInnerHTML={{ __html: shape.svgMarkup }}
            />
          </div>
        );
      })}
    </div>
  );
}

export const CanvasShapeLayer = memo(CanvasShapeLayerInner);

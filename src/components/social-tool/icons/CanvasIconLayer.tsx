"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { LucideIconGlyph } from "@/components/social-tool/icons/LucideIconGlyph";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import type { CanvasIconRecord } from "@/lib/social-tool/icons/types";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildTransformStyle(
  icon: CanvasIconRecord,
  canvasShortSide: number,
): React.CSSProperties {
  const { x, y, scale, rotateZ } = icon.transform;
  const baseSize = Math.max(28, canvasShortSide * 0.06);
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: baseSize,
    height: baseSize,
    opacity: icon.opacity ?? 1,
    zIndex: icon.zIndex,
    transform: `translate(-50%, -50%) rotate(${rotateZ}deg) scale(${scale})`,
    color: icon.color,
  };
}

type IconItemProps = {
  icon: CanvasIconRecord;
  canvasShortSide: number;
  selected: boolean;
  dragging: boolean;
  onPointerDown: (icon: CanvasIconRecord, ev: React.PointerEvent) => void;
  onPointerMove: (ev: React.PointerEvent) => void;
  onPointerUp: (ev: React.PointerEvent) => void;
};

const CanvasIconItem = memo(function CanvasIconItem({
  icon,
  canvasShortSide,
  selected,
  dragging,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: IconItemProps) {
  return (
    <div
      className={`canvas-icon-layer__item${selected ? " is-selected" : ""}${dragging ? " is-dragging" : ""}`}
      style={buildTransformStyle(icon, canvasShortSide)}
      data-canvas-select={`icon:${icon.id}`}
      onPointerDown={(ev) => onPointerDown(icon, ev)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <LucideIconGlyph
        iconName={icon.iconName}
        color={icon.color}
        strokeWidth={icon.strokeWidth}
        className="size-full"
      />
    </div>
  );
});

type Props = {
  icons: CanvasIconRecord[];
  canvasWidth: number;
  canvasHeight: number;
  previewScale?: number;
  interactive?: boolean;
  exporting?: boolean;
  canvasSelection?: CanvasSelectionId | null;
  onCanvasSelect?: (id: CanvasSelectionId | null) => void;
  onIconsChange?: (icons: CanvasIconRecord[]) => void;
  onHistoryCoalesceBegin?: () => void;
  onHistoryCoalesceEnd?: () => void;
};

function CanvasIconLayerInner({
  icons,
  canvasWidth,
  canvasHeight,
  previewScale = 1,
  interactive = false,
  exporting = false,
  canvasSelection,
  onCanvasSelect,
  onIconsChange,
  onHistoryCoalesceBegin,
  onHistoryCoalesceEnd,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const dragRef = useRef<{
    iconId: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragPreviewRef = useRef(dragPreview);
  dragPreviewRef.current = dragPreview;
  const iconsRef = useRef(icons);
  iconsRef.current = icons;

  const canvasShortSide = Math.min(canvasWidth, canvasHeight);

  useEffect(() => {
    if (!interactive) {
      setDraggingId(null);
      setDragPreview(null);
      dragRef.current = null;
    }
  }, [interactive]);

  function commitTransform(id: string, transform: Partial<CanvasIconRecord["transform"]>) {
    if (!onIconsChange) return;
    onIconsChange(
      iconsRef.current.map((icon) =>
        icon.id === id
          ? { ...icon, transform: { ...icon.transform, ...transform } }
          : icon,
      ),
    );
  }

  function onPointerDown(icon: CanvasIconRecord, ev: React.PointerEvent) {
    if (!interactive || icon.locked || !onIconsChange) return;
    ev.preventDefault();
    ev.stopPropagation();
    onCanvasSelect?.(`icon:${icon.id}`);
    onHistoryCoalesceBegin?.();
    setDraggingId(icon.id);
    dragRef.current = {
      iconId: icon.id,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: icon.transform.x,
      originY: icon.transform.y,
    };
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
  }

  const handlePointerMove = useCallback(
    (ev: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const scaleFactor = Math.max(previewScale, 0.01);
      const dx = (ev.clientX - drag.startX) / scaleFactor;
      const dy = (ev.clientY - drag.startY) / scaleFactor;
      const nextX = clamp(
        drag.originX + (dx / canvasWidth) * 100,
        0,
        100,
      );
      const nextY = clamp(
        drag.originY + (dy / canvasHeight) * 100,
        0,
        100,
      );
      const preview = {
        id: drag.iconId,
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
      if (preview && preview.id === drag.iconId) {
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
    [onHistoryCoalesceEnd, onIconsChange],
  );

  if (icons.length === 0) return null;

  return (
    <div
      className={`canvas-icon-layer${exporting ? " canvas-icon-layer--exporting" : ""}`}
      aria-hidden={exporting}
    >
      {icons.map((icon) => {
        const preview =
          dragPreview?.id === icon.id
            ? { ...icon, transform: { ...icon.transform, x: dragPreview.x, y: dragPreview.y } }
            : icon;
        return (
          <CanvasIconItem
            key={icon.id}
            icon={preview}
            canvasShortSide={canvasShortSide}
            selected={canvasSelection === `icon:${icon.id}`}
            dragging={draggingId === icon.id}
            onPointerDown={onPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        );
      })}
    </div>
  );
}

export const CanvasIconLayer = memo(CanvasIconLayerInner);

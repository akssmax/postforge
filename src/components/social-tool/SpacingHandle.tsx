"use client";

import { useRef, useState } from "react";
import {
  applyTokenSteps,
  dragPxToTokenSteps,
  spacingTokenLabel,
  stepSpacingToken,
  type SpacingToken,
} from "@/lib/social-tool/layoutSpacing";

type HandleKind = "padding" | "gap";

type HandleVariant =
  | "edge-bottom"
  | "edge-top"
  | "edge-left"
  | "edge-right"
  | "between";

type Props = {
  kind: HandleKind;
  /** Which spacing token this handle controls */
  token: SpacingToken;
  onTokenChange: (token: SpacingToken) => void;
  /** Screen-space scale of the canvas preview */
  previewScale?: number;
  /** padding: edge strip; gap: horizontal bar between stacked blocks */
  variant: HandleVariant;
  ariaLabel: string;
  className?: string;
};

function isHorizontalVariant(variant: HandleVariant): boolean {
  return variant === "edge-left" || variant === "edge-right";
}

export function SpacingHandle({
  kind,
  token,
  onTokenChange,
  previewScale = 1,
  variant,
  ariaLabel,
  className = "",
}: Props) {
  const [active, setActive] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origin: SpacingToken;
  } | null>(null);
  const horizontal = isHorizontalVariant(variant);

  const onPointerDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setActive(true);
    dragRef.current = {
      startX: ev.clientX,
      startY: ev.clientY,
      origin: token,
    };
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = previewScale > 0 ? previewScale : 1;
    const pxPerStep = 10 * scale;

    let steps = 0;
    if (horizontal) {
      const deltaX = ev.clientX - drag.startX;
      // Left: drag inward (right) increases pad; right: drag inward (left) increases pad
      const signed =
        variant === "edge-left" ? deltaX : -deltaX;
      steps = dragPxToTokenSteps(signed, pxPerStep);
    } else {
      const deltaY = ev.clientY - drag.startY;
      // Top / between: drag up increases. Bottom: drag down (outward) increases.
      const signed = variant === "edge-bottom" ? deltaY : -deltaY;
      steps = dragPxToTokenSteps(signed, pxPerStep);
    }

    if (steps === 0) return;
    const next = applyTokenSteps(drag.origin, steps);
    if (next !== token) {
      dragRef.current = {
        startX: ev.clientX,
        startY: ev.clientY,
        origin: next,
      };
      onTokenChange(next);
    }
  };

  const endDrag = (ev: React.PointerEvent) => {
    dragRef.current = null;
    setActive(false);
    try {
      (ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`spacing-handle spacing-handle--${kind} spacing-handle--${variant}${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="slider"
      aria-label={ariaLabel}
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      aria-valuemin={0}
      aria-valuemax={24}
      aria-valuenow={token}
      aria-valuetext={`${spacingTokenLabel(token)} (${kind})`}
      tabIndex={0}
      onKeyDown={(ev) => {
        if (horizontal) {
          if (ev.key === "ArrowLeft") {
            ev.preventDefault();
            onTokenChange(
              stepSpacingToken(token, variant === "edge-left" ? -1 : 1),
            );
          }
          if (ev.key === "ArrowRight") {
            ev.preventDefault();
            onTokenChange(
              stepSpacingToken(token, variant === "edge-left" ? 1 : -1),
            );
          }
          return;
        }
        if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") {
          ev.preventDefault();
          onTokenChange(stepSpacingToken(token, -1));
        }
        if (ev.key === "ArrowDown" || ev.key === "ArrowRight") {
          ev.preventDefault();
          onTokenChange(stepSpacingToken(token, 1));
        }
      }}
    >
      <span className="spacing-handle-bar" aria-hidden />
      <span className={`spacing-handle-label${active ? " is-visible" : ""}`}>
        {kind === "padding" ? "p" : "gap"}-{spacingTokenLabel(token)}
      </span>
    </div>
  );
}

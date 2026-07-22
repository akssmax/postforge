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

type Props = {
  kind: HandleKind;
  /** Which spacing token this handle controls */
  token: SpacingToken;
  onTokenChange: (token: SpacingToken) => void;
  /** Screen-space scale of the canvas preview */
  previewScale?: number;
  /** padding: edge strip; gap: horizontal bar between stacked blocks */
  variant: "edge-bottom" | "edge-top" | "between";
  ariaLabel: string;
  className?: string;
};

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
  const dragRef = useRef<{ startY: number; origin: SpacingToken } | null>(null);

  const onPointerDown = (ev: React.PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setActive(true);
    dragRef.current = { startY: ev.clientY, origin: token };
    (ev.target as HTMLElement).setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const scale = previewScale > 0 ? previewScale : 1;
    const deltaY = ev.clientY - drag.startY;
    const steps = dragPxToTokenSteps(-deltaY, 10 * scale);
    if (steps === 0) return;
    const next = applyTokenSteps(drag.origin, steps);
    if (next !== token) {
      dragRef.current = { startY: ev.clientY, origin: next };
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
      aria-valuemin={0}
      aria-valuemax={24}
      aria-valuenow={token}
      aria-valuetext={`${spacingTokenLabel(token)} (${kind})`}
      tabIndex={0}
      onKeyDown={(ev) => {
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

"use client";

import type { ReactNode } from "react";

type Props = {
  zoom: ReactNode;
  history?: ReactNode;
};

/** Bottom-left stage chrome — zoom and history as separate pill groups. */
export function CanvasBottomChrome({ zoom, history }: Props) {
  return (
    <div
      className="canvas-bottom-chrome"
      role="toolbar"
      aria-label="Canvas zoom and history"
    >
      <div className="canvas-bottom-chrome-group">{zoom}</div>
      {history ? (
        <div className="canvas-bottom-chrome-group">{history}</div>
      ) : null}
    </div>
  );
}

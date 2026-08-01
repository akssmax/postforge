"use client";

import type { ReactNode } from "react";

type Props = {
  platform: ReactNode;
  exportControl: ReactNode;
};

/** Top-right stage chrome — artboard size and export as a floating pill group. */
export function CanvasTopRightChrome({ platform, exportControl }: Props) {
  return (
    <div
      className="canvas-stage-chrome canvas-stage-chrome--top-right"
      role="toolbar"
      aria-label="Canvas size and export"
    >
      {platform ? (
        <>
          <div className="canvas-top-right-chrome__platform">{platform}</div>
          <div
            className="canvas-stage-chrome-separator"
            role="separator"
            aria-orientation="vertical"
          />
        </>
      ) : null}
      <div className="canvas-top-right-chrome__export">{exportControl}</div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Hand, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  zoomPercent: number;
  canActualSize: boolean;
  handActive: boolean;
  handMode: boolean;
  onToggleHand: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onActualSize: () => void;
  /** Optional pill group rendered after zoom controls (e.g. artboard switcher) */
  trailing?: ReactNode;
};

export function CanvasZoomControls({
  zoomPercent,
  canActualSize,
  handActive,
  handMode,
  onToggleHand,
  onZoomIn,
  onZoomOut,
  onReset,
  onActualSize,
  trailing,
}: Props) {
  return (
    <div className="canvas-stage-chrome" role="toolbar" aria-label="Canvas tools">
      <div className="canvas-zoom-toolbar" role="group" aria-label="Hand tool">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant={handActive ? "primary" : "secondary"}
              size="sm"
              aria-label="Hand tool"
              aria-pressed={handMode}
              className="canvas-tool-pill-btn canvas-zoom-icon-btn"
              onPress={onToggleHand}
            >
              <Hand className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Hand tool</p>
            <p className="layout-shuffle-tooltip-body">
              Hold Space to pan, or press H to lock hand mode
            </p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      <div className="canvas-zoom-toolbar" role="group" aria-label="Canvas zoom">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Zoom out"
              className="canvas-tool-pill-btn canvas-zoom-icon-btn"
              onPress={onZoomOut}
            >
              <ZoomOut className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Zoom out</p>
            <p className="layout-shuffle-tooltip-body">Pinch or Ctrl/⌘ + scroll</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label={`Zoom ${zoomPercent} percent. Click to reset to fit`}
              className="canvas-tool-pill-btn canvas-zoom-percent-btn"
              onPress={onReset}
            >
              <span className="canvas-tool-pill-label">{zoomPercent}%</span>
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Reset zoom</p>
            <p className="layout-shuffle-tooltip-body">Fit canvas to the stage</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Zoom in"
              className="canvas-tool-pill-btn canvas-zoom-icon-btn"
              onPress={onZoomIn}
            >
              <ZoomIn className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Zoom in</p>
            <p className="layout-shuffle-tooltip-body">Pinch or Ctrl/⌘ + scroll</p>
          </Tooltip.Content>
        </Tooltip>

        {canActualSize ? (
          <Tooltip delay={500}>
            <Tooltip.Trigger>
              <Button
                variant="secondary"
                size="sm"
                aria-label="Actual size"
                className="canvas-tool-pill-btn canvas-zoom-icon-btn"
                onPress={onActualSize}
              >
                <Maximize2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" offset={8}>
              <p className="layout-shuffle-tooltip-title">Actual size</p>
              <p className="layout-shuffle-tooltip-body">View at 1:1 pixel size</p>
            </Tooltip.Content>
          </Tooltip>
        ) : null}
      </div>

      {trailing ? (
        <>
          <div
            className="canvas-stage-chrome-separator"
            role="separator"
            aria-orientation="vertical"
          />
          {trailing}
        </>
      ) : null}
    </div>
  );
}

"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function CanvasZoomToolbar({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onReset,
}: Props) {
  return (
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
        <Tooltip.Content placement="top" offset={8}>
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
        <Tooltip.Content placement="top" offset={8}>
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
        <Tooltip.Content placement="top" offset={8}>
          <p className="layout-shuffle-tooltip-title">Zoom in</p>
          <p className="layout-shuffle-tooltip-body">Pinch or Ctrl/⌘ + scroll</p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

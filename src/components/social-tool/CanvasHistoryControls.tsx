"use client";

import { Redo2, Undo2 } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** Flash when undo history hits the 11-step cap */
  historyLimitToast?: boolean;
};

export function CanvasHistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  historyLimitToast = false,
}: Props) {
  return (
    <div
      className="canvas-history-chrome"
      role="toolbar"
      aria-label="Undo and redo"
    >
      <div className="canvas-zoom-toolbar" role="group" aria-label="History">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Undo"
              isDisabled={!canUndo}
              className="canvas-tool-pill-btn canvas-zoom-icon-btn"
              onPress={onUndo}
            >
              <Undo2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top" offset={8}>
            <p className="layout-shuffle-tooltip-title">Undo</p>
            <p className="layout-shuffle-tooltip-body">⌘Z / Ctrl+Z</p>
          </Tooltip.Content>
        </Tooltip>

        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Redo"
              isDisabled={!canRedo}
              className="canvas-tool-pill-btn canvas-zoom-icon-btn"
              onPress={onRedo}
            >
              <Redo2 className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="top" offset={8}>
            <p className="layout-shuffle-tooltip-title">Redo</p>
            <p className="layout-shuffle-tooltip-body">⌘⇧Z / Ctrl+Y</p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      <div
        className={`canvas-history-toast${historyLimitToast ? " is-visible" : ""}`}
        aria-live="polite"
      >
        Undo history limited to 11 steps
      </div>
    </div>
  );
}

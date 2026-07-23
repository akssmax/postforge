"use client";

import type { ReactNode } from "react";
import { Hand, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ASIDE_PANEL_TOGGLE_LAYOUT_ID,
  asidePanelSpring,
} from "@/components/social-tool/asidePanelMotion";

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
  /** Optional control before hand/zoom (e.g. show sidebar when collapsed) */
  leading?: ReactNode;
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
  leading,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="canvas-stage-chrome" role="toolbar" aria-label="Canvas tools">
      <AnimatePresence initial={false} mode="popLayout">
        {leading ? (
          <motion.div
            key="canvas-chrome-leading"
            className="flex items-center gap-1.5"
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={reduceMotion ? { duration: 0 } : asidePanelSpring}
          >
            <motion.div
              layoutId={ASIDE_PANEL_TOGGLE_LAYOUT_ID}
              className="flex"
              transition={reduceMotion ? { duration: 0 } : asidePanelSpring}
            >
              {leading}
            </motion.div>
            <div
              className="canvas-stage-chrome-separator"
              role="separator"
              aria-orientation="vertical"
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

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
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { Hand } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ASIDE_PANEL_TOGGLE_LAYOUT_ID,
  asidePanelSpring,
} from "@/components/social-tool/asidePanelMotion";

type Props = {
  handActive: boolean;
  handMode: boolean;
  onToggleHand: () => void;
  /** Primary leading control (e.g. show sidebar) — shares collapse morph layout id. */
  leading?: ReactNode;
  /** Extra leading controls without shared morph (e.g. open chat). */
  leadingExtra?: ReactNode;
};

export function CanvasZoomControls({
  handActive,
  handMode,
  onToggleHand,
  leading,
  leadingExtra,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="canvas-stage-chrome" role="toolbar" aria-label="Canvas tools">
      <AnimatePresence initial={false} mode="popLayout">
        {leading || leadingExtra ? (
          <motion.div
            key="canvas-chrome-leading"
            className="flex items-center gap-1.5"
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={reduceMotion ? { duration: 0 } : asidePanelSpring}
          >
            {leading ? (
              <motion.div
                layoutId={ASIDE_PANEL_TOGGLE_LAYOUT_ID}
                className="flex"
                transition={reduceMotion ? { duration: 0 } : asidePanelSpring}
              >
                {leading}
              </motion.div>
            ) : null}
            {leadingExtra ? (
              <div className="canvas-stage-chrome-leading-extra flex">{leadingExtra}</div>
            ) : null}
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
    </div>
  );
}

"use client";

import { Loader2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  generating?: boolean;
  disabled?: boolean;
  onGenerate: () => void;
};

export function GenerateVariantsButton({
  generating = false,
  disabled = false,
  onGenerate,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <Tooltip delay={500}>
      <Tooltip.Trigger>
        <Button
          variant="secondary"
          size="sm"
          aria-label="Generate variants"
          className="canvas-tool-pill-btn generate-variants-cta"
          isDisabled={disabled || generating}
          onPress={onGenerate}
        >
          {generating ? (
            <Loader2
              className="size-3.5 shrink-0 animate-spin"
              strokeWidth={2.25}
              aria-hidden
            />
          ) : (
            <motion.span
              className="generate-variants-cta-icon"
              aria-hidden
              animate={
                reduceMotion
                  ? undefined
                  : {
                      scale: [1, 1.12, 1],
                      rotate: [0, -8, 8, 0],
                    }
              }
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 2.4,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 1.2,
                    }
              }
            >
              <Sparkles className="size-3.5 shrink-0" strokeWidth={2.25} />
            </motion.span>
          )}
          <span className="generate-variants-cta-label">Generate variants</span>
          {!generating && !reduceMotion ? (
            <span className="generate-variants-cta-sheen" aria-hidden />
          ) : null}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="bottom" offset={8}>
        <p className="layout-shuffle-tooltip-title">Generate variants</p>
        <p className="layout-shuffle-tooltip-body">
          Create up to 3 more alternate artboards (max 7 total)
        </p>
      </Tooltip.Content>
    </Tooltip>
  );
}

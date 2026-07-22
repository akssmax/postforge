"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  layoutName: string;
  onShuffle: () => void;
};

export function LayoutShuffleButton({ layoutName, onShuffle }: Props) {
  const [flash, setFlash] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function handlePress() {
    onShuffle();
    setFlash(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFlash(false), 2400);
  }

  return (
    <div className="layout-shuffle-toolbar">
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="sm"
            aria-label="Shuffle layout"
            className="layout-shuffle-btn canvas-tool-pill-btn"
            onPress={handlePress}
          >
            <Shuffle className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="layout-shuffle-btn-label canvas-tool-pill-label">Shuffle</span>
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="bottom" offset={8}>
          <p className="layout-shuffle-tooltip-title">Shuffle layout</p>
          <p className="layout-shuffle-tooltip-body">
            Rearrange logo, copy blocks, footer fields, and product image.
          </p>
        </Tooltip.Content>
      </Tooltip>

      <div
        className={`layout-shuffle-toast${flash ? " is-visible" : ""}`}
        aria-live="polite"
      >
        {layoutName}
      </div>
    </div>
  );
}

"use client";

import { MoveVertical } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
};

export function LayoutSpacingToggle({ enabled, onToggle }: Props) {
  return (
    <div className="layout-spacing-toolbar">
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Button
            variant={enabled ? "primary" : "secondary"}
            size="sm"
            aria-label="Adjust spacing"
            aria-pressed={enabled}
            className="canvas-tool-pill-btn"
            onPress={onToggle}
          >
            <MoveVertical className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="canvas-tool-pill-label">Spacing</span>
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content placement="bottom" offset={8}>
          <p className="layout-shuffle-tooltip-title">Adjust spacing</p>
          <p className="layout-shuffle-tooltip-body">
            Show drag handles to tweak gaps and padding with Tailwind steps.
          </p>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}

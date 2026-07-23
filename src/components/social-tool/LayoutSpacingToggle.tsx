"use client";

import { MoveVertical, X } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
};

export function LayoutSpacingToggle({ enabled, onToggle }: Props) {
  return (
    <div className="layout-spacing-toolbar">
      <div
        className={`layout-spacing-combobutton${enabled ? " is-active" : ""}`}
      >
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant={enabled ? "primary" : "secondary"}
              size="sm"
              aria-label="Adjust spacing"
              aria-pressed={enabled}
              className={`canvas-tool-pill-btn layout-spacing-combobutton-main${enabled ? " is-active" : ""}`}
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

        {enabled ? (
          <Tooltip delay={500}>
            <Tooltip.Trigger>
              <Button
                variant="primary"
                size="sm"
                aria-label="Exit spacing"
                className="canvas-tool-pill-btn layout-spacing-combobutton-exit"
                onPress={onToggle}
              >
                <X className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" offset={8}>
              <p className="layout-shuffle-tooltip-title">Exit spacing</p>
            </Tooltip.Content>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}

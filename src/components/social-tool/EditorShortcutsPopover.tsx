"use client";

import { CircleHelp } from "lucide-react";
import { Button, Popover, Tooltip } from "@heroui/react";

const SHORTCUTS: ReadonlyArray<{ keys: string; action: string }> = [
  { keys: "⌘Z / ⌘⇧Z", action: "Undo / Redo" },
  { keys: "1–7", action: "Focus artboard" },
  { keys: "Enter", action: "Edit selected copy" },
  { keys: "[ / ]", action: "Cycle copy variants" },
  { keys: "Delete", action: "Clear / remove visual slot" },
  { keys: "←↑↓→", action: "Nudge featured visual" },
  { keys: "Esc", action: "Clear selection" },
];

type Props = {
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function EditorShortcutsPopover({
  className,
  isOpen,
  onOpenChange,
}: Props) {
  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
      <Tooltip delay={500}>
        <Tooltip.Trigger>
          <Popover.Trigger>
            <Button
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label="Keyboard shortcuts"
              className={
                className ?? "canvas-tool-pill-btn canvas-zoom-icon-btn"
              }
            >
              <CircleHelp
                className="size-3.5 shrink-0"
                strokeWidth={2.25}
                aria-hidden
              />
            </Button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Content placement="top" offset={8}>
          <p className="layout-shuffle-tooltip-title">Keyboard shortcuts</p>
          <p className="layout-shuffle-tooltip-body">Press ? anytime</p>
        </Tooltip.Content>
      </Tooltip>
      <Popover.Content placement="top start" offset={8}>
        <Popover.Dialog className="editor-shortcuts-popover">
          <p className="editor-shortcuts-popover__title">Shortcuts</p>
          <ul className="editor-shortcuts-popover__list">
            {SHORTCUTS.map((row) => (
              <li key={row.keys} className="editor-shortcuts-popover__row">
                <kbd className="editor-shortcuts-popover__keys">{row.keys}</kbd>
                <span className="editor-shortcuts-popover__action">
                  {row.action}
                </span>
              </li>
            ))}
          </ul>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

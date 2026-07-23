"use client";

import { Button, Tooltip } from "@heroui/react";

export type ArtboardSwitcherItem = {
  id: string;
  /** Always the fixed index label ("1"…"7") shown in the pill. */
  label: string;
  /** Optional custom name for aria/tooltip only — never replaces the pill text. */
  name?: string;
};

type Props = {
  boards: ArtboardSwitcherItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function CanvasArtboardSwitcher({ boards, activeId, onSelect }: Props) {
  if (boards.length <= 1) return null;

  return (
    <div
      className="canvas-stage-chrome canvas-artboard-chrome"
      role="toolbar"
      aria-label="Artboards"
    >
      <div className="canvas-zoom-toolbar" role="group" aria-label="Variant artboards">
        {boards.map((board, index) => {
          const selected = board.id === activeId;
          const shortcut = index < 7 ? String(index + 1) : null;
          const customName = board.name?.trim() || "";
          const title = customName
            ? `${customName} (artboard ${board.label})`
            : `Artboard ${board.label}`;
          return (
            <Tooltip key={board.id} delay={500}>
              <Tooltip.Trigger>
                <Button
                  variant={selected ? "primary" : "secondary"}
                  size="sm"
                  aria-label={
                    shortcut
                      ? `Focus ${title} (press ${shortcut})`
                      : `Focus ${title}`
                  }
                  aria-pressed={selected}
                  className="canvas-tool-pill-btn canvas-zoom-artboard-btn"
                  onPress={() => onSelect(board.id)}
                >
                  <span className="canvas-tool-pill-label">{board.label}</span>
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom" offset={8}>
                <p className="layout-shuffle-tooltip-title">{title}</p>
                <p className="layout-shuffle-tooltip-body">
                  {selected
                    ? "Currently editing — click to re-center"
                    : "Switch to this artboard and bring it into view"}
                  {shortcut ? ` · Key ${shortcut}` : ""}
                </p>
              </Tooltip.Content>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

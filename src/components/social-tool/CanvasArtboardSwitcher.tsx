"use client";

import { Button, Tooltip } from "@heroui/react";

export type ArtboardSwitcherItem = {
  id: string;
  label: string;
};

type Props = {
  boards: ArtboardSwitcherItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function CanvasArtboardSwitcher({ boards, activeId, onSelect }: Props) {
  if (boards.length <= 1) return null;

  return (
    <div className="canvas-zoom-toolbar" role="group" aria-label="Artboards">
      {boards.map((board, index) => {
        const selected = board.id === activeId;
        const shortcut = index <= 6 ? String(index) : null;
        return (
          <Tooltip key={board.id} delay={500}>
            <Tooltip.Trigger>
              <Button
                variant={selected ? "primary" : "secondary"}
                size="sm"
                aria-label={
                  shortcut
                    ? `Focus ${board.label} (press ${shortcut})`
                    : `Focus ${board.label}`
                }
                aria-pressed={selected}
                className="canvas-tool-pill-btn canvas-zoom-artboard-btn"
                onPress={() => onSelect(board.id)}
              >
                <span className="canvas-tool-pill-label">{board.label}</span>
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom" offset={8}>
              <p className="layout-shuffle-tooltip-title">{board.label}</p>
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
  );
}

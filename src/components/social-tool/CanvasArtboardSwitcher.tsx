"use client";

import { useEffect, useRef } from "react";
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
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    // Query the pressed pill — avoid Button refs (they can fight HeroUI/RAC).
    const btn = scroller.querySelector<HTMLElement>(
      'button[aria-pressed="true"]',
    );
    if (!btn) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const delta =
      btnRect.left +
      btnRect.width / 2 -
      (scrollerRect.left + scrollerRect.width / 2);
    if (Math.abs(delta) < 1) return;
    // Scroll only this overflow chrome — never scrollIntoView (ancestors).
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeId, boards.length]);

  if (boards.length <= 1) return null;

  return (
    <div
      ref={scrollerRef}
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

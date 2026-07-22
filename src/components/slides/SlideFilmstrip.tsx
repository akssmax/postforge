"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import type { Slide } from "@/lib/slides/types";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides/types";
import { SlideCanvas } from "@/components/slides/SlideCanvas";

type Props = {
  slides: Slide[];
  activeSlideId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
};

export function SlideFilmstrip({
  slides,
  activeSlideId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: Props) {
  const thumbScale = 0.08;

  function onDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(from) && from !== toIndex) onReorder(from, toIndex);
  }

  return (
    <div className="slides-filmstrip">
      <div className="slides-filmstrip-actions">
        <button type="button" onClick={onAdd} aria-label="Add slide">
          <Plus className="size-3.5" />
          Add
        </button>
        <button type="button" onClick={onDuplicate} aria-label="Duplicate slide">
          <Copy className="size-3.5" />
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={slides.length <= 1}
          aria-label="Delete slide"
        >
          <Trash2 className="size-3.5" />
          Delete
        </button>
      </div>
      <div className="slides-filmstrip-track" role="list">
        {slides.map((slide, index) => {
          const active = slide.id === activeSlideId;
          return (
            <div
              key={slide.id}
              role="listitem"
              tabIndex={0}
              draggable
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, index)}
              onClick={() => onSelect(slide.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(slide.id);
                }
              }}
              className={`slides-filmstrip-thumb${active ? " is-active" : ""}`}
              aria-label={`${slide.name}, slide ${index + 1}`}
              aria-current={active ? "true" : undefined}
            >
              <span className="slides-filmstrip-index">{index + 1}</span>
              <span
                className="slides-filmstrip-preview"
                style={{
                  width: SLIDE_WIDTH * thumbScale,
                  height: SLIDE_HEIGHT * thumbScale,
                }}
              >
                <span
                  style={{
                    width: SLIDE_WIDTH,
                    height: SLIDE_HEIGHT,
                    transform: `scale(${thumbScale})`,
                    transformOrigin: "top left",
                    pointerEvents: "none",
                    display: "block",
                  }}
                >
                  <SlideCanvas
                    slide={slide}
                    selectedBlockId={null}
                    exporting
                    interactive={false}
                    staticPreview
                  />
                </span>
              </span>
              <span className="slides-filmstrip-name">{slide.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

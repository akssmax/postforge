"use client";

import type { SlideBlock } from "@/lib/slides/types";
import type { SlideTone } from "@/lib/slides/presets";
import { TextBlockView } from "@/components/slides/blocks/TextBlock";
import { ImageBlockView } from "@/components/slides/blocks/ImageBlock";
import { ProductShotBlockView } from "@/components/slides/blocks/ProductShotBlock";
import { PatternBlockView } from "@/components/slides/blocks/PatternBlock";

type Props = {
  block: SlideBlock;
  selected: boolean;
  exporting: boolean;
  interactive: boolean;
  tone?: SlideTone;
  /** Skip interactive product chrome (filmstrip thumbs) */
  staticPreview?: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
};

type DragKind = "move" | "resize-se";

export function SlideBlockFrame({
  block,
  selected,
  exporting,
  interactive,
  tone = "dark",
  staticPreview = false,
  onSelect,
  onMove,
  onResize,
}: Props) {
  function startPointer(
    e: React.PointerEvent,
    kind: DragKind,
  ) {
    if (!interactive || exporting) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(block.id);

    const target = e.currentTarget as HTMLElement;
    const slide = target.closest(".slides-canvas") as HTMLElement | null;
    if (!slide) return;

    const rect = slide.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { x: block.x, y: block.y, w: block.w, h: block.h };

    const onMovePtr = (ev: PointerEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      if (kind === "move") {
        onMove(
          block.id,
          clamp(orig.x + dx, 0, 100 - orig.w),
          clamp(orig.y + dy, 0, 100 - orig.h),
        );
      } else {
        const w = clamp(orig.w + dx, 4, 100 - orig.x);
        const h = clamp(orig.h + dy, 4, 100 - orig.y);
        onResize(block.id, orig.x, orig.y, w, h);
      }
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMovePtr);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMovePtr);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className={`slides-block${selected && !exporting ? " is-selected" : ""}`}
      style={{
        left: `${block.x}%`,
        top: `${block.y}%`,
        width: `${block.w}%`,
        height: `${block.h}%`,
        zIndex: block.zIndex,
      }}
      onPointerDown={(e) => {
        if (!interactive) return;
        startPointer(e, "move");
      }}
    >
      {block.type === "text" ? (
        <TextBlockView block={block} tone={tone} />
      ) : null}
      {block.type === "image" ? <ImageBlockView block={block} /> : null}
      {block.type === "product" ? (
        <ProductShotBlockView block={block} staticPreview={staticPreview} />
      ) : null}
      {block.type === "pattern" ? (
        <PatternBlockView block={block} tone={tone} />
      ) : null}
      {selected && interactive && !exporting ? (
        <span
          className="slides-block-handle"
          aria-hidden
          onPointerDown={(e) => startPointer(e, "resize-se")}
        />
      ) : null}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

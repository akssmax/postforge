"use client";

import type { Slide } from "@/lib/slides/types";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides/types";
import { slideToneForBackground } from "@/lib/slides/presets";
import { SlideBlockFrame } from "@/components/slides/SlideBlockFrame";

type Props = {
  slide: Slide;
  selectedBlockId: string | null;
  exporting: boolean;
  interactive?: boolean;
  /** Lightweight product chrome for filmstrip (no nested buttons) */
  staticPreview?: boolean;
  onSelectBlock?: (id: string | null) => void;
  onMoveBlock?: (id: string, x: number, y: number) => void;
  onResizeBlock?: (
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
};

export function SlideCanvas({
  slide,
  selectedBlockId,
  exporting,
  interactive = true,
  staticPreview = false,
  onSelectBlock,
  onMoveBlock,
  onResizeBlock,
}: Props) {
  const sorted = [...slide.blocks].sort((a, b) => a.zIndex - b.zIndex);
  const tone = slideToneForBackground(slide.background);

  return (
    <div
      className="slides-canvas"
      data-slide-id={slide.id}
      data-slide-tone={tone}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        background: slide.background,
        color: tone === "light" ? "var(--brand-950)" : "#ffffff",
      }}
      onPointerDown={() => {
        if (interactive) onSelectBlock?.(null);
      }}
    >
      {sorted.map((block) => (
        <SlideBlockFrame
          key={block.id}
          block={block}
          selected={selectedBlockId === block.id}
          exporting={exporting}
          interactive={interactive}
          staticPreview={staticPreview}
          tone={tone}
          onSelect={(id) => onSelectBlock?.(id)}
          onMove={(id, x, y) => onMoveBlock?.(id, x, y)}
          onResize={(id, x, y, w, h) => onResizeBlock?.(id, x, y, w, h)}
        />
      ))}
    </div>
  );
}

"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import {
  type ContrastResult,
  type DesignBlockId,
} from "@/lib/brand/contrast";

type Props = {
  /** Visible preview viewport (matches scaled canvas size on screen) */
  containerRoot: HTMLElement | null;
  canvasRoot: HTMLElement | null;
  enabled: boolean;
  results: ContrastResult[];
  selectedBlock: DesignBlockId | null;
  onSelectBlock: (id: DesignBlockId | null) => void;
};

type BlockRect = {
  id: DesignBlockId;
  top: number;
  left: number;
  width: number;
  height: number;
};

export function CanvasDesignOverlay({
  containerRoot,
  canvasRoot,
  enabled,
  results,
  selectedBlock,
  onSelectBlock,
}: Props) {
  const [rects, setRects] = useState<BlockRect[]>([]);

  const failingIds = useMemo(
    () => new Set(results.filter((r) => !r.passes).map((r) => r.blockId)),
    [results],
  );

  useLayoutEffect(() => {
    if (!enabled || !canvasRoot || !containerRoot || failingIds.size === 0) {
      setRects([]);
      return;
    }

    const measure = () => {
      const containerBox = containerRoot.getBoundingClientRect();
      const next: BlockRect[] = [];
      canvasRoot.querySelectorAll<HTMLElement>("[data-design-block]").forEach((el) => {
        const id = el.dataset.designBlock as DesignBlockId;
        if (!failingIds.has(id)) return;
        const box = el.getBoundingClientRect();
        next.push({
          id,
          top: box.top - containerBox.top,
          left: box.left - containerBox.left,
          width: box.width,
          height: box.height,
        });
      });
      setRects(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvasRoot);
    ro.observe(containerRoot);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [canvasRoot, containerRoot, enabled, failingIds, selectedBlock]);

  if (!enabled || !canvasRoot || !containerRoot || failingIds.size === 0) {
    return null;
  }

  const resultMap = new Map(results.map((r) => [r.blockId, r]));

  return (
    <div className="canvas-design-overlay" aria-hidden={false}>
      {rects.map((rect) => {
        const result = resultMap.get(rect.id);
        const isSelected = selectedBlock === rect.id;

        return (
          <button
            key={rect.id}
            type="button"
            className={`canvas-design-bounds is-fail${isSelected ? " is-selected" : ""}`}
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(isSelected ? null : rect.id);
            }}
            aria-label={`${result?.label ?? rect.id} block, contrast failing`}
            aria-pressed={isSelected}
          >
            <span className="canvas-design-label">{result?.label ?? rect.id}</span>
          </button>
        );
      })}
    </div>
  );
}

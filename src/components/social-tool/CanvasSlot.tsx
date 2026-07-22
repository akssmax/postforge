"use client";

import type { CSSProperties } from "react";
import type { DesignBlockId } from "@/lib/brand/contrast";

export type CanvasSlotVariant = "logo" | "headline" | "subheading" | "image" | "extra";

type Props = {
  variant: CanvasSlotVariant;
  className?: string;
  style?: CSSProperties;
  designBlock?: DesignBlockId;
};

export function CanvasSlot({
  variant,
  className,
  style,
  designBlock,
}: Props) {
  return (
    <div
      className={`canvas-slot canvas-slot--${variant}${className ? ` ${className}` : ""}`}
      style={style}
      data-design-block={designBlock}
      aria-hidden
    />
  );
}

export function isEmptyCopyField(value: string): boolean {
  return value.trim().length === 0;
}

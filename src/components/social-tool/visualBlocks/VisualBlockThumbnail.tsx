"use client";

import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import { isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";

type Props = {
  block: VisualBlockRecord;
  brandColors?: { primary?: string; accent?: string };
  className?: string;
};

export function VisualBlockThumbnail({ block, brandColors, className }: Props) {
  if (isUiReactPattern(block.libraryId)) {
    return (
      <div className={`visual-block-thumbnail${className ? ` ${className}` : ""}`}>
        <VisualBlockRenderer block={block} brandColors={brandColors} compact />
      </div>
    );
  }

  if (block.svgMarkup) {
    return (
      <div
        className={`visual-block-thumbnail visual-block-thumbnail--svg${className ? ` ${className}` : ""}`}
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(block.svgMarkup)}")`,
        }}
      />
    );
  }

  return <div className={`visual-block-thumbnail visual-block-thumbnail--empty${className ? ` ${className}` : ""}`} />;
}

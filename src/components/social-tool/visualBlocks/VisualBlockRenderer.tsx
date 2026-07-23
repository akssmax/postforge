"use client";

import { FeaturedImageContent } from "@/components/social-tool/FeaturedImageContent";
import { getUiPatternComponent } from "@/components/social-tool/visualBlocks/patterns/registry";
import { mergeUiContent, isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type Props = {
  block: VisualBlockRecord;
  brandColors?: {
    primary?: string;
    accent?: string;
  };
  compact?: boolean;
  /** Reserved for future slot-aware UI pattern sizing. */
  canvasFit?: boolean;
};

export function VisualBlockRenderer({
  block,
  brandColors,
  compact = false,
  canvasFit = false,
}: Props) {
  const primary = brandColors?.primary ?? "#0A1B25";
  const accent = brandColors?.accent ?? "#4BB793";
  const libraryId = block.libraryId ?? null;

  if (isUiReactPattern(libraryId) && libraryId) {
    const Pattern = getUiPatternComponent(libraryId);
    if (Pattern) {
      const content = mergeUiContent(libraryId, {
        primary,
        accent,
        headline: block.theme ?? "Your headline",
        theme: block.theme ?? "Product value",
      }, block.content);

      return (
        <Pattern content={content} primary={primary} accent={accent} compact={compact} />
      );
    }
  }

  if (block.svgMarkup) {
    return (
      <FeaturedImageContent imageSrc={null} svgMarkup={block.svgMarkup} bare />
    );
  }

  return null;
}

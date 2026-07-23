"use client";

import { FeaturedComposer } from "@/components/social-tool/visualBlocks/FeaturedComposer";
import { FeaturedImageContent } from "@/components/social-tool/FeaturedImageContent";
import { getUiPatternComponent } from "@/components/social-tool/visualBlocks/patterns/registry";
import {
  densityIsCompact,
  densityIsHero,
  stylePackCssVars,
} from "@/components/social-tool/visualBlocks/stylePacks";
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
  density?: "compact" | "medium" | "hero";
  composition?: string;
  stylePackId?: string;
  /** When true, skip FeaturedComposer nesting (used for parts). */
  asPart?: boolean;
};

export function VisualBlockRenderer({
  block,
  brandColors,
  compact = false,
  canvasFit = false,
  density,
  composition,
  stylePackId,
  asPart = false,
}: Props) {
  const primary = brandColors?.primary ?? "#0A1B25";
  const accent = brandColors?.accent ?? "#4BB793";
  const libraryId = block.libraryId ?? null;
  const resolvedDensity = density ?? block.semantic?.density;
  const resolvedPack = stylePackId ?? block.semantic?.stylePackId;
  const resolvedComposition = composition ?? block.semantic?.composition ?? "centered";
  const isCompact = densityIsCompact(resolvedDensity, compact);
  const isHero = densityIsHero(resolvedDensity);

  // Multi-part compositions are for UI/diagram stacks only — never stack illustrations
  if (
    !asPart &&
    block.kind !== "illustration" &&
    block.semantic?.compositionParts &&
    block.semantic.compositionParts.length > 1
  ) {
    return (
      <FeaturedComposer
        block={block}
        brandColors={brandColors}
        compact={isCompact}
      />
    );
  }

  const packStyle = stylePackCssVars(resolvedPack, { primary, accent });

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
        <div className="flex h-full w-full items-center justify-center" style={packStyle}>
          <Pattern
            content={content}
            primary={primary}
            accent={accent}
            compact={isCompact}
            density={resolvedDensity}
            composition={resolvedComposition}
            hero={isHero}
          />
        </div>
      );
    }
  }

  if (block.svgMarkup) {
    // Illustrations sit bare on the canvas — no style-pack surface card / white plate
    if (block.kind === "illustration") {
      return (
        <div className="flex h-full w-full items-center justify-center overflow-hidden">
          <FeaturedImageContent imageSrc={null} svgMarkup={block.svgMarkup} bare />
        </div>
      );
    }

    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-[var(--vb-radius,12px)]"
        style={packStyle}
      >
        <FeaturedImageContent imageSrc={null} svgMarkup={block.svgMarkup} bare />
      </div>
    );
  }

  void canvasFit;
  return null;
}

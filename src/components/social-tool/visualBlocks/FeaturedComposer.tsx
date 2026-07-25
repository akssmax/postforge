"use client";

import type { CSSProperties } from "react";
import { VisualBlockRenderer } from "@/components/social-tool/visualBlocks/VisualBlockRenderer";
import { stylePackCssVars } from "@/components/social-tool/visualBlocks/stylePacks";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { cn } from "@/lib/utils";

type Props = {
  block: VisualBlockRecord;
  brandColors?: {
    primary?: string;
    accent?: string;
  };
  compact?: boolean;
  className?: string;
};

/**
 * Composes multi-part semantic featured visuals into a single frame.
 * v1: stacks parts vertically; hero part is larger.
 */
export function FeaturedComposer({
  block,
  brandColors,
  compact = false,
  className,
}: Props) {
  const parts = block.semantic?.compositionParts;
  const stylePackId = block.semantic?.stylePackId;
  const vars = stylePackCssVars(stylePackId, brandColors);

  if (!parts || parts.length <= 1) {
    return (
      <div
        className={cn("flex h-full w-full items-center justify-center", className)}
        style={vars}
      >
        <VisualBlockRenderer
          block={block}
          brandColors={brandColors}
          compact={compact || block.semantic?.density === "compact"}
          density={block.semantic?.density}
          composition={block.semantic?.composition}
          stylePackId={stylePackId}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-2 overflow-hidden p-[var(--vb-pad,1rem)]",
        className,
      )}
      style={vars}
    >
      {parts.map((part, index) => {
        const isHero = part.hierarchy === "hero" || index === 0;
        const partBlock: VisualBlockRecord = {
          ...block,
          id: `${block.id}-part-${part.assetId}`,
          libraryId: part.assetId,
          kind: part.kind,
          semantic: {
            ...block.semantic,
            familyId: part.familyId,
            density: part.density,
            hierarchy: part.hierarchy,
            compositionParts: undefined,
          },
          // Only keep SVG on the matching primary asset — never clone across parts
          svgMarkup: part.assetId === block.libraryId ? block.svgMarkup : "",
        };

        const isIllustration = part.kind === "illustration" || part.kind === "3d";

        return (
          <div
            key={`${part.assetId}-${index}`}
            className={cn(
              "min-h-0 overflow-hidden",
              !isIllustration && "rounded-[var(--vb-radius,12px)]",
              isHero ? "flex-[1.4]" : "flex-[0.85]",
            )}
            style={
              isIllustration
                ? undefined
                : ({
                    boxShadow: "var(--vb-shadow)",
                    background: "var(--vb-surface)",
                  } as CSSProperties)
            }
          >
            <VisualBlockRenderer
              block={partBlock}
              brandColors={brandColors}
              compact={!isHero || part.density === "compact"}
              density={part.density}
              composition={block.semantic?.composition}
              stylePackId={stylePackId}
              asPart
            />
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useId, useMemo } from "react";
import {
  extractSvgInnerMarkup,
  parseSvgViewBox,
  tintSvgMarkup,
} from "@/lib/social-tool/patterns/tintSvg";

type SvgTilePatternProps = {
  svg: string;
  tileWidth: number;
  tileHeight: number;
  color: string;
  opacity: number;
  scale: number;
  animated: boolean;
  className?: string;
};

export function SvgTilePattern({
  svg,
  tileWidth,
  tileHeight,
  color,
  opacity,
  scale,
  animated,
  className = "",
}: SvgTilePatternProps) {
  const patternId = useId().replace(/:/g, "");
  const viewBox = useMemo(() => parseSvgViewBox(svg), [svg]);
  const inner = useMemo(
    () => tintSvgMarkup(extractSvgInnerMarkup(svg), color),
    [svg, color],
  );

  const scaledW = Math.max(8, Math.round(tileWidth * scale));
  const scaledH = Math.max(8, Math.round(tileHeight * scale));

  return (
    <svg
      className={`social-post-pattern social-post-pattern--tile ${animated ? "is-animated" : ""} ${className}`.trim()}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      style={
        {
          opacity,
          "--sp-pattern-scale": scale,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={scaledW}
          height={scaledH}
        >
          <svg
            width={viewBox.width}
            height={viewBox.height}
            viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
            dangerouslySetInnerHTML={{ __html: inner }}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

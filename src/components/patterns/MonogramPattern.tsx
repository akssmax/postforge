"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Monogram pattern — Figma node 30:1432 (PAttern)
 *
 * Interactive (footer):
 * - hover → light middle band (bottom fills on tiles 2 & 3)
 * - click → fill the full center monogram (tile 2)
 */

export type MonogramPatternVariant = "default" | "highlight" | "solid";

type SegmentMode = "hidden" | "strokeSoft" | "stroke" | "fill";

type TileSpec = readonly [SegmentMode, SegmentMode, SegmentMode]; // top · mid · bottom

const TOP_STROKE =
  "M835.389 0.5L1113.5 139.558V277.998H557.507V0.5H835.389Z";
const MID_STROKE =
  "M556.828 279.016L1113.49 696.513V835.007H557.163L0.5 417.515V279.016H556.828Z";
const BOT_STROKE =
  "M556.495 836.002V1113.5H278.616L0.5 974.441V836.002H556.495Z";

const TOP_FILL = "M557.007 0H835.506L1114 139.249V278.499H557.007V0Z";
const MID_FILL =
  "M1113.99 835.507H556.995L0 417.766V278.516H556.995L1113.99 696.264V835.507Z";
const BOT_FILL = "M556.995 1114H278.498L0 974.751V835.502H556.995V1114Z";

const SEGMENTS = [
  { stroke: TOP_STROKE, fill: TOP_FILL },
  { stroke: MID_STROKE, fill: MID_FILL },
  { stroke: BOT_STROKE, fill: BOT_FILL },
] as const;

const SOFT: TileSpec = ["strokeSoft", "strokeSoft", "strokeSoft"];
const BRIGHT: TileSpec = ["stroke", "stroke", "stroke"];

/** Default — outlines only */
const DEFAULT_TILES: TileSpec[] = [SOFT, SOFT, BRIGHT, SOFT, SOFT];

/**
 * Hover — three monogram segments lit (Figma Variant2 / user selection):
 * svg[1] top · svg[2] mid · svg[3] bottom
 */
const HIGHLIGHT_TILES: TileSpec[] = [
  SOFT,
  ["fill", "strokeSoft", "strokeSoft"],
  ["strokeSoft", "fill", "strokeSoft"],
  ["strokeSoft", "strokeSoft", "fill"],
  SOFT,
];

/** Click — full center monogram (tile 2 / svg[2] all segments) */
const SOLID_TILES: TileSpec[] = [
  SOFT,
  SOFT,
  ["fill", "fill", "fill"],
  SOFT,
  SOFT,
];

const VARIANT_TILES: Record<MonogramPatternVariant, TileSpec[]> = {
  default: DEFAULT_TILES,
  highlight: HIGHLIGHT_TILES,
  solid: SOLID_TILES,
};

const COLOR = "#E3FFCC"; // brand-100
const ease = [0.22, 1, 0.36, 1] as const;

function SegmentPath({
  mode,
  stroke,
  fill,
  color,
  delay,
  reduceMotion,
}: {
  mode: SegmentMode;
  stroke: string;
  fill: string;
  color: string;
  delay: number;
  reduceMotion: boolean;
}) {
  if (mode === "hidden") return null;

  const isFill = mode === "fill";
  const strokeOpacity = isFill ? 0 : mode === "strokeSoft" ? 0.26 : 1;
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.45, delay, ease };

  return (
    <g>
      <motion.path
        d={stroke}
        fill="none"
        stroke={color}
        strokeWidth={1}
        initial={false}
        animate={{ opacity: strokeOpacity }}
        transition={transition}
      />
      <motion.path
        d={fill}
        fill={color}
        initial={false}
        animate={{ opacity: isFill ? 1 : 0 }}
        transition={transition}
      />
    </g>
  );
}

function MonogramTile({
  spec,
  size,
  color,
  tileIndex,
  reduceMotion,
}: {
  spec: TileSpec;
  size: number;
  color: string;
  tileIndex: number;
  reduceMotion: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 1114 1114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="shrink-0 rotate-180"
    >
      {SEGMENTS.map((seg, i) => (
        <SegmentPath
          key={i}
          mode={spec[i]}
          stroke={seg.stroke}
          fill={seg.fill}
          color={color}
          delay={tileIndex * 0.04 + i * 0.03}
          reduceMotion={reduceMotion}
        />
      ))}
    </svg>
  );
}

type Props = {
  variant?: MonogramPatternVariant;
  className?: string;
  tileSize?: number;
  color?: string;
  /**
   * Hover → middle fills (tiles 2–3 bottoms).
   * Click → toggle full center monogram fill.
   */
  interactive?: boolean;
};

/**
 * Brand monogram strip from Figma Pattern (30:1432).
 */
export function MonogramPattern({
  variant: controlledVariant,
  className = "",
  tileSize = 417,
  color = COLOR,
  interactive = false,
}: Props) {
  const reduceMotion = !!useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    if (controlledVariant === "solid") setSolid(true);
    if (controlledVariant === "default") setSolid(false);
  }, [controlledVariant]);

  const variant: MonogramPatternVariant = interactive
    ? solid
      ? "solid"
      : hovered
        ? "highlight"
        : "default"
    : (controlledVariant ?? "default");

  const tiles = VARIANT_TILES[variant];

  return (
    <div
      className={`flex items-center ${interactive ? "cursor-pointer select-none" : "pointer-events-none"} ${className}`}
      onMouseEnter={interactive ? () => setHovered(true) : undefined}
      onMouseLeave={interactive ? () => setHovered(false) : undefined}
      onClick={
        interactive
          ? () => {
              setSolid((v) => !v);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setSolid((v) => !v);
              }
            }
          : undefined
      }
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? solid : undefined}
      aria-label={
        interactive
          ? solid
            ? "Monogram pattern — filled. Click to reset."
            : "Monogram pattern — hover to highlight, click to fill."
          : undefined
      }
      aria-hidden={interactive ? undefined : true}
    >
      {tiles.map((spec, i) => (
        <MonogramTile
          key={i}
          spec={spec}
          size={tileSize}
          color={color}
          tileIndex={i}
          reduceMotion={reduceMotion}
        />
      ))}
    </div>
  );
}

/** Absolute field pinned to the bottom of a dark section (footer). */
export function MonogramPatternField({
  variant = "default",
  className = "",
  tileSize = 417,
  interactive = true,
}: {
  variant?: MonogramPatternVariant;
  className?: string;
  tileSize?: number;
  interactive?: boolean;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 flex justify-center overflow-hidden ${className}`}
    >
      <MonogramPattern
        variant={variant}
        tileSize={tileSize}
        interactive={interactive}
      />
    </div>
  );
}

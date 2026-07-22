"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Left monogram cluster paths (Figma Pattern 30:1186) */
const LEFT_PATHS = [
  "M278.611 0.5L0.5 139.558V277.999H556.493V0.5H278.611Z",
  "M557.172 279.017L0.511719 696.514V835.008H556.837L1113.5 417.516V279.017H557.172Z",
  "M557.505 836.002V1113.5H835.384L1113.5 974.441V836.002H557.505Z",
] as const;

/** Right monogram cluster — mirrored */
const RIGHT_PATHS = [
  "M1521.39 0.5L1799.5 139.558V277.998H1243.51V0.5H1521.39Z",
  "M1242.83 279.017L1799.49 696.514V835.008H1243.16L686.5 417.516V279.017H1242.83Z",
  "M1242.5 836.002V1113.5H964.616L686.5 974.441V836.002H1242.5Z",
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  className?: string;
  /** When true, plays hover / active animation (path redraw + lift) */
  active?: boolean;
  /** Stroke color — defaults to Ocean Green #4BB793 */
  color?: string;
  /** Resting group opacity (Figma: 0.26) */
  opacity?: number;
  /** Active / hover opacity */
  activeOpacity?: number;
};

/**
 * Hero background monogram pattern from Figma (node 30:1186).
 * Outline-only strokes with screen blend. Drive animation via `active`.
 *
 * Static asset: `/brand/hero-monogram-pattern.svg`
 */
export function HeroMonogramPattern({
  className = "",
  active = false,
  color = "#4BB793",
  opacity = 0.26,
  activeOpacity = 0.55,
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.svg
      width="1800"
      height="1114"
      viewBox="0 0 1800 1114"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      initial={false}
      animate={
        reduceMotion
          ? { opacity: active ? activeOpacity : opacity, scale: 1, y: 0 }
          : {
              opacity: active ? activeOpacity : opacity,
              scale: active ? 1.015 : 1,
              y: active ? -10 : 0,
            }
      }
      transition={{ duration: 0.65, ease }}
      style={{ mixBlendMode: "screen" }}
    >
      <g>
        {LEFT_PATHS.map((d, i) => (
          <PatternPath
            key={`l-${i}`}
            d={d}
            color={color}
            active={active}
            delay={i * 0.12}
            reduceMotion={!!reduceMotion}
          />
        ))}
      </g>
      <g>
        {RIGHT_PATHS.map((d, i) => (
          <PatternPath
            key={`r-${i}`}
            d={d}
            color={color}
            active={active}
            delay={0.08 + i * 0.12}
            reduceMotion={!!reduceMotion}
          />
        ))}
      </g>
    </motion.svg>
  );
}

function PatternPath({
  d,
  color,
  active,
  delay,
  reduceMotion,
}: {
  d: string;
  color: string;
  active: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinejoin="round"
      strokeLinecap="round"
      initial={false}
      animate={
        reduceMotion
          ? { pathLength: 1, opacity: 1 }
          : active
            ? { pathLength: [0, 1], opacity: [0.4, 1] }
            : { pathLength: 1, opacity: 1 }
      }
      transition={
        active && !reduceMotion
          ? {
              pathLength: { duration: 1.35, delay, ease },
              opacity: { duration: 0.45, delay },
            }
          : { duration: 0.35, ease }
      }
    />
  );
}

/**
 * Positioned field for hero backgrounds. Hovering the pattern redraws strokes.
 * Uses a hit area so the SVG can receive pointer events without blocking CTAs
 * (content should sit above with `relative z-10`).
 */
export function HeroMonogramPatternField({
  className = "",
  patternClassName = "",
}: {
  className?: string;
  patternClassName?: string;
}) {
  const [active, setActive] = useState(false);

  return (
    <div
      className={`absolute inset-x-0 top-[26%] z-0 flex justify-center overflow-hidden ${className}`}
      aria-hidden
    >
      <div
        className="w-[min(1800px,165%)] max-w-none"
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
      >
        <HeroMonogramPattern
          active={active}
          className={`h-auto w-full ${patternClassName}`}
        />
      </div>
    </div>
  );
}

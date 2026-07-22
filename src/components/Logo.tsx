"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";

export const logoAnimations = [
  "none",
  "leap",
  "assemble",
  "wave",
  "glint",
] as const;

export type LogoAnimation = (typeof logoAnimations)[number];

type Variant = "full" | "mark" | "wordmark";

type Props = {
  variant?: Variant;
  href?: string | null;
  className?: string;
  /** Logo height in px (full lockup scales with viewBox 160×32) */
  height?: number;
  /**
   * Mark microinteraction preset.
   * - `none` — static
   * - `leap` — layers spring upward (mount + hover)
   * - `assemble` — pieces fly in once
   * - `wave` — soft idle bob
   * - `glint` — mint brightness flash on hover
   */
  animation?: LogoAnimation;
};

/** Stacked post layers — Postforge mark */
const MARK = {
  top: "M6 6h20v5H6z",
  mid: "M10 13h16v5H10z",
  bot: "M14 20h12v5H14z",
} as const;

const spring: Transition = { type: "spring", stiffness: 420, damping: 22, mass: 0.6 };
const softSpring: Transition = { type: "spring", stiffness: 280, damping: 28 };

const leapContainer: Variants = {
  rest: {},
  hover: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

const leapTop: Variants = {
  rest: { y: 0 },
  hover: { y: -2.4, transition: spring },
};

const leapMid: Variants = {
  rest: { y: 0, x: 0 },
  hover: { y: -1.2, x: 0.6, transition: spring },
};

const leapBot: Variants = {
  rest: { y: 0 },
  hover: { y: 0.4, transition: softSpring },
};

const assembleContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const assembleTop: Variants = {
  hidden: { opacity: 0, y: 8, x: -4 },
  show: { opacity: 1, y: 0, x: 0, transition: spring },
};

const assembleMid: Variants = {
  hidden: { opacity: 0, y: 4, x: 8 },
  show: { opacity: 1, y: 0, x: 0, transition: spring },
};

const assembleBot: Variants = {
  hidden: { opacity: 0, y: -6, x: -2 },
  show: { opacity: 1, y: 0, x: 0, transition: spring },
};

const waveTop: Variants = {
  animate: {
    y: [0, -1.8, 0],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
  },
};

const waveMid: Variants = {
  animate: {
    y: [0, -1.2, 0],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 },
  },
};

const waveBot: Variants = {
  animate: {
    y: [0, -0.7, 0],
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.3 },
  },
};

const glintFill: Variants = {
  rest: { fill: "#4BB793" },
  hover: {
    fill: ["#4BB793", "#E3FFCC", "#4BB793"],
    transition: { duration: 0.7, times: [0, 0.45, 1] },
  },
};

function MarkPaths({
  mode,
}: {
  mode: LogoAnimation;
}) {
  return (
    <g>
      <motion.path
        d={MARK.top}
        fill="#4BB793"
        variants={
          mode === "leap"
            ? leapTop
            : mode === "assemble"
              ? assembleTop
              : mode === "wave"
                ? waveTop
                : mode === "glint"
                  ? glintFill
                  : undefined
        }
      />
      <motion.path
        d={MARK.mid}
        fill="#4BB793"
        variants={
          mode === "leap"
            ? leapMid
            : mode === "assemble"
              ? assembleMid
              : mode === "wave"
                ? waveMid
                : mode === "glint"
                  ? glintFill
                  : undefined
        }
        transition={mode === "glint" ? { delay: 0.08 } : undefined}
      />
      <motion.path
        d={MARK.bot}
        fill="#4BB793"
        variants={
          mode === "leap"
            ? leapBot
            : mode === "assemble"
              ? assembleBot
              : mode === "wave"
                ? waveBot
                : mode === "glint"
                  ? glintFill
                  : undefined
        }
        transition={mode === "glint" ? { delay: 0.16 } : undefined}
      />
    </g>
  );
}

/** Postforge monogram — stacked post layers */
export function Monogram({
  className = "",
  title = "Postforge",
  animation = "none",
}: {
  className?: string;
  title?: string;
  animation?: LogoAnimation;
}) {
  const reduceMotion = useReducedMotion();
  const mode = reduceMotion ? "none" : animation;
  const interactive = mode === "leap" || mode === "glint";

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
      initial={mode === "assemble" ? "hidden" : "rest"}
      animate={
        mode === "assemble" ? "show" : mode === "wave" ? "animate" : "rest"
      }
      whileHover={interactive ? "hover" : undefined}
      variants={
        mode === "leap"
          ? leapContainer
          : mode === "assemble"
            ? assembleContainer
            : undefined
      }
    >
      <title>{title}</title>
      <MarkPaths mode={mode} />
    </motion.svg>
  );
}

function Wordmark({ className = "", height }: { className?: string; height: number }) {
  return (
    <span
      className={`inline-flex items-center font-semibold tracking-[-0.04em] text-current ${className}`}
      style={{
        fontSize: Math.round(height * 0.72),
        lineHeight: 1,
        letterSpacing: "-0.04em",
      }}
    >
      Postforge
    </span>
  );
}

/** Full lockup: mark + Postforge wordmark */
export function LogoMark({
  className = "",
  title = "Postforge",
  animation = "none",
  height = 28,
}: {
  className?: string;
  title?: string;
  animation?: LogoAnimation;
  height?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-[0.4em] text-current ${className}`} aria-label={title}>
      <span className="inline-flex" style={{ width: height, height }}>
        <Monogram className="h-full w-full" title={title} animation={animation} />
      </span>
      <Wordmark height={height} />
    </span>
  );
}

export function Logo({
  variant = "full",
  href = "/",
  className = "",
  height = 28,
  animation = "none",
}: Props) {
  let content: ReactNode;
  if (variant === "mark") {
    content = (
      <span className="inline-flex" style={{ width: height, height }}>
        <Monogram
          className="h-full w-full"
          title="Postforge"
          animation={animation}
        />
      </span>
    );
  } else if (variant === "wordmark") {
    content = <Wordmark height={height} />;
  } else {
    content = (
      <LogoMark
        className="text-current"
        title="Postforge"
        animation={animation}
        height={height}
      />
    );
  }

  const classes = `inline-flex items-center ${className.includes("text-") ? "" : "text-leap-fg "}${className}`;

  if (href === null) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link href={href} className={`group ${classes}`} aria-label="Postforge home">
      {content}
    </Link>
  );
}

import type { CSSProperties, ElementType, ReactNode } from "react";

/** Corners that can take a monogram-angled diagonal cut */
export type MonogramCutoutCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * Depth of the cut as a % of the box (matches monogram chamfer scale).
 * Figma CTA uses a generous corner — ~14–18% reads well at section size.
 */
export type MonogramCutoutDepth = number;

const DEFAULT_CUTOUTS: MonogramCutoutCorner[] = ["top-right", "bottom-left"];
const DEFAULT_DEPTH = 14;

/**
 * Build a CSS clip-path polygon with monogram-style diagonal corner cuts.
 * Walks clockwise from top-left.
 */
export function monogramCutoutClipPath(
  cutouts: readonly MonogramCutoutCorner[] = DEFAULT_CUTOUTS,
  depthPercent: MonogramCutoutDepth = DEFAULT_DEPTH,
): string {
  const d = Math.max(0, Math.min(40, depthPercent));
  const has = (c: MonogramCutoutCorner) => cutouts.includes(c);
  const points: string[] = [];

  // Top-left
  if (has("top-left")) {
    points.push(`0 ${d}%`, `${d}% 0`);
  } else {
    points.push("0 0");
  }

  // Top-right
  if (has("top-right")) {
    points.push(`${100 - d}% 0`, `100% ${d}%`);
  } else {
    points.push("100% 0");
  }

  // Bottom-right
  if (has("bottom-right")) {
    points.push(`100% ${100 - d}%`, `${100 - d}% 100%`);
  } else {
    points.push("100% 100%");
  }

  // Bottom-left
  if (has("bottom-left")) {
    points.push(`${d}% 100%`, `0 ${100 - d}%`);
  } else {
    points.push("0 100%");
  }

  return `polygon(${points.join(", ")})`;
}

type Props = {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Which corners get the monogram diagonal. Default: top-right + bottom-left (Figma CTA). */
  cutouts?: readonly MonogramCutoutCorner[];
  /** Cut depth as % of width/height (default 14). */
  depth?: MonogramCutoutDepth;
  /** Disable cutouts below this breakpoint (matches prior mobile behavior). */
  disableBelowMd?: boolean;
  as?: ElementType;
  style?: CSSProperties;
};

/**
 * Section/band with monogram-angled corner cutouts (Figma CTA geometry).
 * Diagonal parallelogram language used by canvas pattern cutouts.
 */
export function MonogramCutout({
  children,
  className = "",
  id,
  cutouts = DEFAULT_CUTOUTS,
  depth = DEFAULT_DEPTH,
  disableBelowMd = true,
  as: Tag = "section",
  style,
}: Props) {
  const clip = monogramCutoutClipPath(cutouts, depth);

  return (
    <Tag
      id={id}
      className={`monogram-cutout ${disableBelowMd ? "monogram-cutout--responsive" : ""} ${className}`}
      style={{
        ...style,
        ["--monogram-cutout-clip" as string]: clip,
        clipPath: clip,
      }}
    >
      {children}
    </Tag>
  );
}

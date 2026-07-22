import type { ReactNode } from "react";
import {
  MonogramCutout,
  type MonogramCutoutCorner,
} from "@/components/patterns/MonogramCutout";

type Props = {
  id?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
  /** Default Figma CTA: top-right + bottom-left */
  cutouts?: readonly MonogramCutoutCorner[];
  depth?: number;
  className?: string;
};

/**
 * Mint CTA band with monogram corner cutouts (landing-2 / Figma).
 * Band is always brand-100 — use fixed dark ink, not theme-flipped text tokens.
 */
export function CutoutCTA({
  id = "cta",
  title = "See Postforge in action",
  description = "Open the canvas and design branded social posts and slide decks.",
  children,
  cutouts = ["top-right", "bottom-left"],
  depth = 14,
  className = "",
}: Props) {
  return (
    <MonogramCutout
      id={id}
      cutouts={cutouts}
      depth={depth}
      className={`bg-[var(--l2-accent,#e3ffcc)] px-[var(--l2-pad,64px)] py-28 text-gray-800 ${className}`}
    >
      <div className="mx-auto flex max-w-[768px] flex-col items-center text-center">
        <h2 className="text-4xl leading-[1.2] text-gray-800 sm:text-[64px] sm:leading-[76.8px]">
          {title}
        </h2>
        <p className="mt-5 text-lg leading-8 text-gray-600 sm:text-xl">
          {description}
        </p>
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </MonogramCutout>
  );
}

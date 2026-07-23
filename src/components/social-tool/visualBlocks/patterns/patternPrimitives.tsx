"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import type { VisualBlockContent } from "@/lib/social-tool/visualBlocks/content";
import { cn } from "@/lib/utils";

export type UiPatternProps = {
  content: VisualBlockContent;
  primary: string;
  accent: string;
  compact?: boolean;
  density?: "compact" | "medium" | "hero";
  composition?: string;
  hero?: boolean;
};

export type DensityTokens = {
  compact: boolean;
  hero: boolean;
  pad: string;
  metric: string;
  title: string;
  body: string;
  label: string;
  gap: string;
  btn: "sm" | "md";
};

export function resolveDensity(props: Pick<UiPatternProps, "compact" | "density" | "hero">): DensityTokens {
  const compact = Boolean(props.compact || props.density === "compact");
  const hero = Boolean(props.hero || props.density === "hero");
  return {
    compact,
    hero,
    pad: compact ? "p-2.5 @[240px]:p-3" : hero ? "p-3.5 @[280px]:p-6" : "p-3 @[260px]:p-4",
    metric: compact
      ? "text-[clamp(1.35rem,10cqw,1.85rem)] leading-none tracking-tight font-bold"
      : hero
        ? "text-[clamp(2.1rem,16cqw,3.75rem)] leading-none tracking-tight font-bold"
        : "text-[clamp(1.75rem,13cqw,2.85rem)] leading-none tracking-tight font-bold",
    title: compact
      ? "text-[clamp(0.7rem,3.8cqw,0.85rem)] font-semibold leading-snug"
      : "text-[clamp(0.8rem,4.2cqw,1.05rem)] font-semibold leading-snug",
    body: compact
      ? "text-[clamp(0.62rem,3.2cqw,0.78rem)] leading-snug text-neutral-600"
      : "text-[clamp(0.72rem,3.6cqw,0.9rem)] leading-snug text-neutral-600",
    label:
      "text-[clamp(0.55rem,2.6cqw,0.68rem)] font-semibold uppercase tracking-[0.1em] text-neutral-400",
    gap: compact ? "gap-1.5" : hero ? "gap-3" : "gap-2.5",
    btn: compact ? "sm" : "md",
  };
}

export function uiPatternVars(primary: string, accent: string): CSSProperties {
  return {
    "--vb-primary": primary,
    "--vb-accent": accent,
  } as CSSProperties;
}

/** Full-slot container root — patterns scale with featured-block width. */
export function PatternShell({
  primary,
  accent,
  children,
  className,
}: {
  primary: string;
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-theme="light"
      className={cn(
        "@container flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden",
        className,
      )}
      style={uiPatternVars(primary, accent)}
    >
      {children}
    </div>
  );
}

export const vbCard = cn(
  "w-full max-w-full min-w-0",
  "rounded-[var(--vb-radius,12px)]",
  "border-[length:var(--vb-border-width,1px)] border-black/[0.08]",
  "bg-[var(--vb-surface,#ffffff)]",
  "shadow-[var(--vb-shadow,0_4px_16px_rgba(15,23,42,0.08))]",
);

export const vbAccentSoft =
  "bg-[color-mix(in_oklab,var(--vb-accent)_14%,white)] text-[var(--vb-accent)]";

export const vbGrid2 = "grid grid-cols-1 @[220px]:grid-cols-2 gap-2 @[260px]:gap-2.5";
export const vbGrid3 = "grid grid-cols-1 @[200px]:grid-cols-2 @[300px]:grid-cols-3 gap-2 @[260px]:gap-2.5";

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ className, filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className={className} aria-hidden>
      <path
        d="M10 1.8l2.2 5.1 5.5.5-4.2 3.7 1.3 5.3L10 13.8 5.2 16.4l1.3-5.3L2.3 7.4l5.5-.5L10 1.8z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.4}
      />
    </svg>
  );
}

export function MiniSpark({ className }: { className?: string }) {
  const gradId = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 36" className={cn("w-full text-[var(--vb-accent)]", className)} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 28 C18 26 24 18 36 16 C48 14 54 22 66 18 C78 14 84 8 96 10 C108 12 114 6 120 4 V36 H0 Z"
        fill={`url(#${gradId})`}
      />
      <path
        d="M0 28 C18 26 24 18 36 16 C48 14 54 22 66 18 C78 14 84 8 96 10 C108 12 114 6 120 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AccentBar({ className }: { className?: string }) {
  return (
    <span
      className={cn("block h-1 w-10 rounded-full bg-[var(--vb-accent)]", className)}
      aria-hidden
    />
  );
}

export function AvatarInitial({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-[var(--vb-accent)]",
        "bg-[color-mix(in_oklab,var(--vb-accent)_18%,white)] ring-2 ring-white",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-xs @[260px]:size-10 @[260px]:text-sm",
        size === "lg" && "size-11 text-sm",
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

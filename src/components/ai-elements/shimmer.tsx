"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { CSSProperties, ElementType } from "react";
import { memo, useMemo } from "react";

export interface ShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export const Shimmer = memo(function Shimmer({
  children,
  as: Component = "span",
  className,
  duration = 2,
  spread = 2,
}: ShimmerProps) {
  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread],
  );

  const MotionComponent =
    typeof Component === "string" && Component in motion
      ? (motion[Component as keyof typeof motion] as typeof motion.span)
      : motion.span;

  return (
    <MotionComponent
      animate={{ backgroundPosition: "0% center" }}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
      transition={{
        duration,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      }}
    >
      {children}
    </MotionComponent>
  );
});

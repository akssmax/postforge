"use client";

import { useEffect, useRef } from "react";
import type { BrandColors } from "@/lib/brand/types";
import { applyBrandTheme, clearBrandTheme } from "@/lib/brand/brandTheme";

type Options = {
  colors: BrandColors;
  /** Apply dynamic theme only when a logo is present */
  active: boolean;
};

/** Scope HeroUI + Postforge accent tokens to uploaded brand colors on the tool shell */
export function useBrandToolTheme({ colors, active }: Options) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (active) {
      applyBrandTheme(root, colors);
    } else {
      clearBrandTheme(root);
    }
  }, [
    active,
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.neutral,
  ]);

  return rootRef;
}

import type { StylePackConfig } from "@/lib/design-config/registry";
import { tryGetStylePack } from "@/lib/design-config/registry";
import type { CSSProperties } from "react";

const RADIUS: Record<StylePackConfig["radius"], string> = {
  none: "0px",
  sm: "6px",
  md: "12px",
  lg: "20px",
  full: "9999px",
};

const SHADOW: Record<StylePackConfig["shadow"], string> = {
  none: "none",
  soft: "0 4px 16px rgba(15, 23, 42, 0.08)",
  medium: "0 8px 28px rgba(15, 23, 42, 0.12)",
  bold: "0 12px 40px rgba(15, 23, 42, 0.18)",
};

const PAD: Record<StylePackConfig["spacing"], string> = {
  tight: "0.75rem",
  comfortable: "1.25rem",
  airy: "1.75rem",
};

const BORDER: Record<StylePackConfig["border"], string> = {
  none: "0px",
  hairline: "1px",
  strong: "2px",
};

/** Map a style pack id → CSS variables (brand colors applied separately). */
export function stylePackCssVars(
  stylePackId: string | undefined,
  brand?: { primary?: string; accent?: string },
): CSSProperties {
  const pack = tryGetStylePack(stylePackId ?? "enterprise") ?? {
    id: "enterprise",
    radius: "md" as const,
    shadow: "soft" as const,
    border: "hairline" as const,
    spacing: "comfortable" as const,
    typography: "sans-tight" as const,
    elevation: "low" as const,
    surface: "solid" as const,
  };

  return {
    "--vb-primary": brand?.primary ?? "#0A1B25",
    "--vb-accent": brand?.accent ?? "#4BB793",
    "--vb-radius": RADIUS[pack.radius],
    "--vb-shadow": SHADOW[pack.shadow],
    "--vb-pad": PAD[pack.spacing],
    "--vb-border-width": BORDER[pack.border],
    "--vb-surface":
      pack.surface === "glass"
        ? "rgba(255,255,255,0.72)"
        : pack.surface === "minimal"
          ? "transparent"
          : pack.surface === "gradient"
            ? "linear-gradient(145deg, color-mix(in srgb, var(--vb-primary) 8%, white), white)"
            : "#ffffff",
  } as CSSProperties;
}

export function densityIsCompact(density?: string, compactFlag?: boolean): boolean {
  if (density === "compact") return true;
  if (density === "hero") return false;
  return Boolean(compactFlag);
}

export function densityIsHero(density?: string): boolean {
  return density === "hero";
}

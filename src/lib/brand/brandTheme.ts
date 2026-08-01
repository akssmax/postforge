import type { BrandColors } from "@/lib/brand/types";
import {
  hexToRgb,
  mixHex,
  relativeLuminance,
  withLightness,
  withSaturation,
} from "@/lib/brand/colorUtils";

export type BrandScale = Record<
  | "25"
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | "950",
  string
>;

/** CSS variables overridden on `.social-tool` when a brand logo is active */
export const BRAND_THEME_CSS_VARS = [
  "--brand-25",
  "--brand-50",
  "--brand-100",
  "--brand-200",
  "--brand-300",
  "--brand-400",
  "--brand-500",
  "--brand-600",
  "--brand-700",
  "--brand-800",
  "--brand-900",
  "--brand-950",
  "--brand-on-primary",
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--accent",
  "--accent-foreground",
  "--focus",
  "--leap-mint",
  "--leap-mint-deep",
  "--leap-glow",
  "--text-link",
] as const;

function isLightTint(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return relativeLuminance(rgb) > 0.72;
}

function accentForeground(primary: string, neutral: string): string {
  const rgb = hexToRgb(primary);
  if (!rgb) return withLightness(neutral, 8);
  return relativeLuminance(rgb) > 0.45
    ? withLightness(neutral, 8)
    : "#f4f4f4";
}

/** Build a full brand scale from extracted / edited kit colors */
export function buildBrandScale(colors: BrandColors): BrandScale {
  const { primary, secondary, accent, neutral } = colors;

  return {
    "25": mixHex("#ffffff", primary, 0.06),
    "50": mixHex("#ffffff", primary, 0.1),
    "100": isLightTint(accent)
      ? accent
      : mixHex("#ffffff", primary, 0.18),
    "200": mixHex("#ffffff", primary, 0.32),
    "300": withSaturation(withLightness(primary, 58), 65),
    "400": withSaturation(withLightness(primary, 48), 75),
    "500": primary,
    "600": secondary,
    "700": withLightness(neutral, 20),
    "800": withLightness(neutral, 14),
    "900": neutral,
    "950": withLightness(neutral, 6),
  };
}

export function buildBrandThemeVars(
  colors: BrandColors,
): Record<(typeof BRAND_THEME_CSS_VARS)[number], string> {
  const scale = buildBrandScale(colors);

  return {
    "--brand-25": scale["25"],
    "--brand-50": scale["50"],
    "--brand-100": scale["100"],
    "--brand-200": scale["200"],
    "--brand-300": scale["300"],
    "--brand-400": scale["400"],
    "--brand-500": scale["500"],
    "--brand-600": scale["600"],
    "--brand-700": scale["700"],
    "--brand-800": scale["800"],
    "--brand-900": scale["900"],
    "--brand-950": scale["950"],
    "--brand-on-primary": accentForeground(colors.primary, colors.neutral),
    "--brand-primary": colors.neutral,
    "--brand-secondary": colors.secondary,
    "--brand-accent": colors.primary,
    "--accent": colors.primary,
    "--accent-foreground": accentForeground(colors.primary, colors.neutral),
    "--focus": colors.primary,
    "--leap-mint": scale["100"],
    "--leap-mint-deep": colors.primary,
    "--leap-glow": `color-mix(in oklab, ${colors.primary} 22%, transparent)`,
    "--text-link": colors.primary,
  };
}

export function applyBrandTheme(element: HTMLElement, colors: BrandColors): void {
  const vars = buildBrandThemeVars(colors);
  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(name, value);
  }
}

export function clearBrandTheme(element: HTMLElement): void {
  for (const name of BRAND_THEME_CSS_VARS) {
    element.style.removeProperty(name);
  }
}

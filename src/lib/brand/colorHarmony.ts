import {
  DEFAULT_BRAND_COLORS,
  type BrandColors,
} from "@/lib/brand/types";
import {
  isNearNeutral,
  shiftHue,
  withLightness,
  withSaturation,
} from "@/lib/brand/colorUtils";

export function buildBrandColorsFromPrimary(primary: string): BrandColors {
  const secondary = shiftHue(primary, 30);
  const accent = shiftHue(primary, 180);
  const neutral = withLightness(primary, 12);

  return {
    primary,
    secondary,
    accent,
    neutral,
    extracted: {
      primary,
      secondary,
      accent,
      neutral,
    },
  };
}

export type HarmonySwatch = {
  id: string;
  label: string;
  hex: string;
  role: keyof BrandColors;
};

/** Suggested swatches derived from the current primary */
export function suggestHarmonySwatches(primary: string): HarmonySwatch[] {
  const base = isNearNeutral(primary) ? DEFAULT_BRAND_COLORS.primary : primary;

  return [
    { id: "primary", label: "Primary", hex: base, role: "primary" },
    {
      id: "analog-a",
      label: "Analog",
      hex: shiftHue(base, 25),
      role: "secondary",
    },
    {
      id: "analog-b",
      label: "Analog 2",
      hex: shiftHue(base, -25),
      role: "secondary",
    },
    {
      id: "complement",
      label: "Complement",
      hex: shiftHue(base, 180),
      role: "accent",
    },
    {
      id: "triad-a",
      label: "Triad",
      hex: shiftHue(base, 120),
      role: "accent",
    },
    {
      id: "triad-b",
      label: "Triad 2",
      hex: shiftHue(base, 240),
      role: "accent",
    },
    {
      id: "muted",
      label: "Muted",
      hex: withSaturation(withLightness(base, 35), 35),
      role: "neutral",
    },
    {
      id: "deep",
      label: "Deep",
      hex: withLightness(base, 14),
      role: "neutral",
    },
  ];
}

import type { BackgroundPreset, BrandColors } from "@/lib/brand/types";
import {
  buildHarmonyBackgroundSolids,
  buildHarmonyGradientSpecs,
  harmonyGradientCss,
} from "@/lib/brand/colorHarmony";
import {
  mixHex,
  relativeLuminance,
  hexToRgb,
  withLightness,
} from "@/lib/brand/colorUtils";

function solidPreset(
  id: string,
  label: string,
  background: string,
  colors: BrandColors,
): BackgroundPreset {
  const textOnBrand = relativeText(background);
  return {
    id,
    label,
    kind: "solid",
    css: {
      background,
      patternTint: withLightness(colors.primary, 85),
      footerPatternTint: colors.accent,
      textOnBrand,
      accentDot: colors.accent,
      subText: mixTextSecondary(textOnBrand),
    },
  };
}

function gradientPreset(
  id: string,
  label: string,
  background: string,
  colors: BrandColors,
  theme: "light" | "dark",
  overrides?: Partial<BackgroundPreset["css"]>,
): BackgroundPreset {
  const textOnBrand = overrides?.textOnBrand ?? (theme === "dark" ? "#f4f4f4" : withLightness(colors.neutral, 18));
  return {
    id,
    label,
    kind: "gradient",
    gradientTheme: theme,
    css: {
      background,
      patternTint: overrides?.patternTint ?? colors.primary,
      footerPatternTint: overrides?.footerPatternTint ?? colors.accent,
      textOnBrand,
      accentDot: overrides?.accentDot ?? colors.accent,
      subText: overrides?.subText ?? mixTextSecondary(textOnBrand),
    },
  };
}

export function buildSolidBackgroundPresets(colors: BrandColors): BackgroundPreset[] {
  return buildHarmonyBackgroundSolids(colors, 12).map((candidate) =>
    solidPreset(candidate.id, candidate.label, candidate.hex, colors),
  );
}

export function buildGradientBackgroundPresets(colors: BrandColors): BackgroundPreset[] {
  const harmonyGradients = buildHarmonyGradientSpecs(colors).map((spec) =>
    gradientPreset(
      spec.id,
      spec.label,
      harmonyGradientCss(spec),
      colors,
      spec.theme,
      spec.theme === "light"
        ? {
            patternTint: withLightness(colors.primary, 38),
            footerPatternTint: colors.secondary,
            accentDot: colors.primary,
            subText: "rgba(15,24,22,0.62)",
          }
        : undefined,
    ),
  );

  return [
    ...harmonyGradients,
    {
      id: "default",
      label: "Postforge default",
      kind: "gradient",
      gradientTheme: "dark",
      css: {
        background: "var(--gradient-hero)",
        patternTint: "#4BB793",
        footerPatternTint: "#E3FFCC",
        textOnBrand: "#f4f4f4",
        accentDot: "#E3FFCC",
        subText: "rgba(255,255,255,0.72)",
      },
    },
  ];
}

export function buildBackgroundPresets(colors: BrandColors): BackgroundPreset[] {
  return [
    ...buildSolidBackgroundPresets(colors),
    ...buildGradientBackgroundPresets(colors),
  ];
}

function relativeText(bg: string): string {
  const rgb = hexToRgb(bg);
  if (!rgb) return "#f4f4f4";
  return relativeLuminance(rgb) > 0.45 ? "#0a1b25" : "#f4f4f4";
}

function mixTextSecondary(main: string): string {
  return main === "#f4f4f4" ? "rgba(255,255,255,0.72)" : "rgba(10,27,37,0.65)";
}

export function getActiveBackgroundPreset(
  presets: BackgroundPreset[],
  id: string | null,
): BackgroundPreset {
  if (!id) return presets.find((p) => p.id === "default") ?? presets[0];
  return presets.find((p) => p.id === id) ?? presets[0];
}

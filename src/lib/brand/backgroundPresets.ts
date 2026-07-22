import type { BackgroundPreset, BrandColors } from "@/lib/brand/types";
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

export function buildSolidBackgroundPresets(colors: BrandColors): BackgroundPreset[] {
  const { primary, secondary, accent, neutral } = colors;
  const deep = withLightness(neutral, 8);

  return [
    solidPreset("solid-primary", "Primary", primary, colors),
    solidPreset("solid-secondary", "Secondary", secondary, colors),
    solidPreset("solid-accent", "Accent", accent, colors),
    solidPreset("solid-neutral", "Neutral", neutral, colors),
    solidPreset("solid-white", "White", "#ffffff", colors),
    solidPreset("solid-light", "Light", "#f8faf9", colors),
    solidPreset("solid-muted", "Muted", mixHex("#ffffff", primary, 0.14), colors),
    solidPreset("solid-dark", "Dark", deep, colors),
  ];
}

export function buildGradientBackgroundPresets(colors: BrandColors): BackgroundPreset[] {
  const { primary, secondary, accent, neutral } = colors;
  const deep = withLightness(neutral, 8);
  const soft = mixHex("#ffffff", primary, 0.12);
  const ink = withLightness(neutral, 6);

  return [
    {
      id: "brand-hero",
      label: "Brand hero",
      kind: "gradient",
      css: {
        background: `linear-gradient(145deg, ${withLightness(secondary, 18)} 0%, ${deep} 55%, ${ink} 100%)`,
        patternTint: primary,
        footerPatternTint: accent,
        textOnBrand: "#f4f4f4",
        accentDot: accent,
        subText: "rgba(255,255,255,0.72)",
      },
    },
    {
      id: "soft-wash",
      label: "Soft wash",
      kind: "gradient",
      css: {
        background: `linear-gradient(180deg, ${soft} 0%, #ffffff 100%)`,
        patternTint: primary,
        footerPatternTint: secondary,
        textOnBrand: withLightness(neutral, 16),
        accentDot: primary,
        subText: "rgba(10,27,37,0.65)",
      },
    },
    {
      id: "complementary",
      label: "Complement pop",
      kind: "gradient",
      css: {
        background: `linear-gradient(135deg, ${withLightness(primary, 20)} 0%, ${withLightness(accent, 28)} 100%)`,
        patternTint: accent,
        footerPatternTint: primary,
        textOnBrand: "#f4f4f4",
        accentDot: accent,
        subText: "rgba(255,255,255,0.75)",
      },
    },
    {
      id: "dark-ink",
      label: "Dark ink",
      kind: "gradient",
      css: {
        background: `linear-gradient(160deg, ${ink} 0%, ${withLightness(neutral, 14)} 100%)`,
        patternTint: primary,
        footerPatternTint: accent,
        textOnBrand: "#eef6f2",
        accentDot: accent,
        subText: "rgba(255,255,255,0.68)",
      },
    },
    {
      id: "light-editorial",
      label: "Light editorial",
      kind: "gradient",
      css: {
        background: `linear-gradient(180deg, #f8faf9 0%, ${mixHex("#ffffff", secondary, 0.08)} 100%)`,
        patternTint: withLightness(primary, 38),
        footerPatternTint: secondary,
        textOnBrand: withLightness(neutral, 18),
        accentDot: primary,
        subText: "rgba(15,24,22,0.62)",
      },
    },
    {
      id: "default",
      label: "Postforge default",
      kind: "gradient",
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

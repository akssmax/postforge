import { buildBackgroundPresets } from "@/lib/brand/backgroundPresets";
import { kitHasAnyLogo } from "@/lib/brand/logoVariants";
import type { BrandColors, BrandKitPersisted } from "@/lib/brand/types";
import { DEFAULT_BRAND_COLORS } from "@/lib/brand/types";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import type { PlatformId } from "@/lib/social-tool/presets";

export type StarterPaletteMood =
  | "warm"
  | "cool"
  | "enterprise"
  | "bold"
  | "neutral";

export type StarterPalette = {
  id: string;
  label: string;
  moods: StarterPaletteMood[];
  colors: BrandColors;
};

/** Curated palettes used when no user brand kit is uploaded. */
export const STARTER_PALETTES: StarterPalette[] = [
  {
    id: "coral-ember",
    label: "Coral ember",
    moods: ["warm", "bold"],
    colors: {
      primary: "#ff6140",
      secondary: "#c4472e",
      accent: "#ffe4d6",
      neutral: "#2a120c",
    },
  },
  {
    id: "ocean-slate",
    label: "Ocean slate",
    moods: ["cool", "enterprise"],
    colors: {
      primary: "#2563eb",
      secondary: "#1e40af",
      accent: "#bfdbfe",
      neutral: "#0f172a",
    },
  },
  {
    id: "forest-sage",
    label: "Forest sage",
    moods: ["cool", "neutral"],
    colors: {
      primary: "#2f6f5e",
      secondary: "#1f4d42",
      accent: "#c8e6d9",
      neutral: "#102019",
    },
  },
  {
    id: "royal-indigo",
    label: "Royal indigo",
    moods: ["bold", "enterprise"],
    colors: {
      primary: "#5b4dff",
      secondary: "#3b2fc9",
      accent: "#ddd6fe",
      neutral: "#15102b",
    },
  },
  {
    id: "sunset-amber",
    label: "Sunset amber",
    moods: ["warm", "neutral"],
    colors: {
      primary: "#f59e0b",
      secondary: "#d97706",
      accent: "#fef3c7",
      neutral: "#291a05",
    },
  },
  {
    id: "berry-pulse",
    label: "Berry pulse",
    moods: ["bold", "warm"],
    colors: {
      primary: "#db2777",
      secondary: "#9d174d",
      accent: "#fbcfe8",
      neutral: "#2a0718",
    },
  },
  {
    id: "midnight-teal",
    label: "Midnight teal",
    moods: ["cool", "enterprise"],
    colors: {
      primary: "#14b8a6",
      secondary: "#0f766e",
      accent: "#99f6e4",
      neutral: "#041816",
    },
  },
  {
    id: "lavender-mist",
    label: "Lavender mist",
    moods: ["neutral", "cool"],
    colors: {
      primary: "#8b5cf6",
      secondary: "#6d28d9",
      accent: "#ede9fe",
      neutral: "#1a1030",
    },
  },
  {
    id: "copper-clay",
    label: "Copper clay",
    moods: ["warm", "neutral"],
    colors: {
      primary: "#b45309",
      secondary: "#78350f",
      accent: "#fde68a",
      neutral: "#241005",
    },
  },
  {
    id: "electric-cyan",
    label: "Electric cyan",
    moods: ["bold", "cool"],
    colors: {
      primary: "#0891b2",
      secondary: "#155e75",
      accent: "#a5f3fc",
      neutral: "#031820",
    },
  },
];

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function colorsEqual(a: BrandColors, b: BrandColors): boolean {
  return (
    a.primary.toLowerCase() === b.primary.toLowerCase() &&
    a.secondary.toLowerCase() === b.secondary.toLowerCase() &&
    a.accent.toLowerCase() === b.accent.toLowerCase() &&
    a.neutral.toLowerCase() === b.neutral.toLowerCase()
  );
}

export function isUnbrandedKit(kit: BrandKitPersisted): boolean {
  return !kitHasAnyLogo(kit) && colorsEqual(kit.colors, DEFAULT_BRAND_COLORS);
}

function scorePalette(
  palette: StarterPalette,
  mood: StarterPaletteMood,
  brief: string,
): number {
  let score = 0;
  if (palette.moods.includes(mood)) score += 8;

  const lower = brief.toLowerCase();
  for (const token of palette.moods) {
    if (lower.includes(token)) score += 2;
  }
  if (palette.id.includes("lavender") && /brand|logo|identity|rebrand/.test(lower)) {
    score += 4;
  }
  if (palette.id.includes("ocean") && /enterprise|b2b|professional/.test(lower)) {
    score += 4;
  }
  if (palette.id.includes("sunset") && /event|celebration|festive/.test(lower)) {
    score += 4;
  }
  if (palette.id.includes("forest") && /education|guide|learn/.test(lower)) {
    score += 3;
  }
  return score;
}

export function pickStarterPalette(input: {
  brief?: string;
  colorMood?: StarterPaletteMood | string;
  seed?: string;
  excludeIds?: string[];
}): StarterPalette {
  const brief = input.brief ?? "";
  const mood = (input.colorMood ?? "neutral") as StarterPaletteMood;
  const excluded = new Set(input.excludeIds ?? []);
  const candidates = STARTER_PALETTES.filter((palette) => !excluded.has(palette.id));

  const pool = candidates.length > 0 ? candidates : STARTER_PALETTES;
  const ranked = [...pool].sort((a, b) => {
    const scoreDelta = scorePalette(b, mood, brief) - scorePalette(a, mood, brief);
    if (scoreDelta !== 0) return scoreDelta;
    if (input.seed) {
      return (hashSeed(`${input.seed}:${a.id}`) % 997) - (hashSeed(`${input.seed}:${b.id}`) % 997);
    }
    return 0;
  });

  if (!input.seed) return ranked[0] ?? STARTER_PALETTES[0]!;

  const topScore = scorePalette(ranked[0]!, mood, brief);
  const tied = ranked.filter((palette) => scorePalette(palette, mood, brief) >= topScore - 1);
  const index = hashSeed(input.seed) % tied.length;
  return tied[index] ?? ranked[0] ?? STARTER_PALETTES[0]!;
}

export function defaultBackgroundPresetIdForColors(colors: BrandColors): string {
  const presets = buildBackgroundPresets(colors);
  return (
    presets.find((preset) => preset.id === "brand-hero")?.id ??
    presets.find((preset) => preset.gradientTheme === "dark")?.id ??
    presets[0]?.id ??
    "default"
  );
}

export type PipelineBrandContext = {
  brandColors: BrandColors;
  backgroundCatalog: { id: string; label?: string }[];
  starterPaletteId: string | null;
};

export function resolvePipelineBrandContext(input: {
  brief: string;
  platformId: PlatformId;
  hasLogo: boolean;
  sessionColors?: Pick<BrandColors, "primary" | "secondary" | "accent">;
  backgroundCatalog?: { id: string; label?: string }[];
  seed?: string;
  excludePaletteIds?: string[];
}): PipelineBrandContext {
  const sessionBrandColors: BrandColors | null = input.sessionColors
    ? {
        primary: input.sessionColors.primary,
        secondary: input.sessionColors.secondary ?? input.sessionColors.primary,
        accent: input.sessionColors.accent ?? input.sessionColors.primary,
        neutral: DEFAULT_BRAND_COLORS.neutral,
      }
    : null;
  const sessionUsesCustomColors =
    sessionBrandColors != null && !colorsEqual(sessionBrandColors, DEFAULT_BRAND_COLORS);

  if ((input.hasLogo || sessionUsesCustomColors) && sessionBrandColors) {
    const catalog =
      input.backgroundCatalog?.length
        ? input.backgroundCatalog
        : buildBackgroundPresets(sessionBrandColors).map((preset) => ({
            id: preset.id,
            label: preset.label,
          }));
    return {
      brandColors: sessionBrandColors,
      backgroundCatalog: catalog,
      starterPaletteId: null,
    };
  }

  const preliminary = campaignPlanFromBrief(input.brief, input.platformId);
  const palette = pickStarterPalette({
    brief: input.brief,
    colorMood: preliminary.visual.colorMood,
    seed: input.seed ?? input.brief,
    excludeIds: input.excludePaletteIds,
  });

  const presets = buildBackgroundPresets(palette.colors);
  return {
    brandColors: palette.colors,
    backgroundCatalog: presets.map((preset) => ({
      id: preset.id,
      label: preset.label,
    })),
    starterPaletteId: palette.id,
  };
}

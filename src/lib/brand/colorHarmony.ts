import {
  DEFAULT_BRAND_COLORS,
  type BrandColors,
} from "@/lib/brand/types";
import {
  clamp,
  colorDistance,
  hexToRgb,
  hslToHex,
  isNearNeutral,
  mixHex,
  rgbToHsl,
  shiftHue,
  type Hsl,
  withLightness,
  withSaturation,
} from "@/lib/brand/colorUtils";

/** Classic hue rotations used in color-wheel harmony schemes */
export const HARMONY_HUE_OFFSETS = {
  analogous: [-30, 30] as const,
  splitComplementary: [150, 210] as const,
  triadic: [120, 240] as const,
  tetradic: [60, 180, 240] as const,
  complement: [180] as const,
} as const;

export type HarmonyColorCandidate = {
  id: string;
  label: string;
  hex: string;
};

export function buildBrandColorsFromPrimary(primary: string): BrandColors {
  return buildBrandColorsFromPalette(primary);
}

export type ExtractedColorWeight = {
  hex: string;
  weight: number;
};

function hueDistance(a: string, b: string): number {
  const ha = readHsl(a)?.h ?? 0;
  const hb = readHsl(b)?.h ?? 0;
  const delta = Math.abs(ha - hb);
  return Math.min(delta, 360 - delta);
}

function colorVibrancy(hex: string): number {
  const hsl = readHsl(hex);
  if (!hsl || isNearNeutral(hex)) return 0;
  return hsl.s * (1 - Math.abs(hsl.l - 52) / 52);
}

function rankExtractedPalette(
  primary: string,
  palette: ExtractedColorWeight[] = [],
): ExtractedColorWeight[] {
  const merged: ExtractedColorWeight[] = [];

  for (const entry of palette) {
    if (isNearNeutral(entry.hex) || colorDistance(entry.hex, primary) < 14) continue;

    const existing = merged.find((item) => colorDistance(item.hex, entry.hex) < 20);
    if (existing) {
      existing.weight += entry.weight;
    } else {
      merged.push({ hex: entry.hex, weight: entry.weight });
    }
  }

  return merged.sort((a, b) => {
    const vibrancyDelta = colorVibrancy(b.hex) - colorVibrancy(a.hex);
    if (Math.abs(vibrancyDelta) > 4) return vibrancyDelta;
    return b.weight - a.weight;
  });
}

function isCoolOnWarmPrimary(primary: string, candidate: string): boolean {
  const primaryHue = readHsl(primary)?.h ?? 0;
  const candidateHue = readHsl(candidate)?.h ?? 0;
  const warmPrimary = primaryHue >= 5 && primaryHue <= 58;
  const coolCandidate = candidateHue >= 165 && candidateHue <= 250;
  return warmPrimary && coolCandidate;
}

function isHarshComplement(primary: string, candidate: string): boolean {
  const delta = hueDistance(primary, candidate);
  return delta >= 168 && delta <= 192;
}

function pickSecondaryFromPalette(
  primary: string,
  ranked: ExtractedColorWeight[],
): string | null {
  let best: { hex: string; score: number } | null = null;

  for (const entry of ranked) {
    if (entry.hex === primary) continue;
    const delta = hueDistance(primary, entry.hex);
    if (delta < 12 || delta > 95) continue;

    const analogBonus = delta >= 15 && delta <= 55 ? 24 : 0;
    const score = entry.weight + colorVibrancy(entry.hex) + analogBonus;
    if (!best || score > best.score) {
      best = { hex: entry.hex, score };
    }
  }

  return best?.hex ?? null;
}

function pickAccentFromPalette(
  primary: string,
  secondary: string,
  ranked: ExtractedColorWeight[],
): string | null {
  let best: { hex: string; score: number } | null = null;

  for (const entry of ranked) {
    if (entry.hex === primary || entry.hex === secondary) continue;

    const delta = hueDistance(primary, entry.hex);
    if (delta < 35) continue;

    let score = entry.weight * 0.65 + colorVibrancy(entry.hex);

    if (isHarshComplement(primary, entry.hex)) score -= 48;
    if (isCoolOnWarmPrimary(primary, entry.hex)) score -= 56;

    if (delta >= 55 && delta <= 140) score += 18;

    if (!best || score > best.score) {
      best = { hex: entry.hex, score };
    }
  }

  if (!best || best.score < 8) return null;
  return best.hex;
}

function pickNeutralFromPalette(
  primary: string,
  ranked: ExtractedColorWeight[],
): string | null {
  let best: { hex: string; score: number } | null = null;

  for (const entry of ranked) {
    const hsl = readHsl(entry.hex);
    if (!hsl) continue;

    const neutralish = hsl.s < 28 || hsl.l < 22;
    const score = entry.weight + (neutralish ? 30 : 0) + (hsl.l < 18 ? 20 : 0);
    if (!best || score > best.score) {
      best = { hex: entry.hex, score };
    }
  }

  if (!best) return null;
  const hsl = readHsl(best.hex);
  if (!hsl) return withLightness(primary, 12);
  return hslToHex({ h: hsl.h, s: clamp(hsl.s * 0.55, 8, 28), l: clamp(hsl.l, 8, 18) });
}

function synthesizeSecondary(primary: string): string {
  return harmonyColorFromBase(primary, HARMONY_HUE_OFFSETS.analogous[1], 0.92, "mid");
}

function synthesizeAccent(primary: string, secondary: string): string {
  const hsl = readHsl(primary);
  if (!hsl) {
    return harmonyColorFromBase(
      primary,
      HARMONY_HUE_OFFSETS.splitComplementary[0],
      0.86,
      "mid",
    );
  }

  if (hsl.h >= 8 && hsl.h <= 58) {
    return hslToHex({
      h: hsl.h,
      s: clamp(hsl.s * 0.96, 52, 96),
      l: clamp(hsl.l - 14, 30, 46),
    });
  }

  if (hueDistance(primary, secondary) >= 20) {
    return withSaturation(withLightness(secondary, clamp(hsl.l + 4, 38, 62)), clamp(hsl.s, 55, 92));
  }

  return harmonyColorFromBase(
    primary,
    HARMONY_HUE_OFFSETS.splitComplementary[0],
    0.86,
    "mid",
  );
}

/** Assign brand roles from a dominant primary plus optional extracted palette. */
export function buildBrandColorsFromPalette(
  primary: string,
  palette: ExtractedColorWeight[] = [],
): BrandColors {
  const base = resolveHarmonyBase(primary);
  const ranked = rankExtractedPalette(base, palette);
  const secondary = pickSecondaryFromPalette(base, ranked) ?? synthesizeSecondary(base);
  const accent = pickAccentFromPalette(base, secondary, ranked) ?? synthesizeAccent(base, secondary);
  const neutral = pickNeutralFromPalette(base, ranked) ?? withLightness(base, 12);

  return {
    primary: base,
    secondary,
    accent,
    neutral,
    extracted: {
      primary: base,
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

export function resolveHarmonyBase(primary: string): string {
  return isNearNeutral(primary) ? DEFAULT_BRAND_COLORS.primary : primary;
}

function readHsl(hex: string): Hsl | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb);
}

/** Map a base hue to a background-friendly lightness band */
function backgroundLightness(hsl: Hsl, band: "light" | "mid" | "dark"): number {
  if (band === "light") return clamp(Math.max(hsl.l, 86), 86, 96);
  if (band === "dark") return clamp(Math.min(hsl.l, 16), 6, 16);
  if (hsl.l > 55) return clamp(hsl.l, 32, 52);
  return clamp(hsl.l, 14, 32);
}

/** Build a harmonious color from a base hue with controlled saturation/lightness */
export function harmonyColorFromBase(
  baseHex: string,
  hueOffset: number,
  saturationMul: number,
  lightnessBand: "light" | "mid" | "dark",
): string {
  const shifted = shiftHue(baseHex, hueOffset);
  const hsl = readHsl(shifted);
  if (!hsl) return shifted;
  return hslToHex({
    h: hsl.h,
    s: clamp(hsl.s * saturationMul, 10, 88),
    l: backgroundLightness(hsl, lightnessBand),
  });
}

export function dedupeHarmonyColors(
  candidates: HarmonyColorCandidate[],
  minDistance = 16,
): HarmonyColorCandidate[] {
  const out: HarmonyColorCandidate[] = [];
  for (const candidate of candidates) {
    if (out.some((existing) => colorDistance(existing.hex, candidate.hex) < minDistance)) {
      continue;
    }
    out.push(candidate);
  }
  return out;
}

const FALLBACK_NEUTRALS: HarmonyColorCandidate[] = [
  { id: "fallback-white", label: "White", hex: "#ffffff" },
  { id: "fallback-light", label: "Light", hex: "#f8faf9" },
  { id: "fallback-slate", label: "Slate", hex: "#1a2332" },
  { id: "fallback-ink", label: "Ink", hex: "#0a1018" },
];

/**
 * ColorHunt-style solid suggestions: brand anchors plus wheel harmonies
 * (analogous, split-complementary, triadic) and monochromatic tints/shades.
 */
export function buildHarmonyBackgroundSolids(
  colors: BrandColors,
  minCount = 12,
): HarmonyColorCandidate[] {
  const base = resolveHarmonyBase(colors.primary);
  const baseHsl = readHsl(base);
  const sat = baseHsl?.s ?? 55;

  const mk = (id: string, label: string, hex: string): HarmonyColorCandidate => ({
    id,
    label,
    hex,
  });

  const candidates: HarmonyColorCandidate[] = [
    mk("primary", "Primary", colors.primary),
    mk("secondary", "Secondary", colors.secondary),
    mk("accent", "Accent", colors.accent),
    mk(
      "analog-warm",
      "Warm analog",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.82, "mid"),
    ),
    mk(
      "analog-cool",
      "Cool analog",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.82, "mid"),
    ),
    mk(
      "split-a",
      "Split comp",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.splitComplementary[0], 0.76, "mid"),
    ),
    mk(
      "split-b",
      "Split comp 2",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.splitComplementary[1], 0.76, "mid"),
    ),
    mk(
      "triad",
      "Triad",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.triadic[0], 0.78, "mid"),
    ),
    mk(
      "triad-2",
      "Triad 2",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.triadic[1], 0.78, "mid"),
    ),
    mk(
      "complement",
      "Complement",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.complement[0], 0.8, "mid"),
    ),
    mk("tint", "Tint", withLightness(withSaturation(base, sat * 0.34), 94)),
    mk("soft", "Soft", mixHex("#ffffff", base, 0.14)),
    mk("muted", "Muted", withSaturation(withLightness(base, 70), 26)),
    mk("deep", "Deep", withLightness(colors.neutral, 10)),
    mk("dark", "Dark", withLightness(colors.neutral, 6)),
    mk("white", "White", "#ffffff"),
    mk("light", "Light", mixHex("#ffffff", colors.secondary, 0.08)),
    mk(
      "analog-light",
      "Warm light",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.42, "light"),
    ),
    mk(
      "cool-light",
      "Cool light",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.4, "light"),
    ),
    mk(
      "analog-dark",
      "Warm dark",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.72, "dark"),
    ),
    mk(
      "cool-dark",
      "Cool dark",
      harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.72, "dark"),
    ),
  ];

  let deduped = dedupeHarmonyColors(candidates);
  if (deduped.length < minCount) {
    deduped = dedupeHarmonyColors([...deduped, ...FALLBACK_NEUTRALS], 12);
  }
  return deduped.slice(0, Math.max(minCount, deduped.length));
}

/** Suggested swatches derived from the current primary (brand color panel) */
export function suggestHarmonySwatches(primary: string): HarmonySwatch[] {
  const base = resolveHarmonyBase(primary);

  return [
    { id: "primary", label: "Primary", hex: base, role: "primary" },
    {
      id: "analog-a",
      label: "Analog",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.9, "mid"),
      role: "secondary",
    },
    {
      id: "analog-b",
      label: "Analog 2",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.9, "mid"),
      role: "secondary",
    },
    {
      id: "complement",
      label: "Complement",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.complement[0], 0.85, "mid"),
      role: "accent",
    },
    {
      id: "split-a",
      label: "Split",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.splitComplementary[0], 0.82, "mid"),
      role: "accent",
    },
    {
      id: "triad-a",
      label: "Triad",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.triadic[0], 0.85, "mid"),
      role: "accent",
    },
    {
      id: "triad-b",
      label: "Triad 2",
      hex: harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.triadic[1], 0.85, "mid"),
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
    {
      id: "tint",
      label: "Tint",
      hex: withLightness(withSaturation(base, 30), 92),
      role: "neutral",
    },
  ];
}

export type HarmonyGradientStop = {
  color: string;
  position: number;
};

export type HarmonyGradientSpec = {
  id: string;
  label: string;
  theme: "light" | "dark";
  angle: number;
  stops: HarmonyGradientStop[];
};

/** Light and dark gradient recipes derived from brand harmony colors */
export function buildHarmonyGradientSpecs(colors: BrandColors): HarmonyGradientSpec[] {
  const base = resolveHarmonyBase(colors.primary);
  const { primary, secondary, accent, neutral } = colors;
  const deep = withLightness(neutral, 8);
  const ink = withLightness(neutral, 6);
  const soft = mixHex("#ffffff", primary, 0.12);
  const warmLight = harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.38, "light");
  const coolLight = harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.36, "light");
  const warmDark = harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[1], 0.72, "dark");
  const coolDark = harmonyColorFromBase(base, HARMONY_HUE_OFFSETS.analogous[0], 0.72, "dark");
  const splitDark = harmonyColorFromBase(
    base,
    HARMONY_HUE_OFFSETS.splitComplementary[0],
    0.68,
    "dark",
  );

  return [
    {
      id: "soft-wash",
      label: "Soft wash",
      theme: "light",
      angle: 180,
      stops: [
        { color: soft, position: 0 },
        { color: "#ffffff", position: 100 },
      ],
    },
    {
      id: "light-editorial",
      label: "Light editorial",
      theme: "light",
      angle: 180,
      stops: [
        { color: "#f8faf9", position: 0 },
        { color: mixHex("#ffffff", secondary, 0.08), position: 100 },
      ],
    },
    {
      id: "dawn-glow",
      label: "Dawn glow",
      theme: "light",
      angle: 145,
      stops: [
        { color: warmLight, position: 0 },
        { color: mixHex("#ffffff", accent, 0.1), position: 55 },
        { color: "#ffffff", position: 100 },
      ],
    },
    {
      id: "frost-mist",
      label: "Frost mist",
      theme: "light",
      angle: 160,
      stops: [
        { color: coolLight, position: 0 },
        { color: mixHex("#ffffff", primary, 0.06), position: 100 },
      ],
    },
    {
      id: "cream-canvas",
      label: "Cream canvas",
      theme: "light",
      angle: 135,
      stops: [
        { color: mixHex("#ffffff", accent, 0.16), position: 0 },
        { color: "#fffdf8", position: 100 },
      ],
    },
    {
      id: "pastel-fade",
      label: "Pastel fade",
      theme: "light",
      angle: 120,
      stops: [
        { color: mixHex("#ffffff", primary, 0.18), position: 0 },
        { color: mixHex("#ffffff", secondary, 0.12), position: 100 },
      ],
    },
    {
      id: "brand-hero",
      label: "Brand hero",
      theme: "dark",
      angle: 145,
      stops: [
        { color: withLightness(secondary, 18), position: 0 },
        { color: deep, position: 55 },
        { color: ink, position: 100 },
      ],
    },
    {
      id: "complementary",
      label: "Complement pop",
      theme: "dark",
      angle: 135,
      stops: [
        { color: withLightness(primary, 20), position: 0 },
        { color: withLightness(accent, 28), position: 100 },
      ],
    },
    {
      id: "dark-ink",
      label: "Dark ink",
      theme: "dark",
      angle: 160,
      stops: [
        { color: ink, position: 0 },
        { color: withLightness(neutral, 14), position: 100 },
      ],
    },
    {
      id: "midnight-aurora",
      label: "Midnight aurora",
      theme: "dark",
      angle: 150,
      stops: [
        { color: coolDark, position: 0 },
        { color: deep, position: 45 },
        { color: warmDark, position: 100 },
      ],
    },
    {
      id: "depth-fade",
      label: "Depth fade",
      theme: "dark",
      angle: 170,
      stops: [
        { color: withLightness(primary, 14), position: 0 },
        { color: ink, position: 100 },
      ],
    },
    {
      id: "nocturne",
      label: "Nocturne",
      theme: "dark",
      angle: 125,
      stops: [
        { color: splitDark, position: 0 },
        { color: deep, position: 60 },
        { color: withLightness(accent, 16), position: 100 },
      ],
    },
  ];
}

export function harmonyGradientCss(spec: HarmonyGradientSpec): string {
  const stops = spec.stops
    .map((stop) => `${stop.color} ${stop.position}%`)
    .join(", ");
  return `linear-gradient(${spec.angle}deg, ${stops})`;
}

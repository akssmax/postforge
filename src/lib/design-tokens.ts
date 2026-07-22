/** Postforge color scales — Neutrals + Brand primitives. */

export const shadeSteps = [
  25, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

export type ShadeStep = (typeof shadeSteps)[number];

export type Shade = {
  step: ShadeStep;
  hex: string;
  source?: string;
};

export type ColorScale = {
  id: string;
  name: string;
  description: string;
  shades: Shade[];
};

export const brandScale: ColorScale = {
  id: "brand",
  name: "Brand",
  description:
    "Figma Brand primitives + logo ocean. Tailwind: bg-brand-*, text-brand-*.",
  shades: [
    { step: 25, hex: "#F6FDEE", source: "Brand/25" },
    { step: 50, hex: "#F2FCE2", source: "Brand/50" },
    { step: 100, hex: "#E3FFCC", source: "Brand/Accent 1" },
    { step: 200, hex: "#C5EFB0" },
    { step: 300, hex: "#9DD98A" },
    { step: 400, hex: "#73C4A2" },
    { step: 500, hex: "#4BB793", source: "Ocean · logo" },
    { step: 600, hex: "#275144", source: "Brand/Secondary" },
    { step: 700, hex: "#1B3D36" },
    { step: 800, hex: "#122E29" },
    { step: 900, hex: "#0A1B25", source: "Brand/Primary" },
    { step: 950, hex: "#040C0B", source: "Grays/950" },
  ],
};

export const grayScale: ColorScale = {
  id: "gray",
  name: "Grays",
  description: "Figma Neutrals / Grays. Tailwind: bg-gray-*, text-gray-*.",
  shades: [
    { step: 25, hex: "#F8FAF9", source: "Grays/25" },
    { step: 50, hex: "#F4F4F4", source: "Grays/50" },
    { step: 100, hex: "#E6EAEA", source: "Grays/100" },
    { step: 200, hex: "#D7D9D8", source: "Grays/200" },
    { step: 300, hex: "#B7BDBD", source: "Grays/300" },
    { step: 400, hex: "#999E9E", source: "Grays/400" },
    { step: 500, hex: "#6F7575", source: "Grays/500" },
    { step: 600, hex: "#525151", source: "Grays/600" },
    { step: 700, hex: "#3B4140", source: "Grays/700" },
    { step: 800, hex: "#232726", source: "Grays/800" },
    { step: 900, hex: "#0F1816", source: "Grays/900" },
    { step: 950, hex: "#040C0B", source: "Grays/950" },
  ],
};

/** @deprecated use grayScale — alias for older design-system pages */
export const neutralScale: ColorScale = {
  ...grayScale,
  id: "neutral",
  name: "Neutral",
  description: "Alias of Grays (legacy name).",
};

export const colorScales: ColorScale[] = [brandScale, grayScale];

/** Semantic tokens from Refined tokens.zip (Mode 1 = light) */
export const semanticTokens = [
  {
    group: "Surface",
    tokens: [
      { name: "primary", light: "#F8FAF9", dark: "#040C0B", usage: "Page canvas" },
      { name: "secondary", light: "#F6FDEE", dark: "#0A1B25", usage: "Soft brand wash / footer light" },
      { name: "tertiary", light: "#F2FCE2", dark: "#091A24", usage: "Elevated mint tint" },
      { name: "invert", light: "#040C0B", dark: "#F8FAF9", usage: "Inverted surface" },
      { name: "border", light: "#999E9E", dark: "#3B4140", usage: "Default border" },
      { name: "border-hover", light: "#6F7575", dark: "#6F7575", usage: "Hover border" },
      { name: "border-error", light: "#E2280D", dark: "#E2280D", usage: "Error" },
      { name: "border-disabled", light: "#B7BDBD", dark: "#3B4140", usage: "Disabled" },
    ],
  },
  {
    group: "Brand",
    tokens: [
      { name: "primary", light: "#0A1B25", dark: "#E3FFCC", usage: "Primary brand / CTAs" },
      { name: "secondary", light: "#275144", dark: "#4BB793", usage: "Secondary brand" },
      { name: "accent", light: "#E3FFCC", dark: "#E3FFCC", usage: "Mint accent" },
      { name: "accent-2", light: "#FF6140", dark: "#FF6140", usage: "Warm accent" },
      { name: "accent-3", light: "#E9D3EE", dark: "#E9D3EE", usage: "Violet accent" },
      { name: "gradient-start", light: "#064D4C", dark: "#064D4C", usage: "Hero gradient" },
      { name: "gradient-end", light: "#091A24", dark: "#091A24", usage: "Hero gradient" },
    ],
  },
  {
    group: "Text",
    tokens: [
      { name: "primary", light: "#0A1B25", dark: "#F4F4F4", usage: "Body / headings" },
      { name: "secondary", light: "#232726", dark: "#E6EAEA", usage: "Secondary copy" },
      { name: "tertiary", light: "#525151", dark: "#999E9E", usage: "Labels / muted" },
      { name: "invert", light: "#F4F4F4", dark: "#040C0B", usage: "Pairs with surface-invert" },
      { name: "on-brand", light: "#F4F4F4", dark: "#F4F4F4", usage: "On brand gradient / dark nav" },
      { name: "placeholder", light: "#6F7575", dark: "#999E9E", usage: "Inputs" },
      { name: "link", light: "#E3FFCC", dark: "#E3FFCC", usage: "Links on dark" },
      { name: "info", light: "#999E9E", dark: "#6F7575", usage: "Meta" },
    ],
  },
] as const;

export const gradients = [
  {
    name: "Hero",
    css: "linear-gradient(180deg, var(--brand-gradient-start) 0%, var(--brand-gradient-end) 70%)",
    usage: "Dark marketing heroes",
  },
] as const;

export const dashboardAccents = [
  { name: "sky", soft: "#E8F4FC", solid: "#2B7BBF", usage: "Active nav, LinkedIn, email links" },
  { name: "blue", soft: "#E6F0FF", solid: "#3B6FD9", usage: "Facebook Ads chips" },
  { name: "amber", soft: "#FFF4E0", solid: "#C47A1A", usage: "Google Ads, Competitive Exams" },
  { name: "violet", soft: "#F3E8FF", solid: "#7B3FA8", usage: "Email Marketing, College Admissions" },
  { name: "rose", soft: "#FFE8EC", solid: "#C23B55", usage: "NEET, Content Marketing" },
  { name: "sand", soft: "#F5EDE3", solid: "#8B6B4A", usage: "Affiliate, Startup Funding" },
] as const;

export const legacyFigmaMap = [
  { figma: "Grays/25", hex: "#F8FAF9", mapsTo: "gray-25 · surface-primary" },
  { figma: "Grays/950", hex: "#040C0B", mapsTo: "gray-950 · surface-invert" },
  { figma: "Brand/25", hex: "#F6FDEE", mapsTo: "brand-25 · surface-secondary" },
  { figma: "Brand/Accent 1", hex: "#E3FFCC", mapsTo: "brand-100 · brand-accent" },
  { figma: "Brand/Primary", hex: "#0A1B25", mapsTo: "brand-900 · brand-primary" },
  { figma: "Brand/Secondary", hex: "#275144", mapsTo: "brand-600" },
] as const;

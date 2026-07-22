export type PlatformId =
  | "linkedin-square"
  | "linkedin-landscape"
  | "instagram-square"
  | "instagram-story"
  | "twitter"
  | "event-standee";

export type PlatformKind = "social" | "print";

export type TemplateId = "product-shot";

export type PostTheme = "dark" | "light";

export type PatternId =
  | "monogram"
  | "monogram-soft"
  | "footer"
  | "outline"
  | "none";

export type ProductPageId = "leads" | "hero-ui" | "pipeline";

/** Type scale multipliers for social post typography */
export type TypeScaleId = 1 | 1.5 | 2 | 3 | 4;

export type TypeScaleOption = {
  id: TypeScaleId;
  label: string;
};

export const TYPE_SCALES: TypeScaleOption[] = [
  { id: 1, label: "1×" },
  { id: 1.5, label: "1.5×" },
  { id: 2, label: "2×" },
  { id: 3, label: "3×" },
  { id: 4, label: "4×" },
];

export type LogoAlign = "left" | "center" | "right";
export type LogoPlacement = "top" | "footer";
export type TextAlign = "left" | "center" | "right";
export type SocialFontId = "display" | "body" | "sans" | "mono";

export type AlignOption<T extends string> = {
  id: T;
  label: string;
};

export type SocialFontOption = {
  id: SocialFontId;
  label: string;
  /** Tailwind / design token name shown in UI */
  token: string;
  /** CSS font-family value applied on the post */
  family: string;
};

export const LOGO_ALIGNS: AlignOption<LogoAlign>[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

export const LOGO_PLACEMENTS: AlignOption<LogoPlacement>[] = [
  { id: "top", label: "Top" },
  { id: "footer", label: "Footer" },
];

export const TEXT_ALIGNS: AlignOption<TextAlign>[] = [
  { id: "left", label: "Left" },
  { id: "center", label: "Center" },
  { id: "right", label: "Right" },
];

export const SOCIAL_FONTS: SocialFontOption[] = [
  {
    id: "display",
    label: "Syne",
    token: "font-social-display",
    family: "var(--font-social-display), var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "body",
    label: "DM Sans",
    token: "font-social-body",
    family: "var(--font-social-body), var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "sans",
    label: "Inter",
    token: "font-sans",
    family: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "mono",
    label: "Mono",
    token: "font-mono",
    family: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },
];

export function getSocialFont(id: SocialFontId): SocialFontOption {
  return SOCIAL_FONTS.find((f) => f.id === id) ?? SOCIAL_FONTS[0];
}

export type PlatformPreset = {
  id: PlatformId;
  label: string;
  width: number;
  height: number;
  kind?: PlatformKind;
  /** Human-readable size for UI (e.g. print inches) */
  sizeLabel?: string;
  /** Physical print size — used for true-size PDF export */
  printInches?: { width: number; height: number };
};

export type TemplateMeta = {
  id: TemplateId;
  label: string;
  description: string;
  defaultTheme: PostTheme;
  /** Whether this template can flip light/dark meaningfully */
  themeToggle: boolean;
  /** Append mint period span after heading */
  accentPeriod: boolean;
};

export type ExtraField = {
  id: string;
  label: string;
  value: string;
};

export type PostCopy = {
  heading: string;
  subheading: string;
  extraFields: ExtraField[];
};

export type PatternOption = {
  id: PatternId;
  label: string;
  description: string;
};

export type ProductPageOption = {
  id: ProductPageId;
  label: string;
  description: string;
};

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: "linkedin-square",
    label: "LinkedIn Square",
    width: 1080,
    height: 1080,
    kind: "social",
  },
  {
    id: "linkedin-landscape",
    label: "LinkedIn Landscape",
    width: 1200,
    height: 627,
    kind: "social",
  },
  {
    id: "instagram-square",
    label: "Instagram Square",
    width: 1080,
    height: 1080,
    kind: "social",
  },
  {
    id: "instagram-story",
    label: "Instagram Story",
    width: 1080,
    height: 1920,
    kind: "social",
  },
  {
    id: "twitter",
    label: "Twitter / X",
    width: 1200,
    height: 675,
    kind: "social",
  },
  {
    id: "event-standee",
    label: "Event Standee",
    /** Working canvas @ ~50 DPI for 36×72 in (1:2). Export 2× ≈ 100 DPI large-format. */
    width: 1800,
    height: 3600,
    kind: "print",
    sizeLabel: "36×72 in · 3×6 ft",
    printInches: { width: 36, height: 72 },
  },
];

export function platformOptionLabel(p: PlatformPreset): string {
  if (p.sizeLabel) return `${p.label} (${p.sizeLabel})`;
  return `${p.label} (${p.width}×${p.height})`;
}

export const PATTERN_OPTIONS: PatternOption[] = [
  {
    id: "monogram",
    label: "Monogram",
    description: "Hero outline pattern",
  },
  {
    id: "monogram-soft",
    label: "Monogram soft",
    description: "Lighter monogram wash",
  },
  {
    id: "footer",
    label: "Footer",
    description: "Site footer monogram strip",
  },
  {
    id: "outline",
    label: "Outline mark",
    description: "Large monogram outline asset",
  },
  {
    id: "none",
    label: "None",
    description: "Solid gradient only",
  },
];

export const PRODUCT_PAGES: ProductPageOption[] = [
  {
    id: "leads",
    label: "Leads table",
    description: "Live CRM leads workspace",
  },
  {
    id: "hero-ui",
    label: "CRM overview",
    description: "Landing product screenshot",
  },
  {
    id: "pipeline",
    label: "Pipeline board",
    description: "Kanban-style deal stages",
  },
];

export const TEMPLATES: TemplateMeta[] = [
  {
    id: "product-shot",
    label: "Product Shot",
    description: "Headline over CRM preview",
    defaultTheme: "dark",
    themeToggle: false,
    accentPeriod: true,
  },
];

export const DEFAULT_COPY: Record<TemplateId, PostCopy> = {
  "product-shot": {
    heading: "Your CRM Just Got Smarter",
    subheading: "Capture every interaction, automate every update.",
    extraFields: [],
  },
};

export function getPlatform(id: PlatformId): PlatformPreset {
  return PLATFORM_PRESETS.find((p) => p.id === id) ?? PLATFORM_PRESETS[0];
}

export function getTemplate(id: TemplateId): TemplateMeta {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}

export function getPattern(id: PatternId): PatternOption {
  return PATTERN_OPTIONS.find((p) => p.id === id) ?? PATTERN_OPTIONS[0];
}

export function getProductPage(id: ProductPageId): ProductPageOption {
  return PRODUCT_PAGES.find((p) => p.id === id) ?? PRODUCT_PAGES[0];
}

/** Render heading with optional [[accent]] spans */
export function parseAccentMarkup(text: string): Array<
  | { type: "text"; value: string }
  | { type: "accent"; value: string }
  | { type: "br" }
> {
  const parts: Array<
    | { type: "text"; value: string }
    | { type: "accent"; value: string }
    | { type: "br" }
  > = [];
  const lines = text.split("\n");
  lines.forEach((line, lineIdx) => {
    const re = /\[\[(.+?)\]\]/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      if (match.index > last) {
        parts.push({ type: "text", value: line.slice(last, match.index) });
      }
      parts.push({ type: "accent", value: match[1] });
      last = match.index + match[0].length;
    }
    if (last < line.length) {
      parts.push({ type: "text", value: line.slice(last) });
    }
    if (lineIdx < lines.length - 1) parts.push({ type: "br" });
  });
  return parts;
}

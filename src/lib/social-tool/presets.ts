export type PlatformId =
  | "linkedin-square"
  | "linkedin-landscape"
  | "instagram-square"
  | "instagram-story"
  | "twitter"
  | "event-standee"
  | "business-card"
  | "poster-portrait"
  | "invite-portrait"
  | "certificate-landscape";

export type PlatformKind = "social" | "print";

export type TemplateId = "product-shot";

export type PostTheme = "dark" | "light";

export type PatternId =
  | "monogram"
  | "monogram-soft"
  | "footer"
  | "none";

export type ProductPageId =
  | "leads"
  | "pipeline"
  | "scheduler"
  | "stats"
  | "pricing"
  | "activity"
  | "profile"
  | "form-card";

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

export function listItemExtraFields(extraFields: ExtraField[]): ExtraField[] {
  return extraFields.filter((field) => field.id !== "footer-author");
}

export function footerAuthorField(
  extraFields: ExtraField[],
): ExtraField | undefined {
  return extraFields.find((field) => field.id === "footer-author");
}

export function createNumberedListPlaceholders(count = 4): ExtraField[] {
  const items = Array.from({ length: count }, (_, i) => ({
    id: `list-item-${i + 1}`,
    label: "Item title",
    value: "Description",
  }));
  return [
    ...items,
    { id: "footer-author", label: "Author", value: "Your name" },
  ];
}

/** Parse \"four things\" / \"5 tips\" from brief text for list layouts. */
export function detectListItemCountFromBrief(brief: string): number | null {
  const lower = brief.toLowerCase();
  const wordMatch = lower.match(
    /\b(one|two|three|four|five|six|1|2|3|4|5|6)\s+(?:things|tips|steps|ways|reasons|items)/,
  );
  if (!wordMatch) return null;
  const map: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
  };
  const n = map[wordMatch[1]] ?? null;
  if (n == null) return null;
  return Math.min(6, Math.max(2, n));
}

export type PostCopy = {
  heading: string;
  subheading: string;
  extraFields: ExtraField[];
};

/** Headline + subheading pair stored for shuffle cycling. */
export type CopyVariant = {
  heading: string;
  subheading: string;
};

export const COPY_VARIANT_POOL_SIZE = 8;

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
  {
    id: "business-card",
    label: "Business Card",
    /** Standard US business card 3.5×2 in @ ~308 DPI preview. */
    width: 1080,
    height: 617,
    kind: "print",
    sizeLabel: "3.5×2 in",
    printInches: { width: 3.5, height: 2 },
  },
  {
    id: "poster-portrait",
    label: "Poster Portrait",
    width: 1080,
    height: 1350,
    kind: "print",
    sizeLabel: "4:5 · 1080×1350",
    printInches: { width: 4, height: 5 },
  },
  {
    id: "invite-portrait",
    label: "Invite Portrait",
    width: 1080,
    height: 1512,
    kind: "print",
    sizeLabel: "5:7 · invite",
    printInches: { width: 5, height: 7 },
  },
  {
    id: "certificate-landscape",
    label: "Certificate",
    width: 1080,
    height: 834,
    kind: "print",
    sizeLabel: "11×8.5 in",
    printInches: { width: 11, height: 8.5 },
  },
];

export function platformOptionLabel(p: PlatformPreset): string {
  if (p.sizeLabel) return `${p.label} (${p.sizeLabel})`;
  return `${p.label} (${p.width}×${p.height})`;
}

/** Compact label for header / canvas chrome pills — name only, no dimensions. */
export function platformPillLabel(p: PlatformPreset): string {
  return p.label;
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
    id: "pipeline",
    label: "Pipeline board",
    description: "Kanban-style deal stages",
  },
  {
    id: "scheduler",
    label: "Scheduler card",
    description: "Meeting booking UI block",
  },
  {
    id: "stats",
    label: "Stats cards",
    description: "KPI dashboard card row",
  },
  {
    id: "pricing",
    label: "Pricing card",
    description: "Single-plan pricing block",
  },
  {
    id: "activity",
    label: "Activity feed",
    description: "Inbox-style notification list",
  },
  {
    id: "profile",
    label: "Profile card",
    description: "User profile summary block",
  },
  {
    id: "form-card",
    label: "Form card",
    description: "Waitlist signup UI block",
  },
];

const PRODUCT_PAGE_IDS = new Set<ProductPageId>(
  PRODUCT_PAGES.map((page) => page.id),
);

/** Coerce persisted or legacy values to a valid GenUI block id. */
export function normalizeProductPage(value: unknown): ProductPageId {
  if (
    typeof value === "string" &&
    PRODUCT_PAGE_IDS.has(value as ProductPageId)
  ) {
    return value as ProductPageId;
  }
  return "leads";
}

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

/** True for ~1:1 artboards (e.g. LinkedIn / Instagram square 1080×1080). */
export function isSquareArtboard(platformId: PlatformId): boolean {
  const platform = getPlatform(platformId);
  const aspect = platform.width / platform.height;
  return aspect >= 0.9 && aspect <= 1.1;
}

/**
 * Horizontal split layouts (copy | feature columns) need wider-than-square
 * canvases. Square posts should use vertical stack layouts instead.
 */
export function platformAllowsHorizontalSplit(platformId: PlatformId): boolean {
  return !isSquareArtboard(platformId);
}

const PLATFORM_IDS = new Set<PlatformId>(
  PLATFORM_PRESETS.map((p) => p.id as PlatformId),
);

export function normalizePlatformId(value: string): PlatformId {
  if (PLATFORM_IDS.has(value as PlatformId)) return value as PlatformId;
  return "linkedin-square";
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

/** True when copy uses [[highlight]] accent markup. */
export function hasAccentMarkup(text: string): boolean {
  return /\[\[(.+?)\]\]/.test(text);
}

/** Visible text with [[accent]] brackets removed. */
export function stripAccentMarkup(text: string): string {
  return text.replace(/\[\[(.+?)\]\]/g, "$1");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML for a contentEditable overlay that preserves accent spans visually. */
export function accentMarkupToEditorHtml(text: string): string {
  return parseAccentMarkup(text)
    .map((part) => {
      if (part.type === "br") return "<br>";
      if (part.type === "accent") {
        return `<span data-accent="1">${escapeHtml(part.value)}</span>`;
      }
      return escapeHtml(part.value);
    })
    .join("");
}

/** Serialize a contentEditable root back to [[accent]] markup. */
export function editorHtmlToAccentMarkup(root: HTMLElement): string {
  const TEXT = 3;
  const ELEMENT = 1;
  const walk = (node: Node): string => {
    if (node.nodeType === TEXT) {
      return node.textContent ?? "";
    }
    if (node.nodeType !== ELEMENT) return "";
    const el = node as HTMLElement;
    const tag = el.tagName;
    if (tag === "BR") return "\n";
    if (el.dataset.accent === "1") {
      const text = el.textContent ?? "";
      return text ? `[[${text}]]` : "";
    }
    let out = "";
    for (const child of Array.from(el.childNodes)) {
      out += walk(child);
    }
    // Block-ish breaks when browsers insert divs on Enter
    if ((tag === "DIV" || tag === "P") && out && !out.endsWith("\n")) {
      return `${out}\n`;
    }
    return out;
  };

  let result = "";
  for (const child of Array.from(root.childNodes)) {
    result += walk(child);
  }
  return result.replace(/\n$/, "");
}

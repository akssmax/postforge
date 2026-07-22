import type {
  Deck,
  ImageBlock,
  PatternBlock,
  ProductBlock,
  Slide,
  SlideBlock,
  TextBlock,
} from "@/lib/slides/types";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export type SlideTone = "light" | "dark";

/** Brand ink tokens for slide copy */
export const SLIDE_INK = {
  dark: {
    primary: "#ffffff",
    muted: "rgba(255,255,255,0.72)",
    accent: "#E3FFCC",
  },
  light: {
    primary: "#040c0b", // --brand-950
    muted: "#275144", // --brand-600
    accent: "#1b3d36", // --brand-700
  },
} as const;

export function createTextBlock(
  partial?: Partial<Omit<TextBlock, "type" | "props">> & {
    props?: Partial<TextBlock["props"]>;
    tone?: SlideTone;
  },
): TextBlock {
  const tone = partial?.tone ?? "dark";
  const ink = SLIDE_INK[tone];
  return {
    id: partial?.id ?? uid("text"),
    type: "text",
    x: partial?.x ?? 10,
    y: partial?.y ?? 20,
    w: partial?.w ?? 80,
    h: partial?.h ?? 20,
    zIndex: partial?.zIndex ?? 2,
    props: {
      content: "Add your headline",
      font: "sans",
      size: 72,
      align: "left",
      color: ink.primary,
      weight: 600,
      ...partial?.props,
    },
  };
}

export function createImageBlock(
  partial?: Partial<Omit<ImageBlock, "type" | "props">> & {
    props?: Partial<ImageBlock["props"]>;
  },
): ImageBlock {
  return {
    id: partial?.id ?? uid("img"),
    type: "image",
    x: partial?.x ?? 55,
    y: partial?.y ?? 20,
    w: partial?.w ?? 40,
    h: partial?.h ?? 60,
    zIndex: partial?.zIndex ?? 2,
    props: {
      src: null,
      fit: "cover",
      opacity: 1,
      ...partial?.props,
    },
  };
}

export function createProductBlock(
  partial?: Partial<Omit<ProductBlock, "type" | "props">> & {
    props?: Partial<ProductBlock["props"]>;
  },
): ProductBlock {
  return {
    id: partial?.id ?? uid("product"),
    type: "product",
    x: partial?.x ?? 48,
    y: partial?.y ?? 18,
    w: partial?.w ?? 48,
    h: partial?.h ?? 64,
    zIndex: partial?.zIndex ?? 3,
    props: {
      page: "leads",
      ...partial?.props,
    },
  };
}

export function createPatternBlock(
  partial?: Partial<Omit<PatternBlock, "type" | "props">> & {
    props?: Partial<PatternBlock["props"]>;
  },
): PatternBlock {
  return {
    id: partial?.id ?? uid("pattern"),
    type: "pattern",
    x: partial?.x ?? 0,
    y: partial?.y ?? 0,
    w: partial?.w ?? 100,
    h: partial?.h ?? 100,
    zIndex: partial?.zIndex ?? 0,
    props: {
      patternId: "monogram",
      opacity: 0.28,
      scale: 1,
      ...partial?.props,
    },
  };
}

/** Brand dark fills used on product-shot posts */
export const SLIDE_BACKGROUNDS = [
  {
    id: "hero",
    label: "Hero dark",
    value: "#040c0b",
    tone: "dark" as const,
  },
  {
    id: "brand-950",
    label: "Brand deep",
    value: "#0a1f1a",
    tone: "dark" as const,
  },
  {
    id: "surface",
    label: "Light surface",
    value: "#f8faf9",
    tone: "light" as const,
  },
  {
    id: "mint",
    label: "Mint wash",
    value: "linear-gradient(145deg, #0a1f1a 0%, #275144 55%, #4BB793 140%)",
    tone: "dark" as const,
  },
] as const;

export function slideToneForBackground(background: string): SlideTone {
  const preset = SLIDE_BACKGROUNDS.find((b) => b.value === background);
  if (preset) return preset.tone;
  const hex = background.trim().toLowerCase();
  if (hex.startsWith("#") && hex.length >= 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if ([r, g, b].every((n) => !Number.isNaN(n))) {
      // Relative luminance — treat bright fills as light
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return lum > 0.55 ? "light" : "dark";
    }
  }
  if (/f8faf9|ffffff|f5f5|surface|light/i.test(background)) return "light";
  return "dark";
}

function normalizeColor(c: string) {
  return c.trim().toLowerCase().replace(/\s+/g, "");
}

/** Remap stored text colors when the slide tone flips (light ↔ dark). */
export function remapTextColorForTone(
  color: string,
  nextTone: SlideTone,
): string {
  const n = normalizeColor(color);
  const from = SLIDE_INK[nextTone === "light" ? "dark" : "light"];
  const to = SLIDE_INK[nextTone];

  if (
    n === normalizeColor(from.primary) ||
    n === "#fff" ||
    n === "#ffffffff" ||
    (nextTone === "light" &&
      (n === "#ffffff" || n.startsWith("rgba(255,255,255")))
  ) {
    if (n.startsWith("rgba(255,255,255") || n === normalizeColor(from.muted)) {
      return to.muted;
    }
    return to.primary;
  }
  if (n === normalizeColor(from.muted) || n.startsWith("rgba(255,255,255")) {
    return to.muted;
  }
  if (n === normalizeColor(from.accent) || n === "#e3ffcc") {
    return to.accent;
  }
  if (n === normalizeColor(from.primary)) return to.primary;

  // Already on-target brand inks — keep
  if (
    n === normalizeColor(to.primary) ||
    n === normalizeColor(to.muted) ||
    n === normalizeColor(to.accent)
  ) {
    return color;
  }

  // Light → dark: known light inks
  if (nextTone === "dark") {
    if (n === "#040c0b" || n === "#0a1f1a") return to.primary;
    if (n === "#275144" || n === "#1b3d36") return to.muted;
  }

  return color;
}

export function adaptSlideBlocksForTone(
  blocks: SlideBlock[],
  nextTone: SlideTone,
): SlideBlock[] {
  return blocks.map((b) => {
    if (b.type !== "text") return b;
    return {
      ...b,
      props: {
        ...b.props,
        color: remapTextColorForTone(b.props.color, nextTone),
      },
    };
  });
}

export function createEmptySlide(name = "Untitled"): Slide {
  return {
    id: uid("slide"),
    name,
    background: "#040c0b",
    blocks: [],
  };
}

export function duplicateSlide(slide: Slide): Slide {
  return {
    ...slide,
    id: uid("slide"),
    name: `${slide.name} copy`,
    blocks: slide.blocks.map((b) => ({
      ...b,
      id: uid(b.type),
      props: { ...b.props },
    })) as SlideBlock[],
  };
}

export function createDefaultDeck(): Deck {
  const title = createEmptySlide("Title");
  title.blocks = [
    createPatternBlock({
      zIndex: 0,
      props: { patternId: "monogram", opacity: 0.22, scale: 1.1 },
    }),
    createTextBlock({
      x: 8,
      y: 28,
      w: 70,
      h: 22,
      zIndex: 2,
      props: {
        content: "Grow pipeline with Postforge",
        font: "sans",
        size: 84,
        weight: 700,
        color: "#ffffff",
        align: "left",
      },
    }),
    createTextBlock({
      x: 8,
      y: 54,
      w: 55,
      h: 12,
      zIndex: 2,
      props: {
        content: "CRM built for modern revenue teams",
        font: "sans",
        size: 32,
        weight: 400,
        color: "rgba(255,255,255,0.72)",
        align: "left",
      },
    }),
  ];

  const feature = createEmptySlide("Feature");
  feature.blocks = [
    createPatternBlock({
      zIndex: 0,
      props: { patternId: "monogram-soft", opacity: 0.18, scale: 0.9 },
    }),
    createTextBlock({
      x: 6,
      y: 22,
      w: 40,
      h: 28,
      zIndex: 2,
      props: {
        content: "See every lead in one workspace",
        font: "sans",
        size: 56,
        weight: 600,
        color: "#ffffff",
        align: "left",
      },
    }),
    createTextBlock({
      x: 6,
      y: 55,
      w: 38,
      h: 16,
      zIndex: 2,
      props: {
        content: "Capture, qualify, and close in one workspace.",
        font: "sans",
        size: 26,
        weight: 400,
        color: "rgba(255,255,255,0.7)",
        align: "left",
      },
    }),
    createProductBlock({
      x: 48,
      y: 14,
      w: 48,
      h: 72,
      zIndex: 3,
      props: { page: "leads" },
    }),
  ];

  const closing = createEmptySlide("Closing");
  closing.blocks = [
    createPatternBlock({
      zIndex: 0,
      props: { patternId: "footer", opacity: 0.35, scale: 1 },
    }),
    createTextBlock({
      x: 10,
      y: 34,
      w: 80,
      h: 18,
      zIndex: 2,
      props: {
        content: "Ready when your team is",
        font: "sans",
        size: 72,
        weight: 700,
        color: "#ffffff",
        align: "center",
      },
    }),
    createTextBlock({
      x: 15,
      y: 56,
      w: 70,
      h: 10,
      zIndex: 2,
      props: {
        content: "Start designing · postforge",
        font: "sans",
        size: 28,
        weight: 500,
        color: "#E3FFCC",
        align: "center",
      },
    }),
  ];

  return {
    id: uid("deck"),
    slides: [title, feature, closing],
    activeSlideId: title.id,
  };
}

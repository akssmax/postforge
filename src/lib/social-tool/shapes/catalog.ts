import type { ShapeBrandColors, ShapeCategory } from "@/lib/social-tool/shapes/types";
import { shapeSvg } from "@/lib/social-tool/shapes/svgFrame";

export type ShapeCatalogEntry = {
  id: string;
  category: ShapeCategory;
  label: string;
  tags: string[];
  defaultOpacity: number;
  defaultScale: number;
  defaultZIndex: number;
  render: (colors: ShapeBrandColors) => string;
};

function polygonPoints(sides: number, cx = 100, cy = 100, r = 80): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

function starPoints(points: number, cx = 100, cy = 100, outer = 80, inner = 36): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

const BASIC_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-basic-rect",
    category: "basic",
    label: "Rectangle",
    tags: ["basic", "rect"],
    defaultOpacity: 0.25,
    defaultScale: 0.35,
    defaultZIndex: 2,
    render: (c) =>
      shapeSvg(`<rect x="30" y="50" width="140" height="100" rx="4" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-rounded-rect",
    category: "basic",
    label: "Rounded rectangle",
    tags: ["basic", "rect"],
    defaultOpacity: 0.25,
    defaultScale: 0.35,
    defaultZIndex: 2,
    render: (c) =>
      shapeSvg(`<rect x="30" y="50" width="140" height="100" rx="24" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-circle",
    category: "basic",
    label: "Circle",
    tags: ["basic", "circle"],
    defaultOpacity: 0.2,
    defaultScale: 0.4,
    defaultZIndex: 1,
    render: (c) => shapeSvg(`<circle cx="100" cy="100" r="78" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-triangle-up",
    category: "basic",
    label: "Triangle up",
    tags: ["basic", "triangle"],
    defaultOpacity: 0.28,
    defaultScale: 0.32,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<polygon points="100,24 176,168 24,168" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-triangle-down",
    category: "basic",
    label: "Triangle down",
    tags: ["basic", "triangle"],
    defaultOpacity: 0.28,
    defaultScale: 0.32,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<polygon points="100,176 24,32 176,32" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-pill",
    category: "basic",
    label: "Pill",
    tags: ["basic", "badge", "offer"],
    defaultOpacity: 0.35,
    defaultScale: 0.28,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<rect x="20" y="78" width="160" height="44" rx="22" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-ellipse",
    category: "basic",
    label: "Ellipse",
    tags: ["basic", "oval"],
    defaultOpacity: 0.22,
    defaultScale: 0.38,
    defaultZIndex: 1,
    render: (c) =>
      shapeSvg(`<ellipse cx="100" cy="100" rx="90" ry="58" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-basic-diamond",
    category: "basic",
    label: "Diamond",
    tags: ["basic", "diamond"],
    defaultOpacity: 0.26,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<polygon points="100,18 182,100 100,182 18,100" fill="{{fill}}"/>`, c),
  },
];

const LINE_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-line-solid",
    category: "lines",
    label: "Solid line",
    tags: ["line", "divider"],
    defaultOpacity: 0.5,
    defaultScale: 0.45,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="20" y1="100" x2="180" y2="100" stroke="{{fill}}" stroke-width="6" stroke-linecap="round"/>`,
        c,
      ),
  },
  {
    id: "shape-line-dashed",
    category: "lines",
    label: "Dashed line",
    tags: ["line", "dashed"],
    defaultOpacity: 0.45,
    defaultScale: 0.45,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="20" y1="100" x2="180" y2="100" stroke="{{fill}}" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>`,
        c,
      ),
  },
  {
    id: "shape-line-dotted",
    category: "lines",
    label: "Dotted line",
    tags: ["line", "dotted"],
    defaultOpacity: 0.45,
    defaultScale: 0.45,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="20" y1="100" x2="180" y2="100" stroke="{{fill}}" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round"/>`,
        c,
      ),
  },
  {
    id: "shape-line-arrow-right",
    category: "lines",
    label: "Arrow line right",
    tags: ["line", "arrow"],
    defaultOpacity: 0.5,
    defaultScale: 0.4,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="24" y1="100" x2="156" y2="100" stroke="{{fill}}" stroke-width="5" stroke-linecap="round"/>
<polygon points="156,84 180,100 156,116" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-line-arrow-left",
    category: "lines",
    label: "Arrow line left",
    tags: ["line", "arrow"],
    defaultOpacity: 0.5,
    defaultScale: 0.4,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="44" y1="100" x2="176" y2="100" stroke="{{fill}}" stroke-width="5" stroke-linecap="round"/>
<polygon points="44,84 20,100 44,116" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-line-vertical",
    category: "lines",
    label: "Vertical line",
    tags: ["line", "vertical"],
    defaultOpacity: 0.45,
    defaultScale: 0.35,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="100" y1="24" x2="100" y2="176" stroke="{{fill}}" stroke-width="5" stroke-linecap="round"/>`,
        c,
      ),
  },
];

const POLYGON_SHAPES: ShapeCatalogEntry[] = [5, 6, 7, 8].map((sides) => ({
  id: `shape-polygon-${sides}`,
  category: "polygons" as const,
  label: `${sides}-sided polygon`,
  tags: ["polygon"],
  defaultOpacity: 0.24,
  defaultScale: 0.32,
  defaultZIndex: 2,
  render: (c: ShapeBrandColors) =>
    shapeSvg(`<polygon points="${polygonPoints(sides)}" fill="{{fill}}"/>`, c),
}));

const STAR_SHAPES: ShapeCatalogEntry[] = [4, 5, 6, 7, 8].map((points) => ({
  id: `shape-star-${points}`,
  category: "stars" as const,
  label: `${points}-point star`,
  tags: ["star", "offer", "accent"],
  defaultOpacity: 0.3,
  defaultScale: 0.28,
  defaultZIndex: 8,
  render: (c: ShapeBrandColors) =>
    shapeSvg(`<polygon points="${starPoints(points)}" fill="{{fill}}"/>`, c),
}));

const ARROW_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-arrow-block-right",
    category: "arrows",
    label: "Block arrow right",
    tags: ["arrow", "block"],
    defaultOpacity: 0.32,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M20 70 H120 V40 L180 100 L120 160 V130 H20 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-arrow-block-left",
    category: "arrows",
    label: "Block arrow left",
    tags: ["arrow", "block"],
    defaultOpacity: 0.32,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M180 70 H80 V40 L20 100 L80 160 V130 H180 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-arrow-block-up",
    category: "arrows",
    label: "Block arrow up",
    tags: ["arrow", "block"],
    defaultOpacity: 0.32,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M70 180 V80 H40 L100 20 L160 80 V180 H130 V130 H70 V180 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-arrow-block-down",
    category: "arrows",
    label: "Block arrow down",
    tags: ["arrow", "block"],
    defaultOpacity: 0.32,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M70 20 V120 H40 L100 180 L160 120 V20 H130 V70 H70 V20 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-arrow-chevron-right",
    category: "arrows",
    label: "Chevron right",
    tags: ["arrow", "chevron"],
    defaultOpacity: 0.4,
    defaultScale: 0.25,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M60 40 L140 100 L60 160 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-arrow-double",
    category: "arrows",
    label: "Double arrow",
    tags: ["arrow", "double"],
    defaultOpacity: 0.35,
    defaultScale: 0.32,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M30 70 H70 L50 50 V90 Z M170 70 H130 L150 50 V90 Z M70 85 H130 V115 H70 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
];

const FLOWCHART_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-flow-process",
    category: "flowchart",
    label: "Process box",
    tags: ["flowchart", "process"],
    defaultOpacity: 0.28,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<rect x="36" y="56" width="128" height="88" rx="8" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-flow-diamond",
    category: "flowchart",
    label: "Decision diamond",
    tags: ["flowchart", "decision"],
    defaultOpacity: 0.28,
    defaultScale: 0.28,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(`<polygon points="100,28 172,100 100,172 28,100" fill="{{fill}}"/>`, c),
  },
  {
    id: "shape-flow-cylinder",
    category: "flowchart",
    label: "Cylinder",
    tags: ["flowchart", "data"],
    defaultOpacity: 0.26,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<ellipse cx="100" cy="58" rx="60" ry="18" fill="{{fill}}"/>
<rect x="40" y="58" width="120" height="84" fill="{{fill}}"/>
<ellipse cx="100" cy="142" rx="60" ry="18" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-flow-connector",
    category: "flowchart",
    label: "Connector",
    tags: ["flowchart", "connector"],
    defaultOpacity: 0.4,
    defaultScale: 0.35,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M100 24 V80 M100 120 V176 M100 80 Q60 80 60 100 Q60 120 100 120" stroke="{{fill}}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
        c,
      ),
  },
  {
    id: "shape-flow-document",
    category: "flowchart",
    label: "Document",
    tags: ["flowchart", "document"],
    defaultOpacity: 0.26,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M52 36 H128 L148 56 V164 H52 Z M128 36 V56 H148" fill="{{fill}}"/>`,
        c,
      ),
  },
];

const ORGANIC_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-organic-blob-soft-01",
    category: "organic",
    label: "Soft blob",
    tags: ["organic", "blob", "background", "mesh"],
    defaultOpacity: 0.14,
    defaultScale: 0.55,
    defaultZIndex: 0,
    render: (c) =>
      shapeSvg(
        `<path d="M148 42 C178 58 188 98 168 132 C148 168 98 182 62 162 C26 142 18 98 38 64 C58 30 108 26 148 42 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-blob-soft-02",
    category: "organic",
    label: "Wide blob",
    tags: ["organic", "blob", "background", "mesh"],
    defaultOpacity: 0.12,
    defaultScale: 0.6,
    defaultZIndex: 0,
    render: (c) =>
      shapeSvg(
        `<path d="M32 88 C18 58 48 28 88 24 C128 20 168 38 178 78 C188 118 158 158 108 168 C58 178 46 118 32 88 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-blob-soft-03",
    category: "organic",
    label: "Tall blob",
    tags: ["organic", "blob", "background"],
    defaultOpacity: 0.13,
    defaultScale: 0.5,
    defaultZIndex: 0,
    render: (c) =>
      shapeSvg(
        `<path d="M92 18 C128 22 156 52 162 92 C168 132 142 172 102 182 C62 192 38 152 34 112 C30 72 56 14 92 18 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-wave-01",
    category: "organic",
    label: "Wave arc",
    tags: ["organic", "wave"],
    defaultOpacity: 0.2,
    defaultScale: 0.45,
    defaultZIndex: 1,
    render: (c) =>
      shapeSvg(
        `<path d="M0 120 Q50 60 100 120 T200 120 V200 H0 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-wave-02",
    category: "organic",
    label: "Swoosh wave",
    tags: ["organic", "wave", "accent"],
    defaultOpacity: 0.22,
    defaultScale: 0.4,
    defaultZIndex: 2,
    render: (c) =>
      shapeSvg(
        `<path d="M10 140 C60 80 140 80 190 140" stroke="{{fill}}" stroke-width="18" stroke-linecap="round" fill="none"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-arc-01",
    category: "organic",
    label: "Corner arc",
    tags: ["organic", "arc", "corner"],
    defaultOpacity: 0.18,
    defaultScale: 0.35,
    defaultZIndex: 1,
    render: (c) =>
      shapeSvg(
        `<path d="M20 180 V80 Q20 20 80 20 H180" stroke="{{fill}}" stroke-width="14" stroke-linecap="round" fill="none"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-splash-01",
    category: "organic",
    label: "Splash",
    tags: ["organic", "splash", "accent"],
    defaultOpacity: 0.16,
    defaultScale: 0.42,
    defaultZIndex: 1,
    render: (c) =>
      shapeSvg(
        `<path d="M100 30 L118 78 L168 78 L128 108 L142 158 L100 128 L58 158 L72 108 L32 78 L82 78 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-organic-ring-01",
    category: "organic",
    label: "Soft ring",
    tags: ["organic", "ring", "background"],
    defaultOpacity: 0.15,
    defaultScale: 0.48,
    defaultZIndex: 0,
    render: (c) =>
      shapeSvg(
        `<circle cx="100" cy="100" r="72" stroke="{{fill}}" stroke-width="22" fill="none"/>`,
        c,
      ),
  },
];

const FRAME_SHAPES: ShapeCatalogEntry[] = [
  {
    id: "shape-frame-corner-bracket",
    category: "frames",
    label: "Corner brackets",
    tags: ["frame", "corner"],
    defaultOpacity: 0.35,
    defaultScale: 0.32,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M36 36 H72 V52 H52 V72 H36 Z M164 36 H148 V52 H128 V36 Z M36 164 V128 H52 V148 H72 V164 Z M164 164 H128 V148 H148 V164 Z" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-frame-underline-swoosh",
    category: "frames",
    label: "Underline swoosh",
    tags: ["frame", "underline", "accent"],
    defaultOpacity: 0.4,
    defaultScale: 0.38,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<path d="M24 130 Q100 160 176 130" stroke="{{fill}}" stroke-width="8" stroke-linecap="round" fill="none"/>`,
        c,
      ),
  },
  {
    id: "shape-frame-dot-cluster",
    category: "frames",
    label: "Dot cluster",
    tags: ["frame", "dots", "decorative"],
    defaultOpacity: 0.35,
    defaultScale: 0.25,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<circle cx="60" cy="80" r="10" fill="{{fill}}"/>
<circle cx="100" cy="60" r="14" fill="{{fill}}"/>
<circle cx="140" cy="80" r="10" fill="{{fill}}"/>
<circle cx="80" cy="120" r="8" fill="{{fill}}"/>
<circle cx="120" cy="120" r="8" fill="{{fill}}"/>`,
        c,
      ),
  },
  {
    id: "shape-frame-ring-accent",
    category: "frames",
    label: "Ring accent",
    tags: ["frame", "ring"],
    defaultOpacity: 0.28,
    defaultScale: 0.3,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<circle cx="100" cy="100" r="68" stroke="{{fill}}" stroke-width="6" fill="none"/>
<circle cx="100" cy="100" r="48" stroke="{{fill}}" stroke-width="3" fill="none" opacity="0.5"/>`,
        c,
      ),
  },
  {
    id: "shape-frame-crosshair",
    category: "frames",
    label: "Crosshair",
    tags: ["frame", "crosshair"],
    defaultOpacity: 0.3,
    defaultScale: 0.28,
    defaultZIndex: 8,
    render: (c) =>
      shapeSvg(
        `<line x1="100" y1="40" x2="100" y2="160" stroke="{{fill}}" stroke-width="4"/>
<line x1="40" y1="100" x2="160" y2="100" stroke="{{fill}}" stroke-width="4"/>
<circle cx="100" cy="100" r="28" stroke="{{fill}}" stroke-width="3" fill="none"/>`,
        c,
      ),
  },
];

export const SHAPE_CATALOG: ShapeCatalogEntry[] = [
  ...BASIC_SHAPES,
  ...LINE_SHAPES,
  ...POLYGON_SHAPES,
  ...STAR_SHAPES,
  ...ARROW_SHAPES,
  ...FLOWCHART_SHAPES,
  ...ORGANIC_SHAPES,
  ...FRAME_SHAPES,
];

export const SHAPE_CATALOG_BY_ID = new Map(
  SHAPE_CATALOG.map((entry) => [entry.id, entry]),
);

export const SHAPES_BY_CATEGORY = SHAPE_CATALOG.reduce(
  (acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category]!.push(entry);
    return acc;
  },
  {} as Record<ShapeCategory, ShapeCatalogEntry[]>,
);

export function getShapeCatalogEntry(libraryId: string): ShapeCatalogEntry | undefined {
  return SHAPE_CATALOG_BY_ID.get(libraryId);
}

export function searchShapeCatalog(query: string): ShapeCatalogEntry[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return SHAPE_CATALOG;
  return SHAPE_CATALOG.filter((entry) => {
    const haystack = [entry.label, entry.id, entry.category, ...entry.tags]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Compact library id list for canvas agent system prompt. */
export function shapeLibrarySummaryForPrompt(maxPerCategory = 4): string {
  return Object.entries(SHAPES_BY_CATEGORY)
    .map(([category, entries]) => {
      const ids = entries.slice(0, maxPerCategory).map((entry) => entry.id);
      return `${category}: ${ids.join(", ")}`;
    })
    .join("\n");
}

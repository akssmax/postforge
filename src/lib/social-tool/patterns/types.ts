/** Namespaced pattern identifier stored on the design document */
export type PatternRef = string;

export type PatternCategory =
  | "lines"
  | "dots"
  | "geometric"
  | "organic"
  | "texture";

export type PatternScope = "global" | "design";

export type LegacyPatternId =
  | "monogram"
  | "monogram-soft"
  | "footer"
  | "outline"
  | "none";

export type BrandPatternId =
  | "tile-grid"
  | "watermark"
  | "diagonal"
  | "corner-strip"
  | "outline-tile";

export type LibraryPatternDef = {
  id: string;
  label: string;
  category: PatternCategory;
  tileWidth: number;
  tileHeight: number;
  /** Tile SVG inner content — use currentColor for fills/strokes */
  svg: string;
  tags: string[];
};

export type CustomPatternRecord = {
  id: string;
  name: string;
  svgMarkup: string;
  scope: PatternScope;
  designId?: string;
  tileWidth: number;
  tileHeight: number;
  createdAt: number;
};

export type ResolvedPattern =
  | {
      kind: "none";
      ref: PatternRef;
    }
  | {
      kind: "legacy";
      ref: PatternRef;
      legacyId: LegacyPatternId;
    }
  | {
      kind: "library";
      ref: PatternRef;
      def: LibraryPatternDef;
    }
  | {
      kind: "brand";
      ref: PatternRef;
      brandId: BrandPatternId;
      label: string;
    }
  | {
      kind: "custom";
      ref: PatternRef;
      record: CustomPatternRecord;
    };

export const PATTERN_NONE_REF = "legacy:none" as PatternRef;
export const DEFAULT_PATTERN_REF = "legacy:monogram" as PatternRef;

export const LEGACY_PATTERN_REFS: Record<LegacyPatternId, PatternRef> = {
  monogram: "legacy:monogram",
  "monogram-soft": "legacy:monogram-soft",
  footer: "legacy:footer",
  outline: "legacy:outline",
  none: "legacy:none",
};

export const BRAND_PATTERN_OPTIONS: { id: BrandPatternId; label: string }[] = [
  { id: "tile-grid", label: "Logo grid" },
  { id: "watermark", label: "Watermark" },
  { id: "diagonal", label: "Diagonal" },
  { id: "corner-strip", label: "Corner strip" },
  { id: "outline-tile", label: "Outline tile" },
];

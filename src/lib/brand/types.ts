export type BrandLogoMime = "image/svg+xml" | "image/png";

export type BrandLogoVariant = "primary" | "onLight" | "onDark" | "monogram";

export type BrandLogoSet = Partial<Record<BrandLogoVariant, BrandLogoRecord>>;

export type BrandLogoRecord = {
  id: string;
  mime: BrandLogoMime;
  fileName: string;
  uploadedAt: number;
  /** Sanitized inline SVG for DOM injection */
  svgMarkup?: string;
  /** Pristine upload copy for restoring contrast fixes */
  svgMarkupOriginal?: string;
  /** When true, skip CSS currentColor tint on the logo wrapper */
  usesExplicitColors?: boolean;
  /** IndexedDB key for PNG blob */
  blobKey?: string;
};

export type BrandColors = {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  /** Snapshot from last extraction — used for "Reset to extracted" */
  extracted?: BrandColors;
};

export type BackgroundPresetKind = "solid" | "gradient";

export type BackgroundPreset = {
  id: string;
  label: string;
  kind: BackgroundPresetKind;
  /** Light/dark grouping for gradient swatches in the background picker */
  gradientTheme?: "light" | "dark";
  css: {
    background: string;
    patternTint: string;
    footerPatternTint: string;
    textOnBrand: string;
    accentDot: string;
    subText: string;
  };
};

/** Serializable kit stored in localStorage */
export type BrandKitPersisted = {
  /** Primary logo alias — mirrors logos.primary */
  logo: BrandLogoRecord | null;
  logos: BrandLogoSet;
  colors: BrandColors;
  activeBackgroundPresetId: string | null;
};

/** Runtime kit with resolved logo URLs for canvas */
export type BrandKitRuntime = BrandKitPersisted & {
  logoSrc: string | null;
  logoSrcs: Partial<Record<BrandLogoVariant, string | null>>;
};

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: "#ff6140",
  secondary: "#c4472e",
  accent: "#ffe4d6",
  neutral: "#2a120c",
};

export const BRAND_KIT_STORAGE_KEY = "postforge-brand-kit";
export const BRAND_IDB_NAME = "postforge-brand";
export const BRAND_IDB_STORE = "logos";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

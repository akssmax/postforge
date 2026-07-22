export type BrandLogoMime = "image/svg+xml" | "image/png";

export type BrandLogoRecord = {
  id: string;
  mime: BrandLogoMime;
  fileName: string;
  uploadedAt: number;
  /** Sanitized inline SVG for DOM injection */
  svgMarkup?: string;
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
  logo: BrandLogoRecord | null;
  colors: BrandColors;
  activeBackgroundPresetId: string | null;
};

/** Runtime kit with resolved logo URL for canvas */
export type BrandKitRuntime = BrandKitPersisted & {
  logoSrc: string | null;
};

export const DEFAULT_BRAND_COLORS: BrandColors = {
  primary: "#4bb793",
  secondary: "#064d4c",
  accent: "#e3ffcc",
  neutral: "#0a1b25",
};

export const BRAND_KIT_STORAGE_KEY = "postforge-brand-kit";
export const BRAND_IDB_NAME = "postforge-brand";
export const BRAND_IDB_STORE = "logos";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

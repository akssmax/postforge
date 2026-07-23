import { resolveBackgroundHex } from "@/lib/brand/contrast";
import { relativeLuminance, hexToRgb } from "@/lib/brand/colorUtils";
import type {
  BrandKitPersisted,
  BrandLogoRecord,
  BrandLogoSet,
  BrandLogoVariant,
} from "@/lib/brand/types";
import { DEFAULT_BRAND_COLORS } from "@/lib/brand/types";

export const BRAND_LOGO_VARIANTS: BrandLogoVariant[] = [
  "primary",
  "onLight",
  "onDark",
  "monogram",
];

export const BRAND_LOGO_VARIANT_META: Record<
  BrandLogoVariant,
  { label: string; hint: string; formats: string }
> = {
  primary: {
    label: "Primary",
    hint: "Full color logo for general use",
    formats: "SVG · PNG",
  },
  onLight: {
    label: "On light",
    hint: "Dark logo for light backgrounds",
    formats: "SVG · PNG",
  },
  onDark: {
    label: "On dark",
    hint: "Light knock-out logo for dark backgrounds",
    formats: "SVG · PNG",
  },
  monogram: {
    label: "Monogram",
    hint: "Symbol only — used in patterns",
    formats: "SVG preferred",
  },
};

export type ResolvedCanvasLogo = {
  variant: BrandLogoVariant;
  record: BrandLogoRecord;
};

export function normalizeBrandKit(
  parsed: Partial<BrandKitPersisted> | null | undefined,
): BrandKitPersisted {
  const logos: BrandLogoSet = { ...(parsed?.logos ?? {}) };
  if (parsed?.logo && !logos.primary) {
    logos.primary = parsed.logo;
  }
  const primary = logos.primary ?? parsed?.logo ?? null;
  return {
    logo: primary,
    logos,
    colors: { ...DEFAULT_BRAND_COLORS, ...parsed?.colors },
    activeBackgroundPresetId: parsed?.activeBackgroundPresetId ?? null,
  };
}

export function getLogoRecord(
  kit: BrandKitPersisted,
  variant: BrandLogoVariant,
): BrandLogoRecord | null {
  return kit.logos?.[variant] ?? (variant === "primary" ? kit.logo : null) ?? null;
}

export function getPrimaryLogo(kit: BrandKitPersisted): BrandLogoRecord | null {
  return getLogoRecord(kit, "primary");
}

export function kitHasAnyLogo(kit: BrandKitPersisted): boolean {
  return BRAND_LOGO_VARIANTS.some((variant) => getLogoRecord(kit, variant) != null);
}

export function syncPrimaryAlias(kit: BrandKitPersisted): BrandKitPersisted {
  const primary = getLogoRecord(kit, "primary");
  return {
    ...kit,
    logo: primary,
    logos: {
      ...kit.logos,
      ...(primary ? { primary } : {}),
    },
  };
}

export function setLogoInKit(
  kit: BrandKitPersisted,
  variant: BrandLogoVariant,
  record: BrandLogoRecord | null,
): BrandKitPersisted {
  const logos = { ...kit.logos };
  if (record) {
    logos[variant] = record;
  } else {
    delete logos[variant];
  }
  const next = { ...kit, logos };
  if (variant === "primary") {
    next.logo = record;
  }
  return syncPrimaryAlias(next);
}

export function backgroundPrefersDarkLogo(backgroundCss: string): boolean {
  const bg = resolveBackgroundHex(backgroundCss);
  const rgb = hexToRgb(bg);
  if (!rgb) return false;
  return relativeLuminance(rgb) > 0.55;
}

/** Pick the best canvas logo variant for the active background. */
export function resolveCanvasLogoVariant(
  kit: BrandKitPersisted,
  backgroundCss: string,
): BrandLogoVariant {
  const prefersDarkLogo = backgroundPrefersDarkLogo(backgroundCss);
  const preferred: BrandLogoVariant = prefersDarkLogo ? "onLight" : "onDark";
  if (getLogoRecord(kit, preferred)) return preferred;
  if (getLogoRecord(kit, "primary")) return "primary";
  if (getLogoRecord(kit, prefersDarkLogo ? "onDark" : "onLight")) {
    return prefersDarkLogo ? "onDark" : "onLight";
  }
  for (const variant of BRAND_LOGO_VARIANTS) {
    if (getLogoRecord(kit, variant)) return variant;
  }
  return "primary";
}

export function resolveCanvasLogo(
  kit: BrandKitPersisted,
  backgroundCss: string,
): ResolvedCanvasLogo | null {
  const variant = resolveCanvasLogoVariant(kit, backgroundCss);
  const record = getLogoRecord(kit, variant);
  if (!record) return null;
  return { variant, record };
}

export function getMonogramMarkup(kit: BrandKitPersisted): string | null {
  return (
    getLogoRecord(kit, "monogram")?.svgMarkup ??
    getLogoRecord(kit, "primary")?.svgMarkup ??
    null
  );
}

export function getKitCompleteness(kit: BrandKitPersisted): {
  ready: boolean;
  missing: BrandLogoVariant[];
} {
  const missing = BRAND_LOGO_VARIANTS.filter(
    (variant) => !getLogoRecord(kit, variant),
  );
  return {
    ready: missing.length === 0,
    missing,
  };
}

export function logoVariantColorMode(
  variant: BrandLogoVariant,
  record: BrandLogoRecord,
): "light" | "dark" | "inherit" {
  if (record.usesExplicitColors) return "inherit";
  if (variant === "onLight") return "dark";
  if (variant === "onDark") return "light";
  return "inherit";
}

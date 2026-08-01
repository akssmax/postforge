/** CTA button library ids — kept separate so server `library/index` never imports client-safe `ctaButtons`. */

export const CTA_BUTTON_LIBRARY_IDS = [
  "cta-button-primary",
  "cta-button-outline",
  "cta-pill-pair",
] as const;

export type CtaButtonLibraryId = (typeof CTA_BUTTON_LIBRARY_IDS)[number];

export function isCtaButtonLibraryId(id?: string | null): boolean {
  return Boolean(
    id && CTA_BUTTON_LIBRARY_IDS.includes(id as CtaButtonLibraryId),
  );
}

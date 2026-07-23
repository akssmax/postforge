import { defaultKit } from "@/lib/brand/storage";
import { normalizeBrandKit } from "@/lib/brand/logoVariants";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";
import {
  DEFAULT_POST_LAYOUT_SPACING,
} from "@/lib/social-tool/layoutSpacing";
import {
  DEFAULT_POST_LAYOUT_ID,
} from "@/lib/social-tool/postLayouts";
import { defaultFeaturedBlock } from "@/lib/social-tool/featuredBlock";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import { DEFAULT_PATTERN_REF } from "@/lib/social-tool/patterns/types";
import { migratePatternRef } from "@/lib/social-tool/patterns/migratePatternRef";
import type { PostCopy } from "@/lib/social-tool/presets";
import { normalizeProductPage } from "@/lib/social-tool/presets";
import type {
  DesignDocument,
  DesignSessionPersisted,
} from "@/lib/design/types";
import { migrateDocumentV1ToV2 } from "@/lib/social-tool/layoutAdapter";

export const EMPTY_POST_COPY: PostCopy = {
  heading: "",
  subheading: "",
  extraFields: [],
};

export function designSessionStorageKey(designId: string): string {
  return `postforge:design:${designId}`;
}

export function scopedBlobKey(
  designId: string,
  kind: "logo" | "featured",
  recordId: string,
): string {
  return `${designId}:${kind}:${recordId}`;
}

export function createBlankDocument(): DesignDocument {
  const base = migrateDocumentV1ToV2({
    version: 1,
    templateId: "product-shot",
    platformId: "linkedin-square",
    theme: "dark",
    layoutId: DEFAULT_POST_LAYOUT_ID,
    layoutSpacing: { ...DEFAULT_POST_LAYOUT_SPACING },
    copy: { ...EMPTY_POST_COPY, extraFields: [] },
    pattern: DEFAULT_PATTERN_REF,
    patternOpacity: 0.28,
    patternScale: 1,
    patternAnimated: false,
    showPattern: false,
    showBackground: true,
    typeScale: 1,
    logoScale: 1,
    logoAlign: "left",
    logoPlacement: "top",
    showBrand: true,
    showContent: false,
    showFeaturedImage: false,
    textAlign: "center",
    headingFont: "sans",
    subFont: "sans",
    featuredTransform: { ...DEFAULT_FEATURED_TRANSFORM },
    logoBackdrop: false,
    logoInvert: false,
    textContrastBoost: false,
    onboarding: {
      phase: "needsLogo",
      briefSkipped: false,
    },
  });
  return base;
}

export function createBlankSession(designId: string): DesignSessionPersisted {
  return {
    designId,
    updatedAt: Date.now(),
    brand: defaultKit(),
    featured: defaultFeaturedBlock(),
    document: createBlankDocument(),
  };
}

function normalizeDocument(
  raw: Partial<DesignDocument> | undefined,
  featured?: FeaturedBlockPersisted,
): DesignDocument {
  const blank = createBlankDocument();
  if (!raw) return blank;
  const merged: DesignDocument = {
    ...blank,
    ...raw,
    version: raw.version === 2 ? 2 : 1,
    copy: {
      ...EMPTY_POST_COPY,
      ...raw.copy,
      extraFields: raw.copy?.extraFields ?? [],
    },
    layoutSpacing: {
      ...DEFAULT_POST_LAYOUT_SPACING,
      ...raw.layoutSpacing,
    },
    featuredTransform: {
      ...DEFAULT_FEATURED_TRANSFORM,
      ...raw.featuredTransform,
    },
    onboarding: {
      phase: raw.onboarding?.phase ?? blank.onboarding.phase,
      briefSkipped: raw.onboarding?.briefSkipped ?? false,
    },
    pattern: migratePatternRef(
      typeof raw.pattern === "string" ? raw.pattern : undefined,
    ),
  };
  return migrateDocumentV1ToV2(merged, featured);
}

export function loadDesignSession(designId: string): DesignSessionPersisted {
  if (typeof window === "undefined") {
    return createBlankSession(designId);
  }
  try {
    const raw = localStorage.getItem(designSessionStorageKey(designId));
    if (!raw) return createBlankSession(designId);
    const parsed = JSON.parse(raw) as DesignSessionPersisted;
    return {
      designId,
      updatedAt: parsed.updatedAt ?? Date.now(),
      brand: normalizeBrandKit(parsed.brand),
      featured: {
        mode: parsed.featured?.mode === "image" ? "image" : "genui",
        productPage: normalizeProductPage(parsed.featured?.productPage),
        image: parsed.featured?.image ?? null,
        slots: parsed.featured?.slots,
      },
      document: normalizeDocument(parsed.document, {
        mode: parsed.featured?.mode === "image" ? "image" : "genui",
        productPage: normalizeProductPage(parsed.featured?.productPage),
        image: parsed.featured?.image ?? null,
        slots: parsed.featured?.slots,
      }),
    };
  } catch {
    return createBlankSession(designId);
  }
}

export function saveDesignSession(session: DesignSessionPersisted): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    designSessionStorageKey(session.designId),
    JSON.stringify({ ...session, updatedAt: Date.now() }),
  );
}

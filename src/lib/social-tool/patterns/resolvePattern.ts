import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import { getLibraryPattern } from "@/lib/social-tool/patterns/library";
import { migratePatternRef } from "@/lib/social-tool/patterns/migratePatternRef";
import {
  getCustomPattern,
  listCustomPatterns,
} from "@/lib/social-tool/patterns/patternStorage";
import {
  BRAND_PATTERN_OPTIONS,
  LEGACY_PATTERN_REFS,
  type BrandPatternId,
  type LegacyPatternId,
  type PatternRef,
  type ResolvedPattern,
} from "@/lib/social-tool/patterns/types";

export function parsePatternRef(ref: PatternRef): {
  namespace: string;
  id: string;
} {
  const idx = ref.indexOf(":");
  if (idx === -1) return { namespace: "legacy", id: ref };
  return {
    namespace: ref.slice(0, idx),
    id: ref.slice(idx + 1),
  };
}

export function legacyPatternRef(id: LegacyPatternId): PatternRef {
  return LEGACY_PATTERN_REFS[id];
}

export function brandPatternRef(id: BrandPatternId): PatternRef {
  return `brand:${id}`;
}

export function customPatternRef(id: string): PatternRef {
  return id.includes(":") ? (`custom:${id}` as PatternRef) : (`custom:${id}` as PatternRef);
}

export function resolvePattern(
  ref: PatternRef | string | undefined | null,
  designId?: string,
): ResolvedPattern {
  const migrated = migratePatternRef(ref);
  const { namespace, id } = parsePatternRef(migrated);

  if (namespace === "legacy") {
    const legacyId = (id in LEGACY_PATTERN_REFS ? id : "monogram") as LegacyPatternId;
    if (legacyId === "none") {
      return { kind: "none", ref: LEGACY_PATTERN_REFS.none };
    }
    return {
      kind: "legacy",
      ref: LEGACY_PATTERN_REFS[legacyId],
      legacyId,
    };
  }

  if (namespace === "library") {
    const def = getLibraryPattern(id);
    if (def) {
      return { kind: "library", ref: migrated, def };
    }
    return {
      kind: "legacy",
      ref: LEGACY_PATTERN_REFS.monogram,
      legacyId: "monogram",
    };
  }

  if (namespace === "brand") {
    const option = BRAND_PATTERN_OPTIONS.find((o) => o.id === id);
    return {
      kind: "brand",
      ref: migrated,
      brandId: (option?.id ?? "tile-grid") as BrandPatternId,
      label: option?.label ?? "Brand pattern",
    };
  }

  if (namespace === "custom") {
    const record = getCustomPattern(id, designId);
    if (record) {
      return { kind: "custom", ref: migrated, record };
    }
  }

  return {
    kind: "legacy",
    ref: LEGACY_PATTERN_REFS.monogram,
    legacyId: "monogram",
  };
}

export function listLegacyPatternOptions(): {
  ref: PatternRef;
  label: string;
}[] {
  return [
    { ref: LEGACY_PATTERN_REFS.monogram, label: "Monogram" },
    { ref: LEGACY_PATTERN_REFS["monogram-soft"], label: "Monogram soft" },
    { ref: LEGACY_PATTERN_REFS.footer, label: "Footer" },
    { ref: LEGACY_PATTERN_REFS.outline, label: "Outline mark" },
    { ref: LEGACY_PATTERN_REFS.none, label: "None" },
  ];
}

export { listCustomPatterns, migratePatternRef };

import {
  DEFAULT_PATTERN_REF,
  LEGACY_PATTERN_REFS,
  type LegacyPatternId,
  type PatternRef,
} from "@/lib/social-tool/patterns/types";

const LEGACY_IDS = new Set<string>([
  "monogram",
  "monogram-soft",
  "footer",
  "none",
]);

const DEPRECATED_OUTLINE_REFS = new Set(["outline", "legacy:outline"]);

/** Migrate old PatternId strings or bare ids to namespaced PatternRef */
export function migratePatternRef(raw: string | undefined | null): PatternRef {
  if (!raw) return DEFAULT_PATTERN_REF;
  if (DEPRECATED_OUTLINE_REFS.has(raw)) {
    return LEGACY_PATTERN_REFS.monogram;
  }
  if (raw.includes(":")) return raw as PatternRef;
  if (LEGACY_IDS.has(raw)) {
    return LEGACY_PATTERN_REFS[raw as LegacyPatternId];
  }
  return DEFAULT_PATTERN_REF;
}

export function isPatternNone(ref: PatternRef): boolean {
  return ref === LEGACY_PATTERN_REFS.none;
}

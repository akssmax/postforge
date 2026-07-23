import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type { PostLayout } from "@/lib/social-tool/postLayouts";

export type VisualPolicy = {
  showPattern: boolean;
  showBackground: boolean;
  patternOpacity?: number;
  patternScale?: number;
  patternAnimated?: boolean;
  patternRef?: PatternRef;
  backgroundPresetId?: string;
  reason: string;
};

function normalizeBrief(brief: string): string {
  return brief.toLowerCase().replace(/\s+/g, " ").trim();
}

const VISUAL_LAYOUTS = new Set([
  "visual-first",
  "product-focus",
  "balanced-split",
]);

const COPY_HEAVY_LAYOUTS = new Set([
  "copy-statement",
  "professional-left",
  "centered-announcement",
]);

export function resolvePatternForLayout(
  layout: PostLayout,
  rulesProfile: DesignRulesProfile | undefined,
  brief: string,
): { showPattern: boolean; patternRef: PatternRef; patternOpacity: number } {
  const lower = normalizeBrief(brief);
  const meta = getLayoutRetrievalMeta(layout);
  const policy = rulesProfile?.patternPolicy ?? "layout_based";

  if (policy === "never") {
    return { showPattern: false, patternRef: legacyPatternRef("none"), patternOpacity: 0.28 };
  }

  if (lower.includes("minimal") || lower.includes("clean b2b") || lower.includes("no pattern")) {
    return { showPattern: false, patternRef: legacyPatternRef("none"), patternOpacity: 0.28 };
  }

  if (policy === "always") {
    return {
      showPattern: true,
      patternRef: libraryPatternRef("grid"),
      patternOpacity: 0.28,
    };
  }

  if (VISUAL_LAYOUTS.has(layout.id) || meta.densityClass === "visualFirst") {
    const patternRef =
      layout.id === "product-focus" || lower.includes("texture")
        ? libraryPatternRef("topography")
        : libraryPatternRef("grid");
    return {
      showPattern: true,
      patternRef,
      patternOpacity: layout.id === "product-focus" ? 0.18 : 0.28,
    };
  }

  if (COPY_HEAVY_LAYOUTS.has(layout.id) || meta.densityClass === "copyHeavy") {
    if (layout.id === "centered-announcement" || layout.tags.includes("brand")) {
      return {
        showPattern: true,
        patternRef: legacyPatternRef("monogram-soft"),
        patternOpacity: 0.22,
      };
    }
    return { showPattern: false, patternRef: legacyPatternRef("none"), patternOpacity: 0.28 };
  }

  return {
    showPattern: true,
    patternRef: libraryPatternRef("grid"),
    patternOpacity: 0.28,
  };
}

export function pickBackgroundPreset(input: {
  intent: CampaignIntent;
  rulesProfile?: DesignRulesProfile;
  catalog: { id: string; label?: string }[];
  recentPresetIds?: string[];
  brief?: string;
}): string | undefined {
  if (!input.catalog.length) return undefined;
  if (input.rulesProfile?.backgroundPolicy !== "catalog_pick") {
    return input.catalog[0]?.id;
  }

  const recent = new Set(input.recentPresetIds ?? []);
  const lower = normalizeBrief(input.brief ?? "");
  const scored = input.catalog.map((preset) => {
    let score = Math.random() * 0.5;
    if (recent.has(preset.id)) score -= 3;
    const idLower = preset.id.toLowerCase();
    if (input.intent.tone === "minimal" && idLower.includes("solid")) score += 1;
    if (input.intent.tone === "bold" && idLower.includes("gradient")) score += 1;
    if (input.intent.campaignType === "product_launch" && idLower.includes("hero")) score += 1;
    if (lower.includes("dark") && idLower.includes("dark")) score += 1;
    if (lower.includes("light") && idLower.includes("light")) score += 1;
    return { preset, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.preset.id ?? input.catalog[0]?.id;
}

export function applyVisualPolicy(
  intent: CampaignIntent,
  layout: PostLayout,
  brief: string,
  rulesProfile?: DesignRulesProfile,
  backgroundCatalog?: { id: string; label?: string }[],
  recentPresetIds?: string[],
): VisualPolicy {
  const pattern = resolvePatternForLayout(layout, rulesProfile, brief);
  const backgroundPresetId =
    backgroundCatalog && backgroundCatalog.length > 0
      ? pickBackgroundPreset({
          intent,
          rulesProfile,
          catalog: backgroundCatalog,
          recentPresetIds,
          brief,
        })
      : undefined;

  const reason = pattern.showPattern
    ? `Layout-based pattern (${pattern.patternRef})`
    : "Copy-heavy or minimal layout — pattern off";

  return {
    showPattern: pattern.showPattern,
    showBackground: true,
    patternOpacity: pattern.patternOpacity,
    patternScale: 1,
    patternAnimated: false,
    patternRef: pattern.patternRef,
    backgroundPresetId,
    reason,
  };
}

export function resolvePatternRef(
  layout: PostLayout,
  brief: string,
  visual: VisualPolicy,
  rulesProfile?: DesignRulesProfile,
): PatternRef {
  if (visual.patternRef) return visual.patternRef;
  return resolvePatternForLayout(layout, rulesProfile, brief).patternRef;
}

import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import {
  intentToCampaignPlan,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { getDesignSystem } from "@/lib/design-config/registry";
import { resolveVisualStrategy } from "@/lib/social-tool/engine/visual/resolveVisualStrategy";
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type { PostLayout } from "@/lib/social-tool/postLayouts";
import { resolveDesignRulesForPlan } from "@/lib/llm/rules";

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

function asPlan(intent: CampaignIntent | CampaignPlan): CampaignPlan {
  if ("campaign" in intent && typeof intent.campaign === "object") {
    return intent as CampaignPlan;
  }
  return intentToCampaignPlan(intent as CampaignIntent);
}

function systemForPlan(plan: CampaignPlan) {
  if (plan.campaign.type === "promotion" || plan.campaign.type === "advertisement") {
    return getDesignSystem("offer");
  }
  if (
    plan.campaign.type === "product_launch" ||
    plan.campaign.type === "feature_release" ||
    plan.campaign.type === "case_study"
  ) {
    return getDesignSystem("enterprise_saas");
  }
  return getDesignSystem("default");
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
  intent: CampaignIntent | CampaignPlan;
  rulesProfile?: DesignRulesProfile;
  catalog: { id: string; label?: string }[];
  recentPresetIds?: string[];
  brief?: string;
}): string | undefined {
  if (!input.catalog.length) return undefined;
  const plan = asPlan(input.intent);
  const rules =
    input.rulesProfile ?? resolveDesignRulesForPlan(plan, input.brief ?? "");
  return resolveVisualStrategy({
    plan,
    layout: { id: "classic-hero" } as PostLayout,
    system: systemForPlan(plan),
    rulesProfile: rules,
    brief: input.brief ?? "",
    backgroundCatalog: input.catalog,
    recentBackgroundPresetIds: input.recentPresetIds,
  }).backgroundPresetId;
}

/** @deprecated Prefer resolveVisualStrategy — kept for legacy callers. */
export function applyVisualPolicy(
  intent: CampaignIntent | CampaignPlan,
  layout: PostLayout,
  brief: string,
  rulesProfile?: DesignRulesProfile,
  backgroundCatalog?: { id: string; label?: string }[],
  recentPresetIds?: string[],
): VisualPolicy {
  const plan = asPlan(intent);
  const rules = rulesProfile ?? resolveDesignRulesForPlan(plan, brief);
  return resolveVisualStrategy({
    plan,
    layout,
    system: systemForPlan(plan),
    rulesProfile: rules,
    brief,
    backgroundCatalog,
    recentBackgroundPresetIds: recentPresetIds,
  });
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

import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { DesignSystemConfig } from "@/lib/design-config/registry";
import { getVisualsStrategy } from "@/lib/design-config/registry";
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type { PostLayout } from "@/lib/social-tool/postLayouts";

export type PatternStrategyResult = {
  showPattern: boolean;
  patternRef: PatternRef;
  patternOpacity: number;
  reason: string;
};

function normalizeBrief(brief: string): string {
  return brief.toLowerCase().replace(/\s+/g, " ").trim();
}

const FAMILY_TO_REF: Record<string, () => PatternRef> = {
  grid: () => libraryPatternRef("grid"),
  dots: () => libraryPatternRef("dots-grid"),
  topography: () => libraryPatternRef("topography"),
  blob: () => libraryPatternRef("topography"),
  mesh: () => libraryPatternRef("topography"),
  monogram: () => legacyPatternRef("monogram-soft"),
  "monogram-soft": () => legacyPatternRef("monogram-soft"),
  none: () => legacyPatternRef("none"),
};

export function resolvePatternStrategy(input: {
  plan: CampaignPlan;
  layout: PostLayout;
  rulesProfile: DesignRulesProfile;
  system: DesignSystemConfig;
  brief: string;
}): PatternStrategyResult {
  const lower = normalizeBrief(input.brief);
  const meta = getLayoutRetrievalMeta(input.layout);
  const policy = input.rulesProfile.patternPolicy;
  const table = getVisualsStrategy().pattern;
  const familyHint =
    table[input.plan.campaign.type] ??
    table[input.system.id] ??
    "grid";

  if (policy === "never" || lower.includes("no pattern") || lower.includes("minimal")) {
    return {
      showPattern: false,
      patternRef: legacyPatternRef("none"),
      patternOpacity: 0.28,
      reason: "Pattern disabled by policy or brief",
    };
  }

  const allowed = input.system.patterns;
  const pickFamily = allowed.includes(familyHint)
    ? familyHint
    : allowed[0] ?? "grid";

  if (policy === "always") {
    const patternRef = (FAMILY_TO_REF[pickFamily] ?? FAMILY_TO_REF.grid)();
    return {
      showPattern: true,
      patternRef,
      patternOpacity: 0.28,
      reason: `Always-on pattern (${pickFamily})`,
    };
  }

  if (meta.densityClass === "copyHeavy") {
    if (input.layout.id === "centered-announcement" || input.layout.tags.includes("brand")) {
      return {
        showPattern: true,
        patternRef: legacyPatternRef("monogram-soft"),
        patternOpacity: 0.22,
        reason: "Soft monogram for copy-heavy brand layout",
      };
    }
    return {
      showPattern: false,
      patternRef: legacyPatternRef("none"),
      patternOpacity: 0.28,
      reason: "No pattern for copy-heavy layout",
    };
  }

  const patternRef = (FAMILY_TO_REF[pickFamily] ?? FAMILY_TO_REF.grid)();
  return {
    showPattern: true,
    patternRef,
    patternOpacity: input.layout.id === "product-focus" ? 0.18 : 0.28,
    reason: `Pattern ${pickFamily} for ${input.plan.campaign.type}`,
  };
}

import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";
import { retrieveLayouts } from "@/lib/social-tool/engine/layoutRetriever";
import { resolveDesignRulesForPlan } from "@/lib/llm/rules";
import { getLayoutRetrievalMeta } from "@/lib/social-tool/engine/layoutRetrievalMeta";
import { retrieveBundle } from "@/lib/social-tool/visualBlocks/engine/bundleRetriever";
import { composeFeaturedSemantic } from "@/lib/social-tool/visualBlocks/engine/featuredComposer";
import type { PlatformId } from "@/lib/social-tool/presets";

export type GoldenBriefExpectation = {
  id: string;
  brief: string;
  platformId: PlatformId;
  campaignType: string | string[];
  pattern: string | string[];
  recipeFamily?: string[];
  densityClass?: Array<"visualFirst" | "balanced" | "copyHeavy">;
  designSystemId?: string;
  /** Expected named visual bundle (optional). */
  visualBundle?: string | string[];
  /** Expected primary visual family (optional). */
  visualFamily?: string | string[];
};

/** Offline golden briefs for campaign-first stability checks. */
export const GOLDEN_BRIEFS: GoldenBriefExpectation[] = [
  {
    id: "saas-replacement",
    brief:
      "Create a LinkedIn ad announcing our AI-native CRM replacing Salesforce. Book a demo.",
    platformId: "linkedin-square",
    campaignType: "advertisement",
    pattern: ["comparison", "offer"],
    recipeFamily: ["comparison_switch", "offer_hero", "problem_solution_flow"],
    densityClass: ["visualFirst", "balanced"],
    designSystemId: "offer",
    visualBundle: ["growth-proof", "feature-launch", "pricing-offer"],
    visualFamily: ["comparison", "product", "metric", "pricing"],
  },
  {
    id: "product-launch",
    brief: "Product launch post for our new analytics dashboard with product screenshots.",
    platformId: "linkedin-square",
    campaignType: "product_launch",
    pattern: "problem_solution",
    recipeFamily: ["problem_solution_flow", "comparison_switch", "offer_hero"],
    densityClass: ["visualFirst", "balanced"],
    designSystemId: "enterprise_saas",
    visualBundle: ["feature-launch", "process-explain", "growth-proof"],
    visualFamily: ["product", "benefits", "process", "metric"],
  },
  {
    id: "promotion-offer",
    brief: "Summer promo: 30% off annual plans this week only. Strong CTA.",
    platformId: "instagram-square",
    campaignType: "promotion",
    pattern: "offer",
    recipeFamily: ["offer_hero", "discount_focus"],
    densityClass: ["visualFirst", "balanced", "copyHeavy"],
    designSystemId: "offer",
    visualBundle: ["pricing-offer", "growth-proof"],
    visualFamily: ["pricing", "metric"],
  },
  {
    id: "announcement",
    brief: "Company announcement: we opened a new office in Austin.",
    platformId: "linkedin-square",
    campaignType: "announcement",
    pattern: "announcement_hero",
    recipeFamily: ["announcement_center", "announcement_hero_layout"],
    designSystemId: "default",
  },
  {
    id: "thought-leadership",
    brief: "Thought leadership insight on why B2B buyers distrust generic AI claims.",
    platformId: "linkedin-square",
    campaignType: "thought_leadership",
    pattern: "narrative",
    recipeFamily: ["narrative_statement"],
    densityClass: ["copyHeavy", "balanced"],
    designSystemId: "default",
  },
  {
    id: "webinar",
    brief: "Register for our webinar on AI sales workflows next Thursday.",
    platformId: "linkedin-square",
    campaignType: "webinar",
    pattern: "announcement_hero",
    recipeFamily: ["event_footer_recipe", "announcement_center"],
    designSystemId: "default",
  },
  {
    id: "case-study",
    brief: "Case study: Acme Corp cut churn 40%. Include customer quote and metric.",
    platformId: "linkedin-square",
    campaignType: "case_study",
    pattern: ["social_proof", "statistic"],
    recipeFamily: ["social_proof_strip", "statistic_hero"],
    designSystemId: "enterprise_saas",
  },
  {
    id: "hiring",
    brief: "We're hiring senior product designers. Apply now.",
    platformId: "linkedin-square",
    campaignType: "hiring",
    pattern: "announcement_hero",
    recipeFamily: ["announcement_center", "announcement_hero_layout"],
    designSystemId: "default",
  },
  {
    id: "feature-release",
    brief: "New feature release: automated pipeline scoring is live. See the UI.",
    platformId: "linkedin-square",
    campaignType: "feature_release",
    pattern: "problem_solution",
    recipeFamily: ["problem_solution_flow", "offer_hero"],
    designSystemId: "enterprise_saas",
  },
  {
    id: "statistic",
    brief: "95% of teams ship faster with Postforge. Share the metric on LinkedIn.",
    platformId: "linkedin-square",
    campaignType: ["thought_leadership", "announcement"],
    pattern: "statistic",
    recipeFamily: ["statistic_hero"],
    densityClass: ["copyHeavy", "balanced", "visualFirst"],
  },
];

export type GoldenBriefResult = {
  id: string;
  ok: boolean;
  failures: string[];
  actual: {
    campaignType: string;
    pattern: string;
    recipeId: string;
    designSystemId: string;
    layoutId: string;
    densityClass: string;
    visualBundle?: string;
    visualFamily?: string;
  };
};

function matchesExpected(actual: string, expected: string | string[]): boolean {
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

export function runGoldenBrief(expectation: GoldenBriefExpectation): GoldenBriefResult {
  const plan = campaignPlanFromBrief(expectation.brief, expectation.platformId);
  const rules = resolveDesignRulesForPlan(plan, expectation.brief);
  const system = retrieveDesignSystem(plan);
  const { recipe, pattern } = resolveRecipe(plan, system);
  const candidates = retrieveLayouts(
    plan,
    expectation.platformId,
    undefined,
    6,
    rules,
    expectation.brief,
    recipe,
    system,
  );
  const layout = candidates[0]?.layout;
  const meta = layout ? getLayoutRetrievalMeta(layout) : null;

  const bundle = retrieveBundle(
    {
      campaignType: plan.campaign.type,
      recipeId: recipe.id,
      patternId: pattern.id,
      designSystemId: system.id,
      platformId: expectation.platformId,
    },
    recipe,
  );

  const composition = composeFeaturedSemantic({
    ctx: {
      campaignType: plan.campaign.type,
      recipeId: recipe.id,
      patternId: pattern.id,
      designSystemId: system.id,
      contentDensity: plan.communication.contentDensity,
      readingPattern: plan.communication.readingPattern,
      colorMood: plan.visual.colorMood,
      brandTone: plan.brand.tone,
      featuredKind: plan.visual.featuredKind,
      proof: plan.visual.proof,
      platformId: expectation.platformId,
    },
    generateInput: {
      headline: expectation.brief.slice(0, 60),
      brief: expectation.brief,
      preferredKind: plan.visual.featuredKind,
      semantic: {
        campaignType: plan.campaign.type,
        recipeId: recipe.id,
        patternId: pattern.id,
      },
    },
    recipe,
  });

  const actual = {
    campaignType: plan.campaign.type,
    pattern: plan.communication.pattern,
    recipeId: recipe.id,
    designSystemId: system.id,
    layoutId: layout?.id ?? "none",
    densityClass: meta?.densityClass ?? "none",
    visualBundle: composition?.bundleId ?? bundle?.id,
    visualFamily: composition?.parts[0]?.familyId,
  };

  const failures: string[] = [];
  if (!matchesExpected(actual.campaignType, expectation.campaignType)) {
    failures.push(
      `campaignType: expected ${JSON.stringify(expectation.campaignType)}, got ${actual.campaignType}`,
    );
  }
  if (!matchesExpected(actual.pattern, expectation.pattern)) {
    failures.push(
      `pattern: expected ${JSON.stringify(expectation.pattern)}, got ${actual.pattern}`,
    );
  }
  if (
    expectation.recipeFamily &&
    !expectation.recipeFamily.includes(actual.recipeId)
  ) {
    failures.push(
      `recipeId: expected one of [${expectation.recipeFamily.join(", ")}], got ${actual.recipeId}`,
    );
  }
  if (
    expectation.designSystemId &&
    actual.designSystemId !== expectation.designSystemId
  ) {
    failures.push(
      `designSystemId: expected ${expectation.designSystemId}, got ${actual.designSystemId}`,
    );
  }
  if (
    expectation.densityClass &&
    meta &&
    !expectation.densityClass.includes(meta.densityClass)
  ) {
    failures.push(
      `densityClass: expected one of [${expectation.densityClass.join(", ")}], got ${meta.densityClass}`,
    );
  }
  if (
    expectation.visualBundle &&
    actual.visualBundle &&
    !matchesExpected(actual.visualBundle, expectation.visualBundle)
  ) {
    failures.push(
      `visualBundle: expected ${JSON.stringify(expectation.visualBundle)}, got ${actual.visualBundle}`,
    );
  }
  if (
    expectation.visualFamily &&
    actual.visualFamily &&
    !matchesExpected(actual.visualFamily, expectation.visualFamily)
  ) {
    failures.push(
      `visualFamily: expected ${JSON.stringify(expectation.visualFamily)}, got ${actual.visualFamily}`,
    );
  }

  return { id: expectation.id, ok: failures.length === 0, failures, actual };
}

export function runAllGoldenBriefs(): {
  passed: number;
  failed: number;
  results: GoldenBriefResult[];
} {
  const results = GOLDEN_BRIEFS.map(runGoldenBrief);
  return {
    passed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  };
}

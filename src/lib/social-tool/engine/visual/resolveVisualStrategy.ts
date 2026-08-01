import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { DesignSystemConfig, RecipeConfig } from "@/lib/design-config/registry";
import type { PostLayout } from "@/lib/social-tool/postLayouts";
import type { VisualPolicy } from "@/lib/social-tool/engine/visualPolicy";
import { resolveFeaturedStrategy } from "@/lib/social-tool/engine/visual/featuredStrategy";
import { resolvePatternStrategy } from "@/lib/social-tool/engine/visual/patternStrategy";
import { resolveDecorationStrategy } from "@/lib/social-tool/engine/visual/decorationStrategy";
import { resolveColorStrategy } from "@/lib/social-tool/engine/visual/colorStrategy";

export type VisualStrategyResult = VisualPolicy & {
  featured: ReturnType<typeof resolveFeaturedStrategy>;
  decoration: ReturnType<typeof resolveDecorationStrategy>;
  colorMood: CampaignPlan["visual"]["colorMood"];
};

/**
 * Facade: Featured + Pattern + Decoration + Color strategies → VisualPolicy-compatible result.
 */
export function resolveVisualStrategy(input: {
  plan: CampaignPlan;
  layout: PostLayout;
  system: DesignSystemConfig;
  rulesProfile: DesignRulesProfile;
  brief: string;
  recipe?: RecipeConfig;
  backgroundCatalog?: { id: string; label?: string }[];
  recentBackgroundPresetIds?: string[];
  artifact?: import("@/lib/design-config/schemas").ArtifactDefinition;
}): VisualStrategyResult {
  const featured = resolveFeaturedStrategy({
    plan: input.plan,
    rulesProfile: input.rulesProfile,
    recipe: input.recipe,
    artifact: input.artifact,
    layout: input.layout,
  });
  const pattern = resolvePatternStrategy({
    plan: input.plan,
    layout: input.layout,
    rulesProfile: input.rulesProfile,
    system: input.system,
    brief: input.brief,
  });
  const decoration = resolveDecorationStrategy({
    plan: input.plan,
    recipe: input.recipe,
  });
  const color = resolveColorStrategy({
    plan: input.plan,
    rulesProfile: input.rulesProfile,
    catalog: input.backgroundCatalog,
    recentPresetIds: input.recentBackgroundPresetIds,
  });

  return {
    showPattern: pattern.showPattern,
    showBackground: color.showBackground,
    patternOpacity: pattern.patternOpacity,
    patternScale: 1,
    patternAnimated: false,
    patternRef: pattern.patternRef,
    backgroundPresetId: color.backgroundPresetId,
    reason: [featured.reason, pattern.reason, decoration.reason, color.reason].join("; "),
    featured,
    decoration,
    colorMood: color.colorMood,
  };
}

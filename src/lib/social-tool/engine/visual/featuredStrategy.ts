import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { RecipeConfig } from "@/lib/design-config/registry";
import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import { getVisualsStrategy } from "@/lib/design-config/registry";
import type { FeaturedPolicy } from "@/lib/llm/rules/types";
import type { PostLayout } from "@/lib/social-tool/postLayouts";
import { layoutFeaturedZoneMode } from "@/lib/social-tool/postLayouts";

export type FeaturedStrategyResult = {
  featuredPolicy: FeaturedPolicy;
  featuredKind: "ui" | "illustration" | "3d" | "diagram";
  reason: string;
};

function artifactFeaturedPolicy(
  artifact: ArtifactDefinition,
  fallback: FeaturedPolicy,
): FeaturedPolicy {
  const primary = artifact.capabilities.primaryContent;
  const renderer = artifact.renderer;

  if (renderer === "print-doc" || primary === "text") {
    return "hidden";
  }
  if (primary === "diagram" || renderer === "diagram") {
    return fallback === "hidden" ? "hidden" : "library";
  }
  if (artifact.category === "events" || artifact.category === "personal") {
    return fallback === "genui" ? "library" : fallback;
  }
  return fallback;
}

function campaignHintToFeaturedKind(
  hint: string | undefined,
): "ui" | "illustration" | "3d" {
  if (hint === "illustration" || hint === "people" || hint === "product_photo") {
    return "illustration";
  }
  if (hint === "3d") return "3d";
  return "ui";
}

function artifactFeaturedKind(
  artifact: ArtifactDefinition,
  planKind: "ui" | "illustration" | "3d",
): "ui" | "illustration" | "3d" | "diagram" {
  if (
    artifact.capabilities.primaryContent === "diagram" ||
    artifact.renderer === "diagram"
  ) {
    return "diagram";
  }
  if (
    artifact.category === "events" ||
    artifact.category === "personal" ||
    artifact.category === "branding" ||
    artifact.category === "editorial"
  ) {
    return planKind === "ui" ? "illustration" : planKind;
  }
  return planKind;
}

export function resolveFeaturedStrategy(input: {
  plan: CampaignPlan;
  rulesProfile: DesignRulesProfile;
  recipe?: RecipeConfig;
  artifact?: ArtifactDefinition;
  layout?: PostLayout;
}): FeaturedStrategyResult {
  const table = getVisualsStrategy().featured;
  const campaignHint = table[input.plan.campaign.type];
  const planKind =
    input.plan.visual.featuredKind ?? campaignHintToFeaturedKind(campaignHint);

  let featuredPolicy = input.artifact
    ? artifactFeaturedPolicy(input.artifact, input.rulesProfile.featuredPolicy)
    : input.rulesProfile.featuredPolicy;
  const featuredKind = input.artifact
    ? artifactFeaturedKind(input.artifact, planKind)
    : planKind;

  const zoneMode = input.layout ? layoutFeaturedZoneMode(input.layout) : "hero";
  if (zoneMode === "corner" || zoneMode === "portrait-strip") {
    featuredPolicy = "image";
  } else if (input.layout?.featuredContentPolicy === "image") {
    featuredPolicy = "image";
  } else if (
    input.layout?.featuredContentPolicy === "library" &&
    featuredPolicy !== "hidden"
  ) {
    featuredPolicy = "library";
  }

  return {
    featuredPolicy,
    featuredKind,
    reason: input.artifact
      ? `Featured ${featuredKind} for ${input.artifact.label} (${featuredPolicy})`
      : zoneMode !== "hero"
        ? `Featured accent photo (${zoneMode}, ${featuredPolicy})`
        : input.layout?.featuredContentPolicy === "image"
          ? `Hero photo (${featuredPolicy})`
          : `Featured ${featuredKind} via ${featuredPolicy} (${campaignHint ?? input.plan.visual.focus})`,
  };
}

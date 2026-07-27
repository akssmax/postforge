import { artifactWantsLogoPlaceholder } from "@/lib/design-engine/artifactRules";
import { parseArtifactBrief } from "@/lib/design-engine/artifactBriefParser";
import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import { textSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";
import type { DynamicLayout } from "@/lib/social-tool/dynamicLayout";
import type { SlotDraft } from "@/lib/llm/schemas/slotDraft";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { generateFromBrief } from "@/lib/social-tool/briefGeneration";
import type { PlatformId, PostCopy } from "@/lib/social-tool/presets";
import { isDiagramArtifact } from "@/lib/design-engine/artifactReference";

function offlineCopyForArtifact(
  brief: string,
  platformId: PlatformId,
  artifact?: ArtifactDefinition,
): PostCopy {
  const parsed = artifact ? parseArtifactBrief(brief, artifact) : null;
  if (parsed) return parsed;
  return generateFromBrief(brief, platformId).copy;
}

export function writeSlotsOffline(input: {
  userMessage: string;
  platformId: PlatformId;
  dynamicLayout: DynamicLayout;
  rulesProfile?: DesignRulesProfile;
  artifact?: ArtifactDefinition;
}): SlotDraft {
  const offline = generateFromBrief(input.userMessage, input.platformId);
  const featuredPolicy = input.rulesProfile?.featuredPolicy ?? "library";
  const copy = offlineCopyForArtifact(input.userMessage, input.platformId, input.artifact);
  const wantsLogo = input.artifact
    ? artifactWantsLogoPlaceholder(input.artifact)
    : true;
  const isDiagram = input.artifact ? isDiagramArtifact(input.artifact.id) : false;
  const hideFeatured =
    featuredPolicy === "hidden" ||
    input.artifact?.renderer === "print-doc" ||
    input.artifact?.capabilities.primaryContent === "text";

  const textSlots = textSlotsFromCopy(copy, input.dynamicLayout);

  const effectiveFeatured = hideFeatured
    ? "hidden"
    : isDiagram
      ? "placeholder"
      : featuredPolicy;

  return {
    textSlots,
    featuredSlots: [
      effectiveFeatured === "library"
        ? {
            slotId: "featured-primary",
            mode: "composed" as const,
            visible: true,
          }
        : effectiveFeatured === "placeholder"
          ? {
              slotId: "featured-primary",
              mode: "placeholder" as const,
              visible: true,
            }
          : {
              slotId: "featured-primary",
              mode: "genui" as const,
              productPage: offline.productPage,
              visible: effectiveFeatured !== "hidden" && offline.showFeaturedImage,
            },
    ],
    showContent: offline.showContent,
    showBrand: wantsLogo,
    showFeaturedImage:
      effectiveFeatured === "hidden"
        ? false
        : effectiveFeatured === "placeholder" ||
            effectiveFeatured === "library"
          ? true
          : offline.showFeaturedImage,
  };
}

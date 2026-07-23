import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import { validateDesignPlan } from "@/lib/llm/services/layoutValidator";
import type { PlatformId } from "@/lib/social-tool/presets";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { textSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";

export function briefResultToDesignPlanInput(
  result: BriefGenerationResult,
  platformId: PlatformId,
) {
  const layout = catalogLayoutToDynamic(getPostLayout(result.layoutId));
  return {
    rationale: result.rationale,
    layoutRef: { source: "catalog" as const, id: result.layoutId },
    textSlots: textSlotsFromCopy(result.copy, layout),
    featuredSlots: [
      {
        slotId: "featured-primary",
        mode: "composed" as const,
        visible: result.showFeaturedImage,
      },
    ],
    showContent: result.showContent,
    showBrand: true,
    showFeaturedImage: result.showFeaturedImage,
    showPattern: result.showPattern,
    showBackground: result.showBackground,
    patternOpacity: result.patternOpacity,
    patternScale: result.patternScale,
    patternAnimated: result.patternAnimated,
  };
}

export function validatedPlanFromBriefResult(
  result: BriefGenerationResult,
  platformId: PlatformId,
): ValidatedDesignPlan | null {
  const validated = validateDesignPlan(
    briefResultToDesignPlanInput(result, platformId),
    platformId,
  );
  return validated.ok ? validated.plan : null;
}

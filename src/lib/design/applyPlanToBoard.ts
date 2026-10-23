import type { DesignSessionPersisted } from "@/lib/design/types";
import {
  applyDesignPlanToSession,
  type DesignPlanApplyOptions,
} from "@/lib/llm/services/applyDesignPlan";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import { applyFeaturedVisualBlockToSession } from "@/lib/social-tool/applyFeaturedVisualBlock";
import { inferFeaturedVisualKind, type FeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { VisualBlockRecord, VisualStylePack } from "@/lib/social-tool/visualBlocks/types";
import { stylePackFitsKind } from "@/lib/social-tool/visualBlocks/library/scoring";
import { visualBlockPickPayload, withLogoAwareShowBrand } from "@/lib/design/visualPickPayload";

function planBrief(plan: ValidatedDesignPlan): string {
  return [plan.copy.heading, plan.copy.subheading, plan.rationale].filter(Boolean).join(" ");
}

/** Whether a plan leaves a composed featured slot for the visuals library to fill. */
export function planNeedsFeaturedLibrary(
  plan: ValidatedDesignPlan,
  options?: DesignPlanApplyOptions,
): boolean {
  return !options?.stockPhoto && plan.featuredSlots.some((slot) => slot.visible && slot.mode === "composed");
}

/** The campaign plan's featured kind; regex inference over the copy is the fallback. */
export function planFeaturedVisualKind(
  plan: ValidatedDesignPlan,
  options: DesignPlanApplyOptions | undefined,
  fallbackArtifactCategory?: DesignPlanApplyOptions["artifactCategory"],
): FeaturedVisualKind {
  return options?.featuredVisualKind ?? inferFeaturedVisualKind(planBrief(plan), {
    artifactCategory: options?.artifactCategory ?? fallbackArtifactCategory,
  });
}

/**
 * Apply a validated plan to a board session (pure). The active-board hook adds
 * blob handling and the async featured pick on top of this.
 */
export function applyPlanToBoardSession(
  prev: DesignSessionPersisted,
  plan: ValidatedDesignPlan,
  options?: DesignPlanApplyOptions,
): { session: DesignSessionPersisted; featuredImageSrc?: string | null } {
  const needsFeaturedLibrary = planNeedsFeaturedLibrary(plan, options);
  const featuredVisualKind = planFeaturedVisualKind(plan, options, prev.document.artifactCategory);
  const applied = applyDesignPlanToSession(plan, prev.document, {
    ...options,
    currentBackgroundPresetId: prev.brand.activeBackgroundPresetId,
    designId: options?.designId ?? prev.designId,
    brandColors: options?.brandColors ?? prev.brand.colors,
    existingVisualBlocks: prev.featured.visualBlocks ?? [],
    brief: planBrief(plan),
  });
  const document = withLogoAwareShowBrand(
    { ...prev.document, ...applied.document, featuredVisualKind, visualSemantic: options?.visualSemantic },
    prev.brand,
  );
  return {
    featuredImageSrc: applied.featuredImageSrc,
    session: {
      ...prev,
      brand: applied.brand ? { ...prev.brand, ...applied.brand } : prev.brand,
      featured: {
        ...prev.featured,
        ...applied.featured,
        image: applied.featuredImageSrc ? null : prev.featured.image,
        visualBlocks:
          applied.visualBlocks ??
          (needsFeaturedLibrary ? [] : prev.featured.visualBlocks),
      },
      document,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Pick a library visual for a board that is not the live session. Excluded ids
 * keep sibling variants from showing the same asset.
 */
export async function pickFeaturedVisualForBoard(
  session: DesignSessionPersisted,
  plan: ValidatedDesignPlan,
  options: DesignPlanApplyOptions | undefined,
  excludeLibraryIds: string[] = [],
  stylePack?: VisualStylePack,
): Promise<{ session: DesignSessionPersisted; libraryId?: string }> {
  if (!planNeedsFeaturedLibrary(plan, options)) return { session };
  const kind = planFeaturedVisualKind(plan, options, session.document.artifactCategory);
  try {
    const response = await fetch("/api/visual-blocks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...visualBlockPickPayload(session, {
          headline: plan.copy.heading,
          subheading: plan.copy.subheading,
          theme: plan.rationale,
          brief: planBrief(plan),
          preferredKind: kind,
          visualSemantic: options?.visualSemantic,
          stylePack: stylePackFitsKind(stylePack, kind),
        }),
        pickFeatured: true,
        source: "library",
        ...(excludeLibraryIds.length ? { excludeLibraryIds } : {}),
      }),
    });
    if (!response.ok) return { session };
    const payload = (await response.json()) as { blocks: VisualBlockRecord[] };
    const block = payload.blocks[0];
    if (!block) return { session };
    return { session: applyFeaturedVisualBlockToSession(session, block, kind), libraryId: block.libraryId };
  } catch {
    return { session };
  }
}

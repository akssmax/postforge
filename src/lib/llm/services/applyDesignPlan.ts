import type { BrandKitPersisted } from "@/lib/brand/types";
import type { DesignDocument } from "@/lib/design/types";
import type { LayoutRef } from "@/lib/social-tool/dynamicLayout";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import {
  catalogLayoutIdFromRef,
  defaultProductPageForSlots,
} from "@/lib/social-tool/layoutAdapter";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";

export type DesignPlanApplyResult = {
  document: Partial<DesignDocument>;
  featured: Partial<FeaturedBlockPersisted>;
  brand?: Partial<BrandKitPersisted>;
};

export function applyDesignPlanToSession(
  plan: ValidatedDesignPlan,
  current: DesignDocument,
): DesignPlanApplyResult {
  const primaryFeatured =
    plan.featuredSlots.find((s) => s.visible) ?? plan.featuredSlots[0];
  const primaryTransform =
    primaryFeatured?.transform ?? plan.featuredTransform ?? DEFAULT_FEATURED_TRANSFORM;
  const featuredMode = primaryFeatured?.mode ?? "genui";
  const resolvedSlotMode =
    featuredMode === "composed"
      ? ("composed" as const)
      : featuredMode === "placeholder"
        ? ("placeholder" as const)
        : primaryFeatured?.mode ?? featuredMode;

  const layoutRef = plan.layoutRef as LayoutRef;

  const document: Partial<DesignDocument> = {
    version: 2,
    layoutRef,
    layoutId: catalogLayoutIdFromRef(layoutRef),
    textSlots: plan.textSlots,
    featuredSlots: plan.featuredSlots.map((slot) => ({
      ...slot,
      mode: resolvedSlotMode,
      transform: slot.transform ?? primaryTransform,
    })),
    copy: plan.copy,
    copyVariants: plan.copyVariants,
    copyVariantIndex: plan.copyVariantIndex ?? 0,
    logoPlacement: plan.logoPlacement,
    logoAlign: plan.logoAlign,
    textAlign: plan.textAlign,
    showContent: plan.showContent,
    showBrand: plan.showBrand,
    showFeaturedImage: plan.showFeaturedImage && plan.featuredSlots.some((s) => s.visible),
    showPattern: plan.showPattern,
    showBackground: plan.showBackground,
    pattern: plan.pattern,
    patternOpacity: plan.patternOpacity,
    patternScale: plan.patternScale,
    patternAnimated: plan.patternAnimated,
    typeScale: plan.typeScale,
    logoScale: plan.logoScale,
    featuredTransform: primaryTransform,
    onboarding: { phase: "ready", briefSkipped: false },
  };

  const featured: Partial<FeaturedBlockPersisted> = {
    mode: featuredMode,
    productPage:
      featuredMode === "genui"
        ? defaultProductPageForSlots(plan.featuredSlots)
        : "leads",
    slots: plan.featuredSlots.map((slot) => ({
      slotId: slot.slotId,
      mode: resolvedSlotMode,
      productPage: slot.productPage,
      transform: slot.transform ?? primaryTransform,
      visible: slot.visible,
    })),
  };

  const brand = plan.backgroundPresetId
    ? { activeBackgroundPresetId: plan.backgroundPresetId }
    : undefined;

  return { document, featured, brand };
}

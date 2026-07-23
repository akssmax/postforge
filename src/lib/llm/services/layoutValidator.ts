import type { DesignPlan } from "@/lib/llm/schemas/designPlan";
import { designPlanSchema } from "@/lib/llm/schemas/designPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { DynamicLayout, LayoutRef } from "@/lib/social-tool/dynamicLayout";
import { resolveLayoutRef } from "@/lib/social-tool/layoutAdapter";
import {
  dynamicLayoutAsPostLayout,
  registerGeneratedLayout,
  resolveLayoutRefForPlan,
} from "@/lib/social-tool/layoutRegistry";
import { resolveLayoutHierarchy } from "@/lib/social-tool/layoutHierarchy";
import { DEFAULT_POST_LAYOUT_SPACING } from "@/lib/social-tool/layoutSpacing";
import { getPlatform, type PlatformId } from "@/lib/social-tool/presets";
import { copyFromTextSlots } from "@/lib/social-tool/layoutAdapter";
import { getLayoutStatePatch } from "@/lib/social-tool/postLayouts";
import { resolvePatternRef } from "@/lib/social-tool/engine/visualPolicy";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";

export type ValidatedDesignPlan = Omit<DesignPlan, "layoutRef"> & {
  layoutRef: LayoutRef;
  copy: ReturnType<typeof copyFromTextSlots>;
  layout: DynamicLayout;
  logoPlacement: ReturnType<typeof getLayoutStatePatch>["logoPlacement"];
  logoAlign: ReturnType<typeof getLayoutStatePatch>["logoAlign"];
  textAlign: ReturnType<typeof getLayoutStatePatch>["textAlign"];
  typeScale: number;
  logoScale: number;
  featuredTransform: typeof DEFAULT_FEATURED_TRANSFORM;
  pattern: PatternRef;
  patternOpacity: number;
  patternScale: number;
  patternAnimated: boolean;
};

function clampRatio(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeGeneratedLayout(layout: DynamicLayout): DynamicLayout {
  return {
    ...layout,
    textZoneRatio: clampRatio(layout.textZoneRatio, 0.18, 0.58),
    textColumnRatio: layout.textColumnRatio
      ? clampRatio(layout.textColumnRatio, 0.32, 0.55)
      : undefined,
    slots: layout.slots.map((slot, index) => ({
      ...slot,
      order: slot.order ?? index,
    })),
  };
}

function pickPattern(
  input: DesignPlan,
  layoutKey: string,
  rulesProfile?: DesignRulesProfile,
): PatternRef {
  if (input.patternRef) {
    const ref = input.patternRef;
    if (ref.startsWith("library:") || ref.startsWith("legacy:")) {
      return ref as PatternRef;
    }
  }
  const layout = getPostLayout(layoutKey as never);
  return resolvePatternRef(layout, "", {
    showPattern: input.showPattern,
    showBackground: input.showBackground,
    reason: "",
  }, rulesProfile);
}

export function validateDesignPlan(
  raw: unknown,
  platformId: PlatformId,
  rulesProfile?: DesignRulesProfile,
): { ok: true; plan: ValidatedDesignPlan } | { ok: false; error: string } {
  const parsed = designPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.message };
  }

  const input = parsed.data;
  const layoutRef = resolveLayoutRefForPlan(input.layoutRef as LayoutRef);
  let layout =
    layoutRef.source === "generated"
      ? normalizeGeneratedLayout(registerGeneratedLayout(layoutRef.layout))
      : resolveLayoutRef(layoutRef);

  const textSlotIds = new Set(layout.slots.filter((s) => s.kind === "text").map((s) => s.id));
  for (const slot of input.textSlots) {
    if (!textSlotIds.has(slot.slotId)) {
      return { ok: false, error: `Unknown text slot: ${slot.slotId}` };
    }
  }

  const featuredSlotIds = new Set(
    layout.slots.filter((s) => s.kind === "featured").map((s) => s.id),
  );
  for (const slot of input.featuredSlots) {
    if (!featuredSlotIds.has(slot.slotId)) {
      return { ok: false, error: `Unknown featured slot: ${slot.slotId}` };
    }
  }

  const postLayout = dynamicLayoutAsPostLayout(layout);
  const copy = copyFromTextSlots(input.textSlots, layout);
  const platform = getPlatform(platformId);
  const showFeatured =
    input.showFeaturedImage && input.featuredSlots.some((s) => s.visible);
  const primaryFeatured = input.featuredSlots.find((s) => s.visible) ?? input.featuredSlots[0];
  const featuredMode = primaryFeatured?.mode ?? "genui";

  let hierarchy;
  try {
    hierarchy = resolveLayoutHierarchy({
      width: platform.width,
      height: platform.height,
      platformId,
      layout: postLayout,
      copy,
      spacing: DEFAULT_POST_LAYOUT_SPACING,
      showLogo: input.showBrand,
      showFeaturedImage: showFeatured,
      featuredMode: featuredMode === "placeholder" ? "placeholder" : featuredMode === "composed" ? "composed" : featuredMode,
      productPage:
        primaryFeatured?.mode === "genui"
          ? (primaryFeatured.productPage ?? "leads")
          : "leads",
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Hierarchy resolution failed",
    };
  }

  const patch = getLayoutStatePatch(postLayout);
  const layoutKey = layout.source === "catalog" ? layout.id : "classic-hero";
  const pattern = pickPattern(input, layoutKey, rulesProfile);

  const featuredSlots = input.featuredSlots.map((slot) => ({
    ...slot,
    transform: slot.transform ?? hierarchy.featuredTransform,
  }));

  return {
    ok: true,
    plan: {
      ...input,
      layoutRef,
      featuredSlots,
      copy,
      layout,
      logoPlacement: patch.logoPlacement,
      logoAlign: patch.logoAlign,
      textAlign: patch.textAlign,
      typeScale: hierarchy.typeScale,
      logoScale: hierarchy.logoScale,
      featuredTransform: hierarchy.featuredTransform,
      pattern,
      patternOpacity: input.patternOpacity ?? (input.showPattern ? 0.28 : 0.28),
      patternScale: input.patternScale ?? 1,
      patternAnimated: input.patternAnimated ?? false,
    },
  };
}

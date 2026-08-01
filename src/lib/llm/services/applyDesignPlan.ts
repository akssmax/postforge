import type { BrandColors, BrandKitPersisted } from "@/lib/brand/types";
import type { CanvasSpec, DesignDocument } from "@/lib/design/types";
import type { ArtifactCategoryId, RendererId } from "@/lib/design-config/schemas";
import type { StockPhotoResult } from "@/lib/llm/stages/stockPhotoResolver";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { LayoutRef } from "@/lib/social-tool/dynamicLayout";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import {
  catalogLayoutIdFromRef,
  defaultProductPageForSlots,
} from "@/lib/social-tool/layoutAdapter";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import { DEFAULT_FEATURED_TRANSFORM } from "@/lib/social-tool/featuredTransform";
import { iconTransformForPreset } from "@/lib/social-tool/icons/placement";
import { getIconCatalogEntry } from "@/lib/social-tool/icons/catalog";
import { createCanvasIconRecord } from "@/lib/social-tool/icons/instantiate";
import type { CanvasIconRecord } from "@/lib/social-tool/icons/types";
import { resolveCanvasShapes } from "@/lib/social-tool/shapes/placement";
import {
  attachCtaButtonsToTextSlots,
} from "@/lib/social-tool/visualBlocks/library/ctaButtons";
import { getPostLayout } from "@/lib/social-tool/postLayouts";

export type DesignPlanApplyResult = {
  document: Partial<DesignDocument>;
  featured: Partial<FeaturedBlockPersisted>;
  brand?: Partial<BrandKitPersisted>;
  featuredImageSrc?: string | null;
  visualBlocks?: import("@/lib/social-tool/visualBlocks/types").VisualBlockRecord[];
};

export type DesignPlanApplyOptions = {
  artifactId?: string;
  artifactCategory?: ArtifactCategoryId;
  canvasSpec?: CanvasSpec;
  rendererId?: RendererId;
  stockPhoto?: StockPhotoResult | null;
  platformId?: PlatformId;
  platformReason?: string;
  bundleId?: string;
  currentBackgroundPresetId?: string | null;
  /** Applied when the session has no uploaded brand kit. */
  assumedBrandColors?: BrandColors;
  decorationLevel?: "minimal" | "offer" | "mesh" | "brand";
  designId?: string;
  brandColors?: BrandColors;
  brief?: string;
  existingVisualBlocks?: import("@/lib/social-tool/visualBlocks/types").VisualBlockRecord[];
};

function canvasIconsFromPlan(
  plan: ValidatedDesignPlan,
  brandColors?: BrandColors,
): CanvasIconRecord[] | undefined {
  const specs = plan.canvasIcons;
  if (!specs?.length) return undefined;

  const accent =
    brandColors?.accent ?? optionsFallbackAccent(specs);

  const icons: CanvasIconRecord[] = [];
  for (const spec of specs) {
    const entry = getIconCatalogEntry(spec.iconName);
    if (!entry) continue;
    const icon = createCanvasIconRecord({
      iconName: spec.iconName,
      label: entry.label,
      category: entry.category,
      color: spec.color ?? accent,
      transform: spec.preset ? iconTransformForPreset(spec.preset) : undefined,
    });
    if (icon) icons.push(icon);
  }
  return icons.length > 0 ? icons : undefined;
}

function optionsFallbackAccent(
  specs: NonNullable<ValidatedDesignPlan["canvasIcons"]>,
): string {
  return specs.find((spec) => spec.color)?.color ?? "#7C9A92";
}

export function applyDesignPlanToSession(
  plan: ValidatedDesignPlan,
  current: DesignDocument,
  options?: DesignPlanApplyOptions,
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

  const stockPhoto = options?.stockPhoto;
  const featuredSlotsWithStock = plan.featuredSlots.map((slot, index) => {
    const base = {
      ...slot,
      mode: resolvedSlotMode,
      transform: slot.transform ?? primaryTransform,
    };
    if (stockPhoto && index === 0 && slot.visible) {
      return {
        ...base,
        mode: "image" as const,
        imageSource: "unsplash" as const,
        unsplash: {
          id: stockPhoto.id,
          url: stockPhoto.url,
          photographer: stockPhoto.photographer,
          attribution: stockPhoto.attribution,
        },
      };
    }
    return base;
  });

  const layoutId = catalogLayoutIdFromRef(layoutRef);
  const postLayout = getPostLayout(layoutId);
  const ctaAttached = attachCtaButtonsToTextSlots({
    textSlots: plan.textSlots,
    visualBlocks: options?.existingVisualBlocks ?? [],
    layout: postLayout,
    brandColors: options?.brandColors,
    brief: options?.brief,
    headline: plan.copy.heading,
    subheading: plan.copy.subheading,
  });

  const document: Partial<DesignDocument> = {
    version: 2,
    layoutRef,
    layoutId,
    textSlots: ctaAttached.textSlots,
    featuredSlots: featuredSlotsWithStock,
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
    artifactId: options?.artifactId ?? current.artifactId,
    artifactCategory: options?.artifactCategory ?? current.artifactCategory,
    canvasSpec: options?.canvasSpec ?? current.canvasSpec,
    rendererId: options?.rendererId ?? current.rendererId,
    platformId: options?.platformId ?? current.platformId,
    platformReason: options?.platformReason ?? current.platformReason,
    bundleId: options?.bundleId ?? current.bundleId,
    decorationLevel: options?.decorationLevel ?? current.decorationLevel,
    canvasShapes:
      options?.decorationLevel != null
        ? resolveCanvasShapes({
            decorationLevel: options.decorationLevel,
            layoutId: catalogLayoutIdFromRef(layoutRef),
            platformId: options?.platformId ?? current.platformId,
            spacing: current.layoutSpacing,
            brandColors: {
              primary:
                options?.brandColors?.primary ??
                options?.assumedBrandColors?.primary ??
                "#1E293B",
              accent:
                options?.brandColors?.accent ??
                options?.assumedBrandColors?.accent ??
                "#7C9A92",
            },
            designId: options?.designId ?? current.layoutId,
          })
        : current.canvasShapes,
    canvasIcons: canvasIconsFromPlan(plan, options?.brandColors) ?? current.canvasIcons,
  };

  const featuredModeWithStock =
    stockPhoto && plan.featuredSlots.some((s) => s.visible)
      ? ("image" as const)
      : featuredMode;

  const featured: Partial<FeaturedBlockPersisted> = {
    mode: featuredModeWithStock,
    productPage:
      featuredModeWithStock === "genui"
        ? defaultProductPageForSlots(plan.featuredSlots)
        : "leads",
    slots: featuredSlotsWithStock.map((slot) => ({
      slotId: slot.slotId,
      mode: stockPhoto && slot.visible ? ("image" as const) : resolvedSlotMode,
      productPage: slot.productPage,
      transform: slot.transform ?? primaryTransform,
      visible: slot.visible,
    })),
  };

  const brand =
    plan.showBackground || options?.assumedBrandColors
      ? {
          ...(options?.assumedBrandColors
            ? { colors: options.assumedBrandColors }
            : {}),
          activeBackgroundPresetId:
            plan.backgroundPresetId ??
            options?.currentBackgroundPresetId ??
            "default",
        }
      : undefined;

  return {
    document,
    featured,
    brand,
    featuredImageSrc: stockPhoto?.url ?? undefined,
    visualBlocks: ctaAttached.visualBlocks,
  };
}

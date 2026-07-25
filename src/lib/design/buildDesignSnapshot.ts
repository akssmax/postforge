import type { DesignSessionPersisted } from "@/lib/design/types";
import type { BackgroundPreset } from "@/lib/brand/types";
import {
  getPostLayout,
  layoutUsesSplit,
  POST_LAYOUTS,
} from "@/lib/social-tool/postLayouts";
import { resolveDocumentLayout } from "@/lib/social-tool/layoutRegistry";
import {
  catalogLayoutToDynamic,
  copyFromTextSlots,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import type { DesignSnapshot, DesignSnapshotInput } from "@/lib/llm/schemas/designSnapshot";
import { designSnapshotSchema } from "@/lib/llm/schemas/designSnapshot";
import { kitHasAnyLogo } from "@/lib/brand/logoVariants";
import { ensureFeaturedSlots } from "@/lib/social-tool/featuredSlots";
import { platformAllowsHorizontalSplit } from "@/lib/social-tool/presets";

const PRODUCT_PAGES = [
  "leads",
  "pipeline",
  "scheduler",
  "stats",
  "pricing",
  "activity",
  "profile",
  "form-card",
] as const;

const PATTERN_REFS = [
  "legacy:none",
  "legacy:monogram",
  "legacy:monogram-soft",
  "legacy:footer",
  "legacy:outline",
  "library:grid",
  "library:topography",
  "library:waves",
  "library:diagonal-lines",
  "library:dots-grid",
  "library:circuit",
] as const;

export function buildDesignSnapshotInput(input: {
  session: DesignSessionPersisted;
  backgroundPresets: BackgroundPreset[];
  selection?: DesignSnapshotInput["selection"];
  artboards?: DesignSnapshotInput["artboards"];
}): DesignSnapshotInput {
  const { session, backgroundPresets, selection, artboards } = input;
  const doc = session.document;
  const layout = getPostLayout(doc.layoutId);
  const dynamicLayout = resolveDocumentLayout(doc);
  const textSlots =
    doc.textSlots && doc.textSlots.length > 0
      ? doc.textSlots
      : textSlotsFromCopy(doc.copy, dynamicLayout);

  return {
    onboardingPhase: doc.onboarding.phase,
    platformId: doc.platformId,
    layoutId: doc.layoutId,
    layoutName: layout.name,
    copy: doc.copy,
    textSlots,
    featured: {
      mode:
        session.featured.mode === "image" && session.featured.image
          ? "image"
          : session.featured.mode === "composed"
            ? "composed"
            : session.featured.mode === "placeholder"
              ? "placeholder"
              : "placeholder",
      productPage: session.featured.productPage,
      hasUploadedImage: !!session.featured.image,
      visible: doc.showFeaturedImage,
      activeBlockId: session.featured.activeBlockId ?? null,
      slots: ensureFeaturedSlots(doc.featuredSlots, {
        mode:
          session.featured.mode === "image" && session.featured.image
            ? "image"
            : session.featured.mode === "composed"
              ? "composed"
              : session.featured.mode === "placeholder"
                ? "placeholder"
                : "placeholder",
        visible: doc.showFeaturedImage,
        activeBlockId: session.featured.activeBlockId ?? null,
      }).map((slot) => ({
        slotId: slot.slotId,
        mode: slot.mode,
        activeBlockId: slot.activeBlockId ?? null,
        visible: slot.visible !== false,
      })),
      visualBlocks: (session.featured.visualBlocks ?? []).map((block) => ({
        id: block.id,
        label: block.label,
        kind: block.kind,
        svgMarkup: block.svgMarkup,
        theme: block.theme,
      })),
    },
    brand: {
      primary: session.brand.colors.primary,
      secondary: session.brand.colors.secondary,
      accent: session.brand.colors.accent,
      activeBackgroundPresetId: session.brand.activeBackgroundPresetId,
      backgroundPresets: backgroundPresets.map((preset) => ({
        id: preset.id,
        label: preset.label,
        kind: preset.kind,
      })),
      hasLogo: kitHasAnyLogo(session.brand),
    },
    pattern: {
      show: doc.showPattern,
      ref: doc.pattern,
      opacity: doc.patternOpacity,
      scale: doc.patternScale,
      animated: doc.patternAnimated,
    },
    visibility: {
      showContent: doc.showContent,
      showBrand: doc.showBrand,
      showFeaturedImage: doc.showFeaturedImage,
      showBackground: doc.showBackground,
      showPattern: doc.showPattern,
    },
    typography: {
      textAlign: doc.textAlign,
      headingFont: doc.headingFont,
      subFont: doc.subFont,
      typeScale: doc.typeScale,
    },
    brandControls: {
      logoScale: doc.logoScale,
      logoPlacement: doc.logoPlacement,
      logoAlign: doc.logoAlign,
    },
    layoutSpacing: doc.layoutSpacing,
    selection: selection ?? null,
    ...(artboards ? { artboards } : {}),
  };
}

export function serializeDesignSnapshot(input: DesignSnapshotInput): DesignSnapshot {
  const allowSplit = platformAllowsHorizontalSplit(input.platformId);
  const snapshot: DesignSnapshot = {
    ...input,
    textSlotIds: input.textSlots.map((slot) => slot.slotId),
    allowedLayouts: POST_LAYOUTS.filter(
      (layout) => allowSplit || !layoutUsesSplit(layout),
    ).map((layout) => layout.id),
    allowedProductPages: [...PRODUCT_PAGES],
    allowedPatternRefs: [...PATTERN_REFS],
    selection: input.selection ?? null,
    ...(input.artboards ? { artboards: input.artboards } : {}),
  };
  return designSnapshotSchema.parse(snapshot);
}

export function buildDesignSnapshot(args: {
  session: DesignSessionPersisted;
  backgroundPresets: BackgroundPreset[];
  selection?: DesignSnapshotInput["selection"];
  artboards?: DesignSnapshotInput["artboards"];
}): DesignSnapshot {
  return serializeDesignSnapshot(
    buildDesignSnapshotInput({
      ...args,
      artboards: args.artboards,
    }),
  );
}

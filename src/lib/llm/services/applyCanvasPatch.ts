import type { DesignDocument, DesignSessionPersisted } from "@/lib/design/types";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { DEFAULT_FEATURED_TRANSFORM } from "@/components/social-tool/templates/ProductShotPost";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import type { FeaturedSlotContent } from "@/lib/social-tool/dynamicLayout";
import { getPlatform } from "@/lib/social-tool/presets";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import { resolveLayoutHierarchy } from "@/lib/social-tool/layoutHierarchy";
import {
  resolveVisualBlockDimensions,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import { findVisualBlock } from "@/lib/social-tool/visualBlocks/storage";

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

function mergeFeaturedSlots(
  previous: FeaturedSlotContent[] | undefined,
  incoming: FeaturedSlotContent[] | undefined,
): FeaturedSlotContent[] | undefined {
  if (!incoming) return previous;
  if (!previous || previous.length === 0) return incoming;
  const next = previous.map((slot) => ({ ...slot }));
  for (const slot of incoming) {
    const index = next.findIndex((entry) => entry.slotId === slot.slotId);
    if (index >= 0) {
      next[index] = { ...next[index]!, ...slot };
    } else {
      next.push(slot);
    }
  }
  return next;
}

function finiteOr(fallback: number, value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function sanitizeFeaturedTransform(
  transform: FeaturedImageTransform | undefined,
  fallback: FeaturedImageTransform,
): FeaturedImageTransform {
  const base = { ...fallback, ...transform };
  return {
    x: finiteOr(fallback.x, base.x),
    y: finiteOr(fallback.y, base.y),
    z: finiteOr(fallback.z, base.z),
    rotateX: finiteOr(fallback.rotateX, base.rotateX),
    rotateY: finiteOr(fallback.rotateY, base.rotateY),
    rotateZ: finiteOr(fallback.rotateZ, base.rotateZ),
    scale: finiteOr(fallback.scale, base.scale),
    perspective: finiteOr(fallback.perspective, base.perspective),
  };
}

function sanitizeDocument(
  document: DesignDocument,
  previous: DesignDocument,
): DesignDocument {
  return {
    ...document,
    typeScale: finiteOr(previous.typeScale, document.typeScale),
    logoScale: finiteOr(previous.logoScale, document.logoScale),
    patternOpacity: finiteOr(previous.patternOpacity, document.patternOpacity),
    patternScale: finiteOr(previous.patternScale, document.patternScale),
    featuredTransform: sanitizeFeaturedTransform(
      document.featuredTransform,
      previous.featuredTransform ?? DEFAULT_FEATURED_TRANSFORM,
    ),
  };
}

export function applyCanvasPatchToSession(
  session: DesignSessionPersisted,
  patch: CanvasPatchResult,
): DesignSessionPersisted {
  if (!patch.success) return session;

  const documentPatch = patch.document ? omitUndefined(patch.document) : undefined;
  const brandPatch = patch.brand ? omitUndefined(patch.brand) : undefined;
  const featuredPatch = patch.featured ? omitUndefined(patch.featured) : undefined;

  let next: DesignSessionPersisted = {
    ...session,
    brand: brandPatch ? { ...session.brand, ...brandPatch } : session.brand,
    featured: featuredPatch
      ? {
          ...session.featured,
          ...featuredPatch,
          image: featuredPatch.image ?? session.featured.image,
          visualBlocks: featuredPatch.visualBlocks ?? session.featured.visualBlocks,
        }
      : session.featured,
    document: documentPatch
      ? sanitizeDocument(
          {
            ...session.document,
            ...documentPatch,
            featuredSlots: mergeFeaturedSlots(
              session.document.featuredSlots,
              documentPatch.featuredSlots,
            ),
          },
          session.document,
        )
      : session.document,
    updatedAt: Date.now(),
  };

  const doc = next.document;
  const layoutChanged =
    documentPatch?.layoutId !== undefined &&
    documentPatch.layoutId !== session.document.layoutId;
  const hierarchyInputsChanged =
    layoutChanged ||
    documentPatch?.copy !== undefined ||
    documentPatch?.textSlots !== undefined ||
    documentPatch?.showFeaturedImage !== undefined ||
    featuredPatch?.mode !== undefined ||
    featuredPatch?.productPage !== undefined;

  if (hierarchyInputsChanged) {
    const platform = getPlatform(doc.platformId);
    const layout = getPostLayout(doc.layoutId);
    const featuredMode =
      next.featured.mode === "image" && next.featured.image
        ? "image"
        : next.featured.mode === "composed"
          ? "composed"
          : next.featured.mode === "placeholder"
            ? "placeholder"
            : "genui";
    const activeBlock =
      featuredMode === "composed"
        ? findVisualBlock(next.featured.visualBlocks ?? [], next.featured.activeBlockId)
        : null;
    const hierarchy = resolveLayoutHierarchy({
      width: platform.width,
      height: platform.height,
      platformId: doc.platformId,
      layout,
      copy: doc.copy,
      spacing: doc.layoutSpacing,
      showLogo: doc.showBrand,
      showFeaturedImage: doc.showFeaturedImage,
      featuredMode,
      productPage: next.featured.productPage,
      visualBlockDimensions:
        featuredMode === "composed"
          ? activeBlock
            ? resolveVisualBlockDimensions(activeBlock)
            : VISUAL_LIBRARY_FRAME
          : undefined,
    });

    next = {
      ...next,
      document: sanitizeDocument(
        {
          ...doc,
          typeScale:
            typeof documentPatch?.typeScale === "number"
              ? documentPatch.typeScale
              : hierarchy.typeScale,
          logoScale:
            typeof documentPatch?.logoScale === "number"
              ? documentPatch.logoScale
              : hierarchy.logoScale,
          featuredTransform: hierarchy.featuredTransform,
        },
        session.document,
      ),
    };
  }

  return next;
}

export function repairDesignDocument(document: DesignDocument): DesignDocument {
  return sanitizeDocument(document, {
    ...document,
    typeScale: Number.isFinite(document.typeScale) ? document.typeScale : 1,
    logoScale: Number.isFinite(document.logoScale) ? document.logoScale : 1,
    patternOpacity: Number.isFinite(document.patternOpacity) ? document.patternOpacity : 0.28,
    patternScale: Number.isFinite(document.patternScale) ? document.patternScale : 1,
    featuredTransform: DEFAULT_FEATURED_TRANSFORM,
  });
}

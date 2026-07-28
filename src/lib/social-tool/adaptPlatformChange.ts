import type { DesignSessionPersisted } from "@/lib/design/types";
import {
  catalogLayoutRef,
  catalogLayoutToDynamic,
  textSlotsFromCopy,
} from "@/lib/social-tool/layoutAdapter";
import { resolveLayoutHierarchyFromIds } from "@/lib/social-tool/layoutHierarchy";
import { layoutIdForDocument } from "@/lib/social-tool/layoutRegistry";
import {
  getApprovedShuffleLayouts,
  layoutMatchesPlatform,
  loadLayoutReviews,
  resolveLayoutSpacing,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import {
  getLayoutShuffleFamily,
  getLayoutStatePatch,
  getPostLayout,
  layoutUsesSplit,
  POST_LAYOUTS,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { platformAllowsHorizontalSplit, getPlatform, type PlatformId } from "@/lib/social-tool/presets";
import { resolveCanvasShapes } from "@/lib/social-tool/shapes/placement";
import {
  resolveVisualBlockDimensions,
  VISUAL_LIBRARY_FRAME,
} from "@/lib/social-tool/visualBlocks/dimensions";
import { activeVisualBlock } from "@/lib/social-tool/visualBlocks/storage";

function normalizeSpacingForPlatform(
  spacing: PostLayoutSpacing,
  layoutId: PostLayoutId,
  platformId: PlatformId,
): PostLayoutSpacing {
  const layout = getPostLayout(layoutId);
  if (platformAllowsHorizontalSplit(platformId) && layoutUsesSplit(layout)) {
    return spacing;
  }
  if (spacing.splitTextColumnShare == null) return spacing;
  const { splitTextColumnShare: _removed, ...rest } = spacing;
  return rest;
}

function resolveLayoutForPlatform(
  layoutId: PostLayoutId,
  platformId: PlatformId,
  record: LayoutReviewRecord,
): PostLayoutId {
  const layout = getPostLayout(layoutId);
  if (layoutMatchesPlatform(layout, platformId)) return layoutId;

  const approved = getApprovedShuffleLayouts(record, platformId);
  if (approved.length > 0) {
    const family = getLayoutShuffleFamily(layout);
    const sameFamily = approved.find(
      (candidate) => getLayoutShuffleFamily(candidate) === family,
    );
    return (sameFamily ?? approved[0]!).id;
  }

  const fallback = POST_LAYOUTS.find((candidate) =>
    layoutMatchesPlatform(candidate, platformId),
  );
  return fallback?.id ?? "classic-hero";
}

function composedBlockDimensions(session: DesignSessionPersisted) {
  const block = activeVisualBlock(
    session.featured.visualBlocks ?? [],
    session.featured.activeBlockId,
  );
  if (!block) return undefined;
  return resolveVisualBlockDimensions(block) ?? VISUAL_LIBRARY_FRAME;
}

/**
 * Adapt a persisted design session when the canvas platform changes.
 * Recalculates hierarchy scales and swaps incompatible layouts when needed.
 */
export function adaptSessionToPlatform(
  session: DesignSessionPersisted,
  nextPlatformId: PlatformId,
  record: LayoutReviewRecord = loadLayoutReviews(),
): DesignSessionPersisted {
  const doc = session.document;
  if (doc.platformId === nextPlatformId) return session;

  const currentLayoutId = layoutIdForDocument(doc);
  const nextLayoutId = resolveLayoutForPlatform(
    currentLayoutId,
    nextPlatformId,
    record,
  );
  const layoutChanged = nextLayoutId !== currentLayoutId;
  const nextLayout = getPostLayout(nextLayoutId);
  const layoutPatch = layoutChanged ? getLayoutStatePatch(nextLayout) : null;

  const nextSpacing = normalizeSpacingForPlatform(
    layoutChanged
      ? resolveLayoutSpacing(record, nextPlatformId, nextLayoutId)
      : doc.layoutSpacing,
    nextLayoutId,
    nextPlatformId,
  );

  const featuredSlotCount = Math.max(1, (doc.featuredSlots ?? []).length);
  const hierarchy = resolveLayoutHierarchyFromIds({
    platformId: nextPlatformId,
    layoutId: nextLayoutId,
    copy: doc.copy,
    spacing: nextSpacing,
    showLogo: doc.showBrand,
    showFeaturedImage: doc.showFeaturedImage,
    featuredMode: session.featured.mode,
    productPage: session.featured.productPage,
    hasUploadedFeaturedImage: !!session.featured.image,
    visualBlockDimensions: composedBlockDimensions(session),
    featuredSlotCount,
  });

  let logoAlign = layoutPatch?.logoAlign ?? doc.logoAlign;
  let textAlign = layoutPatch?.textAlign ?? doc.textAlign;
  if (nextPlatformId === "event-standee") {
    logoAlign = "left";
    textAlign = "left";
  }

  const nextPlatform = getPlatform(nextPlatformId);
  const nextCanvasSpec = doc.canvasSpec
    ? {
        ...doc.canvasSpec,
        width: nextPlatform.width,
        height: nextPlatform.height,
      }
    : undefined;

  const nextDocument = {
    ...doc,
    platformId: nextPlatformId,
    ...(nextCanvasSpec ? { canvasSpec: nextCanvasSpec } : {}),
    layoutSpacing: nextSpacing,
    typeScale: hierarchy.typeScale,
    logoScale: hierarchy.logoScale,
    featuredTransform: hierarchy.featuredTransform,
    logoAlign,
    textAlign,
    ...(layoutPatch
      ? {
          layoutId: nextLayoutId,
          layoutRef: catalogLayoutRef(nextLayoutId),
          logoPlacement: layoutPatch.logoPlacement,
          textSlots: textSlotsFromCopy(
            doc.copy,
            catalogLayoutToDynamic(nextLayout),
          ),
        }
      : {}),
    ...(doc.decorationLevel && (doc.canvasShapes?.length ?? 0) > 0
      ? {
          canvasShapes: resolveCanvasShapes({
            decorationLevel: doc.decorationLevel,
            layoutId: nextLayoutId,
            platformId: nextPlatformId,
            spacing: nextSpacing,
            brandColors: {
              primary: session.brand.colors.primary,
              accent: session.brand.colors.accent,
            },
            designId: session.designId,
          }),
        }
      : {}),
  };

  return {
    ...session,
    document: nextDocument,
    updatedAt: Date.now(),
  };
}


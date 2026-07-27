import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import {
  computeUpdateBackgroundPatch,
  computeUpdateCopyPatch,
  computeUpdateFeaturedPatch,
  computeUpdatePatternPatch,
  computeUpdateVisibilityPatch,
  computeRefreshCopyVariantsPatch,
  computeAddShapePatch,
  computeRemoveShapePatch,
  mergeCanvasPatches,
} from "@/lib/llm/services/computeCanvasPatch";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import { buildCopyVariantsForBrief } from "@/lib/llm/stages/copyVariantWriter";
import type { PlatformId } from "@/lib/social-tool/presets";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Client-safe offline canvas edits for common follow-up phrases. */
export function runCanvasAgentOffline(
  message: string,
  snapshot: DesignSnapshot,
): CanvasPatchResult | null {
  const lower = normalize(message);
  if (!lower) return null;

  const patches: CanvasPatchResult[] = [];

  if (lower.includes("remove pattern") || lower.includes("no pattern") || lower.includes("hide pattern")) {
    patches.push(
      computeUpdatePatternPatch(snapshot, { showPattern: false }),
    );
  } else if (lower.includes("add pattern") || lower.includes("show pattern")) {
    patches.push(
      computeUpdatePatternPatch(snapshot, {
        showPattern: true,
        patternRef: "library:grid",
      }),
    );
  }

  if (lower.includes("hide featured") || lower.includes("remove product") || lower.includes("no image")) {
    patches.push(computeUpdateFeaturedPatch(snapshot, { showFeaturedImage: false }));
  }

  if (lower.includes("pricing")) {
    patches.push(
      computeUpdateFeaturedPatch(snapshot, {
        showFeaturedImage: true,
        mode: "genui",
        productPage: "pricing",
      }),
    );
  }

  if (lower.includes("background")) {
    const presets = snapshot.brand.backgroundPresets;
    const dark = presets.find((p) => p.kind === "gradient" && p.label.toLowerCase().includes("dark"));
    const light = presets.find((p) => p.kind === "solid");
    const presetId =
      lower.includes("dark") || lower.includes("darker")
        ? dark?.id ?? presets[0]?.id
        : lower.includes("light") || lower.includes("lighter")
          ? light?.id ?? presets[0]?.id
          : presets[0]?.id;

    if (presetId) {
      patches.push(computeUpdateBackgroundPatch(snapshot, { presetId, showBackground: true }));
    }
  }

  if (lower.includes("shorter headline") || lower.includes("shorten headline")) {
    const headline = snapshot.textSlots.find((slot) => slot.role === "headline");
    if (headline) {
      const shortened = headline.text.split(/\s+/).slice(0, 6).join(" ");
      patches.push(
        computeUpdateCopyPatch(snapshot, {
          slots: [{ slotId: headline.slotId, text: shortened }],
        }),
      );
    }
  }

  if (lower.includes("text only") || lower.includes("copy only")) {
    patches.push(
      computeUpdateVisibilityPatch({
        showFeaturedImage: false,
        showPattern: false,
      }),
    );
  }

  if (
    lower.includes("remove shape") ||
    lower.includes("remove decoration") ||
    lower.includes("remove blob") ||
    lower.includes("no shapes")
  ) {
    const firstShape = snapshot.canvasShapes?.[0];
    if (firstShape) {
      patches.push(computeRemoveShapePatch(snapshot, { shapeId: firstShape.id }));
    }
  } else if (
    lower.includes("add shape") ||
    lower.includes("add blob") ||
    lower.includes("add decoration") ||
    lower.includes("decorative shape")
  ) {
    patches.push(
      computeAddShapePatch(snapshot, { libraryId: "shape-organic-blob-soft-01" }),
    );
  }

  const wantsAllBoards =
    lower.includes("all artboard") ||
    lower.includes("all board") ||
    lower.includes("all design") ||
    lower.includes("all boards") ||
    lower.includes("every artboard") ||
    lower.includes("every board") ||
    lower.includes("all variants") ||
    lower.includes("every variant");

  const wantsCopyRefresh =
    lower.includes("copy") ||
    lower.includes("headline") ||
    lower.includes("subheading") ||
    lower.includes("rewrite") ||
    lower.includes("refresh text");

  if (wantsCopyRefresh && (wantsAllBoards || lower.includes("each artboard"))) {
    const variants = buildCopyVariantsForBrief(
      message,
      {
        heading: snapshot.copy.heading,
        subheading: snapshot.copy.subheading,
      },
      snapshot.platformId as PlatformId,
    );
    if (variants.length > 0) {
      patches.push(computeRefreshCopyVariantsPatch(snapshot, variants, 0));
    }
  }

  if (patches.length === 0) return null;

  const merged = mergeCanvasPatches(patches);

  return {
    ...merged,
    targetArtboards: wantsAllBoards ? "all" : "active",
  };
}

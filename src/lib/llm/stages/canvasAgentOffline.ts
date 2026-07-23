import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import {
  computeUpdateBackgroundPatch,
  computeUpdateCopyPatch,
  computeUpdateFeaturedPatch,
  computeUpdatePatternPatch,
  computeUpdateVisibilityPatch,
  mergeCanvasPatches,
} from "@/lib/llm/services/computeCanvasPatch";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";

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

  if (patches.length === 0) return null;
  return mergeCanvasPatches(patches);
}

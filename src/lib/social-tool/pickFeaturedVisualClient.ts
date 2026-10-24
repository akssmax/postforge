import type { VisualBlockGenerateInput, VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/**
 * Featured visual pick through the server, which owns the asset library (keeping
 * the ~1.5 MB illustration manifest out of the editor bundle) and sanitizes SVG.
 * Excluded ids switch the server to a randomized pick among the best matches.
 */
export async function requestFeaturedVisualPick(
  input: VisualBlockGenerateInput,
  excludeLibraryIds: string[] = [],
): Promise<VisualBlockRecord | null> {
  const response = await fetch("/api/visual-blocks/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      pickFeatured: true,
      source: "library",
      ...(excludeLibraryIds.length ? { excludeLibraryIds } : {}),
    }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { blocks?: VisualBlockRecord[] };
  return payload.blocks?.[0] ?? null;
}

import type { BlockHierarchy } from "@/lib/social-tool/visualBlocks/semantic/types";

export type HierarchyPart = { hierarchy: BlockHierarchy };

/**
 * Ensure at most one hero part in a composition.
 * Downgrades extra heroes to supporting.
 */
export function enforceHierarchy<T extends HierarchyPart>(parts: T[]): T[] {
  let heroSeen = false;
  return parts.map((part) => {
    if (part.hierarchy !== "hero") return part;
    if (!heroSeen) {
      heroSeen = true;
      return part;
    }
    return { ...part, hierarchy: "supporting" as const };
  });
}

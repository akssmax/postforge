import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import {
  referenceLayoutForArtifact,
} from "@/lib/design-engine/artifactReference";
import { listLayoutMeta, tryGetLayoutMeta } from "@/lib/design-config/registry";
import type { LayoutCandidate } from "@/lib/social-tool/engine/layoutRetriever";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import { layoutUsesSplit } from "@/lib/social-tool/postLayouts";

export function layoutMetaSupportsArtifact(
  layoutId: string,
  artifactId: string,
): boolean {
  const meta = tryGetLayoutMeta(layoutId);
  if (!meta?.artifactSupports || meta.artifactSupports.length === 0) {
    return true;
  }
  return meta.artifactSupports.includes(artifactId);
}

export function filterLayoutCandidatesForArtifact(
  candidates: LayoutCandidate[],
  artifact: ArtifactDefinition,
): LayoutCandidate[] {
  const recommended = new Set(artifact.recommendedLayouts);
  const filtered = candidates.filter((c) =>
    layoutMetaSupportsArtifact(c.layout.id, artifact.id),
  );

  const pool =
    filtered.length > 0
      ? filtered
      : recommended.size > 0
        ? candidates.filter((c) => recommended.has(c.layout.id))
        : candidates;

  if (pool.length === 0) return candidates;

  let rankedPool = pool;
  if (
    artifact.renderer === "print-doc" &&
    artifact.capabilities.primaryContent === "text"
  ) {
    const textFirst = pool.filter(
      (c) =>
        !layoutUsesSplit(c.layout) && c.layout.includeFeaturedSlot === false,
    );
    if (textFirst.length > 0) rankedPool = textFirst;
  }

  if (artifact.capabilities.primaryContent === "diagram") {
    const diagramLayouts = pool.filter(
      (c) =>
        c.layout.id === "diagram-primary" ||
        c.layout.id === "comparison-columns" ||
        c.layout.id === "section-stack" ||
        c.layout.id === "deck-sidebar",
    );
    if (diagramLayouts.length > 0) rankedPool = diagramLayouts;
  }

  if (artifact.id === "checklist" || artifact.id === "framework" || artifact.id === "timeline" || artifact.id === "infographic") {
    const sectionLayouts = pool.filter((c) => c.layout.id === "section-stack");
    if (sectionLayouts.length > 0) rankedPool = sectionLayouts;
  }

  const referenceLayout = referenceLayoutForArtifact(artifact.id);
  if (referenceLayout) {
    const refMatch = rankedPool.filter((c) => c.layout.id === referenceLayout);
    if (refMatch.length > 0) rankedPool = refMatch;
  }

  return rankedPool
    .map((c) => ({
      ...c,
      score: c.score + (recommended.has(c.layout.id) ? 25 : 0),
    }))
    .sort((a, b) => b.score - a.score);
}

export function pickLayoutForArtifact(
  artifact: ArtifactDefinition,
  fallback: PostLayoutId = "classic-hero",
): PostLayoutId {
  const recommended = artifact.recommendedLayouts[0];
  if (recommended) {
    const meta = listLayoutMeta().find((l) => l.id === recommended);
    if (meta && layoutMetaSupportsArtifact(recommended, artifact.id)) {
      return recommended as PostLayoutId;
    }
  }
  return fallback;
}

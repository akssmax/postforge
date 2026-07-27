import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import {
  listBundles,
  tryGetBundle,
  type BlockBundleConfig,
} from "@/lib/design-config/registry";

const MARKETING_BUNDLES = new Set([
  "process-explain",
  "feature-launch",
  "pricing-offer",
  "growth-proof",
]);

function bundleCompatibleWithArtifact(
  bundle: BlockBundleConfig,
  artifact: ArtifactDefinition,
): boolean {
  if (MARKETING_BUNDLES.has(bundle.id)) {
    if (artifact.category === "events") return false;
    if (artifact.renderer === "print-doc") return false;
    if (artifact.renderer === "diagram") return false;
    if (artifact.capabilities.primaryContent === "diagram") return false;
    if (artifact.id === "checklist" || artifact.id === "certificate") return false;
    if (artifact.id === "hiring_post") return false;
  }
  return true;
}

export function filterBundlesForArtifact(
  artifact: ArtifactDefinition,
): BlockBundleConfig[] {
  const recommended = new Set(artifact.recommendedBundles);
  return listBundles().filter((bundle) => {
    if (!bundleCompatibleWithArtifact(bundle, artifact)) return false;
    if (recommended.size > 0 && recommended.has(bundle.id)) return true;
    if (bundle.worksFor.includes(artifact.category)) return true;
    if (recommended.size === 0) return true;
    return false;
  });
}

export function pickBundleForArtifact(
  artifact: ArtifactDefinition,
  preferredId?: string,
): BlockBundleConfig | undefined {
  if (preferredId) {
    const bundle = tryGetBundle(preferredId);
    if (
      bundle &&
      bundleCompatibleWithArtifact(bundle, artifact) &&
      filterBundlesForArtifact(artifact).some((b) => b.id === bundle.id)
    ) {
      return bundle;
    }
  }
  const allowed = filterBundlesForArtifact(artifact);
  return allowed[0];
}

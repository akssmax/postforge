export {
  loadArtifactPlugin,
  resolveArtifactId,
  listArtifactsForCategory,
} from "@/lib/design-engine/artifactRegistry";
export {
  canvasSpecFromArtifact,
  aspectRatioToCanvasSpec,
  resolveDesignCanvasSize,
  resolveArtboardLabel,
  resolveRenderer,
  ARTIFACT_CATEGORIES,
  type CanvasSpec,
} from "@/lib/design-engine/canvasSpec";
export { routeRenderer } from "@/lib/design-engine/rendererRouter";
export {
  resolvePlatformForDesign,
  resolvePlatformIdForArtifact,
  type PlatformResolution,
} from "@/lib/design-engine/platformResolver";
export {
  resolveRecipeForArtifact,
  filterRecipesForArtifact,
} from "@/lib/design-engine/recipeEngine";
export {
  filterLayoutCandidatesForArtifact,
  layoutMetaSupportsArtifact,
  pickLayoutForArtifact,
} from "@/lib/design-engine/layoutEngine";
export {
  filterBundlesForArtifact,
  pickBundleForArtifact,
} from "@/lib/design-engine/bundleEngine";
export {
  mergeArtifactIntoRulesProfile,
  artifactSlotPromptLines,
  artifactWantsLogoPlaceholder,
  artifactWantsLogoPlaceholderById,
  effectiveFeaturedPolicy,
} from "@/lib/design-engine/artifactRules";
export {
  ARTIFACT_REFERENCE_LAYOUT,
  ARTIFACT_DEFAULT_PLATFORM,
  referenceLayoutForArtifact,
  isDiagramArtifact,
  isSectionStackArtifact,
  isCopyOnlyArtifact,
  isSocialAdArtifact,
  isInviteArtifact,
} from "@/lib/design-engine/artifactReference";

import type {
  ArtifactCapabilities,
  ArtifactCategoryId,
  ArtifactDefinition,
  RendererId,
} from "@/lib/design-config/schemas";
import type { DesignDocument } from "@/lib/design/types";
import { getPlatform, platformOptionLabel, platformPillLabel, type PlatformId } from "@/lib/social-tool/presets";

/** Parse "16:9", "1:1", "3.5:2" into pixel dimensions (base width 1080). */
export function aspectRatioToCanvasSpec(
  ratio: string,
  baseWidth = 1080,
): { width: number; height: number; unit: "px" } {
  const normalized = ratio.replace(/\s/g, "");
  if (normalized.includes(":")) {
    const [w, h] = normalized.split(":").map(Number);
    if (w > 0 && h > 0) {
      return {
        width: baseWidth,
        height: Math.round((baseWidth * h) / w),
        unit: "px",
      };
    }
  }
  if (normalized.includes("x")) {
    const [w, h] = normalized.split("x").map(Number);
    if (w > 0 && h > 0) {
      const scale = baseWidth / w;
      return {
        width: Math.round(w * scale),
        height: Math.round(h * scale),
        unit: "px",
      };
    }
  }
  return { width: baseWidth, height: baseWidth, unit: "px" };
}

export type CanvasSpec = {
  width: number;
  height: number;
  unit: "px";
  bleedPx?: number;
};

export function canvasSpecFromArtifact(
  artifact: ArtifactDefinition,
  ratioIndex = 0,
): CanvasSpec {
  const ratio =
    artifact.capabilities.aspectRatios[ratioIndex] ??
    artifact.capabilities.aspectRatios[0] ??
    "1:1";
  const base = aspectRatioToCanvasSpec(ratio);
  const bleedPx = artifact.capabilities.print ? 36 : undefined;
  return { ...base, bleedPx };
}

export function resolveRenderer(
  capabilities: ArtifactCapabilities,
  explicit?: RendererId,
): RendererId {
  if (explicit) return explicit;
  if (capabilities.multiPage) return "slide-deck";
  if (capabilities.print && capabilities.primaryContent === "text") {
    return "print-doc";
  }
  if (capabilities.primaryContent === "diagram") return "diagram";
  return "product-shot";
}

export function resolveDesignCanvasSize(
  document: Pick<DesignDocument, "canvasSpec" | "platformId">,
  platformId?: PlatformId,
): CanvasSpec {
  if (document.canvasSpec) return document.canvasSpec;
  const platform = getPlatform(platformId ?? document.platformId);
  return { width: platform.width, height: platform.height, unit: "px" };
}

/** Header badge label — prefers artifact canvasSpec over generic social platform size. */
export function resolveArtboardLabel(input: {
  platformId: PlatformId;
  canvasSpec?: CanvasSpec;
  artifactId?: string;
}): string {
  const platform = getPlatform(input.platformId);
  if (input.canvasSpec) {
    const { width, height } = input.canvasSpec;
    if (platform.kind === "print" && platform.sizeLabel) {
      return `${platform.label} (${platform.sizeLabel})`;
    }
    if (platform.sizeLabel) {
      return `${platform.label} (${platform.sizeLabel})`;
    }
    return `${platform.label} (${width}×${height})`;
  }
  return platformOptionLabel(platform);
}

/** Compact artboard name for toolbar pills — dimensions live in tooltip / menu meta. */
export function resolveArtboardPillLabel(input: {
  platformId: PlatformId;
}): string {
  return platformPillLabel(getPlatform(input.platformId));
}

export const ARTIFACT_CATEGORIES: ReadonlyArray<{
  id: ArtifactCategoryId;
  label: string;
  emoji: string;
}> = [
  { id: "marketing", label: "Marketing", emoji: "✨" },
  { id: "social", label: "Social", emoji: "📱" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "presentations", label: "Presentations", emoji: "📊" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "events", label: "Events", emoji: "🎉" },
  { id: "branding", label: "Branding", emoji: "🎨" },
  { id: "product", label: "Product", emoji: "📦" },
  { id: "documentation", label: "Documentation", emoji: "📄" },
  { id: "hr_internal", label: "HR & Internal", emoji: "👥" },
  { id: "editorial", label: "Editorial", emoji: "📰" },
  { id: "commerce", label: "Commerce", emoji: "🛍" },
  { id: "print", label: "Print", emoji: "🖨" },
  { id: "personal", label: "Personal", emoji: "👤" },
  { id: "creator", label: "Creator", emoji: "🎥" },
];

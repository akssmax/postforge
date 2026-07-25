import type { VisualBlockKind } from "@/lib/social-tool/visualBlocks/types";
import manifestJson from "../../../../../../public/visuals/3d/thiings/manifest.json";

export type ThreeDSource = "thiings";

export type ThreeDLibraryEntry = {
  id: string;
  label: string;
  kind: "3d";
  tags: string[];
  description: string;
  source: ThreeDSource;
  licenseLabel: string;
  /** Path under /public (PNG) */
  assetPath: string;
};

type ManifestRow = {
  id: string;
  label: string;
  slug: string;
  assetPath: string;
  tags: string[];
  description: string;
};

export const THREED_SOURCE_LABELS: Record<ThreeDSource, string> = {
  thiings: "Thiings",
};

export const THREED_LIBRARY: ThreeDLibraryEntry[] = (
  manifestJson as ManifestRow[]
).map((row) => ({
  id: row.id,
  label: row.label,
  kind: "3d" as const,
  tags: [...row.tags, "3d", "thiings", "icon"],
  description: row.description,
  source: "thiings" as const,
  licenseLabel: "Thiings (attribution required for free use)",
  assetPath: row.assetPath,
}));

export function isThreeDKind(kind: VisualBlockKind | undefined): boolean {
  return kind === "3d";
}

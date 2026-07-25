import type { VisualBlockKind } from "@/lib/social-tool/visualBlocks/types";

export type BlockHierarchy = "hero" | "supporting" | "secondary" | "decorative";
export type BlockDensity = "compact" | "medium" | "hero";

export type SemanticBlockRequest = {
  familyId: string;
  density: BlockDensity;
  composition: string;
  stylePackId: string;
  hierarchy: BlockHierarchy;
  assetId: string;
  kind: VisualBlockKind;
  content: Record<string, string>;
};

export type FeaturedComposition = {
  bundleId?: string;
  parts: SemanticBlockRequest[];
  stylePackId: string;
  reason: string;
};

export type SemanticPickContext = {
  campaignType?: string;
  recipeId?: string;
  patternId?: string;
  designSystemId?: string;
  contentDensity?: "low" | "medium" | "high";
  readingPattern?: "F" | "Z" | "center";
  colorMood?: string;
  brandTone?: string;
  featuredKind?: "ui" | "illustration" | "3d";
  proof?: string;
  platformId?: string;
};

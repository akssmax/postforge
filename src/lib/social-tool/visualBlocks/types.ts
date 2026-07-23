export type VisualBlockKind = "diagram" | "ui" | "illustration";

export type VisualBlockSemanticMeta = {
  familyId?: string;
  bundleId?: string;
  density?: "compact" | "medium" | "hero";
  composition?: string;
  stylePackId?: string;
  hierarchy?: "hero" | "supporting" | "secondary" | "decorative";
  compositionParts?: Array<{
    familyId: string;
    assetId: string;
    kind: VisualBlockKind;
    density: "compact" | "medium" | "hero";
    hierarchy: "hero" | "supporting" | "secondary" | "decorative";
  }>;
};

export type VisualBlockRecord = {
  id: string;
  libraryId?: string;
  label: string;
  kind: VisualBlockKind;
  svgMarkup: string;
  content?: Record<string, string>;
  createdAt: number;
  theme?: string;
  prompt?: string;
  semantic?: VisualBlockSemanticMeta;
};

export type VisualBlockGenerateInput = {
  headline?: string;
  subheading?: string;
  theme?: string;
  brief?: string;
  brandColors?: {
    primary?: string;
    accent?: string;
  };
  /** Campaign intent signals for tag-based library matching. */
  intent?: {
    primaryIntent?: string;
    audience?: string;
    goal?: string;
    visualPriority?: string;
    proofStrategy?: string;
    featuredVisualKind?: "ui" | "illustration";
    keywords?: string[];
    themes?: string[];
  };
  /** Semantic campaign context for family/bundle retrieval. */
  semantic?: {
    campaignType?: string;
    recipeId?: string;
    patternId?: string;
    designSystemId?: string;
    contentDensity?: "low" | "medium" | "high";
    readingPattern?: "F" | "Z" | "center";
    colorMood?: string;
    brandTone?: string;
    featuredKind?: "ui" | "illustration";
    proof?: string;
    platformId?: string;
  };
  /** Override featured slot kind when picking from library. */
  preferredKind?: "ui" | "illustration";
  slotWidth?: number;
  slotHeight?: number;
  count?: number;
  source?: "library" | "generate";
  libraryIds?: string[];
};

export type VisualBlockModifyInput = {
  blockId: string;
  instruction: string;
  block: VisualBlockRecord;
  brandColors?: {
    primary?: string;
    accent?: string;
  };
};

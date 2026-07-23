export type VisualBlockKind = "diagram" | "ui" | "illustration";

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

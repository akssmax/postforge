import type { UIMessage } from "ai";
import type { BrandKitPersisted } from "@/lib/brand/types";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import type {
  FeaturedSlotContent,
  LayoutRef,
  TextSlotContent,
} from "@/lib/social-tool/dynamicLayout";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type {
  CopyVariant,
  LogoAlign,
  LogoPlacement,
  PlatformId,
  PostCopy,
  PostTheme,
  SocialFontId,
  TextAlign,
} from "@/lib/social-tool/presets";
import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";

export type DesignOnboardingPhase = "needsLogo" | "needsBrief" | "ready";

export type DesignOnboardingState = {
  phase: DesignOnboardingPhase;
  briefSkipped: boolean;
};

export type DesignDocument = {
  version: 1 | 2;
  templateId: "product-shot";
  platformId: PlatformId;
  theme: PostTheme;
  layoutId: PostLayoutId;
  layoutRef?: LayoutRef;
  textSlots?: TextSlotContent[];
  featuredSlots?: FeaturedSlotContent[];
  layoutSpacing: PostLayoutSpacing;
  copy: PostCopy;
  /** Brief-specific headline/subheading options for shuffle. */
  copyVariants?: CopyVariant[];
  /** Index into copyVariants for the active headline/subheading. */
  copyVariantIndex?: number;
  /** Inferred preferred asset type for the featured visual slot. */
  featuredVisualKind?: "ui" | "illustration" | "3d";
  pattern: PatternRef;
  patternOpacity: number;
  patternScale: number;
  patternAnimated: boolean;
  showPattern: boolean;
  showBackground: boolean;
  typeScale: number;
  logoScale: number;
  logoAlign: LogoAlign;
  logoPlacement: LogoPlacement;
  showBrand: boolean;
  showContent: boolean;
  showFeaturedImage: boolean;
  textAlign: TextAlign;
  headingFont: SocialFontId;
  subFont: SocialFontId;
  featuredTransform: FeaturedImageTransform;
  logoBackdrop: boolean;
  logoInvert: boolean;
  textContrastBoost: boolean;
  onboarding: DesignOnboardingState;
};

export type DesignSessionPersisted = {
  designId: string;
  updatedAt: number;
  brand: BrandKitPersisted;
  featured: FeaturedBlockPersisted;
  document: DesignDocument;
  /** Brief chat transcript for this design thread (origin board only). */
  briefChatMessages?: UIMessage[];
};

export const DESIGN_SESSION_VERSION = 1 as const;

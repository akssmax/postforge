import type { BrandKitPersisted } from "@/lib/brand/types";
import type { FeaturedBlockPersisted } from "@/lib/social-tool/featuredBlock";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type {
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
  version: 1;
  templateId: "product-shot";
  platformId: PlatformId;
  theme: PostTheme;
  layoutId: PostLayoutId;
  layoutSpacing: PostLayoutSpacing;
  copy: PostCopy;
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
};

export const DESIGN_SESSION_VERSION = 1 as const;

import type { LandingBrandId } from "@/components/landing/landingBrands";
import { defaultLandingIllustration } from "@/components/landing/landingBrandContent";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PlatformId, PostCopy } from "@/lib/social-tool/presets";

export type LandingDemoDesign = {
  id: string;
  title: string;
  brandId: LandingBrandId;
  platformId: PlatformId;
  layoutId: PostLayoutId;
  copy: PostCopy;
  illustrationSrc: string;
  showFeaturedImage: boolean;
  pattern: PatternRef;
  showPattern: boolean;
  patternOpacity: number;
  patternScale: number;
  backgroundPresetId?: string;
};

/** Hand-authored showcase designs — brand-true copy + illustrations (no GenUI). */
export const LANDING_DEMO_DESIGNS: LandingDemoDesign[] = [
  {
    id: "claude-launch",
    title: "AI teammate",
    brandId: "claude",
    platformId: "linkedin-square",
    layoutId: "classic-hero",
    copy: {
      heading: "Think with Claude",
      subheading: "Research, write, and code with an AI that stays on your wavelength.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("claude"),
    showFeaturedImage: true,
    pattern: legacyPatternRef("monogram-soft"),
    showPattern: true,
    patternOpacity: 0.14,
    patternScale: 1.2,
  },
  {
    id: "linear-ship",
    title: "Ship announcement",
    brandId: "linear",
    platformId: "twitter",
    layoutId: "centered-announcement",
    copy: {
      heading: "The issue tracker you’ll actually love",
      subheading: "Plan, build, and ship — without the project-management tax.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("linear"),
    showFeaturedImage: true,
    pattern: libraryPatternRef("bubbles"),
    showPattern: true,
    patternOpacity: 0.2,
    patternScale: 1.4,
  },
  {
    id: "google-focus",
    title: "Search spotlight",
    brandId: "google",
    platformId: "instagram-square",
    layoutId: "product-focus",
    copy: {
      heading: "Search the world’s information",
      subheading: "Find answers, explore ideas, and discover what matters — instantly.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("google"),
    showFeaturedImage: true,
    pattern: legacyPatternRef("none"),
    showPattern: false,
    patternOpacity: 0.2,
    patternScale: 1,
  },
  {
    id: "swiggy-promo",
    title: "Food delivery",
    brandId: "swiggy",
    platformId: "instagram-story",
    layoutId: "visual-first",
    copy: {
      heading: "Hungry? Order in minutes",
      subheading: "Your favorite restaurants, delivered hot — whenever the craving hits.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("swiggy"),
    showFeaturedImage: true,
    pattern: legacyPatternRef("footer"),
    showPattern: true,
    patternOpacity: 0.24,
    patternScale: 1.1,
  },
  {
    id: "blinkit-split",
    title: "Quick commerce",
    brandId: "blinkit",
    platformId: "linkedin-square",
    layoutId: "visual-first",
    copy: {
      heading: "Groceries in 10 minutes",
      subheading: "Milk, snacks, essentials — delivered before you finish this sentence.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("blinkit"),
    showFeaturedImage: true,
    pattern: libraryPatternRef("grid"),
    showPattern: true,
    patternOpacity: 0.16,
    patternScale: 1.3,
  },
  {
    id: "linear-stack",
    title: "Product teams",
    brandId: "linear",
    platformId: "linkedin-landscape",
    layoutId: "brand-stack",
    copy: {
      heading: "Ship faster. Stay aligned.",
      subheading: "One workspace for engineering, design, and product.",
      extraFields: [],
    },
    illustrationSrc: "/visuals/illustrations/undraw/in-progress.svg",
    showFeaturedImage: true,
    pattern: legacyPatternRef("monogram"),
    showPattern: true,
    patternOpacity: 0.22,
    patternScale: 1,
  },
];

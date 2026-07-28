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

const STORYSET = "/visuals/illustrations/storyset";

/** Hand-authored showcase designs — brand-true copy + Storyset illustrations. */
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
    patternOpacity: 0.12,
    patternScale: 1.15,
  },
  {
    id: "linear-ship",
    title: "Ship announcement",
    brandId: "linear",
    platformId: "linkedin-square",
    layoutId: "product-focus",
    copy: {
      heading: "Built for product velocity",
      subheading: "Issues, cycles, and roadmaps — without the project-management tax.",
      extraFields: [],
    },
    illustrationSrc: `${STORYSET}/standup-meeting.svg`,
    showFeaturedImage: true,
    pattern: libraryPatternRef("bubbles"),
    showPattern: true,
    patternOpacity: 0.18,
    patternScale: 1.3,
  },
  {
    id: "google-focus",
    title: "Search spotlight",
    brandId: "google",
    platformId: "instagram-square",
    layoutId: "product-focus",
    copy: {
      heading: "Search that understands you",
      subheading: "Answers, ideas, and discovery — right when you need them.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("google"),
    showFeaturedImage: true,
    pattern: legacyPatternRef("none"),
    showPattern: false,
    patternOpacity: 0,
    patternScale: 1,
  },
  {
    id: "swiggy-promo",
    title: "Food delivery",
    brandId: "swiggy",
    platformId: "instagram-square",
    layoutId: "product-focus",
    copy: {
      heading: "Order in. Dig in.",
      subheading: "Top restaurants, live tracking, and hot delivery to your door.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("swiggy"),
    showFeaturedImage: true,
    pattern: legacyPatternRef("footer"),
    showPattern: true,
    patternOpacity: 0.2,
    patternScale: 1.05,
  },
  {
    id: "blinkit-split",
    title: "Quick commerce",
    brandId: "blinkit",
    platformId: "instagram-square",
    layoutId: "classic-hero",
    copy: {
      heading: "Groceries in minutes",
      subheading: "Essentials, snacks, and fresh picks — at your door before you know it.",
      extraFields: [],
    },
    illustrationSrc: defaultLandingIllustration("blinkit"),
    showFeaturedImage: true,
    pattern: libraryPatternRef("grid"),
    showPattern: true,
    patternOpacity: 0.14,
    patternScale: 1.2,
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
    illustrationSrc: `${STORYSET}/creative-team.svg`,
    showFeaturedImage: true,
    pattern: legacyPatternRef("monogram"),
    showPattern: true,
    patternOpacity: 0.2,
    patternScale: 1,
  },
];

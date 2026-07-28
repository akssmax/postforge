import type { LandingBrandId } from "@/components/landing/landingBrands";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import { legacyPatternRef } from "@/lib/social-tool/patterns/resolvePattern";
import { libraryPatternRef } from "@/lib/social-tool/patterns/library";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { CopyVariant, PlatformId, PostCopy } from "@/lib/social-tool/presets";

export type LandingBrandDefaultDesign = {
  platformId: PlatformId;
  layoutId: PostLayoutId;
  copyVariantIndex: number;
  illustrationSrc: string;
  pattern: PatternRef;
  showPattern: boolean;
  patternOpacity: number;
  patternScale: number;
  backgroundPresetId?: string;
};

export type LandingBrandContent = {
  brandId: LandingBrandId;
  /** Prefer light solid/gradient backgrounds (Claude). */
  preferLightBackground: boolean;
  copyVariants: ReadonlyArray<CopyVariant>;
  /** Public SVG paths for featured illustrations (Storyset-first). */
  illustrations: ReadonlyArray<string>;
  /** Curated starting composition for playground + demos. */
  defaultDesign: LandingBrandDefaultDesign;
};

const STORYSET = "/visuals/illustrations/storyset";

/**
 * Brand-true marketing copy for the offline landing playground.
 * Do not reuse CRM / DEFAULT_COPY fallbacks here.
 */
export const LANDING_BRAND_CONTENT: Record<LandingBrandId, LandingBrandContent> = {
  claude: {
    brandId: "claude",
    preferLightBackground: true,
    copyVariants: [
      {
        heading: "Think with Claude",
        subheading: "Research, write, and code with an AI that stays on your wavelength.",
      },
      {
        heading: "From prompt to publish",
        subheading: "Draft, refine, and ship — without bouncing between a dozen tools.",
      },
      {
        heading: "Your sharpest teammate",
        subheading: "Brainstorm, analyze, and iterate with context that actually sticks.",
      },
      {
        heading: "Less busywork. More clarity.",
        subheading: "Turn messy inputs into polished output in minutes, not hours.",
      },
      {
        heading: "Claude for deep work",
        subheading: "Enterprise-ready AI for writing, research, and creative projects.",
      },
    ],
    illustrations: [
      `${STORYSET}/chat-bot.svg`,
      `${STORYSET}/content-creator.svg`,
      `${STORYSET}/design-thinking.svg`,
      `${STORYSET}/sharing-ideas.svg`,
      `${STORYSET}/group-chat.svg`,
    ],
    defaultDesign: {
      platformId: "linkedin-square",
      layoutId: "classic-hero",
      copyVariantIndex: 0,
      illustrationSrc: `${STORYSET}/chat-bot.svg`,
      pattern: legacyPatternRef("monogram-soft"),
      showPattern: true,
      patternOpacity: 0.12,
      patternScale: 1.15,
    },
  },
  linear: {
    brandId: "linear",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Built for product velocity",
        subheading: "Issues, cycles, and roadmaps — without the project-management tax.",
      },
      {
        heading: "Ship faster. Stay aligned.",
        subheading: "One workspace for engineering, design, and product.",
      },
      {
        heading: "The issue tracker you'll love",
        subheading: "Plan, build, and ship in a calm, purpose-built workspace.",
      },
      {
        heading: "Move fast. Stay focused.",
        subheading: "Linear keeps priorities clear and status noise out of your way.",
      },
      {
        heading: "From backlog to shipped",
        subheading: "Modern software teams deserve tools that match how they work.",
      },
    ],
    illustrations: [
      `${STORYSET}/add-tasks.svg`,
      `${STORYSET}/standup-meeting.svg`,
      `${STORYSET}/business-analytics.svg`,
      `${STORYSET}/creative-team.svg`,
      `${STORYSET}/efficiency.svg`,
    ],
    defaultDesign: {
      platformId: "linkedin-square",
      layoutId: "product-focus",
      copyVariantIndex: 0,
      illustrationSrc: `${STORYSET}/add-tasks.svg`,
      pattern: libraryPatternRef("bubbles"),
      showPattern: true,
      patternOpacity: 0.18,
      patternScale: 1.3,
    },
  },
  google: {
    brandId: "google",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Search that understands you",
        subheading: "Answers, ideas, and discovery — right when you need them.",
      },
      {
        heading: "Explore everything",
        subheading: "The world's information, organized and at your fingertips.",
      },
      {
        heading: "Find it faster",
        subheading: "From quick facts to deep research — one search away.",
      },
      {
        heading: "Discover what matters",
        subheading: "Search built for curiosity, not just keywords.",
      },
      {
        heading: "Knowledge, unlocked",
        subheading: "Billions of sources. One trusted place to start.",
      },
    ],
    illustrations: [
      `${STORYSET}/web-search.svg`,
      `${STORYSET}/search-engines.svg`,
      `${STORYSET}/curiosity-search.svg`,
      `${STORYSET}/people-search.svg`,
      `${STORYSET}/digital-tools.svg`,
    ],
    defaultDesign: {
      platformId: "instagram-square",
      layoutId: "product-focus",
      copyVariantIndex: 0,
      illustrationSrc: `${STORYSET}/web-search.svg`,
      pattern: legacyPatternRef("none"),
      showPattern: false,
      patternOpacity: 0,
      patternScale: 1,
    },
  },
  swiggy: {
    brandId: "swiggy",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Order in. Dig in.",
        subheading: "Top restaurants, live tracking, and hot delivery to your door.",
      },
      {
        heading: "Cravings, sorted",
        subheading: "Browse menus, grab offers, and watch your order arrive live.",
      },
      {
        heading: "Your city on a plate",
        subheading: "From local favorites to late-night fixes — Swiggy has you covered.",
      },
      {
        heading: "Hot food. Zero hassle.",
        subheading: "Thousands of restaurants. One app. Dinner handled in minutes.",
      },
      {
        heading: "Swiggy it",
        subheading: "When hunger hits, great food is never more than a tap away.",
      },
    ],
    illustrations: [
      `${STORYSET}/order-food.svg`,
      `${STORYSET}/delivery.svg`,
      `${STORYSET}/street-food.svg`,
      `${STORYSET}/healthy-food.svg`,
      `${STORYSET}/eating-healthy-food.svg`,
    ],
    defaultDesign: {
      platformId: "instagram-square",
      layoutId: "product-focus",
      copyVariantIndex: 0,
      illustrationSrc: `${STORYSET}/order-food.svg`,
      pattern: legacyPatternRef("footer"),
      showPattern: true,
      patternOpacity: 0.2,
      patternScale: 1.05,
    },
  },
  blinkit: {
    brandId: "blinkit",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Groceries in minutes",
        subheading: "Essentials, snacks, and fresh picks — at your door before you know it.",
      },
      {
        heading: "Blink and it's here",
        subheading: "Quick commerce that keeps pace with your day — not the other way around.",
      },
      {
        heading: "Need it now?",
        subheading: "Milk, produce, and midnight snacks — delivered in minutes.",
      },
      {
        heading: "Stock up instantly",
        subheading: "Thousands of everyday items without the store run.",
      },
      {
        heading: "Your quick store",
        subheading: "From breakfast to bedtime — everything your home runs on.",
      },
    ],
    illustrations: [
      `${STORYSET}/online-groceries.svg`,
      `${STORYSET}/grocery-shopping.svg`,
      `${STORYSET}/delivery-address.svg`,
      `${STORYSET}/drone-delivery.svg`,
      `${STORYSET}/select-house.svg`,
    ],
    defaultDesign: {
      platformId: "instagram-square",
      layoutId: "classic-hero",
      copyVariantIndex: 0,
      illustrationSrc: `${STORYSET}/online-groceries.svg`,
      pattern: libraryPatternRef("grid"),
      showPattern: true,
      patternOpacity: 0.14,
      patternScale: 1.2,
    },
  },
};

export function getLandingBrandContent(brandId: LandingBrandId): LandingBrandContent {
  return LANDING_BRAND_CONTENT[brandId];
}

export function landingCopyFromVariant(variant: CopyVariant): PostCopy {
  return {
    heading: variant.heading,
    subheading: variant.subheading,
    extraFields: [],
  };
}

export function landingDefaultDesignOverrides(brandId: LandingBrandId) {
  const { defaultDesign, copyVariants } = LANDING_BRAND_CONTENT[brandId];
  const variant =
    copyVariants[defaultDesign.copyVariantIndex] ?? copyVariants[0]!;

  return {
    platformId: defaultDesign.platformId,
    layoutId: defaultDesign.layoutId,
    copy: landingCopyFromVariant(variant),
    copyVariantIndex: defaultDesign.copyVariantIndex,
    illustrationSrc: defaultDesign.illustrationSrc,
    pattern: defaultDesign.pattern,
    showPattern: defaultDesign.showPattern,
    patternOpacity: defaultDesign.patternOpacity,
    patternScale: defaultDesign.patternScale,
    backgroundPresetId: defaultDesign.backgroundPresetId,
    showFeaturedImage: true as const,
  };
}

export function pickLandingCopyVariant(
  brandId: LandingBrandId,
  currentIndex: number,
): { copy: PostCopy; nextIndex: number } {
  const pool = LANDING_BRAND_CONTENT[brandId].copyVariants;
  const nextIndex = (currentIndex + 1) % pool.length;
  const variant = pool[nextIndex] ?? pool[0]!;
  return { copy: landingCopyFromVariant(variant), nextIndex };
}

export function pickLandingIllustration(
  brandId: LandingBrandId,
  currentSrc: string | null,
): string {
  const pool = LANDING_BRAND_CONTENT[brandId].illustrations;
  if (pool.length === 0) return "";
  const currentIdx = currentSrc ? pool.indexOf(currentSrc) : -1;
  const nextIdx = (currentIdx + 1) % pool.length;
  return pool[nextIdx] ?? pool[0]!;
}

export function defaultLandingIllustration(brandId: LandingBrandId): string {
  return LANDING_BRAND_CONTENT[brandId].defaultDesign.illustrationSrc;
}

export function defaultLandingCopy(brandId: LandingBrandId): PostCopy {
  const { defaultDesign, copyVariants } = LANDING_BRAND_CONTENT[brandId];
  const variant =
    copyVariants[defaultDesign.copyVariantIndex] ?? copyVariants[0]!;
  return landingCopyFromVariant(variant);
}

import type { LandingBrandId } from "@/components/landing/landingBrands";
import type { CopyVariant, PostCopy } from "@/lib/social-tool/presets";

export type LandingBrandContent = {
  brandId: LandingBrandId;
  /** Prefer light solid/gradient backgrounds (Claude). */
  preferLightBackground: boolean;
  copyVariants: ReadonlyArray<CopyVariant>;
  /** Public SVG paths for featured illustrations (no GenUI). */
  illustrations: ReadonlyArray<string>;
};

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
        heading: "Your next draft, done better",
        subheading: "From briefs to blogs — Claude helps you ship clearer work, faster.",
      },
      {
        heading: "Ask anything. Ship everything.",
        subheading: "A teammate for analysis, coding, and creative work — in one place.",
      },
      {
        heading: "Meet Claude for Work",
        subheading: "Enterprise-ready AI that remembers context and respects your data.",
      },
      {
        heading: "Less blank page. More breakthrough.",
        subheading: "Start from a question — finish with something you can publish.",
      },
    ],
    illustrations: [
      "/visuals/illustrations/undraw/code-thinking.svg",
      "/visuals/illustrations/undraw/chatting.svg",
      "/visuals/illustrations/undraw/solution-mindset.svg",
      "/visuals/illustrations/undraw/idea-to-plan.svg",
      "/visuals/illustrations/undraw/group-chat.svg",
    ],
  },
  linear: {
    brandId: "linear",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "The issue tracker you’ll actually love",
        subheading: "Plan, build, and ship — without the project-management tax.",
      },
      {
        heading: "Built for product teams that move",
        subheading: "Cycles, roadmaps, and issues that stay out of your way.",
      },
      {
        heading: "Ship faster. Stay aligned.",
        subheading: "One workspace for engineering, design, and product.",
      },
      {
        heading: "Projects that don’t drag",
        subheading: "Linear keeps status, owners, and priorities crystal clear.",
      },
      {
        heading: "From backlog to shipped",
        subheading: "A purpose-built system for modern software teams.",
      },
    ],
    illustrations: [
      "/visuals/illustrations/undraw/next-task.svg",
      "/visuals/illustrations/undraw/in-progress.svg",
      "/visuals/illustrations/undraw/design-components.svg",
      "/visuals/illustrations/undraw/idea-to-plan.svg",
      "/visuals/illustrations/undraw/system-interface.svg",
    ],
  },
  google: {
    brandId: "google",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Search the world’s information",
        subheading: "Find answers, explore ideas, and discover what matters — instantly.",
      },
      {
        heading: "Answers you can trust",
        subheading: "Organize the world’s knowledge and make it useful for everyone.",
      },
      {
        heading: "Ask. Explore. Understand.",
        subheading: "From local finds to deep research — Google helps you go further.",
      },
      {
        heading: "Knowledge at your fingertips",
        subheading: "Billions of results, ranked so you spend less time hunting.",
      },
      {
        heading: "Find what you’re looking for",
        subheading: "Search that understands intent — not just keywords.",
      },
    ],
    illustrations: [
      "/visuals/illustrations/undraw/search-results.svg",
      "/visuals/illustrations/undraw/person-search.svg",
      "/visuals/illustrations/undraw/data-transfer.svg",
      "/visuals/illustrations/undraw/solution-mindset.svg",
      "/visuals/illustrations/undraw/mobile-site-builder.svg",
    ],
  },
  swiggy: {
    brandId: "swiggy",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Hungry? Order in minutes",
        subheading: "Your favorite restaurants, delivered hot — whenever the craving hits.",
      },
      {
        heading: "Food that finds you",
        subheading: "Discover new places, track every order, eat happier.",
      },
      {
        heading: "Cravings, handled",
        subheading: "From biryani to brunch — Swiggy brings the city to your door.",
      },
      {
        heading: "Dinner, without the drama",
        subheading: "Browse menus, pay fast, and watch your order arrive live.",
      },
      {
        heading: "Eat what you love",
        subheading: "Thousands of restaurants. One app. Zero fuss.",
      },
    ],
    illustrations: [
      "/visuals/illustrations/undraw/happy-news.svg",
      "/visuals/illustrations/undraw/online-revenue.svg",
      "/visuals/illustrations/undraw/travel-everywhere.svg",
      "/visuals/illustrations/undraw/fitness-tracker.svg",
      "/visuals/illustrations/open-doodles/loving.svg",
    ],
  },
  blinkit: {
    brandId: "blinkit",
    preferLightBackground: false,
    copyVariants: [
      {
        heading: "Groceries in 10 minutes",
        subheading: "Milk, snacks, essentials — delivered before you finish this sentence.",
      },
      {
        heading: "Need it now? Blinkit it",
        subheading: "Thousands of everyday items, lightning-fast to your door.",
      },
      {
        heading: "Your kirana, supercharged",
        subheading: "Fresh picks and daily essentials — on demand, not on wait.",
      },
      {
        heading: "Late-night run? Skip it",
        subheading: "Stock up in minutes without leaving the couch.",
      },
      {
        heading: "Everything. Immediately.",
        subheading: "Quick commerce that keeps your home running smoothly.",
      },
    ],
    illustrations: [
      "/visuals/illustrations/undraw/happy-news.svg",
      "/visuals/illustrations/undraw/data-transfer.svg",
      "/visuals/illustrations/undraw/next-task.svg",
      "/visuals/illustrations/undraw/online-revenue.svg",
      "/visuals/illustrations/open-doodles/sprinting.svg",
    ],
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
  return LANDING_BRAND_CONTENT[brandId].illustrations[0] ?? "";
}

export function defaultLandingCopy(brandId: LandingBrandId): PostCopy {
  const variant = LANDING_BRAND_CONTENT[brandId].copyVariants[0]!;
  return landingCopyFromVariant(variant);
}

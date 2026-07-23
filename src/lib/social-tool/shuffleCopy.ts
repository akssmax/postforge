import { seedCopyForLayout, type PostLayout } from "@/lib/social-tool/postLayouts";
import type { CopyVariant, PostCopy } from "@/lib/social-tool/presets";

const FALLBACK_COPY_VARIANTS: ReadonlyArray<CopyVariant> = [
  {
    heading: "Your CRM Just Got Smarter",
    subheading: "Capture every interaction, automate every update.",
  },
  {
    heading: "Built for Teams That Move Fast",
    subheading: "One workspace for pipeline, outreach, and reporting.",
  },
  {
    heading: "Ship Campaigns Without the Chaos",
    subheading: "Plan, publish, and measure from a single brand kit.",
  },
  {
    heading: "Introducing Your Next Growth Lever",
    subheading: "A new chapter for your brand — share the news with your audience.",
  },
  {
    heading: "Turn Attention Into Pipeline",
    subheading: "Launch posts that look on-brand and convert on every channel.",
  },
  {
    heading: "See It in Action",
    subheading: "Explore the workflow your team will use every day.",
  },
  {
    heading: "Less Busywork. More Momentum.",
    subheading: "Automate updates, keep messaging sharp, stay consistent.",
  },
  {
    heading: "The Modern Stack for GTM Teams",
    subheading: "From first touch to closed-won — aligned in one place.",
  },
];

function applyVariantToCopy(
  current: PostCopy,
  variant: CopyVariant,
  layout: PostLayout,
): PostCopy {
  return seedCopyForLayout(
    {
      ...current,
      heading: variant.heading,
      subheading: variant.subheading,
    },
    layout,
  );
}

/** Cycle through brief-generated copy variants; falls back to static pool when empty. */
export function pickNextCopyVariant(
  current: PostCopy,
  layout: PostLayout,
  variants: CopyVariant[] | undefined,
  currentIndex: number | undefined,
): { copy: PostCopy; nextIndex: number; pool: CopyVariant[] } {
  const pool =
    variants && variants.length > 0 ? variants : [...FALLBACK_COPY_VARIANTS];
  const index = typeof currentIndex === "number" ? currentIndex : 0;
  const nextIndex = (index + 1) % pool.length;
  const variant = pool[nextIndex] ?? pool[0]!;

  return {
    copy: applyVariantToCopy(current, variant, layout),
    nextIndex,
    pool,
  };
}

/** @deprecated Use pickNextCopyVariant with session copyVariants. */
export function pickRandomShuffleCopy(
  current: PostCopy,
  layout: PostLayout,
): PostCopy {
  return pickNextCopyVariant(current, layout, undefined, undefined).copy;
}

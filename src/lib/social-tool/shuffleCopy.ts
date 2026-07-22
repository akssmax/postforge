import { seedCopyForLayout, type PostLayout } from "@/lib/social-tool/postLayouts";
import type { PostCopy } from "@/lib/social-tool/presets";

const SHUFFLE_COPY_VARIANTS: ReadonlyArray<{
  heading: string;
  subheading: string;
}> = [
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
  {
    heading: "Launch Week Starts Now",
    subheading: "Announce the update your customers have been waiting for.",
  },
  {
    heading: "Design Once. Publish Everywhere.",
    subheading: "Square, landscape, and story formats from one source of truth.",
  },
];

function pickRandom<T>(pool: T[], exclude?: T | null): T {
  const filtered =
    exclude != null ? pool.filter((item) => item !== exclude) : pool;
  const source = filtered.length > 0 ? filtered : pool;
  return source[Math.floor(Math.random() * source.length)]!;
}

export function pickRandomShuffleCopy(
  current: PostCopy,
  layout: PostLayout,
): PostCopy {
  const candidates = SHUFFLE_COPY_VARIANTS.filter(
    (variant) => variant.heading !== current.heading,
  );
  const picked = pickRandom(
    candidates.length > 0 ? [...candidates] : [...SHUFFLE_COPY_VARIANTS],
  );

  return seedCopyForLayout(
    {
      ...current,
      heading: picked.heading,
      subheading: picked.subheading,
    },
    layout,
  );
}

import {
  LANDING_DEMO_DESIGNS,
  type LandingDemoDesign,
} from "@/components/landing/landingDemoDesigns";

/** Curated showcase designs — same engine as the tool, hand-tuned for marketing. */
export const LANDING_GOLDEN_DESIGNS = LANDING_DEMO_DESIGNS;

export const LANDING_HERO_DESIGN_ID = "claude-launch";

export function getGoldenDesign(id: string): LandingDemoDesign | undefined {
  return LANDING_GOLDEN_DESIGNS.find((d) => d.id === id);
}

export function getHeroGoldenDesign(): LandingDemoDesign {
  return getGoldenDesign(LANDING_HERO_DESIGN_ID) ?? LANDING_GOLDEN_DESIGNS[0]!;
}

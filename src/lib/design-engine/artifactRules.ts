import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import { tryGetArtifact } from "@/lib/design-config/registry";
import type { DesignRulesProfile, FeaturedPolicy } from "@/lib/llm/rules/types";
import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import { resolveFeaturedStrategy } from "@/lib/social-tool/engine/visual/featuredStrategy";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import {
  isCopyOnlyArtifact,
  isDiagramArtifact,
  isInviteArtifact,
  isSocialAdArtifact,
} from "@/lib/design-engine/artifactReference";

const TEXT_SLOT_ROLES = new Set<TextSlotRole>([
  "headline",
  "subheading",
  "body",
  "caption",
  "title",
  "name",
  "cta",
  "contact",
]);

function isTextSlotRole(value: string): value is TextSlotRole {
  return TEXT_SLOT_ROLES.has(value as TextSlotRole);
}

export function artifactWantsLogoPlaceholder(artifact?: ArtifactDefinition | null): boolean {
  if (!artifact?.constraints) return false;
  const slots = [
    ...(artifact.constraints.requiredSlots ?? []),
    ...(artifact.constraints.optionalSlots ?? []),
  ];
  return slots.includes("logo");
}

export function artifactWantsLogoPlaceholderById(artifactId?: string | null): boolean {
  if (!artifactId) return false;
  return artifactWantsLogoPlaceholder(tryGetArtifact(artifactId));
}

export function mergeArtifactIntoRulesProfile(
  rulesProfile: DesignRulesProfile,
  artifact: ArtifactDefinition,
  plan: CampaignPlan,
): DesignRulesProfile {
  const featured = resolveFeaturedStrategy({ plan, rulesProfile, artifact });
  const merged: DesignRulesProfile = {
    ...rulesProfile,
    featuredPolicy: featured.featuredPolicy,
  };

  const requiredFromArtifact = (artifact.constraints?.requiredSlots ?? []).filter(isTextSlotRole);
  if (requiredFromArtifact.length > 0) {
    merged.requiredSlots = [
      ...new Set([...merged.requiredSlots, ...requiredFromArtifact]),
    ];
  }

  if (artifact.id === "business_card") {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 4, subheadingWords: 8, ctaWords: 0, maxTotalWords: 36 };
    merged.bannedSlots = [...new Set([...merged.bannedSlots, "cta" as TextSlotRole])];
    merged.patternPolicy = "never";
  }

  if (artifact.id === "meetup_poster" || (artifact.category === "events" && artifact.renderer === "product-shot")) {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 10, subheadingWords: 16, ctaWords: 12, maxTotalWords: 120 };
  }

  if (isInviteArtifact(artifact.id)) {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 8, subheadingWords: 14, ctaWords: 10, maxTotalWords: 90 };
  }

  if (isCopyOnlyArtifact(artifact.id)) {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 14, subheadingWords: 20, maxTotalWords: 80 };
    merged.featuredPolicy = "hidden";
    merged.patternPolicy = "never";
  }

  if (artifact.id === "proposal_cover") {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 8, subheadingWords: 12, maxTotalWords: 48 };
    merged.featuredPolicy = "hidden";
  }

  if (artifact.id === "hiring_post") {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 10, subheadingWords: 18, ctaWords: 8, maxTotalWords: 80 };
  }

  if (isSocialAdArtifact(artifact.id)) {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 8, subheadingWords: 16, ctaWords: 5, maxTotalWords: 40 };
  }

  if (isDiagramArtifact(artifact.id)) {
    merged.copyBudget = { ...merged.copyBudget, headlineWords: 8, subheadingWords: 12, maxTotalWords: 60 };
    merged.featuredPolicy = featured.featuredPolicy === "genui" ? "placeholder" : featured.featuredPolicy;
  }

  if (artifact.renderer === "print-doc" || artifact.capabilities.primaryContent === "text") {
    merged.featuredPolicy = featured.featuredPolicy;
  }

  return merged;
}

const SLOT_PROMPTS: Record<string, string[]> = {
  business_card: [
    "Format: business card — NOT a social ad.",
    "headline: person's name · subheading: job title · contact: email · phone",
    "Set showFeaturedImage false.",
  ],
  meetup_poster: [
    "Format: event poster — use exact title, date, time, venue, RSVP from brief.",
    "No SaaS copy or process diagrams.",
  ],
  birthday_invite: [
    "Format: birthday invitation — playful tone, honoree, date/time, location, RSVP.",
  ],
  wedding_invite: [
    "Format: wedding save-the-date — elegant tone, couple names, date, venue, RSVP.",
  ],
  rsvp_card: [
    "Format: RSVP card — event name, respond-by date, contact, clear RSVP line.",
  ],
  certificate: [
    "Format: certificate — recipient name as headline, program/course as subheading, date as body.",
    "Formal centered tone. No product visuals.",
  ],
  quote_card: [
    "Format: quote card — the quote as headline, attribution as subheading.",
    "Typography-focused. No extras unless brief provides context.",
  ],
  proposal_cover: [
    "Format: proposal cover — project title, client name, date. Professional enterprise tone.",
  ],
  hiring_post: [
    "Format: hiring post — role title, team hook, 1–2 role details, apply CTA.",
    "Inclusive friendly tone. No generic SaaS marketing.",
  ],
  linkedin_ad: [
    "Format: LinkedIn ad — benefit headline, proof subline, short CTA. B2B professional tone.",
  ],
  instagram_post: [
    "Format: Instagram post — punchy hook headline, short subline, optional CTA.",
  ],
  checklist: [
    "Format: checklist — title headline, each list item in section/body slots.",
    "Extract numbered or bulleted items from the brief.",
  ],
  framework: [
    "Format: framework infographic — title + 3–6 named pillars/steps in section slots.",
  ],
  timeline: [
    "Format: timeline — title + chronological milestones in section slots.",
  ],
  infographic: [
    "Format: infographic — title + scannable sections with short labels and detail lines.",
  ],
  comparison_chart: [
    "Format: comparison — title headline, optional body; diagram shows the comparison.",
  ],
  flowchart: [
    "Format: flowchart — short title; diagram is the primary content.",
  ],
  org_chart: [
    "Format: org chart — team/company name as headline; hierarchy in diagram.",
  ],
  process_flow: [
    "Format: process flow — process name as headline; steps in diagram.",
  ],
  pitch_deck: [
    "Format: pitch slide — one idea per slide, short headline + supporting body.",
  ],
  webinar_slides: [
    "Format: webinar slide — event title, speaker hook, date if title slide.",
  ],
  roadmap: [
    "Format: roadmap slide — timeframe headline, milestones in body/sections.",
  ],
};

export function artifactSlotPromptLines(
  artifact: ArtifactDefinition,
  brief: string,
): string[] {
  const specific = SLOT_PROMPTS[artifact.id];
  if (specific) return specific;

  if (artifact.category === "events") {
    return SLOT_PROMPTS.meetup_poster ?? [];
  }

  if (artifact.renderer === "print-doc") {
    return [
      `Format: ${artifact.label} — print-ready, text-first.`,
      "Set showFeaturedImage false unless brief asks for a photo.",
    ];
  }

  if (artifact.capabilities.primaryContent === "diagram") {
    return [
      `Format: ${artifact.label} — diagram is primary; keep headline short.`,
      "Fill section/body slots with step or node labels from the brief.",
    ];
  }

  return brief.trim()
    ? [`Artifact: ${artifact.label} (${artifact.category}). Use details from the brief.`]
    : [`Artifact: ${artifact.label}.`];
}

export function effectiveFeaturedPolicy(
  rulesProfile: DesignRulesProfile,
  artifact: ArtifactDefinition,
  plan: CampaignPlan,
): FeaturedPolicy {
  return mergeArtifactIntoRulesProfile(rulesProfile, artifact, plan).featuredPolicy;
}

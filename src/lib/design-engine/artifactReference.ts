import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

/** Primary reference layout per artifact — used for validation and docs. */
export const ARTIFACT_REFERENCE_LAYOUT: Record<string, PostLayoutId> = {
  business_card: "business-card",
  meetup_poster: "event-poster",
  birthday_invite: "invite-card",
  wedding_invite: "invite-card",
  rsvp_card: "invite-card",
  certificate: "copy-only",
  quote_card: "copy-only",
  proposal_cover: "proposal-cover",
  hiring_post: "hiring-post",
  linkedin_ad: "social-ad",
  instagram_post: "social-ad",
  checklist: "section-stack",
  comparison_chart: "comparison-columns",
  flowchart: "diagram-primary",
  org_chart: "diagram-primary",
  process_flow: "diagram-primary",
  framework: "section-stack",
  timeline: "section-stack",
  infographic: "section-stack",
  pitch_deck: "deck-sidebar",
  webinar_slides: "deck-sidebar",
  roadmap: "deck-sidebar",
};

/** Preferred platform when artifact doesn't specify via brief keywords. */
export const ARTIFACT_DEFAULT_PLATFORM: Partial<Record<string, PlatformId>> = {
  business_card: "business-card",
  meetup_poster: "poster-portrait",
  birthday_invite: "invite-portrait",
  wedding_invite: "invite-portrait",
  rsvp_card: "invite-portrait",
  certificate: "certificate-landscape",
  quote_card: "instagram-square",
  proposal_cover: "linkedin-landscape",
  hiring_post: "linkedin-square",
  linkedin_ad: "linkedin-square",
  instagram_post: "instagram-square",
  checklist: "poster-portrait",
  comparison_chart: "linkedin-landscape",
  flowchart: "linkedin-landscape",
  org_chart: "linkedin-square",
  process_flow: "linkedin-landscape",
  framework: "instagram-square",
  timeline: "linkedin-landscape",
  infographic: "poster-portrait",
  pitch_deck: "linkedin-landscape",
  webinar_slides: "linkedin-landscape",
  roadmap: "linkedin-landscape",
};

export function referenceLayoutForArtifact(artifactId: string): PostLayoutId | undefined {
  return ARTIFACT_REFERENCE_LAYOUT[artifactId];
}

export function isDiagramArtifact(artifactId?: string): boolean {
  return (
    artifactId === "flowchart" ||
    artifactId === "org_chart" ||
    artifactId === "process_flow" ||
    artifactId === "comparison_chart" ||
    artifactId === "framework" ||
    artifactId === "timeline" ||
    artifactId === "infographic" ||
    artifactId === "roadmap"
  );
}

export function isSectionStackArtifact(artifactId?: string): boolean {
  if (!artifactId) return false;
  return (
    artifactId === "checklist" ||
    artifactId === "framework" ||
    artifactId === "timeline" ||
    artifactId === "infographic"
  );
}

export function isCopyOnlyArtifact(artifactId?: string): boolean {
  return artifactId === "certificate" || artifactId === "quote_card";
}

export function isSocialAdArtifact(artifactId?: string): boolean {
  return artifactId === "linkedin_ad" || artifactId === "instagram_post";
}

export function isInviteArtifact(artifactId?: string): boolean {
  return (
    artifactId === "birthday_invite" ||
    artifactId === "wedding_invite" ||
    artifactId === "rsvp_card"
  );
}

import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import type { PostCopy } from "@/lib/social-tool/presets";
import {
  isCopyOnlyArtifact,
  isInviteArtifact,
  isSocialAdArtifact,
} from "@/lib/design-engine/artifactReference";
import { isEventArtifact } from "@/lib/design-engine/artifactBriefParser";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";

export type SlotConstraint = {
  role: TextSlotRole;
  maxCharacters: number;
  minCharacters: number;
  maxWords?: number;
  label: string;
};

const DEFAULT_CONSTRAINTS: Record<TextSlotRole, SlotConstraint> = {
  headline: {
    role: "headline",
    maxCharacters: 72,
    minCharacters: 4,
    label: "Headline",
  },
  subheading: {
    role: "subheading",
    maxCharacters: 140,
    minCharacters: 8,
    label: "Subheading",
  },
  body: {
    role: "body",
    maxCharacters: 220,
    minCharacters: 0,
    label: "Body",
  },
  caption: {
    role: "caption",
    maxCharacters: 48,
    minCharacters: 0,
    label: "Caption",
  },
  title: {
    role: "title",
    maxCharacters: 64,
    minCharacters: 0,
    label: "Title",
  },
  name: {
    role: "name",
    maxCharacters: 48,
    minCharacters: 0,
    label: "Name",
  },
  cta: {
    role: "cta",
    maxCharacters: 32,
    minCharacters: 0,
    label: "Call to action",
  },
  contact: {
    role: "contact",
    maxCharacters: 120,
    minCharacters: 0,
    label: "Contact",
  },
};

export function resolveSlotLabel(role: TextSlotRole, artifactId?: string): string {
  if (isInviteArtifact(artifactId)) {
    switch (role) {
      case "headline":
        return "Event title";
      case "subheading":
        return "Host / couple";
      case "body":
        return "Date & details";
      case "contact":
        return "Location";
      case "cta":
        return "RSVP";
      default:
        break;
    }
  }
  if (isEventArtifact(artifactId)) {
    switch (role) {
      case "headline":
        return "Event title";
      case "subheading":
        return "Audience";
      case "body":
        return "Date & time";
      case "contact":
        return "Venue";
      case "cta":
        return "RSVP / CTA";
      case "caption":
        return "RSVP / CTA";
      default:
        break;
    }
  }
  if (artifactId === "business_card") {
    switch (role) {
      case "headline":
        return "Name";
      case "subheading":
        return "Title";
      case "contact":
        return "Contact";
      case "body":
        return "Company";
      default:
        break;
    }
  }
  if (isCopyOnlyArtifact(artifactId)) {
    switch (role) {
      case "headline":
        return artifactId === "certificate" ? "Recipient name" : "Quote";
      case "subheading":
        return artifactId === "certificate" ? "Award title" : "Attribution";
      case "body":
        return artifactId === "certificate" ? "Citation" : "Context";
      case "contact":
        return "Signatory";
      default:
        break;
    }
  }
  if (artifactId === "proposal_cover") {
    switch (role) {
      case "headline":
        return "Project title";
      case "subheading":
        return "Client / subtitle";
      case "body":
        return "Summary";
      case "contact":
        return "Prepared for";
      default:
        break;
    }
  }
  if (artifactId === "hiring_post") {
    switch (role) {
      case "headline":
        return "Role title";
      case "subheading":
        return "Team / location";
      case "body":
        return "Highlights";
      case "cta":
        return "Apply CTA";
      default:
        break;
    }
  }
  if (isSocialAdArtifact(artifactId)) {
    switch (role) {
      case "headline":
        return "Hook";
      case "subheading":
        return "Value prop";
      case "body":
        return "Supporting copy";
      case "cta":
        return "Call to action";
      default:
        break;
    }
  }
  if (artifactId === "checklist") {
    switch (role) {
      case "headline":
        return "Title";
      case "subheading":
        return "Subtitle";
      case "body":
        return "Checklist items";
      default:
        break;
    }
  }
  if (
    artifactId === "flowchart" ||
    artifactId === "org_chart" ||
    artifactId === "process_flow" ||
    artifactId === "comparison_chart"
  ) {
    switch (role) {
      case "headline":
        return "Diagram title";
      case "body":
        return "Notes";
      default:
        break;
    }
  }
  if (
    artifactId === "framework" ||
    artifactId === "timeline" ||
    artifactId === "infographic"
  ) {
    switch (role) {
      case "headline":
        return "Title";
      case "subheading":
        return "Subtitle";
      case "body":
        return "Sections";
      default:
        break;
    }
  }
  return DEFAULT_CONSTRAINTS[role].label;
}

/** Sidebar label for one editable text slot — prefers stored copy labels, then slot id. */
export function resolveEditableSlotLabel(
  slotId: string,
  role: TextSlotRole,
  copy: PostCopy,
  artifactId?: string,
): string {
  const fromCopy = copy.extraFields.find((field) => field.id === slotId)?.label?.trim();
  if (fromCopy) return fromCopy;

  if (slotId.startsWith("section-")) {
    const index = Number(slotId.split("-")[1] ?? 0);
    if (artifactId === "checklist") return `Item ${index + 1}`;
    return `Section ${index + 1}`;
  }

  if (slotId === "extra-2") {
    if (isInviteArtifact(artifactId)) return "Date & details";
    if (isEventArtifact(artifactId)) return "Date & time";
    if (isSocialAdArtifact(artifactId)) return "Supporting copy";
    if (artifactId === "hiring_post") return "Highlights";
    if (artifactId === "proposal_cover") return "Summary";
  }

  if (slotId === "contact-footer") {
    if (isInviteArtifact(artifactId)) return "Location";
    if (isEventArtifact(artifactId)) return "Venue";
    if (artifactId === "business_card") return "Contact";
    if (artifactId === "proposal_cover") return "Prepared for";
    if (artifactId === "certificate") return "Signatory";
  }

  if (slotId === "extras-footer") {
    if (isInviteArtifact(artifactId)) return "RSVP";
    if (isEventArtifact(artifactId)) return "RSVP / CTA";
    if (artifactId === "hiring_post") return "Apply CTA";
    if (isSocialAdArtifact(artifactId)) return "Call to action";
  }

  return resolveSlotLabel(role, artifactId);
}

export function getSlotConstraint(
  role: TextSlotRole,
  rulesProfile?: DesignRulesProfile,
  artifactId?: string,
): SlotConstraint {
  const base = DEFAULT_CONSTRAINTS[role];
  const label = resolveSlotLabel(role, artifactId);
  const withLabel = { ...base, label };
  if (!rulesProfile) return withLabel;

  const maxChars = rulesProfile.slotLimits[role];
  if (maxChars === 0) {
    return { ...withLabel, maxCharacters: 0, minCharacters: 0, maxWords: 0 };
  }
  if (maxChars != null) {
    const wordKey =
      role === "headline"
        ? "headlineWords"
        : role === "subheading"
          ? "subheadingWords"
          : role === "caption"
            ? "ctaWords"
            : undefined;
    return {
      ...withLabel,
      maxCharacters: maxChars,
      maxWords: wordKey ? rulesProfile.copyBudget[wordKey] : undefined,
    };
  }
  return withLabel;
}

export function slotConstraintsPrompt(
  role: TextSlotRole,
  rulesProfile?: DesignRulesProfile,
): string {
  const c = getSlotConstraint(role, rulesProfile);
  if (c.maxCharacters === 0) {
    return `${c.label}: do not fill this slot`;
  }
  const wordPart = c.maxWords != null ? `, max ${c.maxWords} words` : "";
  return `${c.label}: max ${c.maxCharacters} chars${wordPart}${c.minCharacters > 0 ? `, min ${c.minCharacters}` : ""}`;
}

export function countWords(text: string): number {
  const stripped = text.replace(/\[\[accent\]\]|\[\[\/accent\]\]/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

export function totalCopyWords(
  slots: { role: TextSlotRole; text: string }[],
  rulesProfile?: DesignRulesProfile,
): number {
  return slots.reduce((sum, slot) => {
    if (rulesProfile?.bannedSlots.includes(slot.role)) return sum;
    return sum + countWords(slot.text);
  }, 0);
}

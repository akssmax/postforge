import type { PostCopy } from "@/lib/social-tool/presets";
import {
  isCopyOnlyArtifact,
  isInviteArtifact,
  isSectionStackArtifact,
  isSocialAdArtifact,
} from "@/lib/design-engine/artifactReference";
import type { ArtifactDefinition } from "@/lib/design-config/schemas";

function extractMarkdownField(brief: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const patterns = [
      new RegExp(`\\*\\s*\\*\\*${key}:\\*\\*\\s*(.+?)(?=\\n|$)`, "i"),
      new RegExp(`\\*\\*${key}:\\*\\*\\s*(.+?)(?=\\n|$)`, "i"),
      new RegExp(`(?:^|\\n)${key}:\\s*(.+?)(?=\\n|$)`, "im"),
      new RegExp(`(?:^|\\n)\\*\\s*${key}:\\s*(.+?)(?=\\n|$)`, "im"),
    ];
    for (const pattern of patterns) {
      const match = brief.match(pattern);
      const value = match?.[1]?.trim();
      if (value) return value.replace(/\*$/, "").trim();
    }
  }
  return undefined;
}

function extractListItems(brief: string, max = 6): string[] {
  const items: string[] = [];
  for (const line of brief.split("\n")) {
    const match = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (match?.[1]?.trim()) items.push(match[1].trim());
  }
  return items.slice(0, max);
}

/** Parse structured event briefs (markdown lists, design challenges) into poster copy. */
export function parseEventPosterBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  const looksLikeEvent =
    lower.includes("meetup") ||
    lower.includes("event") ||
    lower.includes("poster") ||
    lower.includes("rsvp") ||
    lower.includes("venue") ||
    extractMarkdownField(brief, ["Title", "Event", "Date"]);

  if (!looksLikeEvent) return null;

  const title =
    extractMarkdownField(brief, ["Title", "Event"]) ??
    (brief.match(/Design & [^\n]+/i)?.[0]?.trim() ?? "Community Meetup");

  const audience =
    extractMarkdownField(brief, ["Audience", "Who"]) ??
    "Designers, developers, and creators";

  const date =
    extractMarkdownField(brief, ["Date", "When"]) ?? "Saturday, 22 August";

  const time =
    extractMarkdownField(brief, ["Time"]) ?? "10:00 AM – 1:00 PM";

  const venue =
    extractMarkdownField(brief, ["Venue", "Location", "Where"]) ??
    "WeWork, Koramangala, Bengaluru";

  const cta =
    extractMarkdownField(brief, ["CTA", "RSVP", "Register"]) ??
    "Scan the QR code to RSVP";

  return {
    heading: title,
    subheading: audience,
    extraFields: [
      { id: "extra-2", label: "Date & time", value: `${date} · ${time}` },
      { id: "contact-footer", label: "Venue", value: venue },
      { id: "extras-footer", label: "RSVP", value: cta },
    ],
  };
}

export function parseInviteBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (
    !lower.includes("invite") &&
    !lower.includes("birthday") &&
    !lower.includes("wedding") &&
    !lower.includes("rsvp") &&
    !lower.includes("save the date")
  ) {
    return null;
  }

  const title =
    extractMarkdownField(brief, ["Title", "Event", "Occasion"]) ??
    (lower.includes("wedding") ? "Save the Date" : "You're Invited!");

  const date = extractMarkdownField(brief, ["Date", "When"]) ?? "Saturday, 15 March";
  const time = extractMarkdownField(brief, ["Time"]) ?? "6:00 PM";
  const venue =
    extractMarkdownField(brief, ["Venue", "Location", "Where"]) ??
    "The Garden Venue";
  const cta =
    extractMarkdownField(brief, ["RSVP", "CTA", "Respond"]) ??
    "Please RSVP by 1 March";

  return {
    heading: title,
    subheading: extractMarkdownField(brief, ["Host", "Couple", "Honoree"]) ?? "",
    extraFields: [
      { id: "extra-2", label: "Date & time", value: `${date} · ${time}` },
      { id: "contact-footer", label: "Location", value: venue },
      { id: "extras-footer", label: "RSVP", value: cta },
    ],
  };
}

export function parseBusinessCardBrief(brief: string): PostCopy {
  const forMatch = brief.match(
    /(?:for|card for|business card for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  );
  const name = forMatch?.[1]?.trim() ?? "Alex Chen";
  const titleMatch = brief.match(
    /(?:,\s*|\bas\s+|\btitle[:\s]+)([A-Za-z][^,\n.]{2,60})/i,
  );
  let title =
    titleMatch?.[1]?.trim().replace(/\.$/, "") ?? "Senior Product Designer";
  if (title.toLowerCase() === "title") title = "Senior Product Designer";
  const companyMatch = brief.match(
    /(?:at|@|company[:\s]+)([A-Z][A-Za-z0-9 &.'-]{2,40})/i,
  );
  const company = companyMatch?.[1]?.trim() ?? "Acme Studio";
  const emailMatch = brief.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = brief.match(/(?:\+?\d[\d\s().-]{7,}\d)/);

  return {
    heading: name,
    subheading: title,
    extraFields: [
      { id: "extra-2", label: "Company", value: company },
      {
        id: "contact-footer",
        label: "Contact",
        value: [emailMatch?.[0] ?? "alex@company.com", phoneMatch?.[0]?.trim() ?? "+1 415 555 0198"].join(" · "),
      },
    ],
  };
}

export function parseCertificateBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("certificate") && !lower.includes("completion") && !lower.includes("award")) {
    return null;
  }
  return {
    heading:
      extractMarkdownField(brief, ["Recipient", "Name", "Awarded to"]) ??
      "Certificate of Completion",
    subheading:
      extractMarkdownField(brief, ["Course", "Program", "Achievement"]) ??
      "Advanced Design Systems",
    extraFields: [
      {
        id: "extra-2",
        label: "Date",
        value: extractMarkdownField(brief, ["Date"]) ?? "July 2026",
      },
    ],
  };
}

export function parseQuoteBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("quote") && !lower.includes("testimonial") && !lower.includes("insight")) {
    return null;
  }
  const quoted = brief.match(/[""]([^""]+)[""]/)?.[1]?.trim();
  return {
    heading: quoted ?? extractMarkdownField(brief, ["Quote", "Headline"]) ?? "Design is intelligence made visible.",
    subheading: extractMarkdownField(brief, ["Author", "Attribution", "Source"]) ?? "— Alina Wheeler",
    extraFields: [],
  };
}

export function parseHiringBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("hiring") && !lower.includes("join our team") && !lower.includes("open role")) {
    return null;
  }
  return {
    heading:
      extractMarkdownField(brief, ["Role", "Title", "Headline"]) ??
      "We're hiring a Product Designer",
    subheading:
      extractMarkdownField(brief, ["Team", "Hook", "Subheading"]) ??
      "Help us shape the future of collaborative design tools.",
    extraFields: [
      {
        id: "extra-2",
        label: "Details",
        value:
          extractMarkdownField(brief, ["Details", "Body"]) ??
          "Remote-friendly · Full-time · Competitive equity",
      },
      {
        id: "extras-footer",
        label: "Apply",
        value: extractMarkdownField(brief, ["CTA", "Apply"]) ?? "Apply at careers.company.com",
      },
    ],
  };
}

export function parseProposalCoverBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("proposal") && !lower.includes("cover page") && !lower.includes("rfp")) {
    return null;
  }
  return {
    heading:
      extractMarkdownField(brief, ["Project", "Title"]) ?? "Website Redesign Proposal",
    subheading: extractMarkdownField(brief, ["Client", "Prepared for"]) ?? "Prepared for Acme Corp",
    extraFields: [
      {
        id: "extra-2",
        label: "Date",
        value: extractMarkdownField(brief, ["Date"]) ?? "July 2026",
      },
    ],
  };
}

const CTA_PATTERN =
  /\b(book (?:a|your) (?:demo|call|seat|table)|book now|order (?:now|today)|shop (?:now|the sale)|sign up(?: today| now| free)?|start (?:your )?free trial|get started|learn more|register(?: now| today)?|apply(?: now| today)?|join (?:us|now|the waitlist|today)|download(?: now)?|try (?:it )?(?:free|now)|reserve (?:your )?(?:seat|spot|table)|rsvp|subscribe(?: now)?|contact us|buy now|claim (?:your )?(?:offer|discount|spot))\b/i;

/** Format prefixes like "LinkedIn ad for Acme analytics:" — the product name follows "for". */
const FORMAT_PREFIX =
  /^(?:please\s+)?(?:create|make|design|write)?\s*(?:an?\s+)?(?:[\w-]+\s+){0,3}?(?:ad|post|story|banner|carousel|flyer|poster|announcement|graphic|creative)\s+(?:for|about)\s+([^:.—–]+?)\s*[:.—–]\s*(.*)$/i;

/** "LinkedIn ad announcing our AI-native CRM" — the message follows the verb. */
const FORMAT_VERB_PREFIX =
  /^(?:please\s+)?(?:create|make|design|write)?\s*(?:an?\s+)?(?:[\w-]+\s+){0,3}?(?:ad|post|story|banner|carousel|flyer|poster|graphic|creative)\s+(?:announcing|introducing|launching|promoting|celebrating)\s+(?:our\s+|the\s+)?(.*)$/i;

const ACCENT_PHRASE = /(\d+(?:[.,]\d+)?\s?(?:×|x|%)(?:\s+(?:off|faster|more|less|cheaper|better|growth|savings?))?)/i;

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Deterministic copy from a free-text brief (no AI): headline from the first
 * clause, a number phrase as the accent, the CTA from imperative phrases and the
 * remaining sentences as the subheading. Uses only words from the brief.
 */
export function copyFromFreeTextBrief(brief: string): { heading?: string; subheading?: string; cta?: string } {
  const text = brief.replace(/\s+/g, " ").trim();
  if (!text) return {};
  const prefixed = text.match(FORMAT_PREFIX);
  const verbPrefixed = prefixed ? null : text.match(FORMAT_VERB_PREFIX);
  const product = prefixed?.[1]?.trim();
  const body = (prefixed ? prefixed[2] : verbPrefixed ? verbPrefixed[1] : text) ?? "";
  const ctaMatch = body.match(CTA_PATTERN);
  const cta = ctaMatch ? capitalize(ctaMatch[0]) : undefined;
  const sentences = body
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !(ctaMatch && sentence.replace(/[.!?]+$/, "").trim().toLowerCase() === ctaMatch[0].toLowerCase()));
  const first = sentences[0]?.replace(/[.!?]+$/, "").trim();
  if (!first) return { cta, subheading: product };

  let heading = first;
  let lead = "";
  if (heading.split(" ").length > 8) {
    const [clause, ...rest] = heading.split(/,\s*|\s+with\s+|\s+[—–]\s+/);
    heading = clause ?? heading;
    lead = rest.join(", ");
  }
  heading = capitalize(heading.replace(ACCENT_PHRASE, "[[$1]]"));
  const subheading = [lead && capitalize(lead) + ".", ...sentences.slice(1)].filter(Boolean).join(" ").trim() || product;
  return { heading, subheading, cta };
}

export function parseSocialAdBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("linkedin") && !lower.includes("instagram") && !lower.includes(" ad")) {
    return null;
  }
  const free = copyFromFreeTextBrief(brief);
  const cta = extractMarkdownField(brief, ["CTA", "Call to action"]) ?? free.cta ?? "Start free trial";
  return {
    heading:
      extractMarkdownField(brief, ["Headline", "Title", "Benefit"]) ??
      free.heading ??
      "Ship campaigns 10× faster",
    subheading:
      extractMarkdownField(brief, ["Subheading", "Subline", "Proof"]) ??
      // Copy read from the brief beats an unrelated template line, even when empty.
      (free.heading ? (free.subheading ?? "") : "One workspace for briefs, variants, and on-brand exports."),
    extraFields: [
      { id: "extras-footer", label: "CTA", value: cta },
      // Button-CTA layouts read the cta-primary slot.
      { id: "cta-primary", label: "CTA", value: cta },
    ],
  };
}

export function parseChecklistBrief(brief: string): PostCopy | null {
  const lower = brief.toLowerCase();
  if (!lower.includes("checklist") && !lower.includes("steps") && !lower.includes("framework")) {
    return null;
  }
  const items = extractListItems(brief);
  const title =
    extractMarkdownField(brief, ["Title", "Headline"]) ??
    (lower.includes("framework") ? "5-Step Framework" : "Launch Checklist");

  return {
    heading: title,
    subheading: extractMarkdownField(brief, ["Subheading"]) ?? "",
    extraFields: items.map((item, i) => ({
      id: `section-${i}`,
      label: `Step ${i + 1}`,
      value: item,
    })),
  };
}

export function parseArtifactBrief(
  brief: string,
  artifact?: ArtifactDefinition,
): PostCopy | null {
  if (!artifact) return null;
  const id = artifact.id;

  if (id === "business_card") return parseBusinessCardBrief(brief);
  if (id === "meetup_poster" || (artifact.category === "events" && id === "meetup_poster")) {
    return parseEventPosterBrief(brief);
  }
  if (isInviteArtifact(id)) return parseInviteBrief(brief) ?? parseEventPosterBrief(brief);
  if (isCopyOnlyArtifact(id)) {
    return id === "quote_card" ? parseQuoteBrief(brief) : parseCertificateBrief(brief);
  }
  if (id === "hiring_post") return parseHiringBrief(brief);
  if (id === "proposal_cover") return parseProposalCoverBrief(brief);
  if (isSocialAdArtifact(id)) return parseSocialAdBrief(brief);
  if (isSectionStackArtifact(id)) return parseChecklistBrief(brief);

  if (artifact.category === "events") return parseEventPosterBrief(brief);
  return null;
}

export function isEventArtifact(artifactId?: string): boolean {
  return (
    artifactId === "meetup_poster" ||
    artifactId === "birthday_invite" ||
    artifactId === "wedding_invite" ||
    artifactId === "rsvp_card"
  );
}

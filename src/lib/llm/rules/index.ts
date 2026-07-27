import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import {
  getCampaignRules,
  getFormatOverlay,
  listFormatOverlays,
  tryGetCampaignRules,
  type FormatOverlay,
} from "@/lib/design-config/registry";
import type {
  DesignRulesIntent,
  DesignRulesProfile,
  FeaturedPolicy,
  LayoutPolicy,
  PatternPolicy,
  BackgroundPolicy,
} from "@/lib/llm/rules/types";
import type { PlatformId } from "@/lib/social-tool/presets";

export type { DesignRulesProfile, DesignRulesIntent } from "@/lib/llm/rules/types";
export { extractThemesFromBrief, shouldGenerateVariants } from "@/lib/llm/rules/extractThemes";

function isLinkedIn(platform: string): boolean {
  return platform === "linkedin" || platform.startsWith("linkedin-");
}

function isAdIntent(intent: DesignRulesIntent): boolean {
  if (intent.format === "ad") return true;
  return (
    intent.campaignType === "advertisement" ||
    intent.campaignType === "promotion"
  );
}

function overlayToProfile(overlay: FormatOverlay): DesignRulesProfile {
  return {
    id: overlay.id,
    label: overlay.label,
    copyBudget: overlay.copyBudget,
    slotLimits: overlay.slotLimits as DesignRulesProfile["slotLimits"],
    layoutPolicy: overlay.layoutPolicy as LayoutPolicy,
    featuredPolicy: overlay.featuredPolicy as FeaturedPolicy,
    patternPolicy: overlay.patternPolicy as PatternPolicy,
    backgroundPolicy: overlay.backgroundPolicy as BackgroundPolicy,
    visualBalance: overlay.visualBalance,
    requiredSlots: overlay.requiredSlots as TextSlotRole[],
    bannedSlots: overlay.bannedSlots as TextSlotRole[],
    maxCopyRetries: overlay.maxCopyRetries,
  };
}

function pickFormatOverlay(input: {
  platform: string;
  format?: "ad" | "post";
  campaignType: string;
}): FormatOverlay {
  const overlays = listFormatOverlays();

  if (isLinkedIn(input.platform) && isAdIntent(input)) {
    return getFormatOverlay("linkedin-ad");
  }
  if (isLinkedIn(input.platform)) {
    return getFormatOverlay("linkedin-post");
  }
  if (input.campaignType === "advertisement" || input.campaignType === "promotion") {
    return getFormatOverlay("advertisement");
  }

  const formatMatch = overlays.find(
    (o) =>
      o.id !== "default" &&
      (input.format ? o.formats.includes(input.format) : false) &&
      (o.platforms.length === 0 ||
        o.platforms.some((p) => input.platform === p || input.platform.startsWith(`${p}-`))),
  );
  if (formatMatch) return formatMatch;

  return getFormatOverlay("default");
}

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

function mergeCampaignIntoProfile(
  profile: DesignRulesProfile,
  campaignType: string,
): DesignRulesProfile {
  const rules = tryGetCampaignRules(campaignType);
  if (!rules) return profile;

  const requiredFromCampaign = rules.requiredSlots.filter(isTextSlotRole);
  const bannedFromCampaign = rules.bannedSlots.filter(isTextSlotRole);

  return {
    ...profile,
    copyBudget: {
      ...profile.copyBudget,
      headlineWords: rules.headline?.maxWords ?? profile.copyBudget.headlineWords,
      subheadingWords: rules.subheading?.maxWords ?? profile.copyBudget.subheadingWords,
      maxTotalWords: rules.copy?.maxTotalWords ?? profile.copyBudget.maxTotalWords,
    },
    requiredSlots: [
      ...new Set(
        [...profile.requiredSlots, ...requiredFromCampaign].filter(isTextSlotRole),
      ),
    ],
    bannedSlots: [
      ...new Set([...profile.bannedSlots, ...bannedFromCampaign].filter(isTextSlotRole)),
    ],
  };
}

/** Compile DesignRulesProfile from YAML overlays + campaign rules. */
export function resolveDesignRules(
  intent: DesignRulesIntent | CampaignIntent | CampaignPlan,
): DesignRulesProfile {
  const isPlan = "campaign" in intent && typeof intent.campaign === "object";
  const platform = isPlan
    ? (intent as CampaignPlan).platform
    : (intent as DesignRulesIntent).platform;
  const campaignType = isPlan
    ? (intent as CampaignPlan).campaign.type
    : (intent as DesignRulesIntent).campaignType;
  const format = isPlan
    ? (intent as CampaignPlan).format
    : (intent as DesignRulesIntent).format;

  const overlay = pickFormatOverlay({ platform, format, campaignType });
  const profile = overlayToProfile(overlay);
  return mergeCampaignIntoProfile(profile, campaignType);
}

export function detectFormatFromBrief(brief: string): "ad" | "post" | undefined {
  const lower = brief.toLowerCase();
  if (/\b\d+\s*[x×]\s*(linkedin\s*)?ad\b/.test(lower)) return "ad";
  if (/\blinkedin\s+ad\b/.test(lower)) return "ad";
  if (/\bad\s+creative\b/.test(lower)) return "ad";
  if (/\bsponsored\b/.test(lower) && lower.includes("linkedin")) return "ad";
  if (/\borganic\s+post\b/.test(lower)) return "post";
  return undefined;
}

export function rulesProfilePrompt(profile: DesignRulesProfile): string {
  const featuredLine =
    profile.featuredPolicy === "library"
      ? "Featured: library — infer featuredVisualKind (ui vs illustration) from brief intent; pick HeroUI UI cards for product/metrics proof, illustrations for brand/narrative/festive themes; match tags to copy."
      : `Featured: ${profile.featuredPolicy}.`;

  return [
    `Rules profile: ${profile.label}`,
    `Copy budget: headline ≤${profile.copyBudget.headlineWords} words, subheading ≤${profile.copyBudget.subheadingWords} words, CTA ≤${profile.copyBudget.ctaWords} words, total ≤${profile.copyBudget.maxTotalWords} words.`,
    `Layout policy: ${profile.layoutPolicy}. ${featuredLine} Pattern: ${profile.patternPolicy}.`,
    profile.bannedSlots.length
      ? `Do not fill these slots: ${profile.bannedSlots.join(", ")}.`
      : "",
    `Required slots: ${profile.requiredSlots.join(", ")}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function resolveDesignRulesForBrief(
  intent: CampaignIntent | CampaignPlan,
  brief: string,
): DesignRulesProfile {
  const format = detectFormatFromBrief(brief);
  if ("campaign" in intent && typeof intent.campaign === "object") {
    return resolveDesignRules({ ...(intent as CampaignPlan), format: format ?? intent.format });
  }
  return resolveDesignRules({ ...(intent as CampaignIntent), format });
}

export function resolveDesignRulesForPlatform(
  campaignType: string,
  platformId: PlatformId,
  brief: string,
): DesignRulesProfile {
  const format = detectFormatFromBrief(brief);
  return resolveDesignRules({ campaignType, platform: platformId, format });
}

export function resolveDesignRulesForPlan(
  plan: CampaignPlan,
  brief: string,
): DesignRulesProfile {
  return resolveDesignRulesForBrief(plan, brief);
}

/** Expose campaign YAML for validation stages. */
export { getCampaignRules };

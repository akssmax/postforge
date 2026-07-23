import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import { defaultRulesProfile } from "@/lib/llm/rules/profiles/default";
import { linkedinAdRulesProfile } from "@/lib/llm/rules/profiles/linkedin-ad";
import { linkedinPostRulesProfile } from "@/lib/llm/rules/profiles/linkedin-post";
import type { DesignRulesIntent, DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PlatformId } from "@/lib/social-tool/presets";

export type { DesignRulesProfile, DesignRulesIntent } from "@/lib/llm/rules/types";
export { extractThemesFromBrief, shouldGenerateVariants } from "@/lib/llm/rules/extractThemes";

function isLinkedIn(platform: string): boolean {
  return platform === "linkedin" || platform.startsWith("linkedin-");
}

function isAdIntent(intent: DesignRulesIntent): boolean {
  if (intent.format === "ad") return true;
  return intent.campaignType === "advertisement";
}

export function resolveDesignRules(
  intent: DesignRulesIntent | CampaignIntent,
): DesignRulesProfile {
  const platform = intent.platform;
  const campaignType = intent.campaignType;

  if (isLinkedIn(platform)) {
    if (isAdIntent(intent)) {
      return linkedinAdRulesProfile;
    }
    return linkedinPostRulesProfile;
  }

  if (campaignType === "advertisement") {
    return {
      ...linkedinAdRulesProfile,
      id: "advertisement",
      label: "Advertisement",
    };
  }

  return defaultRulesProfile;
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
      ? "Featured: library — auto-pick a UI block or illustration from the visuals library (composed mode); custom AI generation is optional."
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
  intent: CampaignIntent,
  brief: string,
): DesignRulesProfile {
  const format = detectFormatFromBrief(brief);
  return resolveDesignRules({ ...intent, format });
}

export function resolveDesignRulesForPlatform(
  campaignType: CampaignIntent["campaignType"],
  platformId: PlatformId,
  brief: string,
): DesignRulesProfile {
  const format = detectFormatFromBrief(brief);
  return resolveDesignRules({ campaignType, platform: platformId, format });
}

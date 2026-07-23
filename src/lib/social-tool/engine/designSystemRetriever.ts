import {
  getCampaignRules,
  getDesignSystem,
  listDesignSystems,
  tryGetCampaignRules,
  type DesignSystemConfig,
} from "@/lib/design-config/registry";
import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";

/**
 * Retrieve the design system bundle for a campaign plan.
 * Downstream stages may only choose assets inside this system.
 */
export function retrieveDesignSystem(plan: CampaignPlan): DesignSystemConfig {
  const rules = tryGetCampaignRules(plan.campaign.type);
  if (rules?.designSystem) {
    return getDesignSystem(rules.designSystem);
  }

  const keywordHit = listDesignSystems().find((system) =>
    system.campaigns.includes(plan.campaign.type),
  );
  if (keywordHit) return keywordHit;

  const lowerKeywords = plan.keywords.map((k) => k.toLowerCase()).join(" ");
  if (
    lowerKeywords.includes("enterprise") ||
    lowerKeywords.includes("saas") ||
    lowerKeywords.includes("b2b")
  ) {
    return getDesignSystem("enterprise_saas");
  }

  if (
    plan.campaign.type === "promotion" ||
    plan.campaign.type === "advertisement"
  ) {
    return getDesignSystem("offer");
  }

  return getDesignSystem("default");
}

export function designSystemAllowsLayout(
  system: DesignSystemConfig,
  layoutId: string,
): boolean {
  return system.layouts.includes(layoutId);
}

export function resolveCampaignRulesForPlan(plan: CampaignPlan) {
  return getCampaignRules(plan.campaign.type);
}

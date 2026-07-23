import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
import {
  countWords,
  getSlotConstraint,
  totalCopyWords,
} from "@/lib/social-tool/slotLibrary";

export type DesignScore = {
  total: number;
  checks: { label: string; passed: boolean; detail?: string }[];
  visualBalancePassed: boolean;
};

function estimateFeaturedShare(plan: ValidatedDesignPlan): number {
  const layout = plan.layout;
  if (layout.composition === "split") {
    const textCol = layout.textColumnRatio ?? 0.45;
    return 1 - textCol;
  }
  if (!plan.showFeaturedImage) return 0;
  return Math.max(0, 1 - layout.textZoneRatio);
}

function headlineClippingRisk(plan: ValidatedDesignPlan, rulesProfile?: DesignRulesProfile): boolean {
  const headline = plan.textSlots.find((s) => s.role === "headline");
  if (!headline) return false;
  const constraint = getSlotConstraint("headline", rulesProfile);
  const ratio = plan.layout.textZoneRatio;
  const tightZone = ratio <= 0.32;
  return tightZone && headline.text.length > constraint.maxCharacters * 0.85;
}

export function scoreDesign(
  plan: ValidatedDesignPlan,
  intent: CampaignIntent,
  rulesProfile?: DesignRulesProfile,
): DesignScore {
  const checks: DesignScore["checks"] = [];
  const balance = rulesProfile?.visualBalance;

  for (const slot of plan.textSlots) {
    const constraint = getSlotConstraint(slot.role, rulesProfile);
    const length = slot.text.trim().length;
    const wordCount = countWords(slot.text);
    const charPassed =
      length <= constraint.maxCharacters &&
      (constraint.minCharacters === 0 || length >= constraint.minCharacters);
    const wordPassed =
      constraint.maxWords == null || wordCount <= constraint.maxWords;
    checks.push({
      label: `${constraint.label} length`,
      passed: charPassed && wordPassed,
      detail: `${length}/${constraint.maxCharacters} chars, ${wordCount} words`,
    });
  }

  const totalWords = totalCopyWords(plan.textSlots, rulesProfile);
  const maxWords = rulesProfile?.copyBudget.maxTotalWords ?? 60;
  const wordShare = totalWords / maxWords;
  checks.push({
    label: "Copy word budget",
    passed: totalWords <= maxWords,
    detail: `${totalWords}/${maxWords} words (${Math.round(wordShare * 100)}%)`,
  });

  if (balance) {
    const featuredShare = estimateFeaturedShare(plan);
    checks.push({
      label: "Featured visual share",
      passed: !plan.showFeaturedImage || featuredShare >= balance.minFeaturedShare,
      detail: `${Math.round(featuredShare * 100)}% (min ${Math.round(balance.minFeaturedShare * 100)}%)`,
    });

    checks.push({
      label: "Copy density",
      passed: wordShare <= balance.maxCopyWordShare + 0.05,
      detail: `${Math.round(wordShare * 100)}% of budget`,
    });
  }

  if (headlineClippingRisk(plan, rulesProfile)) {
    checks.push({
      label: "Headline clipping risk",
      passed: false,
      detail: "Headline may clip in tight text zone",
    });
  }

  const needsCta =
    rulesProfile?.requiredSlots.includes("caption") ||
    intent.ctaRequired ||
    rulesProfile?.copyBudget.ctaWords != null;

  if (needsCta) {
    const ctaText =
      plan.copy.extraFields.find((f) => f.value.trim())?.value ??
      plan.textSlots.find((s) => s.role === "caption")?.text ??
      "";
    const ctaWords = countWords(ctaText);
    const maxCta = rulesProfile?.copyBudget.ctaWords ?? 8;
    checks.push({
      label: "CTA present",
      passed: ctaText.trim().length > 0 && ctaWords <= maxCta,
      detail: ctaText ? `${ctaWords} words` : "missing CTA",
    });
  }

  if (intent.proofStrategy === "product_ui" && rulesProfile?.featuredPolicy === "genui") {
    checks.push({
      label: "Product preview",
      passed: plan.showFeaturedImage && plan.featuredSlots.some((slot) => slot.visible),
    });
  }

  if (rulesProfile?.featuredPolicy === "library") {
    checks.push({
      label: "Featured library visual",
      passed:
        plan.showFeaturedImage &&
        plan.featuredSlots.some((s) => s.visible && s.mode === "composed"),
    });
  }

  if (rulesProfile?.featuredPolicy === "placeholder") {
    checks.push({
      label: "Featured placeholder",
      passed:
        plan.showFeaturedImage &&
        plan.featuredSlots.some((s) => s.visible && s.mode === "placeholder"),
    });
  }

  checks.push({
    label: "Logo visible",
    passed: plan.showBrand,
  });

  checks.push({
    label: "Background",
    passed: plan.showBackground,
  });

  const passedCount = checks.filter((check) => check.passed).length;
  const total = checks.length === 0 ? 100 : Math.round((passedCount / checks.length) * 100);
  const threshold = balance?.passThreshold ?? 80;
  const visualBalancePassed = total >= threshold;

  return { total, checks, visualBalancePassed };
}

import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { getVisualsStrategy } from "@/lib/design-config/registry";

export type ColorStrategyResult = {
  colorMood: CampaignPlan["visual"]["colorMood"];
  backgroundPresetId?: string;
  showBackground: boolean;
  reason: string;
};

function scorePreset(
  id: string,
  label: string | undefined,
  mood: string,
  recent: Set<string>,
): number {
  let score = 0;
  const hay = `${id} ${label ?? ""}`.toLowerCase();
  if (mood === "warm" && /(warm|orange|coral|amber|sunset)/.test(hay)) score += 6;
  if (mood === "cool" && /(cool|blue|teal|cyan|sky)/.test(hay)) score += 6;
  if (mood === "enterprise" && /(navy|slate|enterprise|professional|blue)/.test(hay)) {
    score += 6;
  }
  if (mood === "bold" && /(bold|vivid|vibrant|neon)/.test(hay)) score += 6;
  if (mood === "neutral" && /(neutral|gray|grey|soft|cream)/.test(hay)) score += 4;
  if (recent.has(id)) score -= 8;
  return score;
}

export function resolveColorStrategy(input: {
  plan: CampaignPlan;
  rulesProfile: DesignRulesProfile;
  catalog?: { id: string; label?: string }[];
  recentPresetIds?: string[];
}): ColorStrategyResult {
  const table = getVisualsStrategy().color;
  const colorMood =
    (table[input.plan.campaign.type] as CampaignPlan["visual"]["colorMood"] | undefined) ??
    input.plan.visual.colorMood;

  const catalog = input.catalog ?? [];
  const recent = new Set(input.recentPresetIds ?? []);

  let backgroundPresetId: string | undefined;
  if (catalog.length && input.rulesProfile.backgroundPolicy === "catalog_pick") {
    const ranked = [...catalog].sort(
      (a, b) =>
        scorePreset(b.id, b.label, colorMood, recent) -
        scorePreset(a.id, a.label, colorMood, recent),
    );
    backgroundPresetId = ranked[0]?.id;
  } else if (catalog.length) {
    backgroundPresetId = catalog[0]?.id;
  }

  return {
    colorMood,
    backgroundPresetId,
    showBackground: Boolean(backgroundPresetId),
    reason: `Color mood ${colorMood}${backgroundPresetId ? ` → ${backgroundPresetId}` : ""}`,
  };
}

import type { CampaignPlan } from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { getVisualsStrategy } from "@/lib/design-config/registry";

export type ColorStrategyResult = {
  colorMood: CampaignPlan["visual"]["colorMood"];
  backgroundPresetId?: string;
  showBackground: boolean;
  reason: string;
};

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function scorePreset(
  id: string,
  label: string | undefined,
  mood: string,
  recent: Set<string>,
  seed?: string,
): number {
  let score = 0;
  const hay = `${id} ${label ?? ""}`.toLowerCase();
  if (mood === "warm" && /(warm|orange|coral|amber|sunset|copper|ember)/.test(hay)) score += 6;
  if (mood === "cool" && /(cool|blue|teal|cyan|ocean|forest|frost|mist)/.test(hay)) score += 6;
  if (mood === "enterprise" && /(navy|slate|enterprise|professional|blue|midnight|indigo)/.test(hay)) {
    score += 6;
  }
  if (mood === "bold" && /(bold|vivid|vibrant|neon|berry|electric|royal|pulse)/.test(hay)) score += 6;
  if (mood === "neutral" && /(neutral|gray|grey|soft|cream|editorial|wash|lavender)/.test(hay)) {
    score += 4;
  }
  if (recent.has(id)) score -= 8;
  if (seed) score += (hashSeed(`${seed}:${id}`) % 5) - 2;
  return score;
}

export function resolveColorStrategy(input: {
  plan: CampaignPlan;
  rulesProfile: DesignRulesProfile;
  catalog?: { id: string; label?: string }[];
  recentPresetIds?: string[];
  brief?: string;
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
        scorePreset(b.id, b.label, colorMood, recent, input.brief ?? input.plan.primaryMessage) -
        scorePreset(a.id, a.label, colorMood, recent, input.brief ?? input.plan.primaryMessage),
    );
    backgroundPresetId = ranked[0]?.id;
  } else if (catalog.length) {
    backgroundPresetId = catalog[0]?.id;
  }

  // Keep background visible even when the catalog is empty (offline / no snapshot) —
  // the canvas falls back to --gradient-hero via social-post--dark.
  const showBackground = Boolean(backgroundPresetId) || catalog.length === 0;

  return {
    colorMood,
    backgroundPresetId,
    showBackground,
    reason: `Color mood ${colorMood}${backgroundPresetId ? ` → ${backgroundPresetId}` : " → default gradient"}`,
  };
}

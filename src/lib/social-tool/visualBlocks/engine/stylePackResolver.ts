import {
  getStylePack,
  listStylePacks,
  tryGetStylePack,
  type BlockFamilyConfig,
  type StylePackConfig,
} from "@/lib/design-config/registry";
import type { SemanticPickContext } from "@/lib/social-tool/visualBlocks/semantic/types";

/**
 * Style packs define personality; brand remaps primary/accent at render.
 */
export function resolveStylePack(
  ctx: SemanticPickContext,
  family?: BlockFamilyConfig,
): StylePackConfig {
  const allowed = family?.stylePacks ?? listStylePacks().map((p) => p.id);

  const mood = (ctx.colorMood ?? "").toLowerCase();
  const tone = (ctx.brandTone ?? "").toLowerCase();

  let preferred = "enterprise";
  if (mood === "bold" || tone === "bold") preferred = "bold";
  else if (mood === "warm" || tone === "friendly") preferred = "startup";
  else if (mood === "cool") preferred = "glass";
  else if (tone === "minimal") preferred = "minimal";
  else if (mood === "neutral" && tone === "enterprise") preferred = "enterprise";
  else if (ctx.campaignType === "thought_leadership") preferred = "editorial";
  else if (ctx.campaignType === "promotion") preferred = "gradient";

  if (allowed.includes(preferred)) {
    return tryGetStylePack(preferred) ?? getStylePack("enterprise");
  }

  const first = allowed[0];
  if (first) return tryGetStylePack(first) ?? getStylePack("enterprise");
  return getStylePack("enterprise");
}

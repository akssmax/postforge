import { designConfigData } from "@/lib/design-config/generated";
import {
  campaignRulesSchema,
  designSystemConfigSchema,
  formatOverlaySchema,
  layoutMetaConfigSchema,
  patternConfigSchema,
  recipeConfigSchema,
  visualsStrategySchema,
  type CampaignRules,
  type DesignSystemConfig,
  type FormatOverlay,
  type LayoutMetaConfig,
  type PatternConfig,
  type RecipeConfig,
  type VisualsStrategyConfig,
} from "@/lib/design-config/schemas";

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    if (map.has(item.id)) {
      throw new Error(`Duplicate design-config id: ${item.id}`);
    }
    map.set(item.id, item);
  }
  return map;
}

function indexCampaigns(items: CampaignRules[]): Map<string, CampaignRules> {
  const map = new Map<string, CampaignRules>();
  for (const item of items) {
    if (map.has(item.campaign)) {
      throw new Error(`Duplicate campaign rules: ${item.campaign}`);
    }
    map.set(item.campaign, item);
  }
  return map;
}

const campaigns = designConfigData.campaigns.map((c) =>
  campaignRulesSchema.parse(c),
);
const patterns = designConfigData.patterns.map((p) =>
  patternConfigSchema.parse(p),
);
const recipes = designConfigData.recipes.map((r) =>
  recipeConfigSchema.parse(r),
);
const layouts = designConfigData.layouts.map((l) =>
  layoutMetaConfigSchema.parse(l),
);
const systems = designConfigData.systems.map((s) =>
  designSystemConfigSchema.parse(s),
);
const overlays = designConfigData.overlays.map((o) =>
  formatOverlaySchema.parse(o),
);
const visuals: VisualsStrategyConfig = visualsStrategySchema.parse(
  designConfigData.visuals,
);

const campaignByType = indexCampaigns(campaigns);
const patternById = indexById(patterns);
const recipeById = indexById(recipes);
const layoutMetaById = indexById(layouts);
const systemById = indexById(systems);
const overlayById = indexById(overlays);

export function getCampaignRules(type: string): CampaignRules {
  const rules = campaignByType.get(type);
  if (!rules) {
    throw new Error(`Unknown campaign rules: ${type}`);
  }
  return rules;
}

export function tryGetCampaignRules(type: string): CampaignRules | undefined {
  return campaignByType.get(type);
}

export function listCampaignRules(): CampaignRules[] {
  return campaigns;
}

export function getPattern(id: string): PatternConfig {
  const pattern = patternById.get(id);
  if (!pattern) throw new Error(`Unknown communication pattern: ${id}`);
  return pattern;
}

export function tryGetPattern(id: string): PatternConfig | undefined {
  return patternById.get(id);
}

export function listPatterns(): PatternConfig[] {
  return patterns;
}

export function getRecipe(id: string): RecipeConfig {
  const recipe = recipeById.get(id);
  if (!recipe) throw new Error(`Unknown recipe: ${id}`);
  return recipe;
}

export function tryGetRecipe(id: string): RecipeConfig | undefined {
  return recipeById.get(id);
}

export function listRecipes(): RecipeConfig[] {
  return recipes;
}

export function getLayoutMeta(id: string): LayoutMetaConfig {
  const meta = layoutMetaById.get(id);
  if (!meta) throw new Error(`Unknown layout meta: ${id}`);
  return meta;
}

export function tryGetLayoutMeta(id: string): LayoutMetaConfig | undefined {
  return layoutMetaById.get(id);
}

export function listLayoutMeta(): LayoutMetaConfig[] {
  return layouts;
}

export function getDesignSystem(id: string): DesignSystemConfig {
  const system = systemById.get(id);
  if (!system) throw new Error(`Unknown design system: ${id}`);
  return system;
}

export function tryGetDesignSystem(id: string): DesignSystemConfig | undefined {
  return systemById.get(id);
}

export function listDesignSystems(): DesignSystemConfig[] {
  return systems;
}

export function getFormatOverlay(id: string): FormatOverlay {
  const overlay = overlayById.get(id);
  if (!overlay) throw new Error(`Unknown format overlay: ${id}`);
  return overlay;
}

export function listFormatOverlays(): FormatOverlay[] {
  return overlays;
}

export function getVisualsStrategy(): VisualsStrategyConfig {
  return visuals;
}

export function listAllowedPatternIds(): string[] {
  return patterns.map((p) => p.id);
}

export function listAllowedRecipeIds(): string[] {
  return recipes.map((r) => r.id);
}

export type {
  CampaignRules,
  DesignSystemConfig,
  FormatOverlay,
  LayoutMetaConfig,
  PatternConfig,
  RecipeConfig,
  VisualsStrategyConfig,
};

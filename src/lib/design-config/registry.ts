import { designConfigData } from "@/lib/design-config/generated";
import {
  blockBundleSchema,
  blockFamilySchema,
  campaignRulesSchema,
  designSystemConfigSchema,
  formatOverlaySchema,
  illustrationFamilyMapSchema,
  layoutMetaConfigSchema,
  patternConfigSchema,
  recipeConfigSchema,
  artifactDefinitionSchema,
  stylePackSchema,
  visualsStrategySchema,
  type ArtifactDefinition,
  type BlockBundleConfig,
  type BlockFamilyConfig,
  type CampaignRules,
  type DesignSystemConfig,
  type FormatOverlay,
  type IllustrationFamilyMap,
  type LayoutMetaConfig,
  type PatternConfig,
  type RecipeConfig,
  type StylePackConfig,
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

const artifacts = (
  "artifacts" in designConfigData ? designConfigData.artifacts : []
).map((a) => artifactDefinitionSchema.parse(a));
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

const blockFamilies = (
  "blockFamilies" in designConfigData ? designConfigData.blockFamilies : []
).map((f) => blockFamilySchema.parse(f));
const blockBundles = (
  "blockBundles" in designConfigData ? designConfigData.blockBundles : []
).map((b) => blockBundleSchema.parse(b));
const stylePacks = (
  "stylePacks" in designConfigData ? designConfigData.stylePacks : []
).map((s) => stylePackSchema.parse(s));
const illustrationMap: IllustrationFamilyMap = illustrationFamilyMapSchema.parse(
  "illustrationMap" in designConfigData
    ? designConfigData.illustrationMap
    : { families: {} },
);

const campaignByType = indexCampaigns(campaigns);
const artifactById = indexById(artifacts);
const patternById = indexById(patterns);
const recipeById = indexById(recipes);
const layoutMetaById = indexById(layouts);
const systemById = indexById(systems);
const overlayById = indexById(overlays);
const familyById = indexById(blockFamilies);
const bundleById = indexById(blockBundles);
const stylePackById = indexById(stylePacks);

export function getArtifact(id: string): ArtifactDefinition {
  const artifact = artifactById.get(id);
  if (!artifact) throw new Error(`Unknown artifact: ${id}`);
  return artifact;
}

export function tryGetArtifact(id: string): ArtifactDefinition | undefined {
  return artifactById.get(id);
}

export function listArtifacts(): ArtifactDefinition[] {
  return artifacts;
}

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

export function getBlockFamily(id: string): BlockFamilyConfig {
  const family = familyById.get(id);
  if (!family) throw new Error(`Unknown block family: ${id}`);
  return family;
}

export function tryGetBlockFamily(id: string): BlockFamilyConfig | undefined {
  return familyById.get(id);
}

export function listBlockFamilies(): BlockFamilyConfig[] {
  return blockFamilies;
}

export function getBundle(id: string): BlockBundleConfig {
  const bundle = bundleById.get(id);
  if (!bundle) throw new Error(`Unknown block bundle: ${id}`);
  return bundle;
}

export function tryGetBundle(id: string): BlockBundleConfig | undefined {
  return bundleById.get(id);
}

export function listBundles(): BlockBundleConfig[] {
  return blockBundles;
}

export function getStylePack(id: string): StylePackConfig {
  const pack = stylePackById.get(id);
  if (!pack) throw new Error(`Unknown style pack: ${id}`);
  return pack;
}

export function tryGetStylePack(id: string): StylePackConfig | undefined {
  return stylePackById.get(id);
}

export function listStylePacks(): StylePackConfig[] {
  return stylePacks;
}

export function getIllustrationFamilyMap(): IllustrationFamilyMap {
  return illustrationMap;
}

export function illustrationTagsForFamily(familyId: string): string[] {
  return illustrationMap.families[familyId] ?? [];
}

export type {
  ArtifactDefinition,
  BlockBundleConfig,
  BlockFamilyConfig,
  CampaignRules,
  DesignSystemConfig,
  FormatOverlay,
  IllustrationFamilyMap,
  LayoutMetaConfig,
  PatternConfig,
  RecipeConfig,
  StylePackConfig,
  VisualsStrategyConfig,
};

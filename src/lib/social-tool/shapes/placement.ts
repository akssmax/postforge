import type { DecorationStrategyResult } from "@/lib/social-tool/engine/visual/decorationStrategy";
import { instantiateShape } from "@/lib/social-tool/shapes/instantiate";
import {
  getShapeCatalogEntry,
  SHAPE_CATALOG,
  type ShapeCatalogEntry,
} from "@/lib/social-tool/shapes/catalog";
import type { CanvasShapeRecord } from "@/lib/social-tool/shapes/types";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import {
  getPostLayout,
  layoutUsesSplit,
  resolveSplitLayoutZones,
  type PostLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import { getPlatform, type PlatformId } from "@/lib/social-tool/presets";
import { DEFAULT_POST_LAYOUT_SPACING } from "@/lib/social-tool/layoutSpacing";

function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function shapeCountForLevel(
  level: DecorationStrategyResult["decorationLevel"],
): number {
  switch (level) {
    case "minimal":
      return 0;
    case "offer":
      return 2;
    case "brand":
      return 2;
    case "mesh":
      return 3;
    default:
      return 0;
  }
}

function pickEntriesForLevel(
  level: DecorationStrategyResult["decorationLevel"],
  rand: () => number,
): ShapeCatalogEntry[] {
  const count = shapeCountForLevel(level);
  if (count === 0) return [];

  const poolByLevel: Record<
    DecorationStrategyResult["decorationLevel"],
    string[]
  > = {
    minimal: [],
    offer: [
      "shape-star-5",
      "shape-frame-corner-bracket",
      "shape-basic-pill",
      "shape-organic-splash-01",
    ],
    brand: [
      "shape-organic-blob-soft-01",
      "shape-organic-blob-soft-02",
      "shape-frame-corner-bracket",
      "shape-organic-arc-01",
    ],
    mesh: [
      "shape-organic-blob-soft-01",
      "shape-organic-blob-soft-03",
      "shape-organic-ring-01",
      "shape-star-4",
      "shape-frame-dot-cluster",
    ],
  };

  const ids = poolByLevel[level];
  const picked: ShapeCatalogEntry[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const remaining = ids.filter((id) => !used.has(id));
    const fallback = SHAPE_CATALOG.filter((entry) => !used.has(entry.id));
    const source = remaining.length > 0 ? remaining : fallback.map((e) => e.id);
    const id = source[Math.floor(rand() * source.length)] ?? source[0];
    if (!id) break;
    used.add(id);
    const entry = getShapeCatalogEntry(id);
    if (entry) picked.push(entry);
  }

  return picked;
}

type PlacementZone = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

function zonesForLayout(input: {
  layout: PostLayout;
  platform: { width: number; height: number };
  spacing: PostLayoutSpacing;
}): PlacementZone[] {
  const { layout, platform, spacing } = input;
  const isSplit = layoutUsesSplit(layout);

  if (isSplit) {
    const split = resolveSplitLayoutZones({
      width: platform.width,
      height: platform.height,
      footerH: 0,
      layout,
      showFeaturedImage: true,
      isTallPrint: platform.height / platform.width >= 1.8,
      spacing,
    });
    const padPct = (spacing.layoutPad / 16) * 4;
    const textShare = split.textColumn / platform.width;
    const visualX = layout.textSide === "left" ? textShare + 0.06 : padPct;
    const visualW = split.featuredColumn / platform.width;
    return [
      { xMin: padPct, xMax: padPct + 0.18, yMin: 8, yMax: 28 },
      {
        xMin: visualX * 100,
        xMax: (visualX + visualW) * 100 - 4,
        yMin: 12,
        yMax: 88,
      },
      { xMin: 72, xMax: 94, yMin: 72, yMax: 92 },
    ];
  }

  return [
    { xMin: 4, xMax: 22, yMin: 6, yMax: 24 },
    { xMin: 78, xMax: 96, yMin: 8, yMax: 26 },
    { xMin: 6, xMax: 94, yMin: 68, yMax: 94 },
  ];
}

function placeInZone(zone: PlacementZone, rand: () => number) {
  return {
    x: zone.xMin + rand() * (zone.xMax - zone.xMin),
    y: zone.yMin + rand() * (zone.yMax - zone.yMin),
  };
}

export function resolveCanvasShapes(input: {
  decorationLevel: DecorationStrategyResult["decorationLevel"];
  layoutId: PostLayoutId;
  platformId: PlatformId;
  spacing?: PostLayoutSpacing;
  brandColors: { primary: string; accent: string };
  designId: string;
}): CanvasShapeRecord[] {
  const count = shapeCountForLevel(input.decorationLevel);
  if (count === 0) return [];

  const platform = getPlatform(input.platformId);
  const layout = getPostLayout(input.layoutId);
  const spacing = input.spacing ?? DEFAULT_POST_LAYOUT_SPACING;
  const rand = seededRandom(`${input.designId}:${input.decorationLevel}:${input.layoutId}`);
  const entries = pickEntriesForLevel(input.decorationLevel, rand);
  const zones = zonesForLayout({ layout, platform, spacing });

  return entries.map((entry, index) => {
    const zone = zones[index % zones.length]!;
    const position = placeInZone(zone, rand);
    return instantiateShape(
      entry.id,
      input.brandColors,
      {
        transform: {
          x: Math.round(position.x * 10) / 10,
          y: Math.round(position.y * 10) / 10,
          scale: entry.defaultScale,
          rotateZ: Math.round((rand() - 0.5) * 40),
        },
        opacity: entry.defaultOpacity,
        zIndex: entry.defaultZIndex,
      },
    )!;
  });
}

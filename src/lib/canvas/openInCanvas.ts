"use client";

import { canvasFromScenes } from "@/lib/canvas/convert";
import { saveCanvasRecord } from "@/lib/canvas/localStore";
import type { BrandColors } from "@/lib/brand/types";
import type { SceneDocument } from "@/lib/scene/schema";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** Save generated scenes as a new canvas design on this device; returns its id. */
export async function saveScenesToCanvas(input: {
  title: string;
  colors: BrandColors;
  logoSvg?: string | null;
  scenes: SceneDocument[];
  names?: string[];
  blocks?: VisualBlockRecord[];
}): Promise<string> {
  const design = canvasFromScenes(input.title, { colors: input.colors, logoSvg: input.logoSvg ?? null, logoSrc: null }, input.scenes, input.names);
  await saveCanvasRecord({ design, blocks: input.blocks ?? [] });
  return design.id;
}

import { z } from "zod";
import { composeVisualBlocks, modifyVisualBlock } from "@/lib/llm/stages/genuiComposer";
import {
  composeVisualBlocksFromLibrary,
  pickFeaturedVisualFromLibrary,
  pickShuffleFeaturedVisual,
} from "@/lib/social-tool/visualBlocks/library";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export const generateVisualBlocksBodySchema = z.object({
  headline: z.string().optional(),
  subheading: z.string().optional(),
  theme: z.string().optional(),
  brief: z.string().optional(),
  brandColors: z
    .object({
      primary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
  slotWidth: z.number().optional(),
  slotHeight: z.number().optional(),
  count: z.number().min(1).max(3).optional(),
  pickFeatured: z.boolean().optional(),
  excludeLibraryIds: z.array(z.string()).optional(),
  source: z.enum(["library", "generate"]).optional(),
  libraryIds: z.array(z.string()).optional(),
  preferredKind: z.enum(["ui", "illustration"]).optional(),
  intent: z
    .object({
      primaryIntent: z.string().optional(),
      audience: z.string().optional(),
      goal: z.string().optional(),
      visualPriority: z.string().optional(),
      proofStrategy: z.string().optional(),
      featuredVisualKind: z.enum(["ui", "illustration"]).optional(),
      keywords: z.array(z.string()).optional(),
      themes: z.array(z.string()).optional(),
    })
    .optional(),
  semantic: z
    .object({
      campaignType: z.string().optional(),
      recipeId: z.string().optional(),
      patternId: z.string().optional(),
      designSystemId: z.string().optional(),
      contentDensity: z.enum(["low", "medium", "high"]).optional(),
      readingPattern: z.enum(["F", "Z", "center"]).optional(),
      colorMood: z.string().optional(),
      brandTone: z.string().optional(),
      featuredKind: z.enum(["ui", "illustration"]).optional(),
      proof: z.string().optional(),
      platformId: z.string().optional(),
    })
    .optional(),
});

export const modifyVisualBlockBodySchema = z.object({
  blockId: z.string(),
  instruction: z.string().min(1),
  block: z.object({
    id: z.string(),
    label: z.string(),
    kind: z.enum(["diagram", "ui", "illustration"]),
    svgMarkup: z.string(),
    createdAt: z.number(),
    theme: z.string().optional(),
    prompt: z.string().optional(),
  }),
  brandColors: z
    .object({
      primary: z.string().optional(),
      accent: z.string().optional(),
    })
    .optional(),
});

export async function handleGenerateVisualBlocks(
  body: z.infer<typeof generateVisualBlocksBodySchema>,
): Promise<{ blocks: VisualBlockRecord[] }> {
  const source = body.source ?? "library";
  if (source === "library") {
    if (body.pickFeatured) {
      const block = body.excludeLibraryIds?.length
        ? pickShuffleFeaturedVisual(body, body.excludeLibraryIds, { randomize: true })
        : pickFeaturedVisualFromLibrary(body);
      return { blocks: block ? [block] : [] };
    }
    const blocks = composeVisualBlocksFromLibrary(body, { libraryIds: body.libraryIds });
    return { blocks };
  }

  const blocks = await composeVisualBlocks(body);
  return { blocks };
}

export async function handleModifyVisualBlock(
  body: z.infer<typeof modifyVisualBlockBodySchema>,
): Promise<{ block: VisualBlockRecord | null }> {
  const block = await modifyVisualBlock({
    blockId: body.blockId,
    instruction: body.instruction,
    block: body.block,
    brandColors: body.brandColors,
  });
  return { block };
}

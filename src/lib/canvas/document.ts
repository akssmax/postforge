import { z } from "zod";
import { nanoid } from "nanoid";
import { sceneDocumentSchema, type SceneDocument } from "@/lib/scene/schema";

/**
 * Canvas document: the one format for posts, decks, carousels and print.
 * A design holds pages; a page holds artboards (sizes, variants, slides);
 * an artboard holds one scene. Every change goes through operations (ops.ts).
 */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{3,8}$/);

export const canvasBrandSchema = z.object({
  colors: z.object({ primary: hexColor, secondary: hexColor, accent: hexColor, neutral: hexColor }),
  /** Inline SVG logo (rendered as an image, never as markup). */
  logoSvg: z.string().max(200_000).nullable().default(null),
  // A URL, or a data URL for uploads imported from this device.
  logoSrc: z.string().max(3_000_000).nullable().default(null),
});
export type CanvasBrand = z.infer<typeof canvasBrandSchema>;

export const artboardSchema = z.object({
  id: z.string(),
  name: z.string().max(80),
  scene: sceneDocumentSchema,
});
export type Artboard = z.infer<typeof artboardSchema>;

export const pageSchema = z.object({
  id: z.string(),
  name: z.string().max(80),
  artboards: z.array(artboardSchema),
});
export type CanvasPage = z.infer<typeof pageSchema>;

export const canvasDesignSchema = z.object({
  version: z.literal(2),
  id: z.string(),
  title: z.string().max(120),
  brand: canvasBrandSchema,
  /** Design system this design follows (phase E); the inline brand is its fallback. */
  systemId: z.string().nullable().default(null),
  pages: z.array(pageSchema).min(1),
  /** Server revision this copy is based on (0 = never synced). */
  revision: z.number().int().min(0).default(0),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type CanvasDesign = z.infer<typeof canvasDesignSchema>;

export function createId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}

export function createCanvasDesign(input: {
  title: string;
  brand: CanvasBrand;
  artboards: Array<{ name: string; scene: SceneDocument }>;
  pageName?: string;
  id?: string;
}): CanvasDesign {
  const now = Date.now();
  return {
    version: 2,
    id: input.id ?? createId("design"),
    title: input.title,
    brand: input.brand,
    systemId: null,
    revision: 0,
    createdAt: now,
    updatedAt: now,
    pages: [
      {
        id: createId("page"),
        name: input.pageName ?? "Page 1",
        artboards: input.artboards.map((artboard) => ({ id: createId("board"), name: artboard.name, scene: artboard.scene })),
      },
    ],
  };
}

export function findArtboard(design: CanvasDesign, artboardId: string): { page: CanvasPage; artboard: Artboard; index: number } | null {
  for (const page of design.pages) {
    const index = page.artboards.findIndex((artboard) => artboard.id === artboardId);
    if (index >= 0) return { page, artboard: page.artboards[index]!, index };
  }
  return null;
}

export function allArtboards(design: CanvasDesign): Artboard[] {
  return design.pages.flatMap((page) => page.artboards);
}

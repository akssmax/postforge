"use client";

import { hydrateAllLogoSrcs } from "@/lib/brand/storage";
import { canvasFromSessions } from "@/lib/canvas/convert";
import type { CanvasRecord } from "@/lib/canvas/localStore";
import { ensureDesignSessionLoaded } from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { loadBoardSessionsAsync, loadVariantGroup } from "@/lib/design/variantGroup";
import type { SceneDocument, SceneNode } from "@/lib/scene/schema";
import { resolveFeaturedImageSrc } from "@/lib/social-tool/featuredBlock";

/** Object URLs die with the page; canvas records keep uploads as data URLs. */
async function toDataUrl(src: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  } finally {
    if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  }
}

/** Replace `asset:` image urls (per-board uploads) with resolved data URLs, or placeholders. */
function inlineAssets(scene: SceneDocument, assets: Record<string, string | null>): SceneDocument {
  const visit = (node: SceneNode): SceneNode => {
    if (node.type === "frame") return { ...node, children: node.children.map(visit) };
    if (node.type === "visual" && node.source.kind === "image" && node.source.url.startsWith("asset:")) {
      const url = assets[node.source.url.slice(6)];
      return { ...node, source: url ? { kind: "image", url, alt: node.source.alt } : { kind: "placeholder" } };
    }
    return node;
  };
  return { ...scene, root: visit(scene.root) as SceneDocument["root"], overlays: scene.overlays.map((overlay) => ({ ...overlay, node: visit(overlay.node) })) };
}

/**
 * Turn a saved v2 design and its variant boards into a canvas record on this
 * device. Uploaded logos and featured images are inlined so the copy stands alone.
 */
export async function importV2Design(designId: string): Promise<CanvasRecord> {
  const origin = await ensureDesignSessionLoaded(designId);
  const group = loadVariantGroup(designId);
  const loaded = group.boardIds.length > 1 ? await loadBoardSessionsAsync(group.boardIds) : [];
  const boards: DesignSessionPersisted[] = loaded.length ? loaded : [origin];
  const { design, blocks } = canvasFromSessions(boards, group.boardNames ?? {});

  const assets = await Promise.all(boards.map(async (board) => ({ "featured-primary": await toDataUrl(await resolveFeaturedImageSrc(board.featured.image ?? null)) })));
  const logos = await hydrateAllLogoSrcs(origin.brand);
  const logoSrc = design.brand.logoSvg ? null : await toDataUrl(logos.primary ?? null);

  const page = design.pages[0]!;
  return {
    blocks,
    design: {
      ...design,
      brand: { ...design.brand, logoSrc },
      pages: [{ ...page, artboards: page.artboards.map((artboard, index) => ({ ...artboard, scene: inlineAssets(artboard.scene, assets[index] ?? {}) })) }],
    },
  };
}

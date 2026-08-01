import type { ArtboardExportTarget } from "@/lib/social-tool/exportArtboards";
import {
  buildExportFilename,
  slugifyExportSegment,
} from "@/lib/social-tool/exportArtboards";

const FRAME_GAP = 80;

export function buildFigmaFrameName(
  target: ArtboardExportTarget,
  campaignSlug: string,
): string {
  const platform = slugifyExportSegment(
    `${target.platformId}-${target.width}x${target.height}`,
    `${target.width}x${target.height}`,
  );
  const campaign = slugifyExportSegment(campaignSlug, "postforge");
  const board = target.name?.trim()
    ? slugifyExportSegment(target.name, `artboard-${target.index}`)
    : null;
  return ["Postforge", campaign, board, platform].filter(Boolean).join(" / ");
}

export function buildFigDownloadFilename(
  target: ArtboardExportTarget,
  campaignSlug: string,
): string {
  return buildExportFilename({
    campaignSlug,
    index: target.index,
    boardName: target.name,
    platformId: target.platformId,
    width: target.width,
    height: target.height,
    ext: "fig",
  });
}

export function layoutFigmaFrames(
  targets: ArtboardExportTarget[],
): Array<{ x: number; y: number }> {
  let x = 0;
  return targets.map((target) => {
    const pos = { x, y: 0 };
    x += target.width + FRAME_GAP;
    return pos;
  });
}

export const FIGMA_FRAME_GAP = FRAME_GAP;

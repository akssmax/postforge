import JSZip from "jszip";
import type { PlatformId } from "@/lib/social-tool/presets";
import {
  capturePostImage,
  downloadBlob,
  exportMultiPagePdf,
  type ExportFormat,
  type ImageCaptureFormat,
} from "@/lib/social-tool/exportPost";

export type ExportScope = "active" | "selected" | "all";

export type ArtboardExportTarget = {
  boardId: string;
  index: number;
  name?: string;
  platformId: PlatformId;
  width: number;
  height: number;
  printInches?: { width: number; height: number };
};

export type ExportProgress = {
  current: number;
  total: number;
  boardId: string;
};

export type BuildExportFilenameInput = {
  campaignSlug: string;
  index: number;
  boardName?: string;
  platformId: PlatformId;
  width: number;
  height: number;
  ext: string;
};

const MAX_SEGMENT_LENGTH = 40;

export function slugifyExportSegment(value: string, fallback: string): string {
  const stripped = value
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = stripped.slice(0, MAX_SEGMENT_LENGTH);
  return slug || fallback;
}

export function buildCampaignSlug(
  headline: string | undefined,
  originDesignId: string,
): string {
  const fromHeadline = headline?.trim();
  if (fromHeadline) {
    return slugifyExportSegment(fromHeadline, `postforge-${originDesignId.slice(0, 8)}`);
  }
  return `postforge-${originDesignId.slice(0, 8)}`;
}

export function buildExportFilename(input: BuildExportFilenameInput): string {
  const indexLabel = String(input.index).padStart(2, "0");
  const boardSegment = input.boardName?.trim()
    ? slugifyExportSegment(input.boardName, `artboard-${indexLabel}`)
    : null;
  const platformSegment = slugifyExportSegment(
    `${input.platformId}-${input.width}x${input.height}`,
    `${input.width}x${input.height}`,
  );
  const parts = [
    slugifyExportSegment(input.campaignSlug, "postforge"),
    indexLabel,
    boardSegment,
    platformSegment,
  ].filter(Boolean);
  return `${parts.join("-")}.${input.ext}`;
}

export function resolveExportTargetIds(options: {
  scope: ExportScope;
  activeBoardId: string;
  allBoardIds: string[];
  selectedBoardIds: Set<string>;
}): string[] {
  const { scope, activeBoardId, allBoardIds, selectedBoardIds } = options;
  if (allBoardIds.length === 0) return activeBoardId ? [activeBoardId] : [];
  if (scope === "active") {
    return allBoardIds.includes(activeBoardId) ? [activeBoardId] : [allBoardIds[0]!];
  }
  if (scope === "all") return [...allBoardIds];
  return allBoardIds.filter((id) => selectedBoardIds.has(id));
}

export function resolveArtboardExportTargets(
  boards: ArtboardExportTarget[],
  targetIds: string[],
): ArtboardExportTarget[] {
  const byId = new Map(boards.map((board) => [board.boardId, board]));
  return targetIds
    .map((id) => byId.get(id))
    .filter((board): board is ArtboardExportTarget => !!board);
}

function zipFilename(campaignSlug: string, target: ArtboardExportTarget): string {
  return `${slugifyExportSegment(campaignSlug, "postforge")}-${target.width}x${target.height}.zip`;
}

function pdfFilename(campaignSlug: string, target: ArtboardExportTarget): string {
  return `${slugifyExportSegment(campaignSlug, "postforge")}-${target.width}x${target.height}`;
}

function imageFormat(format: ExportFormat): ImageCaptureFormat {
  return format === "jpg" ? "jpg" : "png";
}

function fileExtension(format: ExportFormat): string {
  return format === "jpg" ? "jpg" : format === "png" ? "png" : "pdf";
}

export async function waitForExportPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export type ExportArtboardsOptions = {
  stageEl: HTMLElement;
  targets: ArtboardExportTarget[];
  format: ExportFormat;
  scale?: 1 | 2;
  campaignSlug: string;
  backgroundColorForBoard: (target: ArtboardExportTarget) => string | undefined;
  onProgress?: (progress: ExportProgress) => void;
  signal?: AbortSignal;
};

export async function exportArtboards({
  stageEl,
  targets,
  format,
  scale = 2,
  campaignSlug,
  backgroundColorForBoard,
  onProgress,
  signal,
}: ExportArtboardsOptions): Promise<{ cancelled: boolean }> {
  if (targets.length === 0) return { cancelled: false };

  await waitForExportPaint();

  const captures: {
    target: ArtboardExportTarget;
    filename: string;
    blob: Blob;
    dataUrl: string;
  }[] = [];

  for (let i = 0; i < targets.length; i += 1) {
    if (signal?.aborted) return { cancelled: true };

    const target = targets[i]!;
    onProgress?.({
      current: i + 1,
      total: targets.length,
      boardId: target.boardId,
    });

    const node = stageEl.querySelector<HTMLElement>(
      `[data-artboard-id="${target.boardId}"] .social-post`,
    );
    if (!node) {
      throw new Error(`Artboard ${target.index} is not available for export.`);
    }

    if (format === "pdf") {
      const png = await capturePostImage({
        node,
        format: "png",
        width: target.width,
        height: target.height,
        scale,
        backgroundColor: backgroundColorForBoard(target) ?? "#040c0b",
      });
      captures.push({
        target,
        filename: buildExportFilename({
          campaignSlug,
          index: target.index,
          boardName: target.name,
          platformId: target.platformId,
          width: target.width,
          height: target.height,
          ext: "png",
        }),
        blob: png.blob,
        dataUrl: png.dataUrl,
      });
    } else {
      const captured = await capturePostImage({
        node,
        format: imageFormat(format),
        width: target.width,
        height: target.height,
        scale,
        backgroundColor: backgroundColorForBoard(target) ?? "#040c0b",
      });
      captures.push({
        target,
        filename: buildExportFilename({
          campaignSlug,
          index: target.index,
          boardName: target.name,
          platformId: target.platformId,
          width: target.width,
          height: target.height,
          ext: captured.extension,
        }),
        blob: captured.blob,
        dataUrl: captured.dataUrl,
      });
    }
  }

  if (signal?.aborted) return { cancelled: true };

  if (format === "pdf") {
    if (captures.length === 1) {
      await exportMultiPagePdf({
        filename: buildExportFilename({
          campaignSlug,
          index: captures[0]!.target.index,
          boardName: captures[0]!.target.name,
          platformId: captures[0]!.target.platformId,
          width: captures[0]!.target.width,
          height: captures[0]!.target.height,
          ext: "pdf",
        }).replace(/\.pdf$/, ""),
        pages: captures.map((entry) => ({
          blob: entry.blob,
          dataUrl: entry.dataUrl,
          width: entry.target.width,
          height: entry.target.height,
          printInches: entry.target.printInches,
        })),
      });
    } else {
      await exportMultiPagePdf({
        filename: pdfFilename(campaignSlug, captures[0]!.target),
        pages: captures.map((entry) => ({
          blob: entry.blob,
          dataUrl: entry.dataUrl,
          width: entry.target.width,
          height: entry.target.height,
          printInches: entry.target.printInches,
        })),
      });
    }
    return { cancelled: false };
  }

  if (captures.length === 1) {
    downloadBlob(captures[0]!.blob, captures[0]!.filename);
    return { cancelled: false };
  }

  const zip = new JSZip();
  for (const entry of captures) {
    zip.file(entry.filename, entry.blob);
  }
  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, zipFilename(campaignSlug, captures[0]!.target));
  return { cancelled: false };
}

export function exportTargetCountLabel(count: number, format: ExportFormat): string {
  if (count <= 1) return format.toUpperCase();
  if (format === "pdf") return `PDF (${count} pages)`;
  return `${format.toUpperCase()} (${count} artboards)`;
}

export { fileExtension };

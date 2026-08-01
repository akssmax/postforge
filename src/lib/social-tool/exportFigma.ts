import { downloadBlob } from "@/lib/social-tool/exportPost";
import type {
  ArtboardExportTarget,
  ExportProgress,
} from "@/lib/social-tool/exportArtboards";
import {
  slugifyExportSegment,
  waitForExportPaint,
} from "@/lib/social-tool/exportArtboards";
import { getFigmaConverter } from "@/lib/social-tool/figma/converter";
import {
  buildFigDownloadFilename,
  buildFigmaFrameName,
  layoutFigmaFrames,
} from "@/lib/social-tool/figma/naming";
import {
  createFigmaExportClone,
  resolveSocialPostNode,
  withFigmaExportClone,
} from "@/lib/social-tool/figma/prepareDom";

export {
  buildFigDownloadFilename,
  buildFigmaFrameName,
  layoutFigmaFrames,
} from "@/lib/social-tool/figma/naming";

export type CopyToFigmaPhase = "preparing" | "converting" | "clipboard";

export type CopyToFigmaOptions = {
  stageEl: HTMLElement;
  targets: ArtboardExportTarget[];
  campaignSlug: string;
  onProgress?: (progress: ExportProgress) => void;
  onPhase?: (phase: CopyToFigmaPhase) => void;
  signal?: AbortSignal;
};

export type CopyToFigmaResult =
  | { ok: true; frameCount: number; usedFigDownload: boolean }
  | {
      ok: false;
      reason: "clipboard_denied" | "conversion_failed" | "cancelled" | "missing_dom";
      message: string;
      figBytes?: Uint8Array;
      figFilename?: string;
    };

async function writeFigmaClipboard(html: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.write) {
    return false;
  }

  try {
    const blob = new Blob([html], { type: "text/html" });
    await navigator.clipboard.write([
      new ClipboardItem({ "text/html": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

export function downloadFigFile(bytes: Uint8Array, filename: string): void {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: "application/octet-stream" });
  downloadBlob(blob, filename);
}

export async function copyArtboardsToFigma(
  options: CopyToFigmaOptions,
): Promise<CopyToFigmaResult> {
  const { stageEl, targets, campaignSlug, onProgress, onPhase, signal } =
    options;

  if (signal?.aborted) {
    return { ok: false, reason: "cancelled", message: "Export cancelled." };
  }
  if (targets.length === 0) {
    return {
      ok: false,
      reason: "missing_dom",
      message: "No artboards selected.",
    };
  }

  await waitForExportPaint();
  onPhase?.("preparing");

  const frameNodes: Array<{
    element: HTMLElement;
    target: ArtboardExportTarget;
    x: number;
    y: number;
  }> = [];

  for (let i = 0; i < targets.length; i += 1) {
    if (signal?.aborted) {
      return { ok: false, reason: "cancelled", message: "Export cancelled." };
    }

    const target = targets[i]!;
    onProgress?.({
      current: i + 1,
      total: targets.length,
      boardId: target.boardId,
    });

    const node = resolveSocialPostNode(stageEl, target.boardId);
    if (!node) {
      return {
        ok: false,
        reason: "missing_dom",
        message: `Artboard ${target.index} is not available for Figma export.`,
      };
    }

    const positions = layoutFigmaFrames(targets);
    frameNodes.push({
      element: node,
      target,
      x: positions[i]!.x,
      y: positions[i]!.y,
    });
  }

  onPhase?.("converting");

  let result: Awaited<
    ReturnType<Awaited<ReturnType<typeof getFigmaConverter>>["convert"]>
  >;

  try {
    const converter = await getFigmaConverter();

    if (frameNodes.length === 1) {
      const first = frameNodes[0]!;
      result = await withFigmaExportClone(
        first.element,
        first.target.width,
        first.target.height,
        (clone) =>
          converter.convert({
            element: clone,
            width: first.target.width,
            height: first.target.height,
            name: buildFigmaFrameName(first.target, campaignSlug),
          }),
      );
    } else {
      const clones: Array<{
        element: HTMLElement;
        target: ArtboardExportTarget;
        x: number;
        y: number;
        cleanup: () => void;
      }> = [];

      try {
        for (const frame of frameNodes) {
          const prepared = await createFigmaExportClone(
            frame.element,
            frame.target.width,
            frame.target.height,
          );
          clones.push({ ...frame, ...prepared });
        }

        result = await converter.convert({
          frames: clones.map((frame) => ({
            element: frame.element,
            width: frame.target.width,
            height: frame.target.height,
            x: frame.x,
            y: frame.y,
            name: buildFigmaFrameName(frame.target, campaignSlug),
          })),
          canvasName: slugifyExportSegment(campaignSlug, "postforge"),
        });
      } finally {
        for (const clone of clones) clone.cleanup();
      }
    }
  } catch (err) {
    console.error(err);
    return {
      ok: false,
      reason: "conversion_failed",
      message: "Could not convert this layout for Figma. Try PNG export instead.",
    };
  }

  const clipboardHtml = result.toClipboardHtml();

  if (signal?.aborted) {
    return { ok: false, reason: "cancelled", message: "Export cancelled." };
  }

  onPhase?.("clipboard");

  const copied = await writeFigmaClipboard(clipboardHtml);

  if (copied) {
    return {
      ok: true,
      frameCount: frameNodes.length,
      usedFigDownload: false,
    };
  }

  const figFilename = buildFigDownloadFilename(
    frameNodes.length === 1 ? frameNodes[0]!.target : targets[0]!,
    campaignSlug,
  );

  return {
    ok: false,
    reason: "clipboard_denied",
    message:
      "Clipboard access was blocked. Download the .fig file and open it in Figma Desktop (File → Open).",
    figBytes: result.bytes,
    figFilename,
  };
}

/** Download .fig when clipboard write fails. */
export function offerFigDownload(result: Extract<CopyToFigmaResult, { ok: false }>): void {
  if (result.figBytes && result.figFilename) {
    downloadFigFile(result.figBytes, result.figFilename);
  }
}

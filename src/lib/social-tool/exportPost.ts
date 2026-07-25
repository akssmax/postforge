import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type ExportFormat = "png" | "jpg" | "pdf";

export type ImageCaptureFormat = "png" | "jpg";

type ExportOptions = {
  node: HTMLElement;
  format: ExportFormat;
  width: number;
  height: number;
  /** Capture multiplier (1 or 2) */
  scale?: number;
  filename?: string;
  /** JPG fill when transparency isn't wanted */
  backgroundColor?: string;
  /** When set, PDF is written at true physical inches (print standees, etc.) */
  printInches?: { width: number; height: number };
};

export type CapturePostImageOptions = {
  node: HTMLElement;
  format: ImageCaptureFormat;
  width: number;
  height: number;
  scale?: number;
  backgroundColor?: string;
};

export type CapturedPostImage = {
  blob: Blob;
  extension: "png" | "jpg";
  dataUrl: string;
};

export type PdfPageInput = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  printInches?: { width: number; height: number };
};

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export function baseCaptureOptions(
  node: HTMLElement,
  width: number,
  height: number,
  scale: number,
) {
  return {
    cacheBust: true,
    pixelRatio: scale,
    width,
    height,
    style: {
      transform: "none",
      width: `${width}px`,
      height: `${height}px`,
    },
  } as const;
}

type CapturePostPngOptions = {
  node: HTMLElement;
  width: number;
  height: number;
  scale?: number;
};

export async function capturePostPng({
  node,
  width,
  height,
  scale = 2,
}: CapturePostPngOptions): Promise<string> {
  const opts = baseCaptureOptions(node, width, height, scale);
  return toPng(node, opts);
}

export async function capturePostImage({
  node,
  format,
  width,
  height,
  scale = 2,
  backgroundColor = "#040c0b",
}: CapturePostImageOptions): Promise<CapturedPostImage> {
  const opts = baseCaptureOptions(node, width, height, scale);
  const dataUrl =
    format === "png"
      ? await toPng(node, opts)
      : await toJpeg(node, {
          ...opts,
          quality: 0.95,
          backgroundColor,
        });
  const blob = await dataUrlToBlob(dataUrl);
  return { blob, extension: format, dataUrl };
}

export async function exportMultiPagePdf({
  pages,
  filename,
}: {
  pages: PdfPageInput[];
  filename: string;
}): Promise<void> {
  if (pages.length === 0) return;

  const first = pages[0]!;
  const firstPrint = first.printInches;
  const pdf = firstPrint
    ? new jsPDF({
        orientation:
          firstPrint.width >= firstPrint.height ? "landscape" : "portrait",
        unit: "in",
        format: [firstPrint.width, firstPrint.height],
      })
    : new jsPDF({
        orientation: first.width >= first.height ? "landscape" : "portrait",
        unit: "px",
        format: [first.width, first.height],
        hotfixes: ["px_scaling"],
      });

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i]!;
    if (i > 0) {
      if (page.printInches) {
        pdf.addPage(
          [page.printInches.width, page.printInches.height],
          page.printInches.width >= page.printInches.height
            ? "landscape"
            : "portrait",
        );
      } else {
        pdf.addPage(
          [page.width, page.height],
          page.width >= page.height ? "landscape" : "portrait",
        );
      }
    }

    if (page.printInches) {
      pdf.addImage(
        page.dataUrl,
        "PNG",
        0,
        0,
        page.printInches.width,
        page.printInches.height,
      );
    } else {
      pdf.addImage(page.dataUrl, "PNG", 0, 0, page.width, page.height);
    }
  }

  pdf.save(`${filename}.pdf`);
}

export async function exportPost({
  node,
  format,
  width,
  height,
  scale = 2,
  filename = "postforge-post",
  backgroundColor = "#040c0b",
  printInches,
}: ExportOptions): Promise<void> {
  if (format === "png" || format === "jpg") {
    const captured = await capturePostImage({
      node,
      format,
      width,
      height,
      scale,
      backgroundColor,
    });
    downloadBlob(captured.blob, `${filename}.${captured.extension}`);
    return;
  }

  const png = await capturePostPng({ node, width, height, scale });
  const blob = await dataUrlToBlob(png);
  await exportMultiPagePdf({
    pages: [{ blob, dataUrl: png, width, height, printInches }],
    filename,
  });
}

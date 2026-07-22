import { toJpeg, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

export type ExportFormat = "png" | "jpg" | "pdf";

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

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function baseCaptureOptions(
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
  const opts = baseCaptureOptions(node, width, height, scale);

  if (format === "png") {
    const dataUrl = await toPng(node, opts);
    downloadDataUrl(dataUrl, `${filename}.png`);
    return;
  }

  if (format === "jpg") {
    const dataUrl = await toJpeg(node, {
      ...opts,
      quality: 0.95,
      backgroundColor,
    });
    downloadDataUrl(dataUrl, `${filename}.jpg`);
    return;
  }

  // PDF — wrap a PNG; use physical inches when this is a print asset
  const png = await toPng(node, opts);
  if (printInches) {
    const pdf = new jsPDF({
      orientation:
        printInches.width >= printInches.height ? "landscape" : "portrait",
      unit: "in",
      format: [printInches.width, printInches.height],
    });
    pdf.addImage(png, "PNG", 0, 0, printInches.width, printInches.height);
    pdf.save(`${filename}.pdf`);
    return;
  }

  const pdf = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });
  pdf.addImage(png, "PNG", 0, 0, width, height);
  pdf.save(`${filename}.pdf`);
}

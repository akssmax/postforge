import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides/types";

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function captureOptions(node: HTMLElement, scale: number) {
  return {
    cacheBust: true,
    pixelRatio: scale,
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    style: {
      transform: "none",
      width: `${SLIDE_WIDTH}px`,
      height: `${SLIDE_HEIGHT}px`,
    },
  } as const;
}

export async function exportSlidePng({
  node,
  scale = 2,
  filename = "postforge-slide",
}: {
  node: HTMLElement;
  scale?: number;
  filename?: string;
}): Promise<void> {
  const dataUrl = await toPng(node, captureOptions(node, scale));
  downloadDataUrl(dataUrl, `${filename}.png`);
}

export async function exportDeckPdf({
  nodes,
  scale = 2,
  filename = "postforge-deck",
}: {
  nodes: HTMLElement[];
  scale?: number;
  filename?: string;
}): Promise<void> {
  if (nodes.length === 0) return;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    hotfixes: ["px_scaling"],
  });

  for (let i = 0; i < nodes.length; i++) {
    const png = await toPng(nodes[i], captureOptions(nodes[i], scale));
    if (i > 0) {
      pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], "landscape");
    }
    pdf.addImage(png, "PNG", 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
  }

  pdf.save(`${filename}.pdf`);
}

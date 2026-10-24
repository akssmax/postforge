"use client";

import type { CanvasDesign } from "@/lib/canvas/document";
import { allArtboards } from "@/lib/canvas/document";
import { componentName, domToJsx, htmlDocument, prepareClone, reactModule } from "@/lib/handoff/domToCode";
import { captureScenePng, withOffscreenScenes, zipFiles } from "@/lib/scene/export";
import { downloadFigFile } from "@/lib/social-tool/exportFigma";
import { getFigmaConverter } from "@/lib/social-tool/figma/converter";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "design";
}

function rendererItems(design: CanvasDesign, blocks: VisualBlockRecord[]) {
  return allArtboards(design).map((artboard) => ({
    artboard,
    props: { scene: artboard.scene, colors: design.brand.colors, logo: { src: design.brand.logoSrc, svgMarkup: design.brand.logoSvg }, blocks },
  }));
}

const README = (title: string) => `# ${title}

Exported from Postforge.

- \`index.html\`: every artboard as standalone HTML (open it in a browser).
- \`*.tsx\`: one React component per artboard. Styles are inline and match the canvas exactly.
- \`tokens.ts\`: brand colours and fonts, to swap the hard-coded values for your own tokens.

Fonts load from Google Fonts in \`index.html\`; in your app, load the families listed in \`tokens.ts\`.
Visuals are embedded as SVG or data URLs, so the files work offline.
`;

/** HTML page + one React component per artboard + tokens, as a zip. */
export async function exportCodeZip(design: CanvasDesign, blocks: VisualBlockRecord[]): Promise<Blob> {
  const items = rendererItems(design, blocks);
  return withOffscreenScenes(items.map((item) => item.props), async (roots) => {
    const origin = window.location.origin;
    const files: Array<{ name: string; blob: Blob }> = [];
    const bodies: Array<{ name: string; html: string; width: number; height: number }> = [];
    const usedNames = new Set<string>();
    for (const [index, root] of roots.entries()) {
      const { artboard } = items[index]!;
      const clone = prepareClone(root, origin);
      clone.removeAttribute("data-scene-fit");
      const { width, height } = artboard.scene.size;
      bodies.push({ name: artboard.name, html: clone.outerHTML, width, height });
      let name = componentName(artboard.name);
      while (usedNames.has(name)) name = `${name}${index + 1}`;
      usedNames.add(name);
      files.push({ name: `${name}.tsx`, blob: new Blob([reactModule(artboard.name, domToJsx(clone), width, height)], { type: "text/plain" }) });
    }
    const first = items[0]?.artboard.scene.font;
    const tokens = `// Brand tokens for ${design.title}\nexport const colors = ${JSON.stringify(design.brand.colors, null, 2)} as const;\n\nexport const fonts = ${JSON.stringify({ heading: first?.heading ?? "Inter", body: first?.body ?? "Inter" }, null, 2)} as const;\n`;
    files.push({ name: "index.html", blob: new Blob([htmlDocument(design.title, bodies)], { type: "text/html" }) });
    files.push({ name: "tokens.ts", blob: new Blob([tokens], { type: "text/plain" }) });
    files.push({ name: "README.md", blob: new Blob([README(design.title)], { type: "text/markdown" }) });
    return zipFiles(files.map((file) => ({ ...file, name: `${slug(design.title)}/${file.name}` })));
  });
}

type TextRun = { text: string; options: { color?: string; bold?: boolean } };

function hexOf(cssColor: string): string | undefined {
  const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match || match[4] === "0") return undefined;
  return [match[1], match[2], match[3]].map((value) => Number(value).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function runsOf(element: HTMLElement): TextRun[] {
  const runs: TextRun[] = [];
  const walk = (node: Node, color?: string) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (text) runs.push({ text, options: color ? { color } : {} });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const child = node as HTMLElement;
    const own = hexOf(getComputedStyle(child).color);
    child.childNodes.forEach((grandchild) => walk(grandchild, own ?? color));
  };
  element.childNodes.forEach((child) => walk(child, hexOf(getComputedStyle(element).color)));
  return runs;
}

/**
 * PowerPoint deck: each artboard is a slide with its visuals as one picture
 * and every text layer as an editable text box in the same place.
 */
export async function exportPptx(design: CanvasDesign, blocks: VisualBlockRecord[]): Promise<Blob> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const items = rendererItems(design, blocks);
  const firstSize = items[0]!.artboard.scene.size;
  const slideWidth = 13.333;
  const slideHeight = Math.round((slideWidth * firstSize.height * 1000) / firstSize.width) / 1000;
  pptx.defineLayout({ name: "POSTFORGE", width: slideWidth, height: slideHeight });
  pptx.layout = "POSTFORGE";
  pptx.title = design.title;

  await withOffscreenScenes(items.map((item) => item.props), async (roots) => {
    for (const [index, root] of roots.entries()) {
      const { artboard } = items[index]!;
      const { width, height } = artboard.scene.size;
      // Fit the artboard inside the slide (artboards can differ in size).
      const scale = Math.min(slideWidth / width, slideHeight / height);
      const offsetX = (slideWidth - width * scale) / 2;
      const offsetY = (slideHeight - height * scale) / 2;
      const points = scale * 72;
      const rootBox = root.getBoundingClientRect();
      const texts = [...root.querySelectorAll<HTMLElement>("[data-scene-text]")].filter((element) => element.innerText.trim());
      const boxes = texts.map((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          element,
          x: offsetX + (box.left - rootBox.left) * scale,
          y: offsetY + (box.top - rootBox.top) * scale,
          w: box.width * scale,
          h: box.height * scale,
          fontSize: parseFloat(style.fontSize) * points,
          fontFace: style.fontFamily.split(",")[0]!.replace(/["']/g, "").trim(),
          bold: Number(style.fontWeight) >= 600,
          align: (style.textAlign === "center" ? "center" : style.textAlign === "right" || style.textAlign === "end" ? "right" : "left") as "left" | "center" | "right",
          fill: element.dataset.sceneText === "cta" ? hexOf(style.backgroundColor) : undefined,
          runs: runsOf(element),
          lineSpacing: (parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2) / parseFloat(style.fontSize),
        };
      });
      // Picture of everything except the text, then the text on top as real text boxes.
      const hidden = texts.map((element) => [element, element.style.visibility] as const);
      texts.forEach((element) => (element.style.visibility = "hidden"));
      const picture = await captureScenePng(root, artboard.scene, 2);
      hidden.forEach(([element, visibility]) => (element.style.visibility = visibility));
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(picture);
      });

      const slide = pptx.addSlide();
      slide.background = { color: "FFFFFF" };
      slide.addImage({ data: dataUrl, x: offsetX, y: offsetY, w: width * scale, h: height * scale });
      for (const box of boxes) {
        slide.addText(
          box.runs.map((run) => ({ text: run.text, options: { ...run.options, bold: box.bold } })),
          {
            x: box.x,
            y: box.y,
            w: Math.max(box.w, 0.1),
            h: Math.max(box.h, 0.1),
            fontSize: Math.max(1, Math.round(box.fontSize * 10) / 10),
            fontFace: box.fontFace,
            align: box.align,
            valign: box.fill ? "middle" : "top",
            margin: 0,
            fit: "none",
            lineSpacingMultiple: Math.min(2.5, Math.max(0.7, box.lineSpacing)),
            ...(box.fill ? { fill: { color: box.fill }, rectRadius: 0.5, shape: pptx.ShapeType.roundRect } : {}),
          },
        );
      }
      slide.addNotes(artboard.name);
    }
  });
  return (await pptx.write({ outputType: "blob" })) as Blob;
}

export type FigmaResult = { ok: true; frames: number } | { ok: false; message: string; download?: () => void };

/** Copy every artboard to the clipboard as Figma frames (or offer a .fig download). */
export async function copyDesignToFigma(design: CanvasDesign, blocks: VisualBlockRecord[]): Promise<FigmaResult> {
  const items = rendererItems(design, blocks);
  const converter = await getFigmaConverter();
  const gap = 80;
  return withOffscreenScenes(items.map((item) => item.props), async (roots) => {
    let x = 0;
    const frames = roots.map((root, index) => {
      const { artboard } = items[index]!;
      const frame = { element: root, width: artboard.scene.size.width, height: artboard.scene.size.height, x, y: 0, name: artboard.name };
      x += artboard.scene.size.width + gap;
      return frame;
    });
    let result: Awaited<ReturnType<typeof converter.convert>>;
    try {
      result = frames.length === 1 ? await converter.convert({ element: frames[0]!.element, width: frames[0]!.width, height: frames[0]!.height, name: frames[0]!.name }) : await converter.convert({ frames, canvasName: slug(design.title) });
    } catch (error) {
      console.error(error);
      return { ok: false, message: "This design couldn't be converted for Figma. Try PNG or code export." };
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([result.toClipboardHtml()], { type: "text/html" }) })]);
      return { ok: true, frames: frames.length };
    } catch {
      return { ok: false, message: "Clipboard access was blocked. Download the .fig file and open it in Figma.", download: () => downloadFigFile(result.bytes, `${slug(design.title)}.fig`) };
    }
  });
}

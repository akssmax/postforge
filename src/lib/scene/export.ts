"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import JSZip from "jszip";
import { SceneRenderer, type SceneRendererProps } from "@/components/scene/SceneRenderer";
import { capturePostImage, exportMultiPagePdf } from "@/lib/social-tool/exportPost";
import type { SceneDocument } from "@/lib/scene/schema";

/** Capture a rendered scene root at its native size (the preview may be scaled down). */
export async function captureScenePng(root: HTMLElement, scene: SceneDocument, pixelRatio = 1): Promise<Blob> {
  const { blob } = await capturePostImage({
    node: root,
    format: "png",
    width: scene.size.width,
    height: scene.size.height,
    scale: pixelRatio,
  });
  return blob;
}

/** Copy a scene as a PNG. Must start inside a click handler for the clipboard to allow it. */
export async function copyScenePng(root: HTMLElement, scene: SceneDocument): Promise<void> {
  // Passing the promise keeps the user gesture alive while the capture runs.
  await navigator.clipboard.write([new ClipboardItem({ "image/png": captureScenePng(root, scene) })]);
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Wait until every scene's auto-fit stops changing (or ~40 frames pass). */
async function settle(container: HTMLElement): Promise<void> {
  await document.fonts?.ready;
  let previous = "";
  let stable = 0;
  for (let frame = 0; frame < 40 && stable < 3; frame += 1) {
    await nextFrame();
    const current = [...container.querySelectorAll("[data-scene-root]")].map((root) => root.getAttribute("data-scene-fit")).join(",");
    stable = current === previous ? stable + 1 : 0;
    previous = current;
  }
}

/**
 * Render scenes offscreen at native size, let auto-fit settle, and hand each
 * root to `capture`. Used for multi-size export and video frames.
 */
export async function withOffscreenScenes<T>(
  items: Array<Omit<SceneRendererProps, "scale">>,
  capture: (roots: HTMLElement[]) => Promise<T>,
): Promise<T> {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText = "position:fixed;left:-100000px;top:0;display:flex;flex-direction:column;gap:20px;pointer-events:none;";
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    root.render(createElement("div", null, ...items.map((item, index) => createElement(SceneRenderer, { key: index, ...item, scale: 1 }))));
    await settle(container);
    return await capture([...container.querySelectorAll<HTMLElement>("[data-scene-root]")]);
  } finally {
    root.unmount();
    container.remove();
  }
}

export async function zipFiles(files: Array<{ name: string; blob: Blob }>): Promise<Blob> {
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, file.blob);
  return zip.generateAsync({ type: "blob" });
}

export function sceneFileName(scene: SceneDocument, suffix: string, extension: string): string {
  return `postforge-${scene.origin.id}-${scene.size.width}x${scene.size.height}${suffix ? `-${suffix}` : ""}.${extension}`;
}

/** Capture rendered pages and save them as one PDF (decks, LinkedIn carousels). */
export async function exportScenesPdf(roots: HTMLElement[], scenes: SceneDocument[], filename: string): Promise<void> {
  const pages = [];
  for (const [index, root] of roots.entries()) {
    const scene = scenes[index]!;
    const { blob, dataUrl } = await capturePostImage({ node: root, format: "png", width: scene.size.width, height: scene.size.height, scale: 1 });
    pages.push({ blob, dataUrl, width: scene.size.width, height: scene.size.height });
  }
  await exportMultiPagePdf({ pages, filename });
}

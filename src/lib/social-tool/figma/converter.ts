import type { FigmaConverter } from "@figit/dom-to-figma";
import { postforgeClassify } from "@/lib/social-tool/figma/classify";
import { postforgeFontLoader } from "@/lib/social-tool/figma/fontLoader";
import { postforgeImageLoader } from "@/lib/social-tool/figma/imageLoader";

let converterPromise: Promise<FigmaConverter> | null = null;

async function loadConverter(): Promise<FigmaConverter> {
  const { createFigmaConverter } = await import("@figit/dom-to-figma");
  return createFigmaConverter({
    fontLoader: postforgeFontLoader,
    imageLoader: postforgeImageLoader,
    classify: postforgeClassify,
    layout: "auto",
  });
}

export function getFigmaConverter(): Promise<FigmaConverter> {
  if (!converterPromise) {
    converterPromise = loadConverter();
  }
  return converterPromise;
}

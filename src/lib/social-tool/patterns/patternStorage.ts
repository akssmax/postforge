import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import { parseSvgViewBox } from "@/lib/social-tool/patterns/tintSvg";
import type {
  CustomPatternRecord,
  PatternScope,
} from "@/lib/social-tool/patterns/types";

const GLOBAL_KEY = "postforge:patterns:global";
const DESIGN_KEY_PREFIX = "postforge:patterns:design:";
export const MAX_PATTERN_BYTES = 500 * 1024;

function designKey(designId: string): string {
  return `${DESIGN_KEY_PREFIX}${designId}`;
}

function loadGlobal(): CustomPatternRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomPatternRecord[];
  } catch {
    return [];
  }
}

function saveGlobal(records: CustomPatternRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_KEY, JSON.stringify(records));
}

function loadDesign(designId: string): CustomPatternRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(designKey(designId));
    if (!raw) return [];
    return JSON.parse(raw) as CustomPatternRecord[];
  } catch {
    return [];
  }
}

function saveDesign(designId: string, records: CustomPatternRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(designKey(designId), JSON.stringify(records));
}

export function listCustomPatterns(designId?: string): CustomPatternRecord[] {
  const global = loadGlobal();
  const scoped = designId ? loadDesign(designId) : [];
  return [...global, ...scoped].sort((a, b) => b.createdAt - a.createdAt);
}

export function getCustomPattern(
  refId: string,
  designId?: string,
): CustomPatternRecord | undefined {
  const global = loadGlobal();
  const foundGlobal = global.find((r) => r.id === refId);
  if (foundGlobal) return foundGlobal;
  if (designId) {
    return loadDesign(designId).find((r) => r.id === refId);
  }
  return global.find((r) => r.id === refId);
}

export async function parsePatternSvgFile(file: File): Promise<{
  svgMarkup: string;
  tileWidth: number;
  tileHeight: number;
}> {
  const name = file.name.toLowerCase();
  if (file.type !== "image/svg+xml" && !name.endsWith(".svg")) {
    throw new Error("Upload an SVG pattern file.");
  }
  if (file.size > MAX_PATTERN_BYTES) {
    throw new Error("Pattern SVG must be under 500 KB.");
  }
  const text = await file.text();
  const svgMarkup = sanitizeSvgMarkup(text);
  if (!svgMarkup) {
    throw new Error("Could not parse this SVG. Try a simpler file.");
  }
  const { width, height } = parseSvgViewBox(svgMarkup);
  return { svgMarkup, tileWidth: width, tileHeight: height };
}

export function addCustomPattern(input: {
  name: string;
  svgMarkup: string;
  tileWidth: number;
  tileHeight: number;
  scope: PatternScope;
  designId?: string;
}): CustomPatternRecord {
  const id = `pat-${Date.now()}`;
  const record: CustomPatternRecord = {
    id,
    name: input.name.trim() || "Custom pattern",
    svgMarkup: input.svgMarkup,
    tileWidth: input.tileWidth,
    tileHeight: input.tileHeight,
    scope: input.scope,
    designId: input.scope === "design" ? input.designId : undefined,
    createdAt: Date.now(),
  };

  if (input.scope === "design" && input.designId) {
    const next = [record, ...loadDesign(input.designId)];
    saveDesign(input.designId, next);
  } else {
    const next = [record, ...loadGlobal()];
    saveGlobal(next);
  }

  return record;
}

export function deleteCustomPattern(
  id: string,
  designId?: string,
): boolean {
  const global = loadGlobal();
  const nextGlobal = global.filter((r) => r.id !== id);
  if (nextGlobal.length !== global.length) {
    saveGlobal(nextGlobal);
    return true;
  }
  if (designId) {
    const scoped = loadDesign(designId);
    const nextScoped = scoped.filter((r) => r.id !== id);
    if (nextScoped.length !== scoped.length) {
      saveDesign(designId, nextScoped);
      return true;
    }
  }
  return false;
}

export function customPatternRefForRecord(record: CustomPatternRecord): string {
  return `custom:${record.id}`;
}

import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";

export function buildLayoutCatalogPrompt(): string {
  const catalog = POST_LAYOUTS.map((layout) => ({
    id: layout.id,
    name: layout.name,
    summary: layout.summary,
    tags: layout.tags,
    composition: layout.composition ?? "stack",
    stack: layout.stack,
    textZoneRatio: layout.textZoneRatio,
    bestFor: layout.bestFor,
    promptHints: layout.promptHints.slice(0, 6),
  }));

  return JSON.stringify(catalog, null, 2);
}

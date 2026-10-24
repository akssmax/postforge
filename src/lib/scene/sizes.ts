import type { SceneDocument } from "@/lib/scene/schema";

/** Canvas sizes a scene can reflow to; one auto-layout tree serves all of them. */
export const SCENE_SIZES = [
  { id: "square", label: "Square 1:1", width: 1080, height: 1080 },
  { id: "portrait", label: "Portrait 4:5", width: 1080, height: 1350 },
  { id: "story", label: "Story 9:16", width: 1080, height: 1920 },
  { id: "landscape", label: "Landscape", width: 1200, height: 627 },
] as const;

export type SceneSize = (typeof SCENE_SIZES)[number];

/** The same design at another size. Layout is auto-layout, so nothing else changes. */
export function resizeScene(scene: SceneDocument, size: { width: number; height: number }): SceneDocument {
  const kind = scene.kind === "social" || scene.kind === "story"
    ? (size.height >= size.width * 1.5 ? "story" : "social")
    : scene.kind;
  return { ...scene, kind, size: { width: size.width, height: size.height } };
}

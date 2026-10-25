import type { BrandColors } from "@/lib/brand/types";
import type { SceneDocument, SceneNode } from "@/lib/scene/schema";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export type ComposeStreamEvent =
  | { type: "draft"; scene: SceneDocument; colors: BrandColors; ms: number }
  | { type: "blocks"; blocks: VisualBlockRecord[]; ms: number }
  | { type: "partial"; scene: SceneDocument; ms: number }
  | { type: "final"; scene: SceneDocument; source: "ai" | "draft"; rationale?: string; note?: string; ms: number }
  | { type: "error"; message: string };

/** POST JSON and hand each newline-delimited JSON event in the streamed reply to `onEvent`. */
export async function streamNdjson<E extends { type: string }>(
  url: string,
  body: unknown,
  onEvent: (event: E | { type: "error"; message: string }) => void,
  signal?: AbortSignal,
  headers: Record<string, string> = {},
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    onEvent({ type: "error", message: payload?.error ?? "The request failed. Try again." });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as E);
      newline = buffer.indexOf("\n");
    }
    if (done) break;
  }
}

/** POST a brief to /api/scene/compose and hand each streamed event to `onEvent`. */
export function streamComposeScene(
  body: { brief: string; size: { width: number; height: number }; brandColors?: BrandColors; modelId?: string },
  onEvent: (event: ComposeStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  return streamNdjson<ComposeStreamEvent>("/api/scene/compose", body, onEvent, signal);
}

/** Fill unresolved visual nodes (queries, placeholders) with picked blocks, in order. */
export function attachBlocks(scene: SceneDocument, blocks: VisualBlockRecord[]): SceneDocument {
  if (!blocks.length) return scene;
  let index = 0;
  const fill = (node: SceneNode): SceneNode => {
    if (node.type === "frame") return { ...node, children: node.children.map(fill) };
    if (node.type === "visual" && (node.source.kind === "query" || node.source.kind === "placeholder")) {
      const block = blocks[index++ % blocks.length]!;
      return { ...node, source: { kind: "block", blockId: block.id } };
    }
    return node;
  };
  return {
    ...scene,
    overlays: scene.overlays.map((overlay) => ({ ...overlay, node: fill(overlay.node) })),
    root: fill(scene.root) as SceneDocument["root"],
  };
}

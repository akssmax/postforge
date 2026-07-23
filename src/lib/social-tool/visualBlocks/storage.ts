import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export function createVisualBlockId(): string {
  return `vblock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertVisualBlock(
  blocks: VisualBlockRecord[],
  block: VisualBlockRecord,
): VisualBlockRecord[] {
  const index = blocks.findIndex((entry) => entry.id === block.id);
  if (index < 0) return [...blocks, block];
  const next = [...blocks];
  next[index] = block;
  return next;
}

export function appendVisualBlocks(
  blocks: VisualBlockRecord[],
  incoming: VisualBlockRecord[],
): VisualBlockRecord[] {
  const ids = new Set(blocks.map((b) => b.id));
  const merged = [...blocks];
  for (const block of incoming) {
    if (ids.has(block.id)) continue;
    merged.push(block);
    ids.add(block.id);
  }
  return merged;
}

export function findVisualBlock(
  blocks: VisualBlockRecord[],
  blockId: string | null | undefined,
): VisualBlockRecord | undefined {
  if (!blockId) return undefined;
  return blocks.find((block) => block.id === blockId);
}

export function activeVisualBlock(
  blocks: VisualBlockRecord[],
  activeBlockId: string | null | undefined,
): VisualBlockRecord | undefined {
  return findVisualBlock(blocks, activeBlockId) ?? blocks[0];
}

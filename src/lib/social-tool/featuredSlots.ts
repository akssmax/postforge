import type { FeaturedImageTransform } from "@/components/social-tool/templates/ProductShotPost";
import type { FeaturedSlotContent } from "@/lib/social-tool/dynamicLayout";
import type { ProductPageId } from "@/lib/social-tool/presets";
import { findVisualBlock, upsertVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export const FEATURED_PRIMARY_SLOT_ID = "featured-primary";
export const MAX_FEATURED_SLOTS = 3;

export function ensureFeaturedSlots(
  slots: FeaturedSlotContent[] | undefined,
  fallback?: Partial<FeaturedSlotContent>,
): FeaturedSlotContent[] {
  if (slots && slots.length > 0) return slots;
  return [
    {
      slotId: FEATURED_PRIMARY_SLOT_ID,
      mode: fallback?.mode ?? "placeholder",
      productPage: fallback?.productPage,
      activeBlockId: fallback?.activeBlockId ?? null,
      transform: fallback?.transform,
      visible: fallback?.visible ?? true,
    },
  ];
}

export function nextFeaturedSlotId(slots: FeaturedSlotContent[]): string {
  const used = new Set(slots.map((slot) => slot.slotId));
  if (!used.has(FEATURED_PRIMARY_SLOT_ID)) return FEATURED_PRIMARY_SLOT_ID;
  let index = 2;
  while (used.has(`featured-${index}`)) index += 1;
  return `featured-${index}`;
}

export function addFeaturedSlot(
  slots: FeaturedSlotContent[] | undefined,
  options?: { transform?: FeaturedImageTransform },
): FeaturedSlotContent[] | null {
  const current = ensureFeaturedSlots(slots);
  if (current.length >= MAX_FEATURED_SLOTS) return null;
  return [
    ...current,
    {
      slotId: nextFeaturedSlotId(current),
      mode: "placeholder",
      visible: true,
      activeBlockId: null,
      transform: options?.transform,
    },
  ];
}

export function removeFeaturedSlot(
  slots: FeaturedSlotContent[] | undefined,
  slotId: string,
): FeaturedSlotContent[] {
  const current = ensureFeaturedSlots(slots);
  if (current.length <= 1) return current;
  const next = current.filter((slot) => slot.slotId !== slotId);
  return next.length > 0 ? next : current;
}

export function reorderFeaturedSlot(
  slots: FeaturedSlotContent[] | undefined,
  slotId: string,
  direction: "left" | "right",
): FeaturedSlotContent[] {
  const current = [...ensureFeaturedSlots(slots)];
  const index = current.findIndex((slot) => slot.slotId === slotId);
  if (index < 0) return current;
  const target = direction === "left" ? index - 1 : index + 1;
  if (target < 0 || target >= current.length) return current;
  const moving = current[index]!;
  current[index] = current[target]!;
  current[target] = moving;
  return current;
}

export function patchFeaturedSlot(
  slots: FeaturedSlotContent[] | undefined,
  slotId: string,
  patch: Partial<FeaturedSlotContent>,
): FeaturedSlotContent[] {
  const current = ensureFeaturedSlots(slots);
  if (!current.some((slot) => slot.slotId === slotId)) {
    return [
      ...current,
      {
        slotId,
        mode: patch.mode ?? "composed",
        visible: patch.visible ?? true,
        activeBlockId: patch.activeBlockId ?? null,
        transform: patch.transform,
        productPage: patch.productPage,
      },
    ];
  }
  return current.map((slot) =>
    slot.slotId === slotId ? { ...slot, ...patch } : slot,
  );
}

export function findFeaturedSlot(
  slots: FeaturedSlotContent[] | undefined,
  slotId: string,
): FeaturedSlotContent | undefined {
  return ensureFeaturedSlots(slots).find((slot) => slot.slotId === slotId);
}

export function featuredSlotIndex(
  slots: FeaturedSlotContent[] | undefined,
  slotId: string,
): number {
  return ensureFeaturedSlots(slots).findIndex((slot) => slot.slotId === slotId);
}

export function resolveSlotBlock(
  slot: FeaturedSlotContent,
  visualBlocks: VisualBlockRecord[],
): VisualBlockRecord | undefined {
  return findVisualBlock(visualBlocks, slot.activeBlockId);
}

/**
 * Upsert a block for a target slot without wiping other slots' same-kind visuals.
 * Drops the target slot's previous block only when nothing else references it and
 * it isn't kept as the opposite-kind dual-cache for a kind toggle.
 */
export function withAssignedVisualBlock(
  blocks: VisualBlockRecord[],
  slots: FeaturedSlotContent[] | undefined,
  nextBlock: VisualBlockRecord,
  targetSlotId: string,
): VisualBlockRecord[] {
  const current = ensureFeaturedSlots(slots);
  const target = current.find((slot) => slot.slotId === targetSlotId);
  const previousId = target?.activeBlockId ?? null;
  let next = upsertVisualBlock(blocks, nextBlock);

  if (previousId && previousId !== nextBlock.id) {
    const stillUsedElsewhere = current.some(
      (slot) =>
        slot.slotId !== targetSlotId && slot.activeBlockId === previousId,
    );
    const previous = findVisualBlock(next, previousId);
    const keepForKindToggle =
      !!previous &&
      previous.kind !== nextBlock.kind &&
      (previous.kind === "ui" || previous.kind === "illustration") &&
      (nextBlock.kind === "ui" || nextBlock.kind === "illustration");
    if (!stillUsedElsewhere && !keepForKindToggle) {
      next = next.filter((block) => block.id !== previousId);
    }
  }

  return next;
}

/**
 * Backfill primary slot activeBlockId from legacy session-level pointer.
 */
export function migrateFeaturedSlotBlockIds(
  slots: FeaturedSlotContent[] | undefined,
  fallbackActiveId?: string | null,
): FeaturedSlotContent[] {
  const current = ensureFeaturedSlots(slots, {
    activeBlockId: fallbackActiveId,
  });
  if (!fallbackActiveId) return current;
  return current.map((slot) => {
    if (slot.slotId !== FEATURED_PRIMARY_SLOT_ID) return slot;
    if (slot.activeBlockId) return slot;
    return { ...slot, activeBlockId: fallbackActiveId };
  });
}

export function createPlaceholderFeaturedSlot(
  slotId: string,
  options?: {
    transform?: FeaturedImageTransform;
    productPage?: ProductPageId;
  },
): FeaturedSlotContent {
  return {
    slotId,
    mode: "placeholder",
    visible: true,
    activeBlockId: null,
    transform: options?.transform,
    productPage: options?.productPage,
  };
}

type ToolSlotRef = {
  slotId: string;
  mode?: string;
  activeBlockId?: string | null;
  visible?: boolean;
};

/**
 * Pick which featured slot a chat/canvas tool should update.
 * Never invents a new slot id — prefers selection, then empty, then primary.
 */
export function resolveToolFeaturedSlotId(options: {
  slots?: ToolSlotRef[] | null;
  requestedSlotId?: string | null;
  selection?: string | null;
}): string {
  const slots = options.slots ?? [];
  const requested = options.requestedSlotId?.trim();
  if (requested && slots.some((slot) => slot.slotId === requested)) {
    return requested;
  }

  if (options.selection === "featured") {
    if (slots.some((slot) => slot.slotId === FEATURED_PRIMARY_SLOT_ID)) {
      return FEATURED_PRIMARY_SLOT_ID;
    }
  } else if (options.selection?.startsWith("featured:")) {
    const selectedId = options.selection.slice("featured:".length);
    if (slots.some((slot) => slot.slotId === selectedId)) return selectedId;
  }

  const empty = slots.find(
    (slot) =>
      slot.visible !== false &&
      (slot.mode === "placeholder" || !slot.activeBlockId),
  );
  if (empty) return empty.slotId;

  if (slots.some((slot) => slot.slotId === FEATURED_PRIMARY_SLOT_ID)) {
    return FEATURED_PRIMARY_SLOT_ID;
  }
  return slots[0]?.slotId ?? FEATURED_PRIMARY_SLOT_ID;
}

/**
 * Apply a tool patch to featured slots without growing the slot list.
 * Empty designs get exactly one primary slot.
 */
export function patchFeaturedSlotsForTool(
  existing: FeaturedSlotContent[] | undefined,
  slotId: string,
  patch: Partial<FeaturedSlotContent>,
): FeaturedSlotContent[] {
  if (!existing || existing.length === 0) {
    return [
      {
        slotId: FEATURED_PRIMARY_SLOT_ID,
        mode: patch.mode ?? "composed",
        visible: patch.visible ?? true,
        activeBlockId: patch.activeBlockId ?? null,
        transform: patch.transform,
        productPage: patch.productPage,
      },
    ];
  }

  const targetId = existing.some((slot) => slot.slotId === slotId)
    ? slotId
    : existing.find((slot) => slot.slotId === FEATURED_PRIMARY_SLOT_ID)?.slotId ??
      existing[0]!.slotId;

  return existing.map((slot) =>
    slot.slotId === targetId ? { ...slot, ...patch } : slot,
  );
}

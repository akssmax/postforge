import type { DesignSessionPersisted } from "@/lib/design/types";
import {
  FEATURED_PRIMARY_SLOT_ID,
  withAssignedVisualBlock,
} from "@/lib/social-tool/featuredSlots";
import type { FeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

export function applyFeaturedVisualBlockToSession(
  session: DesignSessionPersisted,
  newBlock: VisualBlockRecord,
  activeKind: FeaturedVisualKind,
): DesignSessionPersisted {
  const blocks = session.featured.visualBlocks ?? [];
  const visualBlocks = withAssignedVisualBlock(
    blocks,
    session.document.featuredSlots,
    newBlock,
    FEATURED_PRIMARY_SLOT_ID,
  );

  return {
    ...session,
    featured: {
      ...session.featured,
      mode: "composed",
      activeBlockId: newBlock.id,
      visualBlocks,
    },
    document: {
      ...session.document,
      featuredVisualKind: activeKind,
      showFeaturedImage: true,
      featuredSlots: (session.document.featuredSlots ?? [
        {
          slotId: FEATURED_PRIMARY_SLOT_ID,
          mode: "composed" as const,
          visible: true,
          activeBlockId: session.featured.activeBlockId,
        },
      ]).map((slot) =>
        slot.slotId === FEATURED_PRIMARY_SLOT_ID
          ? {
              ...slot,
              mode: "composed" as const,
              visible: true,
              activeBlockId: newBlock.id,
            }
          : slot,
      ),
    },
    updatedAt: Date.now(),
  };
}

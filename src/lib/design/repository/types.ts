import type { DesignOnboardingPhase } from "@/lib/design/types";
import type { DesignSessionPersisted } from "@/lib/design/types";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

export type DesignSummary = {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  platformId: PlatformId;
  layoutId: PostLayoutId;
  layoutName: string;
  onboardingPhase: DesignOnboardingPhase;
  hasLogo: boolean;
  thumbnailKey?: string;
};

export interface DesignRepository {
  list(): Promise<DesignSummary[]>;
  get(id: string): Promise<DesignSessionPersisted | null>;
  upsert(session: DesignSessionPersisted): Promise<DesignSummary | null>;
  delete(id: string): Promise<void>;
  /** Remove one variant artboard (not the origin). Returns the next active board id. */
  deleteVariantBoard(boardId: string): Promise<string | null>;
  captureThumbnail(id: string, node: HTMLElement): Promise<void>;
}

import { z } from "zod";
import {
  featuredSlotContentSchema,
  textSlotContentSchema,
} from "@/lib/llm/schemas/designPlan";

export const slotDraftSchema = z.object({
  textSlots: z.array(textSlotContentSchema).min(1),
  featuredSlots: z.array(featuredSlotContentSchema).default([]),
  showContent: z.boolean().default(true),
  showBrand: z.boolean().default(true),
  showFeaturedImage: z.boolean().default(true),
});

export type SlotDraft = z.infer<typeof slotDraftSchema>;

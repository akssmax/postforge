import { textSlotsFromCopy } from "@/lib/social-tool/layoutAdapter";
import type { DynamicLayout } from "@/lib/social-tool/dynamicLayout";
import type { SlotDraft } from "@/lib/llm/schemas/slotDraft";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { generateFromBrief } from "@/lib/social-tool/briefGeneration";
import type { PlatformId } from "@/lib/social-tool/presets";

export function writeSlotsOffline(input: {
  userMessage: string;
  platformId: PlatformId;
  dynamicLayout: DynamicLayout;
  rulesProfile?: DesignRulesProfile;
}): SlotDraft {
  const offline = generateFromBrief(input.userMessage, input.platformId);
  const featuredPolicy = input.rulesProfile?.featuredPolicy ?? "library";

  return {
    textSlots: textSlotsFromCopy(offline.copy, input.dynamicLayout),
    featuredSlots: [
      featuredPolicy === "library"
        ? {
            slotId: "featured-primary",
            mode: "composed" as const,
            visible: true,
          }
        : featuredPolicy === "placeholder"
        ? {
            slotId: "featured-primary",
            mode: "placeholder" as const,
            visible: true,
          }
        : {
            slotId: "featured-primary",
            mode: "genui" as const,
            productPage: offline.productPage,
            visible: offline.showFeaturedImage,
          },
    ],
    showContent: offline.showContent,
    showBrand: true,
    showFeaturedImage:
      featuredPolicy === "hidden"
        ? false
        : featuredPolicy === "placeholder" || featuredPolicy === "library"
          ? true
          : offline.showFeaturedImage,
  };
}

import { generateObject } from "ai";
import { z } from "zod";
import { createMistralModel } from "@/lib/llm/mistral";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { rulesProfilePrompt } from "@/lib/llm/rules";
import {
  formatCandidatesForPrompt,
  type LayoutCandidate,
} from "@/lib/social-tool/engine/layoutRetriever";
import { POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";

const catalogIds = POST_LAYOUTS.map((layout) => layout.id) as [PostLayoutId, ...PostLayoutId[]];

const layoutRankSchema = z.object({
  layoutId: z.enum(catalogIds),
  rationale: z.string().min(1),
});

export async function rankLayout(
  intent: CampaignIntent,
  candidates: LayoutCandidate[],
  userMessage: string,
  rulesProfile?: DesignRulesProfile,
): Promise<{ layoutId: PostLayoutId; rationale: string }> {
  if (candidates.length === 0) {
    return {
      layoutId: "classic-hero",
      rationale: "Default hero layout for general announcements.",
    };
  }

  if (candidates.length === 1) {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} best matches ${intent.primaryIntent}.`,
    };
  }

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: layoutRankSchema,
      temperature: 0,
      system: [
        "You rank proven social post layouts for marketing communication.",
        "Pick exactly one layout ID from the candidate list.",
        "Do not invent layouts or specify geometry.",
        rulesProfile ? rulesProfilePrompt(rulesProfile) : "",
        rulesProfile?.layoutPolicy === "auto_by_density"
          ? "Prefer visual-first or balanced layouts when copy budget is tight."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "User brief:",
        userMessage,
        "",
        "Campaign intent:",
        JSON.stringify(intent, null, 2),
        "",
        "Candidate layouts:",
        formatCandidatesForPrompt(candidates),
        "",
        "Return the best layout id and a one-sentence rationale.",
      ].join("\n"),
    });

    return result.object;
  } catch {
    return {
      layoutId: candidates[0].layout.id,
      rationale: `${candidates[0].layout.name} ranked highest for ${intent.primaryIntent}.`,
    };
  }
}

import { generateObject } from "ai";
import { createMistralModel } from "@/lib/llm/mistral";
import { slotDraftSchema, type SlotDraft } from "@/lib/llm/schemas/slotDraft";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { rulesProfilePrompt } from "@/lib/llm/rules";
import { writeSlotsOffline } from "@/lib/llm/stages/slotWriterOffline";
import type { DynamicLayout } from "@/lib/social-tool/dynamicLayout";
import {
  countWords,
  getSlotConstraint,
  slotConstraintsPrompt,
  totalCopyWords,
} from "@/lib/social-tool/slotLibrary";
import type { PostLayout } from "@/lib/social-tool/postLayouts";
import type { PlatformId } from "@/lib/social-tool/presets";

export type SlotWriteFailure = {
  ok: false;
  reasons: string[];
};

export type SlotWriteSuccess = {
  ok: true;
  draft: SlotDraft;
};

function buildSlotPrompt(
  layout: DynamicLayout,
  rulesProfile: DesignRulesProfile,
): string {
  const textSlots = layout.slots.filter((slot) => slot.kind === "text");
  return textSlots
    .map((slot) => {
      const role = slot.textRole ?? "body";
      if (rulesProfile.bannedSlots.includes(role)) {
        return `- ${slot.id} (${role}): leave empty — not used for this format`;
      }
      return `- ${slot.id} (${role}): ${slotConstraintsPrompt(role, rulesProfile)}`;
    })
    .join("\n");
}

function featuredInstructions(rulesProfile: DesignRulesProfile): string[] {
  if (rulesProfile.featuredPolicy === "library") {
    return [
      "Set showFeaturedImage true.",
      "Use featuredSlots with slotId featured-primary, mode composed, visible true.",
      "Do not use genui product pages or placeholder frames — the pipeline picks a visuals-library asset matched to intent (UI block or illustration).",
    ];
  }
  if (rulesProfile.featuredPolicy === "placeholder") {
    return [
      "Set showFeaturedImage true.",
      "Use featuredSlots with slotId featured-primary, mode placeholder, visible true.",
      "Do not use genui product pages.",
    ];
  }
  if (rulesProfile.featuredPolicy === "hidden") {
    return ["Set showFeaturedImage false."];
  }
  return [
    "Set showFeaturedImage true when product UI proof is needed.",
    "Use featuredSlots with slotId featured-primary when showFeaturedImage is true.",
  ];
}

function copyStructureInstructions(rulesProfile: DesignRulesProfile): string[] {
  const lines = [
    "Structure: headline → one short subline → single CTA in extras/footer only.",
    `Word limits: headline ≤${rulesProfile.copyBudget.headlineWords}, subheading ≤${rulesProfile.copyBudget.subheadingWords}, CTA ≤${rulesProfile.copyBudget.ctaWords}, total ≤${rulesProfile.copyBudget.maxTotalWords}.`,
    "No body paragraphs. No long marketing prose in extras.",
  ];
  if (rulesProfile.bannedSlots.includes("body")) {
    lines.push("Do not fill body-role slots.");
  }
  return lines;
}

function sanitizeDraft(draft: SlotDraft, rulesProfile: DesignRulesProfile): SlotDraft {
  const filteredTextSlots = draft.textSlots.filter((slot) => {
    if (rulesProfile.bannedSlots.includes(slot.role)) return false;
    const constraint = getSlotConstraint(slot.role, rulesProfile);
    if (constraint.maxCharacters === 0) return false;
    return true;
  });

  const textSlots = filteredTextSlots.map((slot) => {
    const constraint = getSlotConstraint(slot.role, rulesProfile);
    let text = slot.text.trim();
    if (constraint.maxWords != null && countWords(text) > constraint.maxWords) {
      text = text.split(/\s+/).slice(0, constraint.maxWords).join(" ");
    }
    if (text.length > constraint.maxCharacters) {
      text = text.slice(0, constraint.maxCharacters).trim();
    }
    return { ...slot, text };
  });

  const featuredPolicy = rulesProfile.featuredPolicy;
  let featuredSlots = draft.featuredSlots;
  let showFeaturedImage = draft.showFeaturedImage;

  if (featuredPolicy === "library") {
    showFeaturedImage = true;
    featuredSlots = [
      {
        slotId: "featured-primary",
        mode: "composed" as const,
        visible: true,
      },
    ];
  } else if (featuredPolicy === "placeholder") {
    showFeaturedImage = true;
    featuredSlots = [
      {
        slotId: "featured-primary",
        mode: "placeholder" as const,
        visible: true,
      },
    ];
  } else if (featuredPolicy === "hidden") {
    showFeaturedImage = false;
    featuredSlots = draft.featuredSlots.map((slot) => ({ ...slot, visible: false }));
  }

  return {
    ...draft,
    textSlots,
    featuredSlots,
    showFeaturedImage,
  };
}

export function validateSlotDraft(
  draft: SlotDraft,
  rulesProfile: DesignRulesProfile,
): SlotWriteFailure | SlotWriteSuccess {
  const reasons: string[] = [];

  for (const slot of draft.textSlots) {
    const constraint = getSlotConstraint(slot.role, rulesProfile);
    if (rulesProfile.bannedSlots.includes(slot.role) && slot.text.trim()) {
      reasons.push(`${slot.role} slot should be empty for ${rulesProfile.label}`);
    }
    if (constraint.maxCharacters > 0 && slot.text.length > constraint.maxCharacters) {
      reasons.push(
        `${slot.role} is ${slot.text.length} chars, max ${constraint.maxCharacters}`,
      );
    }
    if (constraint.maxWords != null && countWords(slot.text) > constraint.maxWords) {
      reasons.push(
        `${slot.role} is ${countWords(slot.text)} words, max ${constraint.maxWords}`,
      );
    }
  }

  const totalWords = totalCopyWords(draft.textSlots, rulesProfile);
  if (totalWords > rulesProfile.copyBudget.maxTotalWords) {
    reasons.push(
      `Total copy is ${totalWords} words, max ${rulesProfile.copyBudget.maxTotalWords}`,
    );
  }

  for (const required of rulesProfile.requiredSlots) {
    const slot = draft.textSlots.find((s) => s.role === required);
    if (!slot?.text.trim()) {
      reasons.push(`Missing required ${required}`);
    }
  }

  if (reasons.length > 0) {
    return { ok: false, reasons };
  }
  return { ok: true, draft };
}

export async function writeSlots(input: {
  intent: CampaignIntent;
  layout: PostLayout;
  dynamicLayout: DynamicLayout;
  userMessage: string;
  platformId: PlatformId;
  rulesProfile: DesignRulesProfile;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  retryReasons?: string[];
  themeAngle?: string;
}): Promise<SlotDraft> {
  const slotPrompt = buildSlotPrompt(input.dynamicLayout, input.rulesProfile);

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: slotDraftSchema,
      temperature: input.retryReasons?.length ? 0.2 : 0.4,
      system: [
        "You write marketing copy for social post slots.",
        "Fill each slot with compelling copy — never mention layout, positioning, or geometry.",
        "Headlines may use [[accent]] markup for one highlighted phrase.",
        `Platform: ${input.platformId}`,
        input.brandSummary
          ? `Brand colors: primary ${input.brandSummary.primary}, accent ${input.brandSummary.accent}`
          : "",
        `Tone: ${input.intent.tone}`,
        `Audience: ${input.intent.audience}`,
        `Goal: ${input.intent.goal}`,
        rulesProfilePrompt(input.rulesProfile),
        ...copyStructureInstructions(input.rulesProfile),
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "Brief:",
        input.userMessage,
        input.themeAngle ? `Theme angle: ${input.themeAngle}` : "",
        "",
        "Intent:",
        JSON.stringify(input.intent, null, 2),
        "",
        input.retryReasons?.length
          ? `Previous attempt failed — rewrite SHORTER:\n${input.retryReasons.map((r) => `- ${r}`).join("\n")}`
          : "",
        "",
        "Slots to fill:",
        slotPrompt,
        "",
        ...featuredInstructions(input.rulesProfile),
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return sanitizeDraft(result.object, input.rulesProfile);
  } catch {
    return sanitizeDraft(
      writeSlotsOffline({
        userMessage: input.userMessage,
        platformId: input.platformId,
        dynamicLayout: input.dynamicLayout,
        rulesProfile: input.rulesProfile,
      }),
      input.rulesProfile,
    );
  }
}

export async function writeSlotsWithRetries(input: {
  intent: CampaignIntent;
  layout: PostLayout;
  dynamicLayout: DynamicLayout;
  userMessage: string;
  platformId: PlatformId;
  rulesProfile: DesignRulesProfile;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  themeAngle?: string;
}): Promise<{ draft: SlotDraft; retries: number; validationReasons: string[] }> {
  let retryReasons: string[] | undefined;
  let retries = 0;
  const maxRetries = input.rulesProfile.maxCopyRetries;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const draft = await writeSlots({ ...input, retryReasons });
    const validation = validateSlotDraft(draft, input.rulesProfile);
    if (validation.ok) {
      return { draft: validation.draft, retries, validationReasons: [] };
    }
    retryReasons = validation.reasons;
    retries = attempt + 1;
    if (attempt >= maxRetries) {
      return { draft, retries, validationReasons: validation.reasons };
    }
  }

  const fallback = sanitizeDraft(
    writeSlotsOffline({
      userMessage: input.userMessage,
      platformId: input.platformId,
      dynamicLayout: input.dynamicLayout,
      rulesProfile: input.rulesProfile,
    }),
    input.rulesProfile,
  );
  return { draft: fallback, retries, validationReasons: retryReasons ?? [] };
}

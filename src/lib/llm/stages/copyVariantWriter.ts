import { generateObject } from "ai";
import { z } from "zod";
import { createMistralModel } from "@/lib/llm/mistral";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import {
  campaignPlanToIntent,
  type CampaignPlan,
} from "@/lib/llm/schemas/campaignPlan";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { rulesProfilePrompt } from "@/lib/llm/rules";
import type { CopyVariant } from "@/lib/social-tool/presets";
import { COPY_VARIANT_POOL_SIZE } from "@/lib/social-tool/presets";
import { countWords } from "@/lib/social-tool/slotLibrary";
import { resolveDesignRulesForBrief } from "@/lib/llm/rules";
import { intentFromBrief } from "@/lib/social-tool/engine/intentFromBrief";
import type { PlatformId } from "@/lib/social-tool/presets";

const copyVariantSchema = z.object({
  heading: z.string(),
  subheading: z.string(),
});

const copyVariantsResponseSchema = z.object({
  variants: z.array(copyVariantSchema).min(6).max(10),
});

function normalizeVariant(variant: CopyVariant, rulesProfile: DesignRulesProfile): CopyVariant {
  let heading = variant.heading.trim();
  let subheading = variant.subheading.trim();

  if (countWords(heading) > rulesProfile.copyBudget.headlineWords) {
    heading = heading.split(/\s+/).slice(0, rulesProfile.copyBudget.headlineWords).join(" ");
  }
  if (countWords(subheading) > rulesProfile.copyBudget.subheadingWords) {
    subheading = subheading
      .split(/\s+/)
      .slice(0, rulesProfile.copyBudget.subheadingWords)
      .join(" ");
  }

  return { heading, subheading };
}

function dedupeKey(variant: CopyVariant): string {
  return `${variant.heading.toLowerCase()}::${variant.subheading.toLowerCase()}`;
}

export function buildCopyVariantPool(
  primary: CopyVariant,
  alternatives: CopyVariant[],
  rulesProfile: DesignRulesProfile,
): CopyVariant[] {
  const pool: CopyVariant[] = [];
  const seen = new Set<string>();

  const push = (variant: CopyVariant) => {
    const normalized = normalizeVariant(variant, rulesProfile);
    if (!normalized.heading.trim()) return;
    const key = dedupeKey(normalized);
    if (seen.has(key)) return;
    seen.add(key);
    pool.push(normalized);
  };

  push(primary);
  for (const variant of alternatives) {
    push(variant);
    if (pool.length >= COPY_VARIANT_POOL_SIZE) break;
  }

  return pool.slice(0, COPY_VARIANT_POOL_SIZE);
}

const OFFLINE_VARIANT_TEMPLATES: ReadonlyArray<{
  heading: (topic: string) => string;
  subheading: (topic: string) => string;
}> = [
  {
    heading: (topic) => `${topic} Just Got Smarter`,
    subheading: () => "Capture every interaction, automate every update.",
  },
  {
    heading: (topic) => `Built for Teams That Move Fast`,
    subheading: (topic) => `${topic} — one workspace for pipeline, outreach, and reporting.`,
  },
  {
    heading: (topic) => `Ship ${topic} Without the Chaos`,
    subheading: () => "Plan, publish, and measure from a single brand kit.",
  },
  {
    heading: (topic) => `Introducing ${topic}`,
    subheading: () => "A new chapter for your brand — share the news with your audience.",
  },
  {
    heading: () => "Turn Attention Into Pipeline",
    subheading: () => "Launch posts that look on-brand and convert on every channel.",
  },
  {
    heading: (topic) => `See ${topic} in Action`,
    subheading: () => "Explore the workflow your team will use every day.",
  },
  {
    heading: () => "Less Busywork. More Momentum.",
    subheading: () => "Automate updates, keep messaging sharp, stay consistent.",
  },
  {
    heading: (topic) => `${topic} for Modern GTM Teams`,
    subheading: () => "From first touch to closed-won — aligned in one place.",
  },
  {
    heading: () => "Launch Week Starts Now",
    subheading: () => "Announce the update your customers have been waiting for.",
  },
];

function extractTopic(brief: string): string {
  const trimmed = brief.trim();
  if (!trimmed) return "Your Product";
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  const words = firstLine.split(/\s+/).slice(0, 6);
  const topic = words.join(" ");
  return topic.length > 48 ? `${topic.slice(0, 45).trim()}…` : topic;
}

/** Build a shuffle-ready copy pool for any generation path (LLM, offline, legacy). */
export function buildCopyVariantsForBrief(
  userMessage: string,
  primary: CopyVariant,
  platformId: PlatformId,
): CopyVariant[] {
  const intent = intentFromBrief(userMessage, platformId);
  const rulesProfile = resolveDesignRulesForBrief(intent, userMessage);
  return buildCopyVariantPool(
    primary,
    writeCopyVariantsOffline({ userMessage, rulesProfile }),
    rulesProfile,
  );
}

export function writeCopyVariantsOffline(input: {
  userMessage: string;
  rulesProfile: DesignRulesProfile;
}): CopyVariant[] {
  const topic = extractTopic(input.userMessage);
  return OFFLINE_VARIANT_TEMPLATES.map((template) =>
    normalizeVariant(
      {
        heading: template.heading(topic),
        subheading: template.subheading(topic),
      },
      input.rulesProfile,
    ),
  );
}

export async function writeCopyVariants(input: {
  intent: CampaignIntent | CampaignPlan;
  userMessage: string;
  platformId: PlatformId;
  rulesProfile: DesignRulesProfile;
  brandSummary?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  themeAngle?: string;
  instruction?: string;
  excludePrimary?: CopyVariant;
}): Promise<CopyVariant[]> {
  const intent =
    "campaign" in input.intent && typeof input.intent.campaign === "object"
      ? campaignPlanToIntent(input.intent as CampaignPlan)
      : (input.intent as CampaignIntent);
  const targetCount = COPY_VARIANT_POOL_SIZE - (input.excludePrimary ? 1 : 0);

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: copyVariantsResponseSchema,
      temperature: 0.65,
      system: [
        "You write alternate marketing copy options for social posts.",
        "Each variant needs a distinct headline angle — never repeat phrasing.",
        "Headlines may use [[accent]] markup for one highlighted phrase.",
        `Platform: ${input.platformId}`,
        input.brandSummary
          ? `Brand colors: primary ${input.brandSummary.primary}, accent ${input.brandSummary.accent}`
          : "",
        `Tone: ${intent.tone}`,
        `Audience: ${intent.audience}`,
        `Goal: ${intent.goal}`,
        rulesProfilePrompt(input.rulesProfile),
        `Headline ≤${input.rulesProfile.copyBudget.headlineWords} words.`,
        `Subheading ≤${input.rulesProfile.copyBudget.subheadingWords} words.`,
        "No body paragraphs. One short subline per variant.",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "Brief:",
        input.userMessage,
        input.instruction ? `Follow-up instruction: ${input.instruction}` : "",
        input.themeAngle ? `Theme angle: ${input.themeAngle}` : "",
        input.excludePrimary
          ? `Do not repeat this primary copy:\nHeadline: ${input.excludePrimary.heading}\nSubheading: ${input.excludePrimary.subheading}`
          : "",
        "",
        `Generate ${targetCount} distinct headline + subheading pairs for shuffle alternatives.`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    return result.object.variants.map((variant) =>
      normalizeVariant(variant, input.rulesProfile),
    );
  } catch {
    return writeCopyVariantsOffline({
      userMessage: input.instruction ?? input.userMessage,
      rulesProfile: input.rulesProfile,
    });
  }
}

export function primaryCopyFromTextSlots(
  textSlots: { role: string; text: string }[],
): CopyVariant {
  return {
    heading: textSlots.find((slot) => slot.role === "headline")?.text.trim() ?? "",
    subheading:
      textSlots.find((slot) => slot.role === "subheading")?.text.trim() ?? "",
  };
}

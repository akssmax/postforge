import { generateObject } from "ai";
import type { UIMessage } from "ai";
import { createMistralModel } from "@/lib/llm/mistral";
import {
  detectFormatFromBrief,
  extractThemesFromBrief,
} from "@/lib/llm/rules";
import {
  campaignIntentSchema,
  type CampaignIntent,
} from "@/lib/llm/schemas/campaignIntent";
import { intentFromBrief } from "@/lib/social-tool/engine/intentFromBrief";
import { inferFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import type { PlatformId } from "@/lib/social-tool/presets";

function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function analyzeIntent(input: {
  userMessage: string;
  messages: UIMessage[];
  platformId: PlatformId;
}): Promise<CampaignIntent> {
  const userMessage = input.userMessage || latestUserText(input.messages);
  if (!userMessage.trim()) {
    return intentFromBrief("", input.platformId);
  }

  const fallback = intentFromBrief(userMessage, input.platformId);
  const format = detectFormatFromBrief(userMessage);
  const themes = extractThemesFromBrief(userMessage);

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: campaignIntentSchema,
      temperature: 0,
      system: [
        "You analyze marketing briefs for social post design.",
        "Extract structured campaign intent only — no layout, copy, colors, or geometry.",
        `Target platform: ${input.platformId}`,
        "Set featuredVisualKind to ui when the brief needs product proof (SaaS UI, metrics, dashboards, demos, ROI).",
        "Set featuredVisualKind to illustration when the brief is narrative, emotional, brand, cultural, festive, or lifestyle-led.",
        format === "ad"
          ? "This is an advertisement — set campaignType to advertisement and format to ad."
          : "",
        themes.length > 1
          ? `Extract themes/angles from the brief: ${themes.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "Analyze this brief:",
        userMessage,
        "",
        "Conversation context (may be empty):",
        input.messages
          .slice(-6)
          .map((message) => `${message.role}: ${message.parts.map((part) => ("text" in part ? part.text : "")).join("")}`)
          .join("\n"),
      ].join("\n"),
    });

    return {
      ...result.object,
      platform: input.platformId,
      keywords: result.object.keywords.length ? result.object.keywords : fallback.keywords,
      themes: result.object.themes.length ? result.object.themes : themes,
      featuredVisualKind:
        result.object.featuredVisualKind ??
        inferFeaturedVisualKind(userMessage, { ...result.object, keywords: fallback.keywords }),
      format: result.object.format ?? format,
      campaignType:
        format === "ad" || result.object.format === "ad"
          ? "advertisement"
          : result.object.campaignType,
      ctaRequired:
        format === "ad" ? true : result.object.ctaRequired,
    };
  } catch {
    return {
      ...fallback,
      themes,
      format,
      campaignType: format === "ad" ? "advertisement" : fallback.campaignType,
      ctaRequired: format === "ad" ? true : fallback.ctaRequired,
    };
  }
}

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createMistralModel } from "@/lib/llm/mistral";
import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import { resolveDesignRulesForBrief, rulesProfilePrompt, detectFormatFromBrief } from "@/lib/llm/rules";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PlatformId } from "@/lib/social-tool/presets";
import {
  generateVisualBlockToolSchema,
  modifyVisualBlockToolSchema,
  selectVisualBlockToolSchema,
  updateBackgroundToolSchema,
  updateBrandToolSchema,
  updateCopyToolSchema,
  updateFeaturedToolSchema,
  refreshCopyVariantsToolSchema,
  updateLayoutToolSchema,
  updatePatternToolSchema,
  updateSpacingToolSchema,
  updateTypographyToolSchema,
  updateVisibilityToolSchema,
} from "@/lib/llm/schemas/canvasTools";
import { composeVisualBlocks, modifyVisualBlock as modifyVisualBlockComposer } from "@/lib/llm/stages/genuiComposer";
import {
  buildCopyVariantPool,
  writeCopyVariants,
} from "@/lib/llm/stages/copyVariantWriter";
import {
  composeVisualBlocksFromLibrary,
  libraryPatternSummaryForPrompt,
} from "@/lib/social-tool/visualBlocks/library";
import { buildVisualPickIntentFromText } from "@/lib/social-tool/visualBlocks/library/scoring";
import { inferFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import { findVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import {
  computeGeneratedVisualBlocksPatch,
  computeModifiedVisualBlockPatch,
  computeSelectVisualBlockPatch,
  computeUpdateBackgroundPatch,
  computeUpdateBrandPatch,
  computeUpdateCopyPatch,
  computeRefreshCopyVariantsPatch,
  computeUpdateFeaturedPatch,
  computeUpdateLayoutPatch,
  computeUpdatePatternPatch,
  computeUpdateSpacingPatch,
  computeUpdateTypographyPatch,
  computeUpdateVisibilityPatch,
} from "@/lib/llm/services/computeCanvasPatch";

function buildSnapshotPrompt(snapshot: DesignSnapshot): string {
  return [
    "Current design snapshot:",
    `- Layout: ${snapshot.layoutName} (${snapshot.layoutId})`,
    `- Headline: ${snapshot.copy.heading}`,
    `- Subheading: ${snapshot.copy.subheading}`,
    `- Text slots: ${snapshot.textSlots.map((s) => `${s.slotId}=${JSON.stringify(s.text.slice(0, 60))}`).join("; ")}`,
    `- Background preset: ${snapshot.brand.activeBackgroundPresetId ?? "default"}`,
    `- Background options: ${snapshot.brand.backgroundPresets.map((p) => p.id).join(", ")}`,
    `- Pattern: ${snapshot.pattern.show ? snapshot.pattern.ref : "off"}`,
    `- Featured: ${snapshot.featured.visible ? snapshot.featured.mode : "hidden"}`,
    `- Visual blocks: ${snapshot.featured.visualBlocks.map((b) => `${b.id}:${b.label}`).join(", ") || "none"}`,
    `- Active visual block: ${snapshot.featured.activeBlockId ?? "none"}`,
    `- Uploaded image available: ${snapshot.featured.hasUploadedImage}`,
    `- Visibility: content=${snapshot.visibility.showContent}, brand=${snapshot.visibility.showBrand}, featured=${snapshot.visibility.showFeaturedImage}, pattern=${snapshot.visibility.showPattern}`,
    `- Allowed layouts: ${snapshot.allowedLayouts.join(", ")}`,
    `- Allowed patterns: ${snapshot.allowedPatternRefs.join(", ")}`,
    snapshot.selection ? `- Selected: ${snapshot.selection}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCanvasTools(
  snapshot: DesignSnapshot,
  rulesProfile: DesignRulesProfile,
  followUpMessage: string,
) {
  return {
    updateCopy: tool({
      description:
        "Update text in one or more copy slots (headline, subheading, CTA/extras). Provide full new text per slot.",
      inputSchema: updateCopyToolSchema,
      execute: async (input) => computeUpdateCopyPatch(snapshot, input),
    }),
    refreshCopyVariants: tool({
      description:
        "Regenerate 7-8 brief-specific headline/subheading options and apply the best one. Prefer this when the user asks to rewrite, refresh, or change copy direction.",
      inputSchema: refreshCopyVariantsToolSchema,
      execute: async (input) => {
        const instruction = input.instruction?.trim() || followUpMessage.trim();
        const briefContext = [
          snapshot.copy.heading,
          snapshot.copy.subheading,
          instruction,
        ]
          .filter(Boolean)
          .join(". ");
        const generated = await writeCopyVariants({
          intent: {
            campaignType: "announcement",
            platform: snapshot.platformId,
            format: "post",
            primaryIntent: "copy_refresh",
            audience: "general",
            goal: "awareness",
            tone: "enterprise",
            contentDensity: "low",
            visualPriority: "balanced",
            proofStrategy: "none",
            featuredVisualKind: inferFeaturedVisualKind(briefContext),
            ctaRequired: false,
            keywords: [],
            themes: [],
          },
          userMessage: briefContext,
          platformId: snapshot.platformId as PlatformId,
          rulesProfile,
          brandSummary: {
            primary: snapshot.brand.primary,
            accent: snapshot.brand.accent,
          },
          instruction: instruction || undefined,
        });
        const primary = generated[0] ?? {
          heading: snapshot.copy.heading,
          subheading: snapshot.copy.subheading,
        };
        const variants = buildCopyVariantPool(primary, generated.slice(1), rulesProfile);
        return computeRefreshCopyVariantsPatch(snapshot, variants, 0);
      },
    }),
    updateBackground: tool({
      description:
        "Change canvas background using a preset id from the snapshot catalog. Never invent preset ids.",
      inputSchema: updateBackgroundToolSchema,
      execute: async (input) => computeUpdateBackgroundPatch(snapshot, input),
    }),
    updatePattern: tool({
      description: "Toggle or change background pattern using allowed pattern refs.",
      inputSchema: updatePatternToolSchema,
      execute: async (input) => computeUpdatePatternPatch(snapshot, input),
    }),
    updateFeatured: tool({
      description: "Show/hide the visual slot or switch between placeholder, composed, or uploaded image.",
      inputSchema: updateFeaturedToolSchema,
      execute: async (input) => computeUpdateFeaturedPatch(snapshot, input),
    }),
    generateVisualBlock: tool({
      description:
        "Add visual blocks for the featured slot. Default to source=library for instant patterns; use source=generate only when the user wants custom AI SVG.",
      inputSchema: generateVisualBlockToolSchema,
      execute: async (input) => {
        const source = input.source ?? "library";
        const payload = {
          headline: snapshot.copy.heading,
          subheading: snapshot.copy.subheading,
          theme: input.theme,
          brief: input.brief ?? snapshot.copy.heading,
          brandColors: {
            primary: snapshot.brand.primary,
            accent: snapshot.brand.accent,
          },
          count: input.count ?? 3,
          intent: buildVisualPickIntentFromText(
            snapshot.copy.heading,
            snapshot.copy.subheading,
            input.theme,
            input.brief,
            followUpMessage,
          ),
        };
        const blocks =
          source === "library"
            ? composeVisualBlocksFromLibrary(payload, { libraryIds: input.libraryIds })
            : await composeVisualBlocks({ ...payload, source: "generate" });
        return computeGeneratedVisualBlocksPatch(snapshot, blocks);
      },
    }),
    modifyVisualBlock: tool({
      description:
        "Modify an existing visual block SVG using a natural-language instruction. Use for visual-slot edits only.",
      inputSchema: modifyVisualBlockToolSchema,
      execute: async (input) => {
        const blockId =
          input.blockId ??
          snapshot.featured.activeBlockId ??
          snapshot.featured.visualBlocks[0]?.id;
        const existing = findVisualBlock(
          snapshot.featured.visualBlocks.map((block) => ({
            ...block,
            svgMarkup: block.svgMarkup ?? "",
            createdAt: Date.now(),
          })),
          blockId,
        );
        if (!existing?.svgMarkup) {
          return { success: false as const, error: "No visual block to modify" };
        }
        const modified = await modifyVisualBlockComposer({
          blockId: existing.id,
          instruction: input.instruction,
          block: existing,
        });
        if (!modified) {
          return { success: false as const, error: "Could not modify visual block" };
        }
        const fullBlock = { ...existing, ...modified, id: existing.id };
        return computeModifiedVisualBlockPatch(snapshot, fullBlock);
      },
    }),
    selectVisualBlock: tool({
      description: "Switch the active visual block in the featured slot using a block id from the library.",
      inputSchema: selectVisualBlockToolSchema,
      execute: async (input) => computeSelectVisualBlockPatch(snapshot, input),
    }),
    updateLayout: tool({
      description:
        "Switch to another catalog layout. preserveCopy defaults to true.",
      inputSchema: updateLayoutToolSchema,
      execute: async (input) => computeUpdateLayoutPatch(snapshot, input),
    }),
    updateBrand: tool({
      description: "Adjust logo visibility, scale, placement, or alignment.",
      inputSchema: updateBrandToolSchema,
      execute: async (input) => computeUpdateBrandPatch(input),
    }),
    updateTypography: tool({
      description: "Change text alignment, fonts, or type scale.",
      inputSchema: updateTypographyToolSchema,
      execute: async (input) => computeUpdateTypographyPatch(input),
    }),
    updateVisibility: tool({
      description: "Show or hide content, brand, featured, pattern, or background.",
      inputSchema: updateVisibilityToolSchema,
      execute: async (input) => computeUpdateVisibilityPatch(input),
    }),
    updateSpacing: tool({
      description: "Adjust layout spacing tokens (Tailwind scale classes).",
      inputSchema: updateSpacingToolSchema,
      execute: async (input) => computeUpdateSpacingPatch(snapshot, input),
    }),
  };
}

export async function handleCanvasAgentRequest(input: {
  messages: UIMessage[];
  snapshot: DesignSnapshot;
}) {
  const model = createMistralModel();
  const userMessage =
    input.messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")
      ?.parts.filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("\n") ?? "";

  const intent = {
    campaignType: detectFormatFromBrief(userMessage) === "ad" ? "advertisement" : "announcement",
    platform: input.snapshot.platformId,
    format: detectFormatFromBrief(userMessage),
  } as CampaignIntent;

  const rulesProfile = resolveDesignRulesForBrief(
    {
      ...intent,
      primaryIntent: "edit",
      audience: "general",
      goal: "awareness",
      tone: "enterprise",
      contentDensity: "low",
      visualPriority: "balanced",
      proofStrategy: "none",
      featuredVisualKind: inferFeaturedVisualKind(userMessage),
      ctaRequired: false,
      keywords: [],
      themes: [],
    },
    userMessage,
  );

  const tools = buildCanvasTools(input.snapshot, rulesProfile, userMessage);

  const result = streamText({
    model,
    temperature: 0.2,
    system: [
      "You are Postforge's visual block assistant.",
      "Focus on the featured visual slot — generate, modify, or select visual blocks.",
      "Do not rewrite the entire design unless the user explicitly asks.",
      "Use generateVisualBlock for new diagrams/UI cards/illustrations.",
      "Prefer source=library (instant) unless the user asks for custom AI visuals.",
      "For UI patterns (stat-highlight, pricing-card, etc.), prefer library blocks and update content text fields — do not regenerate SVG.",
      "Available library patterns:",
      libraryPatternSummaryForPrompt(),
      "Use modifyVisualBlock to refine the active block.",
      "Use selectVisualBlock to swap blocks from the library.",
      "Use refreshCopyVariants when the user asks to rewrite, refresh, or change headline/subheading direction.",
      "Use updateCopy only for precise edits to specific slot text.",
      rulesProfilePrompt(rulesProfile),
      rulesProfile.featuredPolicy === "library"
        ? 'For "add visual" requests, prefer generateVisualBlock with source=library — pick UI blocks or illustrations whose tags match brief intent (keywords, goal, proofStrategy). Use libraryIds when you know the best-matched asset id. Use source=generate only when the user explicitly wants custom AI SVG.'
        : rulesProfile.featuredPolicy === "placeholder"
          ? 'For "add visual" requests on ads, use updateFeatured with mode placeholder — not product UI pages.'
          : "",
      "",
      buildSnapshotPrompt(input.snapshot),
    ]
      .filter(Boolean)
      .join("\n"),
    messages: await convertToModelMessages(input.messages),
    tools,
    toolChoice: "auto",
  });

  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });
}

export async function handleClarifyRequest(question: string) {
  const model = createMistralModel();
  const result = streamText({
    model,
    temperature: 0.3,
    prompt: `Ask the user this clarifying question in a friendly sentence: ${question}`,
  });
  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream(),
  });
}

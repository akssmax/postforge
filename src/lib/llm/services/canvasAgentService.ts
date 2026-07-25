import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createMistralModel, LLM_STREAM_TIMEOUT_MS } from "@/lib/llm/mistral";
import { toBriefChatClientError } from "@/lib/llm/streamErrors";
import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import { resolveDesignRulesForBrief, rulesProfilePrompt, detectFormatFromBrief } from "@/lib/llm/rules";
import type { CampaignIntent } from "@/lib/llm/schemas/campaignIntent";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import type { PlatformId } from "@/lib/social-tool/presets";
import {
  attachArtboardTarget,
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
  withArtboardTargetSchema,
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
  const artboards = snapshot.artboards;
  const artboardLine = artboards
    ? [
        `- Artboards: ${artboards.count} total; editing #${artboards.activeIndex}`,
        `- Board list: ${artboards.boards
          .map(
            (b) =>
              `#${b.index} (${b.layoutName}): ${JSON.stringify(b.headline.slice(0, 48))}`,
          )
          .join("; ")}`,
        `- Set targetArtboards on tools: "active" (default), "all", or 1-based indices like [1,3]`,
      ].join("\n")
    : "";

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
    `- Featured slots (${snapshot.featured.slots.length}): ${
      snapshot.featured.slots
        .map(
          (s) =>
            `${s.slotId}[mode=${s.mode},block=${s.activeBlockId ?? "none"},visible=${s.visible}]`,
        )
        .join("; ") || "none — tools may create featured-primary only"
    }`,
    `- Visual blocks: ${snapshot.featured.visualBlocks.map((b) => `${b.id}:${b.label}`).join(", ") || "none"}`,
    `- Active visual block: ${snapshot.featured.activeBlockId ?? "none"}`,
    `- Uploaded image available: ${snapshot.featured.hasUploadedImage}`,
    `- Visibility: content=${snapshot.visibility.showContent}, brand=${snapshot.visibility.showBrand}, featured=${snapshot.visibility.showFeaturedImage}, pattern=${snapshot.visibility.showPattern}`,
    `- Allowed layouts: ${snapshot.allowedLayouts.join(", ")}`,
    `- Allowed patterns: ${snapshot.allowedPatternRefs.join(", ")}`,
    artboardLine,
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
        "Update text in one or more copy slots (headline, subheading, CTA/extras). Provide full new text per slot. Defaults to the active artboard; set targetArtboards for multi-board edits.",
      inputSchema: withArtboardTargetSchema(updateCopyToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateCopyPatch(snapshot, input), input),
    }),
    refreshCopyVariants: tool({
      description:
        "Regenerate 7-8 brief-specific headline/subheading options and apply one. Prefer when the user asks to rewrite, refresh, or change copy direction. With targetArtboards='all', each artboard receives a different variant from the pool.",
      inputSchema: withArtboardTargetSchema(refreshCopyVariantsToolSchema),
      execute: async (input) => {
        const instruction = input.instruction?.trim() || followUpMessage.trim();
        const multiBoardTarget =
          input.targetArtboards === "all" ||
          (Array.isArray(input.targetArtboards) && input.targetArtboards.length > 1);
        const boardCount =
          input.targetArtboards === "all"
            ? Math.max(1, snapshot.artboards?.count ?? 1)
            : Array.isArray(input.targetArtboards)
              ? input.targetArtboards.length
              : 1;
        const briefContext = [
          snapshot.copy.heading,
          snapshot.copy.subheading,
          instruction,
        ]
          .filter(Boolean)
          .join(". ");
        const spreadInstruction = multiBoardTarget
          ? `Generate at least ${boardCount} clearly distinct headline/subheading pairs — each artboard will get a different one.`
          : undefined;
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
          instruction: [instruction, spreadInstruction].filter(Boolean).join(" "),
        });
        const primary = generated[0] ?? {
          heading: snapshot.copy.heading,
          subheading: snapshot.copy.subheading,
        };
        const variants = buildCopyVariantPool(primary, generated.slice(1), rulesProfile);
        return attachArtboardTarget(
          computeRefreshCopyVariantsPatch(snapshot, variants, 0),
          input,
        );
      },
    }),
    updateBackground: tool({
      description:
        "Change canvas background using a preset id from the snapshot catalog. Never invent preset ids. Prefer targetArtboards='all' when the user wants a shared background across options.",
      inputSchema: withArtboardTargetSchema(updateBackgroundToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateBackgroundPatch(snapshot, input), input),
    }),
    updatePattern: tool({
      description:
        "Toggle or change background pattern using allowed pattern refs. Prefer targetArtboards='all' for shared pattern changes.",
      inputSchema: withArtboardTargetSchema(updatePatternToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdatePatternPatch(snapshot, input), input),
    }),
    updateFeatured: tool({
      description:
        "Show/hide a featured visual slot or switch between placeholder, composed, or uploaded image. Uses an existing slotId from the snapshot (or featured-primary if none). Never invents new slot ids.",
      inputSchema: withArtboardTargetSchema(updateFeaturedToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateFeaturedPatch(snapshot, input), input),
    }),
    generateVisualBlock: tool({
      description:
        "Fill one featured visual slot with a visual block. Defaults to count=1 and an existing slot (selection, empty slot, or featured-primary). Does not add extra artboard slots. Prefer source=library; use source=generate only for custom AI SVG.",
      inputSchema: withArtboardTargetSchema(generateVisualBlockToolSchema),
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
          count: input.count ?? 1,
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
        return attachArtboardTarget(
          computeGeneratedVisualBlocksPatch(snapshot, blocks, input.slotId),
          input,
        );
      },
    }),
    modifyVisualBlock: tool({
      description:
        "Modify an existing visual block SVG using a natural-language instruction. Targets one existing featured slot only.",
      inputSchema: withArtboardTargetSchema(modifyVisualBlockToolSchema),
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
        return attachArtboardTarget(
          computeModifiedVisualBlockPatch(snapshot, fullBlock, input.slotId),
          input,
        );
      },
    }),
    selectVisualBlock: tool({
      description:
        "Switch the active visual block on one existing featured slot using a block id from the library.",
      inputSchema: withArtboardTargetSchema(selectVisualBlockToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeSelectVisualBlockPatch(snapshot, input), input),
    }),
    updateLayout: tool({
      description:
        "Switch to another catalog layout. preserveCopy defaults to true. Defaults to the active artboard unless targetArtboards is set.",
      inputSchema: withArtboardTargetSchema(updateLayoutToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateLayoutPatch(snapshot, input), input),
    }),
    updateBrand: tool({
      description:
        "Adjust logo visibility, scale, placement, or alignment. Prefer targetArtboards='all' for shared brand chrome.",
      inputSchema: withArtboardTargetSchema(updateBrandToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateBrandPatch(input), input),
    }),
    updateTypography: tool({
      description: "Change text alignment, fonts, or type scale.",
      inputSchema: withArtboardTargetSchema(updateTypographyToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateTypographyPatch(input), input),
    }),
    updateVisibility: tool({
      description: "Show or hide content, brand, featured, pattern, or background.",
      inputSchema: withArtboardTargetSchema(updateVisibilityToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateVisibilityPatch(input), input),
    }),
    updateSpacing: tool({
      description: "Adjust layout spacing tokens (Tailwind scale classes).",
      inputSchema: withArtboardTargetSchema(updateSpacingToolSchema),
      execute: async (input) =>
        attachArtboardTarget(computeUpdateSpacingPatch(snapshot, input), input),
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
    timeout: LLM_STREAM_TIMEOUT_MS,
    // Default stopWhen is isStepCount(1), which ends after the first tool call and
    // never produces a user-facing text reply. Allow a follow-up text step.
    stopWhen: isStepCount(5),
    prepareStep: ({ steps }) => {
      const last = steps.at(-1);
      if (last && last.toolCalls.length > 0) {
        // After tools run, force a short natural-language confirmation.
        return { toolChoice: "none" as const };
      }
      return {};
    },
    system: [
      "You are Postforge's visual block assistant.",
      "Focus on featured visual slots — generate, modify, or select visual blocks.",
      "Do not rewrite the entire design unless the user explicitly asks.",
      "Featured slots: only use slotIds listed in the snapshot. If none exist, omit slotId (system creates featured-primary only).",
      "Never invent slot ids like featured-2. Do not add a second visual slot unless the snapshot already has multiple slots and the user asks to fill another existing empty one.",
      "generateVisualBlock defaults to count=1 — do not raise count unless the user asks for multiple options.",
      "Use generateVisualBlock for new diagrams/UI cards/illustrations.",
      "Prefer source=library (instant) unless the user asks for custom AI visuals.",
      "For UI patterns (stat-highlight, pricing-card, etc.), prefer library blocks and update content text fields — do not regenerate SVG.",
      "Available library patterns:",
      libraryPatternSummaryForPrompt(),
      "Use modifyVisualBlock to refine the active block.",
      "Use selectVisualBlock to swap blocks from the library.",
      "Use refreshCopyVariants when the user asks to rewrite, refresh, or change headline/subheading direction.",
      "Use updateCopy only for precise edits to specific slot text on one artboard (or the same literal text everywhere).",
      "Multi-artboard: each tool accepts targetArtboards ('active' | 'all' | [1-based indices]).",
      "Default to active. Use 'all' when the user says every board/all variants/shared background/brand.",
      "For copy changes across all artboards, call refreshCopyVariants with targetArtboards='all' — the app assigns a different variant to each board.",
      "Use specific indices when they name artboard numbers (e.g. board 2 and 4 → [2,4]).",
      "After you call tools, always send a short (1-2 sentence) user-facing reply confirming what changed.",
      "Never finish with tool calls alone — end with conversational text the user can read in chat.",
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
    stream: result.toUIMessageStream({ onError: toBriefChatClientError }),
  });
}

export async function handleClarifyRequest(question: string) {
  const model = createMistralModel();
  const result = streamText({
    model,
    temperature: 0.3,
    timeout: LLM_STREAM_TIMEOUT_MS,
    prompt: `Ask the user this clarifying question in a friendly sentence: ${question}`,
  });
  return createUIMessageStreamResponse({
    stream: result.toUIMessageStream({ onError: toBriefChatClientError }),
  });
}

import { generateObject } from "ai";
import { z } from "zod";
import { sanitizeSvgMarkup } from "@/lib/brand/parseLogoFile";
import { createMistralModel, LLM_VISUAL_TIMEOUT_MS, llmAbortSignal } from "@/lib/llm/mistral";
import { libraryPatternSummaryForPrompt } from "@/lib/social-tool/visualBlocks/library";
import { createVisualBlockId } from "@/lib/social-tool/visualBlocks/storage";
import type {
  VisualBlockGenerateInput,
  VisualBlockKind,
  VisualBlockModifyInput,
  VisualBlockRecord,
} from "@/lib/social-tool/visualBlocks/types";

const blockKindSchema = z.enum(["diagram", "ui", "illustration"]);

const generatedBlockSchema = z.object({
  label: z.string().min(1).max(60),
  kind: blockKindSchema,
  svgMarkup: z.string().min(20),
});

const generateBlocksSchema = z.object({
  blocks: z.array(generatedBlockSchema).min(1).max(3),
});

function fallbackBlocks(input: VisualBlockGenerateInput): VisualBlockRecord[] {
  const accent = input.brandColors?.accent ?? "#7C9A92";
  const primary = input.brandColors?.primary ?? "#1E293B";
  const headline = input.headline ?? "Your headline";
  const theme = input.theme ?? input.brief?.slice(0, 40) ?? "Product value";

  return [
    {
      id: createVisualBlockId(),
      label: "Stat highlight",
      kind: "ui" as const,
      createdAt: Date.now(),
      theme,
      svgMarkup: sanitizeSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" fill="none">
  <rect width="480" height="280" rx="20" fill="white" fill-opacity="0.95"/>
  <rect x="24" y="24" width="432" height="232" rx="16" fill="${primary}" fill-opacity="0.06"/>
  <text x="40" y="88" fill="${primary}" font-family="system-ui,sans-serif" font-size="42" font-weight="700">5× ROI</text>
  <text x="40" y="132" fill="${primary}" fill-opacity="0.72" font-family="system-ui,sans-serif" font-size="18">${theme}</text>
  <rect x="40" y="168" width="160" height="44" rx="22" fill="${accent}"/>
  <text x="68" y="197" fill="white" font-family="system-ui,sans-serif" font-size="16" font-weight="600">Book demo</text>
</svg>`) ?? "",
    },
    {
      id: createVisualBlockId(),
      label: "Comparison cards",
      kind: "diagram" as const,
      createdAt: Date.now(),
      theme,
      svgMarkup: sanitizeSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" fill="none">
  <rect x="20" y="40" width="200" height="200" rx="16" fill="white" stroke="${accent}" stroke-width="2"/>
  <text x="40" y="78" fill="${primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Legacy CRM</text>
  <text x="40" y="110" fill="${primary}" fill-opacity="0.6" font-family="system-ui,sans-serif" font-size="14">Slow setup</text>
  <rect x="260" y="24" width="200" height="216" rx="16" fill="${primary}"/>
  <text x="280" y="72" fill="white" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${headline.slice(0, 24)}</text>
  <text x="280" y="104" fill="white" fill-opacity="0.82" font-family="system-ui,sans-serif" font-size="14">AI-native workflow</text>
</svg>`) ?? "",
    },
    {
      id: createVisualBlockId(),
      label: "Icon grid",
      kind: "illustration" as const,
      createdAt: Date.now(),
      theme,
      svgMarkup: sanitizeSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" fill="none">
  <rect width="480" height="280" rx="20" fill="${primary}" fill-opacity="0.04"/>
  <circle cx="120" cy="100" r="36" fill="${accent}" fill-opacity="0.25"/>
  <circle cx="240" cy="100" r="36" fill="${accent}" fill-opacity="0.45"/>
  <circle cx="360" cy="100" r="36" fill="${accent}"/>
  <rect x="72" y="168" width="96" height="12" rx="6" fill="${primary}" fill-opacity="0.2"/>
  <rect x="192" y="168" width="96" height="12" rx="6" fill="${primary}" fill-opacity="0.35"/>
  <rect x="312" y="168" width="96" height="12" rx="6" fill="${primary}" fill-opacity="0.2"/>
  <text x="120" y="220" text-anchor="middle" fill="${primary}" font-family="system-ui,sans-serif" font-size="13">Pipeline</text>
  <text x="240" y="220" text-anchor="middle" fill="${primary}" font-family="system-ui,sans-serif" font-size="13">Automate</text>
  <text x="360" y="220" text-anchor="middle" fill="${primary}" font-family="system-ui,sans-serif" font-size="13">Launch</text>
</svg>`) ?? "",
    },
  ].slice(0, input.count ?? 3);
}

function normalizeGeneratedBlock(
  block: z.infer<typeof generatedBlockSchema>,
  theme?: string,
): VisualBlockRecord | null {
  const svgMarkup = sanitizeSvgMarkup(block.svgMarkup);
  if (!svgMarkup) return null;
  return {
    id: createVisualBlockId(),
    label: block.label.trim(),
    kind: block.kind as VisualBlockKind,
    svgMarkup,
    createdAt: Date.now(),
    theme,
  };
}

export async function composeVisualBlocks(
  input: VisualBlockGenerateInput,
): Promise<VisualBlockRecord[]> {
  const count = Math.min(3, Math.max(1, input.count ?? 3));
  const theme = input.theme ?? input.headline ?? "visual block";

  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: generateBlocksSchema,
      temperature: 0.5,
      abortSignal: llmAbortSignal(LLM_VISUAL_TIMEOUT_MS),
      system: [
        "You compose static marketing visual blocks as SVG markup for social ad featured slots.",
        "Output exactly 3 distinct blocks: one diagram, one ui card/tile, one illustration.",
        "SVG must be self-contained, no scripts, no external URLs, viewBox around 480x280.",
        "Use simple shapes, text, and cards — not interactive form fields or browser chrome.",
        "Prefer adapting these existing library patterns when relevant:",
        libraryPatternSummaryForPrompt(),
        input.brandColors?.primary
          ? `Brand primary: ${input.brandColors.primary}, accent: ${input.brandColors.accent ?? input.brandColors.primary}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      prompt: [
        "Generate visual blocks for this creative:",
        input.headline ? `Headline: ${input.headline}` : "",
        input.subheading ? `Subheading: ${input.subheading}` : "",
        input.brief ? `Brief: ${input.brief}` : "",
        input.theme ? `Theme: ${input.theme}` : "",
        `Return ${count} blocks.`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    const blocks = result.object.blocks
      .map((block) => normalizeGeneratedBlock(block, theme))
      .filter((block): block is VisualBlockRecord => block !== null);

    if (blocks.length > 0) return blocks.slice(0, count);
  } catch {
    // fall through to templates
  }

  return fallbackBlocks({ ...input, count });
}

export async function modifyVisualBlock(
  input: VisualBlockModifyInput,
): Promise<VisualBlockRecord | null> {
  try {
    const model = createMistralModel();
    const result = await generateObject({
      model,
      schema: generatedBlockSchema,
      temperature: 0.4,
      abortSignal: llmAbortSignal(LLM_VISUAL_TIMEOUT_MS),
      system: [
        "You modify an existing static SVG visual block for a social ad featured slot.",
        "Preserve overall layout unless the instruction asks to change structure.",
        "Return valid self-contained SVG only.",
      ].join("\n"),
      prompt: [
        `Instruction: ${input.instruction}`,
        `Current label: ${input.block.label}`,
        `Current kind: ${input.block.kind}`,
        "Current SVG:",
        input.block.svgMarkup,
      ].join("\n"),
    });

    const svgMarkup = sanitizeSvgMarkup(result.object.svgMarkup);
    if (!svgMarkup) return null;

    return {
      ...input.block,
      label: result.object.label.trim() || input.block.label,
      kind: result.object.kind as VisualBlockKind,
      svgMarkup,
      createdAt: Date.now(),
      prompt: input.instruction,
    };
  } catch {
    return null;
  }
}

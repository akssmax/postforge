import { getMistralApiKey } from "@/lib/llm/mistral";
import {
  generateVisualBlocksBodySchema,
  handleGenerateVisualBlocks,
} from "@/lib/llm/services/visualBlockService";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = generateVisualBlocksBodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }

    const source = parsed.data.source ?? "library";
    if (source === "generate" && !getMistralApiKey()) {
      return Response.json({ error: "MISTRAL_API_KEY is not configured." }, { status: 503 });
    }

    const result = await handleGenerateVisualBlocks(parsed.data);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Visual block generation failed" },
      { status: 500 },
    );
  }
}

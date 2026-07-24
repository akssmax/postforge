import { getMistralApiKey } from "@/lib/llm/mistral";
import {
  handleModifyVisualBlock,
  modifyVisualBlockBodySchema,
} from "@/lib/llm/services/visualBlockService";

/** Mistral SVG modify can exceed the old 60s cap under cold starts / region latency. */
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!getMistralApiKey()) {
    return Response.json({ error: "MISTRAL_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const json = await req.json();
    const parsed = modifyVisualBlockBodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.message }, { status: 400 });
    }

    const result = await handleModifyVisualBlock(parsed.data);
    if (!result.block) {
      return Response.json({ error: "Could not modify visual block" }, { status: 422 });
    }
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Visual block modification failed" },
      { status: 500 },
    );
  }
}

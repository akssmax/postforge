import { z } from "zod";
import { isOpenRouterChatModelId, type OpenRouterChatModelId } from "@/lib/llm/models";
import { composeDeckEvents } from "@/lib/scene/deck/composer";
import { deckKindSchema } from "@/lib/scene/deck/outline";

export const maxDuration = 60;

const bodySchema = z.object({
  brief: z.string().trim().min(3).max(4000),
  kind: deckKindSchema,
  brandColors: z.object({ primary: z.string(), secondary: z.string(), accent: z.string(), neutral: z.string() }).optional(),
  modelId: z.string().optional(),
});

/** Streams newline-delimited JSON events: draft, blocks, final. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send a brief (3–4000 characters) and a kind (deck or carousel)." }, { status: 400 });
  const { modelId, ...request } = parsed.data;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await composeDeckEvents(
          { ...request, modelId: isOpenRouterChatModelId(modelId) ? (modelId as OpenRouterChatModelId) : undefined },
          (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
        );
      } catch (error) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Deck failed" })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

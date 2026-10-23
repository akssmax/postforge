import { z } from "zod";
import { isOpenRouterChatModelId, type OpenRouterChatModelId } from "@/lib/llm/models";
import { composeSceneEvents } from "@/lib/scene/compose/composer";

/** One AI call after an instant draft; well under the brief chat's multi-stage budget. */
export const maxDuration = 60;

const bodySchema = z.object({
  brief: z.string().trim().min(3).max(2000),
  size: z.object({ width: z.number().int().min(200).max(4000), height: z.number().int().min(200).max(4000) }),
  brandColors: z
    .object({ primary: z.string(), secondary: z.string(), accent: z.string(), neutral: z.string() })
    .optional(),
  modelId: z.string().optional(),
});

/** Streams newline-delimited JSON events: draft, blocks, partial…, final. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Send a brief (3–2000 characters) and a canvas size." }, { status: 400 });
  }
  const { modelId, ...request } = parsed.data;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await composeSceneEvents(
          { ...request, modelId: isOpenRouterChatModelId(modelId) ? (modelId as OpenRouterChatModelId) : undefined },
          (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)),
        );
      } catch (error) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Compose failed" })}\n`));
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

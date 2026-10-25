import { auth, authConfigured } from "@/auth";
import { agentProviderFor, runAgent, usesOwnKey } from "@/lib/agent/dispatch";
import type { AgentEvent } from "@/lib/agent/run";
import { findLibraryVisual } from "@/lib/agent/visuals";
import type { AgentScope } from "@/lib/agent/workspace";
import { canvasDesignSchema } from "@/lib/canvas/document";
import { designSystemSchema } from "@/lib/design-systems/schema";
import { z } from "zod";

export const maxDuration = 300;

/** About 3 MB per image after base64; renders are sent as JPEG/PNG at ~1024 px. */
const imageSchema = z.string().max(4_000_000).regex(/^data:image\/(png|jpeg|webp|gif);base64,/);

const bodySchema = z.object({
  design: canvasDesignSchema,
  prompt: z.string().trim().min(1).max(4000),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("design") }),
    z.object({ kind: z.literal("artboard"), artboardId: z.string() }),
    z.object({ kind: z.literal("node"), artboardId: z.string(), nodeId: z.string() }),
  ]),
  system: designSystemSchema.optional(),
  images: z.array(imageSchema).max(3).optional(),
  comments: z.array(z.object({ id: z.string(), artboardId: z.string(), nodeId: z.string().nullish(), text: z.string().max(2000), author: z.string().nullish() })).max(50).optional(),
});

/** Streams agent events as NDJSON: text, ops (to apply), blocks, tool results, done. */
export async function POST(request: Request) {
  const provider = agentProviderFor(request.headers);
  if (!provider) {
    return Response.json({ error: "No AI provider is set up. Add your OpenRouter or Anthropic key in Settings → AI provider." }, { status: 503 });
  }
  // The server's key is shared: with sign-in configured, only signed-in people use it.
  if (!usesOwnKey(request.headers) && authConfigured && !(await auth())?.user?.id) {
    return Response.json({ error: "Sign in, or add your own API key in Settings, to use the design agent." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await runAgent({ ...parsed.data, scope: parsed.data.scope as AgentScope }, provider, emit, { findVisual: findLibraryVisual, signal: request.signal });
      } catch (error) {
        if (!request.signal.aborted) emit({ type: "error", message: error instanceof Error ? error.message : "The agent failed." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

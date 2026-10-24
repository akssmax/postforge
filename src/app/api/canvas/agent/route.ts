import { auth, authConfigured } from "@/auth";
import { runDesignAgent, type AgentEvent } from "@/lib/agent/run";
import { findLibraryVisual } from "@/lib/agent/visuals";
import type { AgentScope } from "@/lib/agent/workspace";
import { canvasDesignSchema } from "@/lib/canvas/document";
import { designSystemSchema } from "@/lib/design-systems/schema";
import { z } from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  design: canvasDesignSchema,
  prompt: z.string().trim().min(1).max(4000),
  scope: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("design") }),
    z.object({ kind: z.literal("artboard"), artboardId: z.string() }),
    z.object({ kind: z.literal("node"), artboardId: z.string(), nodeId: z.string() }),
  ]),
  system: designSystemSchema.optional(),
  comments: z.array(z.object({ id: z.string(), artboardId: z.string(), nodeId: z.string().nullish(), text: z.string().max(2000), author: z.string().nullish() })).max(50).optional(),
});

/** Streams agent events as NDJSON: text, ops (to apply), blocks, tool results, done. */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ error: "The design agent needs ANTHROPIC_API_KEY on the server." }, { status: 503 });
  }
  // With sign-in configured, only signed-in people can spend agent tokens.
  if (authConfigured && !(await auth())?.user?.id) {
    return Response.json({ error: "Sign in to use the design agent." }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AgentEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await runDesignAgent({ ...parsed.data, scope: parsed.data.scope as AgentScope }, emit, { findVisual: findLibraryVisual, signal: request.signal });
      } catch (error) {
        if (!request.signal.aborted) emit({ type: "error", message: error instanceof Error ? error.message : "The agent failed." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}

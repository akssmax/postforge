import { authConfigured } from "@/auth";
import { actorFor } from "@/lib/server/api";
import { listComments, listPresence } from "@/lib/server/commentStore";
import { getDb } from "@/lib/server/db";
import { opsSince, StoreError } from "@/lib/server/designStore";

type Context = { params: Promise<{ id: string }> };

export const maxDuration = 60;
/** Each stream lives this long; EventSource reconnects with the latest revision. */
const STREAM_MS = 25_000;
const TICK_MS = 1000;

/**
 * Server-sent events for one design: new op batches, changed comments and
 * who's here. The server polls Postgres once a second per open stream, so
 * clients hear about changes within about a second without polling themselves.
 */
export async function GET(request: Request, { params }: Context) {
  const db = getDb();
  if (!db || !authConfigured) return new Response("Cloud sync isn't configured", { status: 503 });
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  const url = new URL(request.url);
  let revision = Math.max(0, Number(url.searchParams.get("since") ?? 0) || 0);
  const clientId = url.searchParams.get("clientId") ?? "";
  try {
    // Access check up front: a stream nobody may read fails fast.
    revision = Math.min(revision, (await opsSince(db, id, actor, revision)).revision);
  } catch (error) {
    return new Response(error instanceof StoreError ? error.message : "Forbidden", { status: error instanceof StoreError ? error.status : 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      let commentsSince = new Date().toISOString();
      let lastPresence = "";
      const started = Date.now();
      try {
        while (!request.signal.aborted && Date.now() - started < STREAM_MS) {
          const [ops, comments, presence] = await Promise.all([opsSince(db, id, actor, revision), listComments(db, id, actor, commentsSince), listPresence(db, id)]);
          if (ops.entries.length) {
            revision = ops.entries.at(-1)!.revision;
            send("ops", ops.entries);
          }
          if (comments.length) {
            commentsSince = comments.reduce((latest, comment) => (comment.updatedAt > latest ? comment.updatedAt : latest), commentsSince);
            send("comments", comments);
          }
          const peers = presence.filter((peer) => peer.clientId !== clientId);
          const key = JSON.stringify(peers);
          if (key !== lastPresence) {
            lastPresence = key;
            send("presence", peers);
          }
          await new Promise((resolve) => setTimeout(resolve, TICK_MS));
        }
        send("reconnect", { revision });
      } catch {
        // Access revoked or the database hiccuped: the client reconnects.
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store, no-transform", Connection: "keep-alive" } });
}

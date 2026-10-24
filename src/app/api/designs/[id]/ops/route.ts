import { actorFor, withStore } from "@/lib/server/api";
import { opsSince, pushOps } from "@/lib/server/designStore";

type Context = { params: Promise<{ id: string }> };

/** Ops after `?since=<revision>` (pull). */
export async function GET(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  const since = Math.max(0, Number(new URL(request.url).searchParams.get("since") ?? 0) || 0);
  return withStore((db) => opsSince(db, id, actor, since));
}

/** Push ops on a base revision; `ok: false` carries the ops to rebase onto. */
export async function POST(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const body = (await request.json()) as { baseRevision?: number; ops?: unknown[]; clientId?: string };
    return pushOps(db, id, actor, { baseRevision: Number(body.baseRevision ?? -1), ops: body.ops ?? [], clientId: typeof body.clientId === "string" ? body.clientId.slice(0, 64) : null });
  });
}

import { actorFor, withStore } from "@/lib/server/api";
import { heartbeat, leave, listPresence } from "@/lib/server/commentStore";

type Context = { params: Promise<{ id: string }> };

/** Heartbeat: this client has the design open, with this selection. Returns who else is here. */
export async function POST(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const body = (await request.json()) as { clientId?: string; artboardId?: string | null; nodeId?: string | null; leave?: boolean };
    const clientId = String(body.clientId ?? "");
    if (!clientId) return { peers: [] };
    if (body.leave) await leave(db, id, clientId);
    else await heartbeat(db, id, actor, { clientId, artboardId: body.artboardId, nodeId: body.nodeId });
    return { peers: (await listPresence(db, id)).filter((peer) => peer.clientId !== clientId) };
  });
}

import { actorFor, withStore } from "@/lib/server/api";
import { createShareLink, listShareLinks, revokeShareLink, StoreError, type ShareRole } from "@/lib/server/designStore";

type Context = { params: Promise<{ id: string }> };
const ROLES = new Set<ShareRole>(["view", "comment", "edit"]);

export async function GET(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore((db) => listShareLinks(db, id, actor));
}

export async function POST(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const { role } = (await request.json()) as { role?: ShareRole };
    if (!role || !ROLES.has(role)) throw new StoreError(400, "role must be view, comment or edit");
    return createShareLink(db, id, actor, role);
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const { token } = (await request.json()) as { token?: string };
    await revokeShareLink(db, id, actor, String(token ?? ""));
    return { ok: true };
  });
}

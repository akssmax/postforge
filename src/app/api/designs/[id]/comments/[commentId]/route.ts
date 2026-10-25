import { actorFor, withStore } from "@/lib/server/api";
import { deleteComment, setResolved } from "@/lib/server/commentStore";

type Context = { params: Promise<{ id: string; commentId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const [{ id, commentId }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const { resolved } = (await request.json()) as { resolved?: boolean };
    await setResolved(db, id, actor, commentId, resolved !== false);
    return { ok: true };
  });
}

export async function DELETE(request: Request, { params }: Context) {
  const [{ id, commentId }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    await deleteComment(db, id, actor, commentId);
    return { ok: true };
  });
}

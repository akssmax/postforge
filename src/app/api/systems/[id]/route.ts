import { actorFor, requireUser, withStore } from "@/lib/server/api";
import { deleteSystem } from "@/lib/server/systemStore";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    await deleteSystem(db, requireUser(actor), id);
    return { ok: true };
  });
}

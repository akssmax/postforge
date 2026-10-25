import { actorFor, withStore } from "@/lib/server/api";
import { deleteDesign, getDesign } from "@/lib/server/designStore";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore((db) => getDesign(db, id, actor));
}

export async function DELETE(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    await deleteDesign(db, id, actor);
    return { ok: true };
  });
}

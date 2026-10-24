import { actorFor, withStore } from "@/lib/server/api";
import { createComment, listComments } from "@/lib/server/commentStore";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore((db) => listComments(db, id, actor, new URL(request.url).searchParams.get("since")));
}

export async function POST(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => createComment(db, id, actor, await request.json()));
}

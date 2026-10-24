import { actorFor, withStore } from "@/lib/server/api";
import { getVersion } from "@/lib/server/designStore";

type Context = { params: Promise<{ id: string; versionId: string }> };

export async function GET(request: Request, { params }: Context) {
  const [{ id, versionId }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore((db) => getVersion(db, id, actor, versionId));
}

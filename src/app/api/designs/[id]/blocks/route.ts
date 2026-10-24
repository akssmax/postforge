import { actorFor, withStore } from "@/lib/server/api";
import { addBlocks } from "@/lib/server/designStore";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const [{ id }, actor] = await Promise.all([params, actorFor(request)]);
  return withStore(async (db) => {
    const body = (await request.json()) as { blocks?: VisualBlockRecord[] };
    return { blocks: await addBlocks(db, id, actor, Array.isArray(body.blocks) ? body.blocks : []) };
  });
}

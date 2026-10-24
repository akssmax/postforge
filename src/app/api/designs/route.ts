import { actorFor, requireUser, withStore } from "@/lib/server/api";
import { createDesign, listDesigns } from "@/lib/server/designStore";

export async function GET(request: Request) {
  const actor = await actorFor(request);
  return withStore((db) => listDesigns(db, requireUser(actor)));
}

/** Create a design, or upload one from this device (keeps its id). */
export async function POST(request: Request) {
  const actor = await actorFor(request);
  return withStore(async (db) => {
    const body = (await request.json()) as { design?: unknown; blocks?: [] };
    const created = await createDesign(db, requireUser(actor), { design: body.design, blocks: body.blocks });
    return { id: created.id, revision: created.revision, created: created.created };
  });
}

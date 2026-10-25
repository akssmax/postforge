import { actorFor, requireUser, withStore } from "@/lib/server/api";
import { listSystems, saveSystem } from "@/lib/server/systemStore";

export async function GET(request: Request) {
  const actor = await actorFor(request);
  return withStore((db) => listSystems(db, requireUser(actor)));
}

export async function POST(request: Request) {
  const actor = await actorFor(request);
  return withStore(async (db) => {
    const body = (await request.json()) as { system?: unknown; makeDefault?: boolean };
    return saveSystem(db, requireUser(actor), body.system, body.makeDefault === true);
  });
}

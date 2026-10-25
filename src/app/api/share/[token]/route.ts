import { withStore } from "@/lib/server/api";
import { resolveShareToken, StoreError } from "@/lib/server/designStore";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { token } = await params;
  return withStore(async (db) => {
    const shared = await resolveShareToken(db, token);
    if (!shared) throw new StoreError(404, "This link has expired or was revoked");
    return shared;
  });
}

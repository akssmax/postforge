import "server-only";
import { NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { getDb, type Db } from "@/lib/server/db";
import { StoreError, type Actor } from "@/lib/server/designStore";

export const SHARE_HEADER = "x-postforge-share";

/** Signed-in user (if any) plus the share token the client sent (if any). */
export async function actorFor(request: Request): Promise<Actor> {
  const session = authConfigured ? await auth() : null;
  const userId = session?.user?.id ?? null;
  return { userId, shareToken: request.headers.get(SHARE_HEADER) };
}

/** Run a store call, mapping missing config and store errors to JSON responses. */
export async function withStore(run: (db: Db) => Promise<unknown>): Promise<NextResponse> {
  const db = getDb();
  if (!db || !authConfigured) return NextResponse.json({ error: "Cloud sync isn't configured on this server." }, { status: 503 });
  try {
    return NextResponse.json(await run(db));
  } catch (error) {
    if (error instanceof StoreError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    if ((error as { name?: string })?.name === "ZodError") return NextResponse.json({ error: "Invalid design" }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export function requireUser(actor: Actor): string {
  if (!actor.userId) throw new StoreError(401, "Sign in to sync designs");
  return actor.userId;
}

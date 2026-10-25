import { NextResponse } from "next/server";
import { auth, authConfigured, authProviderIds } from "@/auth";
import { getDb } from "@/lib/server/db";

/** Whether cloud sync is available here, and who is signed in. */
export async function GET() {
  const enabled = authConfigured && !!getDb();
  const session = enabled ? await auth() : null;
  const user = session?.user?.id ? { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null } : null;
  return NextResponse.json({ enabled, user, providers: enabled ? authProviderIds : [] });
}

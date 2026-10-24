import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getDb } from "@/lib/server/db";
import { ensureUser } from "@/lib/server/designStore";

/** OAuth providers are enabled by their AUTH_<PROVIDER>_ID/SECRET env vars. */
const providers: NextAuthConfig["providers"] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) providers.push(GitHub);
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) providers.push(Google);

/**
 * Local development sign-in by email, no password. Never in production builds:
 * it would let anyone claim any account.
 */
export const devLoginEnabled = process.env.NODE_ENV !== "production" && process.env.AUTH_DEV_LOGIN === "1";
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Development login",
      credentials: { email: { label: "Email", type: "email" } },
      authorize: (credentials) => {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+$/.test(email)) return null;
        return { id: `dev:${email}`, email, name: email.split("@")[0] };
      },
    }),
  );
}

export const authConfigured = !!process.env.AUTH_SECRET && providers.length > 0;
/** Provider ids as Auth.js routes them (a custom `id` lives in `options`). */
export const authProviderIds = providers.map((provider) => {
  const resolved = typeof provider === "function" ? provider() : provider;
  return (resolved as { options?: { id?: string } }).options?.id ?? resolved.id;
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user }) {
      // First sign-in: a stable id per provider account, recorded in our users table.
      if (account) {
        const uid = account.provider === "dev" ? String(user?.id) : `${account.provider}:${account.providerAccountId}`;
        token.uid = uid;
        const db = getDb();
        if (db) await ensureUser(db, { id: uid, email: user?.email ?? token.email, name: user?.name ?? token.name, image: user?.image ?? token.picture });
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string" && session.user) session.user.id = token.uid;
      return session;
    },
  },
});

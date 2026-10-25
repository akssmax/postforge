import "server-only";
import { neon } from "@neondatabase/serverless";
import { pgDb } from "@/lib/server/pgDb";

export type Query = { text: string; params: unknown[] };

/** The small slice of Postgres the app uses; Neon in production, node-postgres in tests. */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  /** Run statements as one transaction; results per statement. */
  batch(queries: Query[]): Promise<Record<string, unknown>[][]>;
}

export function neonDb(connectionString: string): Db {
  const sql = neon(connectionString);
  return {
    query: async <T,>(text: string, params: unknown[] = []) => (await sql.query(text, params)) as T[],
    batch: async (queries) => (await sql.transaction(queries.map((query) => sql.query(query.text, query.params)))) as Record<string, unknown>[][],
  };
}

/** Neon is reached over HTTP; any other Postgres (local, self-hosted) over TCP. */
export const isNeonUrl = (url: string) => /\.neon\.tech|\.neon\.build/.test(url);

let override: Db | null = null;
let cached: Db | null = null;

/** Null when no database is configured: the app then runs local-only. */
export function getDb(): Db | null {
  if (override) return override;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  cached ??= isNeonUrl(url) ? neonDb(url) : pgDb(url);
  return cached;
}

/** Tests point the store at their own database. */
export function setDbForTests(db: Db | null) {
  override = db;
}

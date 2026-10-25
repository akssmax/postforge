import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "@/lib/server/db";

export const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

/** Split a migration into statements (our migrations hold no functions or DO blocks). */
export function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
}

/** Apply every not-yet-applied migration in filename order, each in its own transaction. */
export async function runMigrations(db: Db, dir = MIGRATIONS_DIR): Promise<string[]> {
  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  const applied = new Set((await db.query<{ name: string }>(`SELECT name FROM schema_migrations`)).map((row) => row.name));
  const ran: string[] = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith(".sql")).sort()) {
    if (applied.has(name)) continue;
    const statements = splitStatements(readFileSync(join(dir, name), "utf8"));
    await db.batch([...statements.map((text) => ({ text, params: [] })), { text: `INSERT INTO schema_migrations (name) VALUES ($1)`, params: [name] }]);
    ran.push(name);
  }
  return ran;
}

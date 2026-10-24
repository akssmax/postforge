// node-postgres adapter for the Db interface.
// Used for non-Neon Postgres (local development, self-hosting) and tests.
import pg from "pg";
import type { Db } from "@/lib/server/db";

export function pgDb(connectionString: string): Db & { end: () => Promise<void> } {
  const pool = new pg.Pool({ connectionString, max: 4 });
  return {
    query: async <T,>(text: string, params: unknown[] = []) => (await pool.query(text, params)).rows as T[],
    batch: async (queries) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const query of queries) results.push((await client.query(query.text, query.params)).rows);
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}

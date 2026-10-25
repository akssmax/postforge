import "server-only";
import { designSystemSchema, type DesignSystem } from "@/lib/design-systems/schema";
import type { Db } from "@/lib/server/db";
import { StoreError } from "@/lib/server/designStore";

const MAX_SYSTEMS = 50;

export async function listSystems(db: Db, userId: string): Promise<Array<DesignSystem & { isDefault: boolean }>> {
  const rows = await db.query<{ doc: unknown; is_default: boolean }>(`SELECT doc, is_default FROM design_systems WHERE owner_id = $1 ORDER BY updated_at DESC`, [userId]);
  return rows.flatMap((row) => {
    const parsed = designSystemSchema.safeParse(typeof row.doc === "string" ? JSON.parse(row.doc) : row.doc);
    return parsed.success ? [{ ...parsed.data, isDefault: row.is_default }] : [];
  });
}

/** Create or replace one of the user's systems (ids are scoped per owner). */
export async function saveSystem(db: Db, userId: string, raw: unknown, makeDefault = false): Promise<DesignSystem> {
  const parsed = designSystemSchema.safeParse(raw);
  if (!parsed.success) throw new StoreError(400, `Invalid design system: ${parsed.error.issues[0]?.message ?? ""}`);
  const [{ count } = { count: 0 }] = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM design_systems WHERE owner_id = $1 AND id <> $2`, [userId, parsed.data.id]);
  if (count >= MAX_SYSTEMS) throw new StoreError(400, `At most ${MAX_SYSTEMS} design systems`);
  const system = parsed.data;
  const statements = [
    {
      text: `INSERT INTO design_systems (id, owner_id, name, doc, is_default, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5, now())
             ON CONFLICT (owner_id, id) DO UPDATE SET name = EXCLUDED.name, doc = EXCLUDED.doc, is_default = design_systems.is_default OR EXCLUDED.is_default, updated_at = now()`,
      params: [system.id, userId, system.name, JSON.stringify(system), makeDefault],
    },
  ];
  if (makeDefault) statements.unshift({ text: `UPDATE design_systems SET is_default = false WHERE owner_id = $1`, params: [userId] } as (typeof statements)[number]);
  await db.batch(statements);
  return system;
}

export async function deleteSystem(db: Db, userId: string, id: string) {
  await db.query(`DELETE FROM design_systems WHERE owner_id = $1 AND id = $2`, [userId, id]);
}

import "server-only";
import { randomBytes } from "node:crypto";
import { canvasDesignSchema, createId, type CanvasDesign } from "@/lib/canvas/document";
import { applyOps, CanvasOpError, canvasOpSchema, type CanvasOp } from "@/lib/canvas/ops";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import type { Db } from "@/lib/server/db";

export type Role = "owner" | "edit" | "comment" | "view";
export type ShareRole = Exclude<Role, "owner">;

/** Who is asking: a signed-in user, a share-link holder, or both. */
export type Actor = { userId: string | null; shareToken?: string | null };

export class StoreError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
  }
}

const RANK: Record<Role, number> = { view: 0, comment: 1, edit: 2, owner: 3 };
export const canAct = (role: Role | null, needed: Role) => role !== null && RANK[role] >= RANK[needed];

/** Op batches per push and blocks per design are capped to keep rows small. */
const MAX_OPS_PER_PUSH = 500;
const MAX_BLOCKS = 200;

type DesignRow = { id: string; owner_id: string; doc: unknown; blocks: unknown; revision: number; title: string; updated_at: string | Date };

export async function ensureUser(db: Db, user: { id: string; email?: string | null; name?: string | null; image?: string | null }) {
  await db.query(
    `INSERT INTO users (id, email, name, image) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, users.email), name = COALESCE(EXCLUDED.name, users.name), image = COALESCE(EXCLUDED.image, users.image)`,
    [user.id, user.email ?? null, user.name ?? null, user.image ?? null],
  );
}

async function loadRow(db: Db, designId: string): Promise<DesignRow | null> {
  const [row] = await db.query<DesignRow>(`SELECT id, owner_id, doc, blocks, revision, title, updated_at FROM designs WHERE id = $1 AND deleted_at IS NULL`, [designId]);
  return row ?? null;
}

export async function resolveRole(db: Db, row: Pick<DesignRow, "id" | "owner_id">, actor: Actor): Promise<Role | null> {
  if (actor.userId && actor.userId === row.owner_id) return "owner";
  if (!actor.shareToken) return null;
  const [link] = await db.query<{ role: ShareRole }>(`SELECT role FROM share_links WHERE token = $1 AND design_id = $2 AND revoked_at IS NULL`, [actor.shareToken, row.id]);
  return link?.role ?? null;
}

async function requireRole(db: Db, designId: string, actor: Actor, needed: Role) {
  const row = await loadRow(db, designId);
  if (!row) throw new StoreError(404, "Design not found");
  const role = await resolveRole(db, row, actor);
  if (!role) throw new StoreError(actor.userId || actor.shareToken ? 403 : 401, "You don't have access to this design");
  if (!canAct(role, needed)) throw new StoreError(403, `This needs ${needed} access`);
  return { row, role };
}

function parseDoc(raw: unknown): CanvasDesign {
  return canvasDesignSchema.parse(typeof raw === "string" ? JSON.parse(raw) : raw);
}

const json = (value: unknown) => JSON.stringify(value);

export type DesignSummaryRow = { id: string; title: string; revision: number; updatedAt: string };

export async function listDesigns(db: Db, userId: string): Promise<DesignSummaryRow[]> {
  const rows = await db.query<{ id: string; title: string; revision: number; updated_at: string | Date }>(
    `SELECT id, title, revision, updated_at FROM designs WHERE owner_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 200`,
    [userId],
  );
  return rows.map((row) => ({ id: row.id, title: row.title, revision: row.revision, updatedAt: new Date(row.updated_at).toISOString() }));
}

/**
 * Store a design (new, or uploaded from this device). Keeps the client's id
 * unless someone else already owns it, so local links keep working.
 */
export async function createDesign(db: Db, userId: string, input: { design: unknown; blocks?: VisualBlockRecord[] }) {
  const parsed = canvasDesignSchema.parse(input.design);
  const existing = await loadRow(db, parsed.id);
  if (existing && existing.owner_id === userId) {
    return { id: existing.id, revision: existing.revision, design: parseDoc(existing.doc), created: false };
  }
  const design: CanvasDesign = { ...parsed, id: existing ? createId("d") : parsed.id, revision: 0 };
  const blocks = (input.blocks ?? []).slice(0, MAX_BLOCKS);
  await db.query(`INSERT INTO designs (id, owner_id, title, doc, blocks, revision) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 0)`, [design.id, userId, design.title, json(design), json(blocks)]);
  return { id: design.id, revision: 0, design, created: true };
}

export async function getDesign(db: Db, designId: string, actor: Actor) {
  const { row, role } = await requireRole(db, designId, actor, "view");
  const design = parseDoc(row.doc);
  return { design: { ...design, revision: row.revision }, blocks: (row.blocks ?? []) as VisualBlockRecord[], revision: row.revision, role };
}

export type PushResult =
  | { ok: true; revision: number }
  | { ok: false; revision: number; missing: Array<{ revision: number; ops: CanvasOp[]; clientId: string | null }> };

/**
 * Apply a client's ops on top of `baseRevision`. The server re-validates every
 * op against its own copy, so a client can't store an invalid design. If
 * someone else got there first, nothing is written and the client receives
 * the ops it is missing so it can rebase and retry.
 */
export async function pushOps(db: Db, designId: string, actor: Actor, input: { baseRevision: number; ops: unknown[]; clientId?: string | null }): Promise<PushResult> {
  if (!Array.isArray(input.ops) || input.ops.length === 0) throw new StoreError(400, "No ops");
  if (input.ops.length > MAX_OPS_PER_PUSH) throw new StoreError(400, `At most ${MAX_OPS_PER_PUSH} ops per push`);
  const ops = input.ops.map((op) => {
    const parsed = canvasOpSchema.safeParse(op);
    if (!parsed.success) throw new StoreError(400, "Malformed op");
    return parsed.data;
  });
  const { row } = await requireRole(db, designId, actor, "edit");
  if (row.revision !== input.baseRevision) {
    return { ok: false, revision: row.revision, missing: await opsSinceRow(db, designId, input.baseRevision) };
  }
  let next: CanvasDesign;
  try {
    next = applyOps(parseDoc(row.doc), ops).design;
  } catch (error) {
    throw new StoreError(400, error instanceof CanvasOpError ? error.message : "Ops don't apply");
  }
  const revision = row.revision + 1;
  next = { ...next, revision };
  try {
    await db.batch([
      // The primary key on (design_id, revision) rejects a concurrent writer on the same base.
      { text: `INSERT INTO design_ops (design_id, revision, ops, author_id, client_id) VALUES ($1, $2, $3::jsonb, $4, $5)`, params: [designId, revision, json(ops), actor.userId, input.clientId ?? null] },
      { text: `UPDATE designs SET doc = $2::jsonb, title = $3, revision = $4, updated_at = now() WHERE id = $1 AND revision = $5`, params: [designId, json(next), next.title, revision, row.revision] },
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const fresh = await loadRow(db, designId);
      return { ok: false, revision: fresh?.revision ?? revision, missing: await opsSinceRow(db, designId, input.baseRevision) };
    }
    throw error;
  }
  return { ok: true, revision };
}

function isUniqueViolation(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "23505" || /duplicate key|unique constraint/i.test(String((error as Error)?.message ?? ""));
}

async function opsSinceRow(db: Db, designId: string, since: number) {
  const rows = await db.query<{ revision: number; ops: unknown; client_id: string | null }>(
    `SELECT revision, ops, client_id FROM design_ops WHERE design_id = $1 AND revision > $2 ORDER BY revision ASC LIMIT 1000`,
    [designId, since],
  );
  return rows.map((row) => ({ revision: row.revision, ops: (typeof row.ops === "string" ? JSON.parse(row.ops) : row.ops) as CanvasOp[], clientId: row.client_id }));
}

export async function opsSince(db: Db, designId: string, actor: Actor, since: number) {
  const { row } = await requireRole(db, designId, actor, "view");
  return { revision: row.revision, entries: await opsSinceRow(db, designId, since) };
}

/** Library visuals referenced by the design's scenes; merged by id. */
export async function addBlocks(db: Db, designId: string, actor: Actor, blocks: VisualBlockRecord[]) {
  const { row } = await requireRole(db, designId, actor, "edit");
  const current = (row.blocks ?? []) as VisualBlockRecord[];
  const known = new Set(current.map((block) => block.id));
  const merged = [...current, ...blocks.filter((block) => block && typeof block.id === "string" && !known.has(block.id))].slice(0, MAX_BLOCKS);
  await db.query(`UPDATE designs SET blocks = $2::jsonb WHERE id = $1`, [designId, json(merged)]);
  return merged;
}

export async function deleteDesign(db: Db, designId: string, actor: Actor) {
  await requireRole(db, designId, actor, "owner");
  await db.query(`UPDATE designs SET deleted_at = now() WHERE id = $1`, [designId]);
}

export async function createVersion(db: Db, designId: string, actor: Actor, label: string) {
  const { row } = await requireRole(db, designId, actor, "edit");
  const id = createId("v");
  const clean = label.trim().slice(0, 80) || `Revision ${row.revision}`;
  await db.query(`INSERT INTO design_versions (id, design_id, revision, label, doc, author_id) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`, [id, designId, row.revision, clean, json(row.doc), actor.userId]);
  return { id, label: clean, revision: row.revision };
}

export async function listVersions(db: Db, designId: string, actor: Actor) {
  await requireRole(db, designId, actor, "view");
  const rows = await db.query<{ id: string; label: string; revision: number; created_at: string | Date }>(
    `SELECT id, label, revision, created_at FROM design_versions WHERE design_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [designId],
  );
  return rows.map((row) => ({ id: row.id, label: row.label, revision: row.revision, createdAt: new Date(row.created_at).toISOString() }));
}

export async function getVersion(db: Db, designId: string, actor: Actor, versionId: string) {
  await requireRole(db, designId, actor, "view");
  const [row] = await db.query<{ doc: unknown; label: string; revision: number }>(`SELECT doc, label, revision FROM design_versions WHERE id = $1 AND design_id = $2`, [versionId, designId]);
  if (!row) throw new StoreError(404, "Version not found");
  return { design: parseDoc(row.doc), label: row.label, revision: row.revision };
}

export async function createShareLink(db: Db, designId: string, actor: Actor, role: ShareRole) {
  await requireRole(db, designId, actor, "owner");
  const token = randomBytes(18).toString("base64url");
  await db.query(`INSERT INTO share_links (token, design_id, role, created_by) VALUES ($1, $2, $3, $4)`, [token, designId, role, actor.userId]);
  return { token, role };
}

export async function listShareLinks(db: Db, designId: string, actor: Actor) {
  await requireRole(db, designId, actor, "owner");
  const rows = await db.query<{ token: string; role: ShareRole; created_at: string | Date }>(
    `SELECT token, role, created_at FROM share_links WHERE design_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
    [designId],
  );
  return rows.map((row) => ({ token: row.token, role: row.role, createdAt: new Date(row.created_at).toISOString() }));
}

export async function revokeShareLink(db: Db, designId: string, actor: Actor, token: string) {
  await requireRole(db, designId, actor, "owner");
  await db.query(`UPDATE share_links SET revoked_at = now() WHERE token = $1 AND design_id = $2`, [token, designId]);
}

/** The design a share token opens, if the link is live. */
export async function resolveShareToken(db: Db, token: string) {
  const [row] = await db.query<{ design_id: string; role: ShareRole }>(
    `SELECT s.design_id, s.role FROM share_links s JOIN designs d ON d.id = s.design_id WHERE s.token = $1 AND s.revoked_at IS NULL AND d.deleted_at IS NULL`,
    [token],
  );
  return row ? { designId: row.design_id, role: row.role } : null;
}

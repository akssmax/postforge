import "server-only";
import { createId } from "@/lib/canvas/document";
import type { Db } from "@/lib/server/db";
import { canAct, resolveRole, StoreError, type Actor } from "@/lib/server/designStore";

export type CommentRow = {
  id: string;
  parentId: string | null;
  artboardId: string;
  nodeId: string | null;
  x: number | null;
  y: number | null;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  deleted: boolean;
};

export type PresenceRow = { clientId: string; userId: string | null; name: string; artboardId: string | null; nodeId: string | null };

const PRESENCE_TTL_SECONDS = 20;
const MAX_BODY = 4000;

async function roleFor(db: Db, designId: string, actor: Actor) {
  const [row] = await db.query<{ id: string; owner_id: string }>(`SELECT id, owner_id FROM designs WHERE id = $1 AND deleted_at IS NULL`, [designId]);
  if (!row) throw new StoreError(404, "Design not found");
  const role = await resolveRole(db, row, actor);
  if (!role) throw new StoreError(actor.userId || actor.shareToken ? 403 : 401, "You don't have access to this design");
  return role;
}

const iso = (value: string | Date | null) => (value ? new Date(value).toISOString() : null);

function toComment(row: Record<string, unknown>): CommentRow {
  return {
    id: String(row.id),
    parentId: (row.parent_id as string | null) ?? null,
    artboardId: String(row.artboard_id),
    nodeId: (row.node_id as string | null) ?? null,
    x: row.x === null || row.x === undefined ? null : Number(row.x),
    y: row.y === null || row.y === undefined ? null : Number(row.y),
    body: String(row.body),
    authorId: (row.author_id as string | null) ?? null,
    authorName: (row.author_name as string | null) ?? null,
    createdAt: iso(row.created_at as string)!,
    updatedAt: iso(row.updated_at as string)!,
    resolvedAt: iso(row.resolved_at as string | null),
    deleted: !!row.deleted_at,
  };
}

/** Comments on a design; with `since`, only ones changed after it (for live updates). */
export async function listComments(db: Db, designId: string, actor: Actor, since?: string | null): Promise<CommentRow[]> {
  await roleFor(db, designId, actor);
  const rows = since
    ? await db.query(`SELECT * FROM comments WHERE design_id = $1 AND date_trunc('milliseconds', updated_at) > $2 ORDER BY created_at ASC`, [designId, since])
    : await db.query(`SELECT * FROM comments WHERE design_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1000`, [designId]);
  return rows.map(toComment);
}

export async function createComment(
  db: Db,
  designId: string,
  actor: Actor & { name?: string | null },
  input: { artboardId: string; nodeId?: string | null; x?: number | null; y?: number | null; body: string; parentId?: string | null },
): Promise<CommentRow> {
  const role = await roleFor(db, designId, actor);
  if (!canAct(role, "comment")) throw new StoreError(403, "This link can view but not comment");
  const body = String(input.body ?? "").trim();
  if (!body) throw new StoreError(400, "Comment is empty");
  if (body.length > MAX_BODY) throw new StoreError(400, `Comments are limited to ${MAX_BODY} characters`);
  const clampFraction = (value: number | null | undefined) => (typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null);
  let artboardId = String(input.artboardId ?? "").slice(0, 80);
  if (input.parentId) {
    const [parent] = await db.query<{ artboard_id: string }>(`SELECT artboard_id FROM comments WHERE id = $1 AND design_id = $2`, [input.parentId, designId]);
    if (!parent) throw new StoreError(404, "The comment you're replying to is gone");
    artboardId = parent.artboard_id;
  }
  if (!artboardId) throw new StoreError(400, "Comments need an artboard");
  const [row] = await db.query(
    `INSERT INTO comments (id, design_id, parent_id, artboard_id, node_id, x, y, body, author_id, author_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [createId("cm"), designId, input.parentId ?? null, artboardId, input.parentId ? null : (input.nodeId?.slice(0, 80) ?? null), input.parentId ? null : clampFraction(input.x), input.parentId ? null : clampFraction(input.y), body, actor.userId, actor.name?.slice(0, 80) ?? (actor.userId ? null : "Guest")],
  );
  return toComment(row!);
}

/** Resolve or reopen a thread: editors, or the person who started it. */
export async function setResolved(db: Db, designId: string, actor: Actor, commentId: string, resolved: boolean) {
  const role = await roleFor(db, designId, actor);
  const [comment] = await db.query<{ author_id: string | null }>(`SELECT author_id FROM comments WHERE id = $1 AND design_id = $2 AND parent_id IS NULL`, [commentId, designId]);
  if (!comment) throw new StoreError(404, "Comment not found");
  if (!canAct(role, "edit") && !(actor.userId && comment.author_id === actor.userId)) throw new StoreError(403, "Only editors or the author can resolve this");
  await db.query(`UPDATE comments SET resolved_at = ${resolved ? "now()" : "NULL"}, updated_at = now() WHERE id = $1`, [commentId]);
}

/** Delete a comment: its author, or the owner. Replies go with their thread. */
export async function deleteComment(db: Db, designId: string, actor: Actor, commentId: string) {
  const role = await roleFor(db, designId, actor);
  const [comment] = await db.query<{ author_id: string | null }>(`SELECT author_id FROM comments WHERE id = $1 AND design_id = $2 AND deleted_at IS NULL`, [commentId, designId]);
  if (!comment) throw new StoreError(404, "Comment not found");
  if (role !== "owner" && !(actor.userId && comment.author_id === actor.userId)) throw new StoreError(403, "Only the author or the owner can delete this");
  await db.query(`UPDATE comments SET deleted_at = now(), updated_at = now(), body = '' WHERE id = $1 OR parent_id = $1`, [commentId]);
}

/** Record that this client has the design open (and what it has selected). */
export async function heartbeat(db: Db, designId: string, actor: Actor & { name?: string | null }, input: { clientId: string; artboardId?: string | null; nodeId?: string | null }) {
  await roleFor(db, designId, actor);
  await db.query(
    `INSERT INTO presence (design_id, client_id, user_id, name, artboard_id, node_id, updated_at) VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (design_id, client_id) DO UPDATE SET name = EXCLUDED.name, artboard_id = EXCLUDED.artboard_id, node_id = EXCLUDED.node_id, updated_at = now()`,
    [designId, input.clientId.slice(0, 64), actor.userId, (actor.name ?? "Guest").slice(0, 80), input.artboardId?.slice(0, 80) ?? null, input.nodeId?.slice(0, 80) ?? null],
  );
}

export async function leave(db: Db, designId: string, clientId: string) {
  await db.query(`DELETE FROM presence WHERE design_id = $1 AND client_id = $2`, [designId, clientId]);
}

export async function listPresence(db: Db, designId: string): Promise<PresenceRow[]> {
  const rows = await db.query<{ client_id: string; user_id: string | null; name: string; artboard_id: string | null; node_id: string | null }>(
    `SELECT client_id, user_id, name, artboard_id, node_id FROM presence WHERE design_id = $1 AND updated_at > now() - make_interval(secs => $2) ORDER BY updated_at DESC LIMIT 50`,
    [designId, PRESENCE_TTL_SECONDS],
  );
  return rows.map((row) => ({ clientId: row.client_id, userId: row.user_id, name: row.name, artboardId: row.artboard_id, nodeId: row.node_id }));
}

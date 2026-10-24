// Integration tests against a real Postgres. Set TEST_DATABASE_URL (a throwaway
// database; tables are dropped) or the suite is skipped.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { blankCanvasDesign } from "@/lib/canvas/blank";
import { applyOps } from "@/lib/canvas/ops";
import {
  addBlocks,
  createDesign,
  createShareLink,
  createVersion,
  ensureUser,
  getDesign,
  getVersion,
  listDesigns,
  listShareLinks,
  listVersions,
  opsSince,
  pushOps,
  resolveShareToken,
  revokeShareLink,
  StoreError,
} from "@/lib/server/designStore";
import { runMigrations, splitStatements } from "@/lib/server/migrate";
import { pgDb } from "@/lib/server/pgDb";

const url = process.env.TEST_DATABASE_URL;
const db = url ? pgDb(url) : null;
const skip = !db && "TEST_DATABASE_URL not set";

before(async () => {
  if (!db) return;
  await db.query(`DROP TABLE IF EXISTS share_links, design_versions, design_ops, designs, users, schema_migrations CASCADE`);
  assert.deepEqual(await runMigrations(db), ["001_init.sql"]);
  assert.deepEqual(await runMigrations(db), [], "migrations are applied once");
  await ensureUser(db, { id: "alice", email: "alice@example.com", name: "Alice" });
  await ensureUser(db, { id: "bob", email: "bob@example.com" });
});

after(async () => {
  await db?.end();
});

const alice = { userId: "alice" };
const bob = { userId: "bob" };

async function rejects(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (error: unknown) => error instanceof StoreError && error.status === status);
}

test("migration files split into statements", () => {
  assert.deepEqual(splitStatements("-- a\nCREATE TABLE x (a int);\nCREATE INDEX y ON x (a);\n"), ["CREATE TABLE x (a int)", "CREATE INDEX y ON x (a)"]);
});

test("owners create, list and read designs; others can't", { skip }, async () => {
  const local = blankCanvasDesign();
  const created = await createDesign(db!, "alice", { design: local });
  assert.equal(created.id, local.id, "keeps the local id");
  assert.equal((await createDesign(db!, "alice", { design: local })).created, false, "uploading twice is idempotent");
  const bobsCopy = await createDesign(db!, "bob", { design: local });
  assert.notEqual(bobsCopy.id, local.id, "someone else's id is never taken over");
  assert.ok((await listDesigns(db!, "alice")).some((row) => row.id === local.id));
  assert.equal((await getDesign(db!, local.id, alice)).role, "owner");
  await rejects(getDesign(db!, local.id, bob), 403);
  await rejects(getDesign(db!, local.id, { userId: null }), 401);
  await rejects(getDesign(db!, "missing", alice), 404);
});

test("ops apply on the base revision; a stale writer gets the missing ops", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  const artboardId = local.pages[0]!.artboards[0]!.id;
  const first = await pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "setDesign", path: "title", value: "Launch" }], clientId: "tab-a" });
  assert.deepEqual(first, { ok: true, revision: 1 });

  // A second tab still on revision 0 is told what it missed.
  const stale = await pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "setScene", artboardId, path: "typeScale", value: 1.4 }], clientId: "tab-b" });
  assert.equal(stale.ok, false);
  assert.ok(!stale.ok && stale.missing.length === 1 && stale.missing[0]!.clientId === "tab-a");
  const retry = await pushOps(db!, local.id, alice, { baseRevision: 1, ops: [{ op: "setScene", artboardId, path: "typeScale", value: 1.4 }], clientId: "tab-b" });
  assert.deepEqual(retry, { ok: true, revision: 2 });

  const stored = await getDesign(db!, local.id, alice);
  assert.equal(stored.design.title, "Launch");
  assert.equal(stored.design.pages[0]!.artboards[0]!.scene.typeScale, 1.4);
  // Replaying the op log on the original gives the stored document.
  const log = await opsSince(db!, local.id, alice, 0);
  const replayed = applyOps(local, log.entries.flatMap((entry) => entry.ops)).design;
  assert.deepEqual({ ...replayed, updatedAt: 0, revision: 0 }, { ...stored.design, updatedAt: 0, revision: 0 });
});

test("invalid ops are rejected server-side and change nothing", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  await rejects(pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "remove", artboardId: "nope", nodeId: "x" }] }), 400);
  await rejects(pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "bogus" }] }), 400);
  await rejects(pushOps(db!, local.id, bob, { baseRevision: 0, ops: [{ op: "setDesign", path: "title", value: "x" }] }), 403);
  assert.equal((await getDesign(db!, local.id, alice)).revision, 0);
});

test("concurrent pushes on one base: exactly one wins", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  const results = await Promise.all(
    ["A", "B", "C", "D"].map((name) => pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "setDesign", path: "title", value: name }], clientId: name })),
  );
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal((await getDesign(db!, local.id, alice)).revision, 1);
});

test("share links grant their role until revoked", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  await rejects(createShareLink(db!, local.id, bob, "view"), 403);
  const view = await createShareLink(db!, local.id, alice, "view");
  const edit = await createShareLink(db!, local.id, alice, "edit");
  assert.deepEqual(await resolveShareToken(db!, view.token), { designId: local.id, role: "view" });
  assert.equal((await getDesign(db!, local.id, { userId: null, shareToken: view.token })).role, "view");
  await rejects(pushOps(db!, local.id, { userId: null, shareToken: view.token }, { baseRevision: 0, ops: [{ op: "setDesign", path: "title", value: "x" }] }), 403);
  assert.ok((await pushOps(db!, local.id, { userId: "bob", shareToken: edit.token }, { baseRevision: 0, ops: [{ op: "setDesign", path: "title", value: "Bob was here" }] })).ok);
  assert.equal((await listShareLinks(db!, local.id, alice)).length, 2);
  await revokeShareLink(db!, local.id, alice, view.token);
  assert.equal(await resolveShareToken(db!, view.token), null);
  await rejects(getDesign(db!, local.id, { userId: null, shareToken: view.token }), 403);
});

test("versions snapshot the document and restore through an undoable op", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  const version = await createVersion(db!, local.id, alice, "Before edits");
  const artboardId = local.pages[0]!.artboards[0]!.id;
  await pushOps(db!, local.id, alice, { baseRevision: 0, ops: [{ op: "renameArtboard", artboardId, name: "Changed" }] });
  assert.equal((await listVersions(db!, local.id, alice))[0]!.label, "Before edits");
  const snapshot = await getVersion(db!, local.id, alice, version.id);
  const restored = await pushOps(db!, local.id, alice, { baseRevision: 1, ops: [{ op: "replacePages", pages: snapshot.design.pages }] });
  assert.ok(restored.ok);
  assert.equal((await getDesign(db!, local.id, alice)).design.pages[0]!.artboards[0]!.name, "Artboard 1");
});

test("library visuals merge by id", { skip }, async () => {
  const local = blankCanvasDesign();
  await createDesign(db!, "alice", { design: local });
  const block = { id: "b1", kind: "ui" as const, label: "Dash", svgMarkup: "", createdAt: 0 };
  await addBlocks(db!, local.id, alice, [block]);
  const merged = await addBlocks(db!, local.id, alice, [block, { ...block, id: "b2" }]);
  assert.deepEqual(merged.map((entry) => entry.id), ["b1", "b2"]);
});

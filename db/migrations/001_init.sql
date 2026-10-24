-- Accounts (Auth.js signs people in; this row is our own record of them).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One canvas design. `doc` is the full CanvasDesign at `revision`.
CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc JSONB NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS designs_owner_updated ON designs (owner_id, updated_at DESC) WHERE deleted_at IS NULL;

-- Every accepted op batch, in order. (design_id, revision) is the concurrency guard:
-- two writers on the same base revision collide on this key and one is rejected.
CREATE TABLE IF NOT EXISTS design_ops (
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  ops JSONB NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (design_id, revision)
);

-- Named snapshots people can restore.
CREATE TABLE IF NOT EXISTS design_versions (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  label TEXT NOT NULL,
  doc JSONB NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS design_versions_design ON design_versions (design_id, created_at DESC);

-- Link sharing: anyone with the token gets `role` on the design.
CREATE TABLE IF NOT EXISTS share_links (
  token TEXT PRIMARY KEY,
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('view', 'comment', 'edit')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS share_links_design ON share_links (design_id);

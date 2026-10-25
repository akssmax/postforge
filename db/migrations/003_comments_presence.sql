-- Comments pinned to an artboard (and optionally a layer and a point on it).
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  artboard_id TEXT NOT NULL,
  node_id TEXT,
  x REAL,
  y REAL,
  body TEXT NOT NULL,
  author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  -- Soft delete, so live clients learn about removals.
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS comments_design_updated ON comments (design_id, updated_at);

-- Who has a design open right now (rows older than a few seconds are stale).
CREATE TABLE IF NOT EXISTS presence (
  design_id TEXT NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  artboard_id TEXT,
  node_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (design_id, client_id)
);

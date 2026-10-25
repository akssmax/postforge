-- Design systems people own; designs reference one by id (doc.systemId).
CREATE TABLE IF NOT EXISTS design_systems (
  id TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc JSONB NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, id)
);

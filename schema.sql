CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL,
  group_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nodes_position ON nodes(position);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

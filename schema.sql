-- Banca de Poker — esquema D1
-- Soft-delete en todos lados: `deleted_at` + `deleted_by`. Nada se borra de verdad.

CREATE TABLE IF NOT EXISTS contacts (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT,
  deleted_at INTEGER,
  deleted_by TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  started_at      INTEGER NOT NULL,
  finished_at     INTEGER NOT NULL,
  buy_in_cents    INTEGER NOT NULL,
  -- snapshots como JSON para reflejar fielmente el estado al cerrar la timba
  chips_json      TEXT NOT NULL,
  players_json    TEXT NOT NULL,
  transfers_json  TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL,
  updated_by      TEXT,
  deleted_at      INTEGER,
  deleted_by      TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_finished ON sessions(finished_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  at            INTEGER NOT NULL,
  actor         TEXT NOT NULL,
  action        TEXT NOT NULL,        -- login, contact.upsert, contact.delete, contact.restore, session.upsert, session.delete, session.restore, transfer.toggle
  entity_type   TEXT,
  entity_id     TEXT,
  payload_json  TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_at ON audit_log(at DESC);

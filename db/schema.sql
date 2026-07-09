PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'IOS',
  token TEXT NOT NULL UNIQUE,
  app_version TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  label TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  notify_on_first_run INTEGER NOT NULL DEFAULT 0,
  item_key_path TEXT,
  title_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_fetched_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE,
  UNIQUE (user_id, source_id)
);

CREATE TABLE IF NOT EXISTS source_items (
  id TEXT PRIMARY KEY,
  user_source_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  title TEXT,
  raw TEXT NOT NULL,
  seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_source_id) REFERENCES user_sources(id) ON DELETE CASCADE,
  UNIQUE (user_source_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS fetch_runs (
  id TEXT PRIMARY KEY,
  user_source_id TEXT NOT NULL,
  status TEXT NOT NULL,
  new_item_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  FOREIGN KEY (user_source_id) REFERENCES user_sources(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_source_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  payload TEXT NOT NULL,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_source_id) REFERENCES user_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS devices_user_id_idx ON devices(user_id);
CREATE INDEX IF NOT EXISTS user_sources_user_id_idx ON user_sources(user_id);
CREATE INDEX IF NOT EXISTS user_sources_source_id_idx ON user_sources(source_id);
CREATE INDEX IF NOT EXISTS source_items_user_source_id_idx ON source_items(user_source_id);
CREATE INDEX IF NOT EXISTS fetch_runs_user_source_id_idx ON fetch_runs(user_source_id);
CREATE INDEX IF NOT EXISTS fetch_runs_started_at_idx ON fetch_runs(started_at);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_source_id_idx ON notifications(user_source_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

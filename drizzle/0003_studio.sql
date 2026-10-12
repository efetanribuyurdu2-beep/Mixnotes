CREATE TABLE IF NOT EXISTS smart_crate_rules (owner_id TEXT NOT NULL, crate_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY (owner_id, crate_id));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS practice_sessions (owner_id TEXT NOT NULL, id TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (owner_id, id));
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sessions_owner_created_idx ON practice_sessions(owner_id,created_at DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS workspace_imports (owner_id TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(owner_id,digest));

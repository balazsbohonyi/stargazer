import type { DbConnection } from "./connection.js";

export function initializeSchema(db: DbConnection) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS repositories (
      id TEXT PRIMARY KEY,
      database_id INTEGER,
      full_name TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      description TEXT,
      language TEXT,
      url TEXT NOT NULL,
      stargazer_count INTEGER,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS star_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      is_private INTEGER NOT NULL CHECK (is_private IN (0, 1)),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS repo_list_memberships (
      repo_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
      list_id TEXT NOT NULL REFERENCES star_lists(id) ON DELETE CASCADE,
      PRIMARY KEY (repo_id, list_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS repo_fts USING fts5(
      repo_id UNINDEXED,
      full_name,
      description
    );
  `);
}

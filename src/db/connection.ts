import Database from "better-sqlite3";

export type DbConnection = Database.Database;

export function connect(databasePath = ":memory:"): DbConnection {
  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  return db;
}

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: Database.Database | null = null;

/**
 * Get or create the SQLite database connection.
 * Uses DATABASE_PATH env var or defaults to ./data/shaken.db.
 * Creates the data directory if it doesn't exist.
 */
export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = process.env.DATABASE_PATH || './data/shaken.db';
  const dir = path.dirname(dbPath);

  fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  return db;
}

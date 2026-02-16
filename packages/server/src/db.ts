import { createDb, type Db } from '@tractor/db';

let db: Db | null = null;

export function initDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[db] DATABASE_URL not set — running in memory-only mode');
    return null;
  }
  db = createDb(url);
  console.log('[db] Connected to PostgreSQL');
  return db;
}

export function getDb(): Db | null {
  return db;
}

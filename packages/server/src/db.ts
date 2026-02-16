import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import { Migrator, FileMigrationProvider, sql } from 'kysely';
import { createDb, type Db } from '@tractor/db';

let db: Db | null = null;

export async function initDb(): Promise<Db | null> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[db] DATABASE_URL not set — running in memory-only mode');
    return null;
  }
  const instance = createDb(url);

  // Validate connectivity
  try {
    await sql`SELECT 1`.execute(instance);
  } catch (err) {
    console.error('[db] Connection failed — falling back to memory-only mode:', err);
    try { await instance.destroy(); } catch { /* ignore */ }
    return null;
  }
  console.log('[db] Connected to PostgreSQL');

  // Auto-migrate
  try {
    // Resolve the migrations folder from @tractor/db package
    const require = createRequire(import.meta.url);
    const dbPkgDir = path.dirname(require.resolve('@tractor/db/package.json'));
    const migrationsFolder = path.join(dbPkgDir, 'migrations');

    const migrator = new Migrator({
      db: instance,
      provider: new FileMigrationProvider({
        fs,
        path,
        migrationFolder: migrationsFolder,
      }),
    });

    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((r) => {
      if (r.status === 'Success') {
        console.log(`[db] Migration "${r.migrationName}" applied`);
      } else if (r.status === 'Error') {
        console.error(`[db] Migration "${r.migrationName}" failed`);
      }
    });
    if (error) {
      console.error('[db] Migration error (tables may already exist):', error);
    }
  } catch (err) {
    console.error('[db] Auto-migration error:', err);
  }

  db = instance;
  return db;
}

export function getDb(): Db | null {
  return db;
}

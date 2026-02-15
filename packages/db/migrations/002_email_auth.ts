import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('email', 'varchar(255)', (col) => col.unique())
    .execute();
  await db.schema
    .alterTable('users')
    .addColumn('email_verified_at', 'timestamptz')
    .execute();

  await db.schema
    .createTable('email_codes')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('code', 'varchar(8)', (col) => col.notNull())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id'))
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .addColumn('used_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .createIndex('email_codes_email_idx')
    .on('email_codes')
    .column('email')
    .execute();
  await db.schema
    .createIndex('email_codes_code_idx')
    .on('email_codes')
    .column('code')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('email_codes').ifExists().execute();
  await db.schema.alterTable('users').dropColumn('email_verified_at').execute();
  await db.schema.alterTable('users').dropColumn('email').execute();
}

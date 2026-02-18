import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('lobby_messages')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(db.fn('gen_random_uuid')),
    )
    .addColumn('user_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id'),
    )
    .addColumn('text', 'varchar(200)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(db.fn('now')),
    )
    .execute();

  await db.schema
    .createIndex('lobby_messages_created_idx')
    .on('lobby_messages')
    .column('created_at desc')
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('lobby_messages').execute();
}

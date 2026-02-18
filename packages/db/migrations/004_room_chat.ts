import { type Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('room_messages')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('room_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('seat', 'integer', (col) => col.notNull())
    .addColumn('user_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('text', 'varchar(200)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex('room_messages_room_idx')
    .on('room_messages')
    .columns(['room_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('room_messages').execute();
}

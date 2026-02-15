import type { Kysely } from 'kysely';
import { sql } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`.execute(db);

  // users
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('username', 'varchar(50)', (col) => col.unique())
    .addColumn('display_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('guest_token', 'uuid', (col) => col.unique())
    .addColumn('oauth_provider', 'varchar(30)')
    .addColumn('oauth_id', 'varchar(255)')
    .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema
    .createIndex('users_oauth_idx')
    .unique()
    .on('users')
    .columns(['oauth_provider', 'oauth_id'])
    .execute();

  // matches
  await db.schema
    .createTable('matches')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('room_id', 'varchar(100)', (col) => col.notNull())
    .addColumn('player_count', 'int2', (col) => col.notNull())
    .addColumn('winning_team', 'int2')
    .addColumn('team_levels_start', 'jsonb', (col) => col.notNull())
    .addColumn('team_levels_end', 'jsonb')
    .addColumn('started_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .addColumn('ended_at', 'timestamptz')
    .execute();

  // match_players
  await db.schema
    .createTable('match_players')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('matches.id'))
    .addColumn('user_id', 'uuid', (col) => col.references('users.id'))
    .addColumn('seat', 'int2', (col) => col.notNull())
    .addColumn('team', 'int2', (col) => col.notNull())
    .addColumn('display_name', 'varchar(50)', (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex('match_players_match_seat_idx')
    .unique()
    .on('match_players')
    .columns(['match_id', 'seat'])
    .execute();
  await db.schema
    .createIndex('match_players_user_idx')
    .on('match_players')
    .column('user_id')
    .execute();

  // rounds
  await db.schema
    .createTable('rounds')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('match_id', 'uuid', (col) => col.notNull().references('matches.id'))
    .addColumn('round_number', 'int2', (col) => col.notNull())
    .addColumn('banker_seat', 'int2', (col) => col.notNull())
    .addColumn('level_rank', 'varchar(2)', (col) => col.notNull())
    .addColumn('trump_suit', 'varchar(5)', (col) => col.notNull())
    .addColumn('kitty_cards', 'jsonb', (col) => col.notNull())
    .addColumn('defender_points', 'int2', (col) => col.notNull())
    .addColumn('attacker_points', 'int2', (col) => col.notNull())
    .addColumn('kitty_points', 'int2', (col) => col.notNull())
    .addColumn('kitty_multiplier', 'int2', (col) => col.notNull())
    .addColumn('winner_team', 'int2', (col) => col.notNull())
    .addColumn('winner_side', 'varchar(10)', (col) => col.notNull())
    .addColumn('level_from', 'varchar(2)', (col) => col.notNull())
    .addColumn('level_to', 'varchar(2)', (col) => col.notNull())
    .addColumn('level_delta', 'int2', (col) => col.notNull())
    .addColumn('roles_swapped', 'boolean', (col) => col.notNull())
    .addColumn('new_banker_seat', 'int2', (col) => col.notNull())
    .addColumn('started_at', 'timestamptz', (col) => col.notNull())
    .addColumn('ended_at', 'timestamptz', (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex('rounds_match_round_idx')
    .unique()
    .on('rounds')
    .columns(['match_id', 'round_number'])
    .execute();

  // round_events
  await db.schema
    .createTable('round_events')
    .addColumn('id', 'bigserial', (col) => col.primaryKey())
    .addColumn('round_id', 'uuid', (col) => col.notNull().references('rounds.id'))
    .addColumn('seq', 'integer', (col) => col.notNull())
    .addColumn('event_type', 'varchar(30)', (col) => col.notNull())
    .addColumn('seat', 'int2')
    .addColumn('cards', sql`text[]`)
    .addColumn('payload', 'jsonb', (col) => col.notNull())
    .addColumn('at_ms', 'bigint', (col) => col.notNull())
    .execute();
  await db.schema
    .createIndex('round_events_round_seq_idx')
    .unique()
    .on('round_events')
    .columns(['round_id', 'seq'])
    .execute();
  await db.schema
    .createIndex('round_events_type_idx')
    .on('round_events')
    .column('event_type')
    .execute();
  await sql`CREATE INDEX round_events_cards_idx ON round_events USING gin (cards)`.execute(db);

  // user_ratings
  await db.schema
    .createTable('user_ratings')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').unique())
    .addColumn('rating', 'integer', (col) => col.notNull().defaultTo(1500))
    .addColumn('deviation', 'integer', (col) => col.notNull().defaultTo(350))
    .addColumn('matches_rated', 'integer', (col) => col.notNull().defaultTo(0))
    .addColumn('peak_rating', 'integer', (col) => col.notNull().defaultTo(1500))
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('user_ratings').ifExists().execute();
  await db.schema.dropTable('round_events').ifExists().execute();
  await db.schema.dropTable('rounds').ifExists().execute();
  await db.schema.dropTable('match_players').ifExists().execute();
  await db.schema.dropTable('matches').ifExists().execute();
  await db.schema.dropTable('users').ifExists().execute();
}

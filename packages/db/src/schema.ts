import {
  pgTable,
  uuid,
  varchar,
  smallint,
  timestamp,
  jsonb,
  bigserial,
  boolean,
  integer,
  bigint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── users ──

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 50 }).notNull(),
  guestToken: uuid('guest_token').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── matches ──

export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  roomId: varchar('room_id', { length: 100 }).notNull(),
  playerCount: smallint('player_count').notNull(),
  winningTeam: smallint('winning_team'),
  teamLevelsStart: jsonb('team_levels_start').notNull().$type<[string, string]>(),
  teamLevelsEnd: jsonb('team_levels_end').$type<[string, string]>(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

// ── match_players ──

export const matchPlayers = pgTable(
  'match_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id),
    userId: uuid('user_id').references(() => users.id),
    seat: smallint('seat').notNull(),
    team: smallint('team').notNull(),
    displayName: varchar('display_name', { length: 50 }).notNull(),
  },
  (t) => [
    uniqueIndex('match_players_match_seat_idx').on(t.matchId, t.seat),
    index('match_players_user_idx').on(t.userId),
  ],
);

// ── rounds ──

export const rounds = pgTable(
  'rounds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id),
    roundNumber: smallint('round_number').notNull(),
    bankerSeat: smallint('banker_seat').notNull(),
    levelRank: varchar('level_rank', { length: 2 }).notNull(),
    trumpSuit: varchar('trump_suit', { length: 5 }).notNull(),
    kittyCards: jsonb('kitty_cards').notNull().$type<string[]>(),
    playedBySeat: jsonb('played_by_seat').notNull().$type<string[][]>(),
    defenderPoints: smallint('defender_points').notNull(),
    attackerPoints: smallint('attacker_points').notNull(),
    kittyPoints: smallint('kitty_points').notNull(),
    kittyMultiplier: smallint('kitty_multiplier').notNull(),
    winnerTeam: smallint('winner_team').notNull(),
    winnerSide: varchar('winner_side', { length: 10 }).notNull().$type<'DEFENDER' | 'ATTACKER'>(),
    levelFrom: varchar('level_from', { length: 2 }).notNull(),
    levelTo: varchar('level_to', { length: 2 }).notNull(),
    levelDelta: smallint('level_delta').notNull(),
    rolesSwapped: boolean('roles_swapped').notNull(),
    newBankerSeat: smallint('new_banker_seat').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('rounds_match_round_idx').on(t.matchId, t.roundNumber),
  ],
);

// ── round_events ──

export const roundEvents = pgTable(
  'round_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    roundId: uuid('round_id')
      .notNull()
      .references(() => rounds.id),
    seq: integer('seq').notNull(),
    eventType: varchar('event_type', { length: 30 }).notNull(),
    seat: smallint('seat'),
    payload: jsonb('payload').notNull(),
    atMs: bigint('at_ms', { mode: 'number' }).notNull(),
  },
  (t) => [
    uniqueIndex('round_events_round_seq_idx').on(t.roundId, t.seq),
    index('round_events_type_idx').on(t.eventType),
  ],
);

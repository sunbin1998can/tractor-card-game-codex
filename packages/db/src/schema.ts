import type { ColumnType, Generated, Insertable, Selectable, Updateable } from 'kysely';

// ── users ──

export interface UsersTable {
  id: Generated<string>;
  username: string | null;
  display_name: string;
  guest_token: string | null;
  oauth_provider: string | null;
  oauth_id: string | null;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

// ── matches ──

export interface MatchesTable {
  id: Generated<string>;
  room_id: string;
  player_count: number;
  winning_team: number | null;
  team_levels_start: ColumnType<[string, string], string, string>;
  team_levels_end: ColumnType<[string, string] | null, string | null, string | null>;
  started_at: Generated<Date>;
  ended_at: Date | null;
}

export type Match = Selectable<MatchesTable>;
export type NewMatch = Insertable<MatchesTable>;
export type MatchUpdate = Updateable<MatchesTable>;

// ── match_players ──

export interface MatchPlayersTable {
  id: Generated<string>;
  match_id: string;
  user_id: string | null;
  seat: number;
  team: number;
  display_name: string;
}

export type MatchPlayer = Selectable<MatchPlayersTable>;
export type NewMatchPlayer = Insertable<MatchPlayersTable>;

// ── rounds ──

export interface RoundsTable {
  id: Generated<string>;
  match_id: string;
  round_number: number;
  banker_seat: number;
  level_rank: string;
  trump_suit: string;
  kitty_cards: ColumnType<string[], string, string>;
  defender_points: number;
  attacker_points: number;
  kitty_points: number;
  kitty_multiplier: number;
  winner_team: number;
  winner_side: 'DEFENDER' | 'ATTACKER';
  level_from: string;
  level_to: string;
  level_delta: number;
  roles_swapped: boolean;
  new_banker_seat: number;
  started_at: Date;
  ended_at: Date;
}

export type Round = Selectable<RoundsTable>;
export type NewRound = Insertable<RoundsTable>;

// ── round_events ──

export interface RoundEventsTable {
  id: Generated<number>;
  round_id: string;
  seq: number;
  event_type: string;
  seat: number | null;
  cards: string[] | null;
  payload: ColumnType<unknown, string, string>;
  at_ms: number;
}

export type RoundEvent = Selectable<RoundEventsTable>;
export type NewRoundEvent = Insertable<RoundEventsTable>;

// ── user_ratings ──

export interface UserRatingsTable {
  id: Generated<string>;
  user_id: string;
  rating: Generated<number>;
  deviation: Generated<number>;
  matches_rated: Generated<number>;
  peak_rating: Generated<number>;
  updated_at: Generated<Date>;
}

export type UserRating = Selectable<UserRatingsTable>;
export type NewUserRating = Insertable<UserRatingsTable>;
export type UserRatingUpdate = Updateable<UserRatingsTable>;

// ── Database ──

export interface Database {
  users: UsersTable;
  matches: MatchesTable;
  match_players: MatchPlayersTable;
  rounds: RoundsTable;
  round_events: RoundEventsTable;
  user_ratings: UserRatingsTable;
}

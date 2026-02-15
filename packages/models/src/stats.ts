import { sql } from 'kysely';
import type { Db } from '@tractor/db';

export interface UserStats {
  totalMatches: number;
  wins: number;
  winRate: number;
  roundsPlayed: number;
  avgPointsAsAttacker: number;
  avgPointsAsDefender: number;
  totalLevelUps: number;
  biggestLevelJump: number;
}

export async function getUserStats(db: Db, userId: string): Promise<UserStats> {
  // Match-level stats
  const matchStats = await db
    .selectFrom('match_players')
    .innerJoin('matches', 'matches.id', 'match_players.match_id')
    .select([
      sql<number>`count(*)::int`.as('total_matches'),
      sql<number>`count(*) filter (where matches.winning_team = match_players.team)::int`.as('wins'),
    ])
    .where('match_players.user_id', '=', userId)
    .where('matches.winning_team', 'is not', null)
    .executeTakeFirstOrThrow();

  // Round-level stats: join banker's match_players row to compare teams
  const roundStats = await db
    .selectFrom('match_players')
    .innerJoin('rounds', 'rounds.match_id', 'match_players.match_id')
    .innerJoin('match_players as banker_mp', (join) =>
      join
        .onRef('banker_mp.match_id', '=', 'rounds.match_id')
        .onRef('banker_mp.seat', '=', 'rounds.banker_seat'),
    )
    .select([
      sql<number>`count(*)::int`.as('rounds_played'),
      sql<number>`coalesce(avg(case when match_players.team != banker_mp.team then rounds.attacker_points end), 0)::float`.as('avg_points_as_attacker'),
      sql<number>`coalesce(avg(case when match_players.team = banker_mp.team then rounds.defender_points end), 0)::float`.as('avg_points_as_defender'),
      sql<number>`coalesce(sum(case when rounds.winner_team = match_players.team then rounds.level_delta else 0 end), 0)::int`.as('total_level_ups'),
      sql<number>`coalesce(max(case when rounds.winner_team = match_players.team then rounds.level_delta end), 0)::int`.as('biggest_level_jump'),
    ])
    .where('match_players.user_id', '=', userId)
    .executeTakeFirstOrThrow();

  const totalMatches = matchStats.total_matches;
  const wins = matchStats.wins;

  return {
    totalMatches,
    wins,
    winRate: totalMatches > 0 ? wins / totalMatches : 0,
    roundsPlayed: roundStats.rounds_played,
    avgPointsAsAttacker: roundStats.avg_points_as_attacker,
    avgPointsAsDefender: roundStats.avg_points_as_defender,
    totalLevelUps: roundStats.total_level_ups,
    biggestLevelJump: roundStats.biggest_level_jump,
  };
}

export async function getUserRecentMatches(db: Db, userId: string, limit = 10) {
  return db
    .selectFrom('match_players')
    .innerJoin('matches', 'matches.id', 'match_players.match_id')
    .select([
      'matches.id as match_id',
      'matches.room_id',
      'matches.player_count',
      'matches.winning_team',
      'matches.team_levels_start',
      'matches.team_levels_end',
      'matches.started_at',
      'matches.ended_at',
      'match_players.seat',
      'match_players.team',
      'match_players.display_name',
    ])
    .where('match_players.user_id', '=', userId)
    .orderBy('matches.started_at', 'desc')
    .limit(limit)
    .execute();
}

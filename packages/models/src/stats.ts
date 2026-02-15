import { eq, sql, and, isNotNull } from 'drizzle-orm';
import type { Db } from '@tractor/db';
import { matches, matchPlayers, rounds } from '@tractor/db';

export interface UserStats {
  totalMatches: number;
  wins: number;
  winRate: number;
  roundsPlayed: number;
  avgPointsAsAttacker: number;
  avgPointsAsDefender: number;
}

export async function getUserStats(db: Db, userId: string): Promise<UserStats> {
  // Match-level stats
  const [matchStats] = await db
    .select({
      totalMatches: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${matches.winningTeam} = ${matchPlayers.team})::int`,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(and(eq(matchPlayers.userId, userId), isNotNull(matches.winningTeam)));

  // Round-level stats: points as attacker vs defender
  const [roundStats] = await db
    .select({
      roundsPlayed: sql<number>`count(*)::int`,
      avgPointsAsAttacker: sql<number>`coalesce(avg(case when ${matchPlayers.seat} != ${rounds.bankerSeat} then ${rounds.attackerPoints} end), 0)::float`,
      avgPointsAsDefender: sql<number>`coalesce(avg(case when ${matchPlayers.seat} = ${rounds.bankerSeat} then ${rounds.defenderPoints} end), 0)::float`,
    })
    .from(matchPlayers)
    .innerJoin(rounds, eq(matchPlayers.matchId, rounds.matchId))
    .where(eq(matchPlayers.userId, userId));

  const totalMatches = matchStats?.totalMatches ?? 0;
  const wins = matchStats?.wins ?? 0;

  return {
    totalMatches,
    wins,
    winRate: totalMatches > 0 ? wins / totalMatches : 0,
    roundsPlayed: roundStats?.roundsPlayed ?? 0,
    avgPointsAsAttacker: roundStats?.avgPointsAsAttacker ?? 0,
    avgPointsAsDefender: roundStats?.avgPointsAsDefender ?? 0,
  };
}

export async function getUserRecentMatches(db: Db, userId: string, limit = 10) {
  return db
    .select({
      matchId: matches.id,
      roomId: matches.roomId,
      playerCount: matches.playerCount,
      winningTeam: matches.winningTeam,
      teamLevelsStart: matches.teamLevelsStart,
      teamLevelsEnd: matches.teamLevelsEnd,
      startedAt: matches.startedAt,
      endedAt: matches.endedAt,
      seat: matchPlayers.seat,
      team: matchPlayers.team,
      displayName: matchPlayers.displayName,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(eq(matchPlayers.userId, userId))
    .orderBy(sql`${matches.startedAt} desc`)
    .limit(limit);
}

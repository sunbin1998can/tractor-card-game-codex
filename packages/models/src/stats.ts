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
  totalLevelUps: number;
  biggestLevelJump: number;
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

  // Round-level stats: use team to determine attacker/defender role
  // In Tractor, the banker's entire team defends. We join match_players
  // for both the queried user and the banker to compare teams.
  const [roundStats] = await db
    .select({
      roundsPlayed: sql<number>`count(*)::int`,
      avgPointsAsAttacker: sql<number>`coalesce(avg(case when ${matchPlayers.team} != banker_mp.team then ${rounds.attackerPoints} end), 0)::float`,
      avgPointsAsDefender: sql<number>`coalesce(avg(case when ${matchPlayers.team} = banker_mp.team then ${rounds.defenderPoints} end), 0)::float`,
      totalLevelUps: sql<number>`coalesce(sum(case when ${rounds.winnerTeam} = ${matchPlayers.team} then ${rounds.levelDelta} else 0 end), 0)::int`,
      biggestLevelJump: sql<number>`coalesce(max(case when ${rounds.winnerTeam} = ${matchPlayers.team} then ${rounds.levelDelta} end), 0)::int`,
    })
    .from(matchPlayers)
    .innerJoin(rounds, eq(matchPlayers.matchId, rounds.matchId))
    .innerJoin(
      sql`${matchPlayers} as banker_mp`,
      sql`banker_mp.match_id = ${rounds.matchId} and banker_mp.seat = ${rounds.bankerSeat}`,
    )
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
    totalLevelUps: roundStats?.totalLevelUps ?? 0,
    biggestLevelJump: roundStats?.biggestLevelJump ?? 0,
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

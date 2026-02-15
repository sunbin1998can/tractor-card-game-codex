import { eq, desc } from 'drizzle-orm';
import type { Db } from '@tractor/db';
import { matches, matchPlayers, rounds } from '@tractor/db';

export type Match = typeof matches.$inferSelect;
export type MatchInsert = typeof matches.$inferInsert;
export type MatchPlayer = typeof matchPlayers.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type RoundInsert = typeof rounds.$inferInsert;

export interface CreateMatchOpts {
  roomId: string;
  playerCount: number;
  teamLevelsStart: [string, string];
  players: {
    userId?: string;
    seat: number;
    team: number;
    displayName: string;
  }[];
}

export async function createMatch(db: Db, opts: CreateMatchOpts): Promise<Match> {
  const [match] = await db
    .insert(matches)
    .values({
      roomId: opts.roomId,
      playerCount: opts.playerCount,
      teamLevelsStart: opts.teamLevelsStart,
    })
    .returning();

  if (opts.players.length > 0) {
    await db.insert(matchPlayers).values(
      opts.players.map((p) => ({
        matchId: match.id,
        userId: p.userId ?? null,
        seat: p.seat,
        team: p.team,
        displayName: p.displayName,
      })),
    );
  }

  return match;
}

export async function finalizeMatch(
  db: Db,
  matchId: string,
  opts: { winningTeam: number; teamLevelsEnd: [string, string] },
): Promise<void> {
  await db
    .update(matches)
    .set({
      winningTeam: opts.winningTeam,
      teamLevelsEnd: opts.teamLevelsEnd,
      endedAt: new Date(),
    })
    .where(eq(matches.id, matchId));
}

export async function recordRound(
  db: Db,
  matchId: string,
  roundData: Omit<RoundInsert, 'id' | 'matchId'>,
): Promise<Round> {
  const [row] = await db
    .insert(rounds)
    .values({ ...roundData, matchId })
    .returning();
  return row;
}

export async function getMatchWithRounds(
  db: Db,
  matchId: string,
): Promise<{ match: Match; players: MatchPlayer[]; rounds: Round[] } | undefined> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!match) return undefined;

  const [players, matchRounds] = await Promise.all([
    db.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId)),
    db
      .select()
      .from(rounds)
      .where(eq(rounds.matchId, matchId))
      .orderBy(rounds.roundNumber),
  ]);

  return { match, players, rounds: matchRounds };
}

export async function getUserMatches(
  db: Db,
  userId: string,
  opts?: { limit?: number; offset?: number },
): Promise<{ match: Match; seat: number; team: number }[]> {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  const rows = await db
    .select({
      match: matches,
      seat: matchPlayers.seat,
      team: matchPlayers.team,
    })
    .from(matchPlayers)
    .innerJoin(matches, eq(matchPlayers.matchId, matches.id))
    .where(eq(matchPlayers.userId, userId))
    .orderBy(desc(matches.startedAt))
    .limit(limit)
    .offset(offset);

  return rows;
}

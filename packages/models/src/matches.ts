import type { Db, Match, MatchPlayer, Round, NewRound } from '@tractor/db';

export type { Match, MatchPlayer, Round, NewRound } from '@tractor/db';

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
  const match = await db
    .insertInto('matches')
    .values({
      room_id: opts.roomId,
      player_count: opts.playerCount,
      team_levels_start: JSON.stringify(opts.teamLevelsStart),
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  if (opts.players.length > 0) {
    await db
      .insertInto('match_players')
      .values(
        opts.players.map((p) => ({
          match_id: match.id,
          user_id: p.userId ?? null,
          seat: p.seat,
          team: p.team,
          display_name: p.displayName,
        })),
      )
      .execute();
  }

  return match;
}

export async function finalizeMatch(
  db: Db,
  matchId: string,
  opts: { winningTeam: number; teamLevelsEnd: [string, string] },
): Promise<void> {
  await db
    .updateTable('matches')
    .set({
      winning_team: opts.winningTeam,
      team_levels_end: JSON.stringify(opts.teamLevelsEnd),
      ended_at: new Date(),
    })
    .where('id', '=', matchId)
    .execute();
}

export async function recordRound(
  db: Db,
  matchId: string,
  roundData: Omit<NewRound, 'id' | 'match_id'>,
): Promise<Round> {
  return db
    .insertInto('rounds')
    .values({ ...roundData, match_id: matchId })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getMatchWithRounds(
  db: Db,
  matchId: string,
): Promise<{ match: Match; players: MatchPlayer[]; rounds: Round[] } | undefined> {
  const match = await db
    .selectFrom('matches')
    .selectAll()
    .where('id', '=', matchId)
    .executeTakeFirst();

  if (!match) return undefined;

  const [players, matchRounds] = await Promise.all([
    db
      .selectFrom('match_players')
      .selectAll()
      .where('match_id', '=', matchId)
      .execute(),
    db
      .selectFrom('rounds')
      .selectAll()
      .where('match_id', '=', matchId)
      .orderBy('round_number', 'asc')
      .execute(),
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
    .selectFrom('match_players')
    .innerJoin('matches', 'matches.id', 'match_players.match_id')
    .select([
      'matches.id',
      'matches.room_id',
      'matches.player_count',
      'matches.winning_team',
      'matches.team_levels_start',
      'matches.team_levels_end',
      'matches.started_at',
      'matches.ended_at',
      'match_players.seat',
      'match_players.team',
    ])
    .where('match_players.user_id', '=', userId)
    .orderBy('matches.started_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute();

  return rows.map((r) => ({
    match: {
      id: r.id,
      room_id: r.room_id,
      player_count: r.player_count,
      winning_team: r.winning_team,
      team_levels_start: r.team_levels_start,
      team_levels_end: r.team_levels_end,
      started_at: r.started_at,
      ended_at: r.ended_at,
    },
    seat: r.seat,
    team: r.team,
  }));
}

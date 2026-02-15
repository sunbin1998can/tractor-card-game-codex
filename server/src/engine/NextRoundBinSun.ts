/**
 * Tractor "Next Round" rules module
 *
 * Drop this file anywhere (e.g. repoRoot/tractor_rules/next_round.ts),
 * then import it from your server code.
 *
 * Implements rules:
 * - s = attacker/challenger team score (抢分方得分)
 * - s < 40  -> defender(dealer) stays, +2 levels
 * - s < 80  -> defender(dealer) stays, +1 level
 * - 80..120 -> attacker becomes dealer, +0 (keep their level)
 * - >120    -> attacker becomes dealer, +2 levels
 * - duiKou  -> defender(dealer) stays, +4 levels (override)
 * - banker seat: if same dealer team -> +2; else -> +1 (mod N)
 * - cannot skip ranks 5 / 10 / K (must-play ranks)
 */

export type TeamId = 0 | 1;

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export type Rank = (typeof RANKS)[number];

export const MUST_PLAY: Rank[] = ["5", "10", "K"];

/** Minimal round input you need to compute next round. */
export type NextRoundInput = {
  playerCount: number;       // N (usually 4)
  dealerTeam: TeamId;        // current dealer team (防守方/庄家方)
  bankerSeat: number;        // current banker seat index [0..N-1]
  sAttacker: number;         // attacker/challenger score s (抢分方得分) AFTER any kouDi doubling is applied
  duiKou: boolean;           // 对抠 special flag

  // Per-team current level/rank. If missing, treated as "2".
  teamLevel: Record<TeamId, Rank | null | undefined>;
};

export type NextRoundOutput = {
  nextDealerTeam: TeamId;
  nextBankerSeat: number;
  nextTrumpRank: Rank; // the rank to "play" next round (打几主)
  updatedTeamLevel: Record<TeamId, Rank>;
  appliedDelta: number; // how many levels were applied to the upgrade team
  upgradeTeam: TeamId;
};

/** Convenience: other team */
export function otherTeam(t: TeamId): TeamId {
  return (t === 0 ? 1 : 0);
}

/** Ensure rank is at least defined; default to "2". */
export function normalizeRank(r: Rank | null | undefined): Rank {
  return r ?? "2";
}

/**
 * Advance rank by delta, but do NOT skip the next MUST_PLAY (5/10/K).
 * If target would cross a must-play rank, stop at that must-play rank.
 *
 * Examples:
 * - 4 +2 => 5 (cannot jump over 5)
 * - 9 +3 => 10 (cannot jump over 10)
 * - Q +4 => K (cannot jump over K)
 */
export function advanceRankNoSkip(current: Rank, delta: number): Rank {
  if (delta <= 0) return current;

  let idx = RANKS.indexOf(current);
  if (idx < 0) idx = 0;

  const targetIdx = Math.min(idx + delta, RANKS.length - 1);

  // find the first must-play rank AFTER current
  let nextMustIdx = -1;
  for (let i = idx + 1; i < RANKS.length; i++) {
    if (MUST_PLAY.includes(RANKS[i])) {
      nextMustIdx = i;
      break;
    }
  }

  // If we would cross the must-play rank, stop there.
  if (nextMustIdx !== -1 && targetIdx > nextMustIdx) {
    return RANKS[nextMustIdx];
  }

  return RANKS[targetIdx];
}

/**
 * Core rule: compute next round dealer team, banker seat, and rank levels.
 */
export function resolveNextRound(input: NextRoundInput): NextRoundOutput {
  const N = input.playerCount;
  if (!Number.isInteger(N) || N <= 0) {
    throw new Error(`playerCount must be positive integer, got ${N}`);
  }

  const dealerTeam = input.dealerTeam;
  const attackerTeam = otherTeam(dealerTeam);
  const s = input.sAttacker;

  // Determine base outcome
  let nextDealerTeam: TeamId;
  let upgradeTeam: TeamId;
  let deltaBase: number;

  if (s < 40) {
    nextDealerTeam = dealerTeam;
    upgradeTeam = dealerTeam;
    deltaBase = 2;
  } else if (s < 80) {
    nextDealerTeam = dealerTeam;
    upgradeTeam = dealerTeam;
    deltaBase = 1;
  } else if (s <= 120) {
    // confirmed: 80-120 attacker becomes dealer, keeps their current level (no upgrade)
    nextDealerTeam = attackerTeam;
    upgradeTeam = attackerTeam;
    deltaBase = 0;
  } else {
    nextDealerTeam = attackerTeam;
    upgradeTeam = attackerTeam;
    deltaBase = 2;
  }

  // Special override: duiKou => defender (dealerTeam) stays +4
  if (input.duiKou) {
    nextDealerTeam = dealerTeam;
    upgradeTeam = dealerTeam;
    deltaBase = 4;
  }

  // Banker seat movement rule:
  // - if defender continues (same dealer team): +2
  // - if defender steps down (dealer team changes): +1
  const sameDealer = nextDealerTeam === dealerTeam;
  const nextBankerSeat = modSeat(input.bankerSeat + (sameDealer ? 2 : 1), N);

  // Update team levels
  const updatedTeamLevel: Record<TeamId, Rank> = {
    0: normalizeRank(input.teamLevel[0]),
    1: normalizeRank(input.teamLevel[1]),
  };

  updatedTeamLevel[upgradeTeam] = advanceRankNoSkip(updatedTeamLevel[upgradeTeam], deltaBase);

  // Next trump rank = next dealer team's current level
  const nextTrumpRank = updatedTeamLevel[nextDealerTeam];

  return {
    nextDealerTeam,
    nextBankerSeat,
    nextTrumpRank,
    updatedTeamLevel,
    appliedDelta: deltaBase,
    upgradeTeam,
  };
}

/** Safe mod for seats (handles negative too) */
function modSeat(x: number, n: number): number {
  const r = x % n;
  return r < 0 ? r + n : r;
}

/* ------------------------------------------------------------------
 * OPTIONAL HELPERS for scoring bottom cards (抠底分数加倍)
 * ------------------------------------------------------------------
 * If you already compute sAttacker elsewhere, ignore this section.
 */

/** Card ranks relevant to points (5/10/K). */
export type PointCardRank = "5" | "10" | "K";

/** Minimal card type for point calculation */
export type PointCard = { rank: PointCardRank };

/** Each 5 = 5 pts, 10 = 10 pts, K = 10 pts */
export function cardPointValue(rank: PointCardRank): number {
  if (rank === "5") return 5;
  if (rank === "10") return 10;
  return 10; // K
}

/** Sum bottom points (底牌分) */
export function computeBottomPoints(bottom: PointCard[]): number {
  return bottom.reduce((sum, c) => sum + cardPointValue(c.rank), 0);
}

/**
 * Apply kouDi doubling to bottom points.
 * - If kouDi happened, bottom points counted *2
 * Return points to add to the winner side.
 */
export function applyKouDiMultiplier(bottomPoints: number, kouDi: boolean): number {
  return kouDi ? bottomPoints * 2 : bottomPoints;
}

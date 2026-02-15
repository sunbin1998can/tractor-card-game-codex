import type { Rank } from '../engine/types';
import { resolveNextRound } from '../engine/NextRoundBinSun';

export type TeamId = 0 | 1;

export interface Tractor6RoundInput {
  bankerSeat: number;
  levelRank: Rank;
  attackerPoints: number;
  duiKou?: boolean;
}

export interface Tractor6RoundResult {
  winnerSide: 'DEFENDER' | 'ATTACKER';
  winnerTeam: TeamId;
  rolesSwapped: boolean;
  newBankerSeat: number;
  levelFrom: Rank;
  levelTo: Rank;
  delta: number;
}

/**
 * Dedicated rules surface for 6-player Tractor.
 *
 * Notes:
 * - This class is intentionally not wired into the live engine yet.
 * - 4-player behavior is untouched.
 * - Extend this file with 6-player-only semantics (team mapping, score bands,
 *   banker rotation, declaration/follow special cases) before integration.
 */
export class Tractor6Rules {
  readonly playerCount = 6 as const;

  teamOfSeat(seat: number): TeamId {
    return (seat % 2) as TeamId;
  }

  attackerTeamOfBankerSeat(bankerSeat: number): TeamId {
    const defenderTeam = this.teamOfSeat(bankerSeat);
    return (defenderTeam === 0 ? 1 : 0) as TeamId;
  }

  resolveRound(input: Tractor6RoundInput): Tractor6RoundResult {
    const defenderTeam = this.teamOfSeat(input.bankerSeat);
    const attackerTeam = this.attackerTeamOfBankerSeat(input.bankerSeat);
    const winnerSide: 'DEFENDER' | 'ATTACKER' =
      input.attackerPoints < 80 ? 'DEFENDER' : 'ATTACKER';
    const winnerTeam = winnerSide === 'DEFENDER' ? defenderTeam : attackerTeam;

    const next = resolveNextRound({
      playerCount: this.playerCount,
      dealerTeam: defenderTeam,
      bankerSeat: input.bankerSeat,
      sAttacker: input.attackerPoints,
      duiKou: !!input.duiKou,
      teamLevel: {
        0: input.levelRank,
        1: input.levelRank
      }
    });

    return {
      winnerSide,
      winnerTeam,
      rolesSwapped: next.nextDealerTeam !== defenderTeam,
      newBankerSeat: next.nextBankerSeat,
      levelFrom: input.levelRank,
      levelTo: next.nextTrumpRank,
      delta: next.appliedDelta
    };
  }
}


import type { Card, Pattern, Rank, Suit } from './types';
import { validateFollowPlay } from './Follow';

export interface GameState {
  levelRank: Rank;
  trumpSuit: Suit;
}

export function validatePlay(
  leadPat: Pattern,
  playIds: string[],
  hand: Card[],
  state: GameState
) {
  return validateFollowPlay(leadPat, playIds, hand, state);
}

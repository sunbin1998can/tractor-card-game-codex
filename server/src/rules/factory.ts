import { GameEngine } from '../engine/GameEngine';
import type { Rank, Suit } from '../engine/types';

export interface RulesProfile {
  players: number;
  kittySize: number;
  levelRank: Rank;
  trumpSuit: Suit;
  fairnessWindowMs: number;
  deckCount: number;
}

interface CreateEngineInput {
  players: number;
  bankerSeat: number;
  levelRank: Rank;
  trumpSuit: Suit;
  kittySize: number;
  fairnessWindowMs?: number;
  rngSeed?: number;
}

export function createEngineForRoom(input: CreateEngineInput) {
  const fairnessWindowMs = input.fairnessWindowMs ?? 2000;
  const engine = new GameEngine({
    numPlayers: input.players,
    bankerSeat: input.bankerSeat,
    levelRank: input.levelRank,
    trumpSuit: input.trumpSuit,
    kittySize: input.kittySize,
    fairnessWindowMs,
    rngSeed: input.rngSeed
  });

  const profile: RulesProfile = {
    players: input.players,
    kittySize: input.kittySize,
    levelRank: input.levelRank,
    trumpSuit: input.trumpSuit,
    fairnessWindowMs,
    deckCount: 2
  };

  return { engine, profile };
}

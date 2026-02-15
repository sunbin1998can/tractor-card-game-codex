import { GameEngine } from '../engine/GameEngine';
import type { Rank, Suit } from '../engine/types';
import { Tractor6Engine } from './tractor6-engine';

export type RulesProfile = 'tractor4_legacy' | 'tractor6_legacy' | 'tractor6_new';

export interface EngineFactoryInput {
  players: 4 | 6;
  bankerSeat: number;
  levelRank: Rank;
  trumpSuit: Suit;
  kittySize: number;
}

export interface EngineFactoryOutput {
  engine: GameEngine;
  profile: RulesProfile;
}

/**
 * Safe rollout factory for rules/engine selection.
 *
 * Defaults preserve existing behavior:
 * - 4 players: legacy GameEngine
 * - 6 players: legacy GameEngine
 *
 * To opt into upcoming 6-player rules path, set:
 * - ENABLE_TRACTOR6_RULES=true
 *
 * Under flag, 6-player rooms are routed to Tractor6Engine, which currently
 * behaves the same as GameEngine but provides an isolated extension point.
 */
export function createEngineForRoom(input: EngineFactoryInput): EngineFactoryOutput {
  const useNewTractor6 = process.env.ENABLE_TRACTOR6_RULES === 'true' && input.players === 6;

  if (useNewTractor6) {
    return {
      engine: new Tractor6Engine({
        numPlayers: input.players,
        bankerSeat: input.bankerSeat,
        levelRank: input.levelRank,
        trumpSuit: input.trumpSuit,
        kittySize: input.kittySize
      }),
      profile: 'tractor6_new'
    };
  }

  return {
    engine: new GameEngine({
      numPlayers: input.players,
      bankerSeat: input.bankerSeat,
      levelRank: input.levelRank,
      trumpSuit: input.trumpSuit,
      kittySize: input.kittySize
    }),
    profile: input.players === 6 ? 'tractor6_legacy' : 'tractor4_legacy'
  };
}

import { GameEngine } from '../engine/GameEngine';
import type { GameConfig } from '../engine/GameEngine';

/**
 * 6-player engine entrypoint.
 *
 * This class intentionally starts as a thin wrapper around GameEngine so we can
 * route 6-player rooms through a dedicated type without touching 4-player code.
 * Add 6-player-specific overrides here incrementally behind the feature flag.
 */
export class Tractor6Engine extends GameEngine {
  constructor(config: GameConfig) {
    super(config);
  }
}


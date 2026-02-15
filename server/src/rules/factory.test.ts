import { afterEach, describe, expect, it } from 'vitest';
import { createEngineForRoom } from './factory';
import { GameEngine } from '../engine/GameEngine';
import { Tractor6Engine } from './tractor6-engine';

const prevFlag = process.env.ENABLE_TRACTOR6_RULES;

afterEach(() => {
  if (prevFlag === undefined) {
    delete process.env.ENABLE_TRACTOR6_RULES;
  } else {
    process.env.ENABLE_TRACTOR6_RULES = prevFlag;
  }
});

describe('createEngineForRoom', () => {
  it('keeps 4-player rooms on legacy profile', () => {
    process.env.ENABLE_TRACTOR6_RULES = 'true';
    const out = createEngineForRoom({
      players: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    expect(out.profile).toBe('tractor4_legacy');
    expect(out.engine).toBeInstanceOf(GameEngine);
    expect(out.engine).not.toBeInstanceOf(Tractor6Engine);
  });

  it('keeps 6-player rooms on legacy profile when flag is off', () => {
    delete process.env.ENABLE_TRACTOR6_RULES;
    const out = createEngineForRoom({
      players: 6,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 12
    });
    expect(out.profile).toBe('tractor6_legacy');
    expect(out.engine).toBeInstanceOf(GameEngine);
    expect(out.engine).not.toBeInstanceOf(Tractor6Engine);
  });

  it('routes 6-player rooms to Tractor6Engine when flag is on', () => {
    process.env.ENABLE_TRACTOR6_RULES = 'true';
    const out = createEngineForRoom({
      players: 6,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 12
    });
    expect(out.profile).toBe('tractor6_new');
    expect(out.engine).toBeInstanceOf(Tractor6Engine);
  });
});


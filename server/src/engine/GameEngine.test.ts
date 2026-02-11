import { describe, expect, it } from 'vitest';
import { GameEngine } from './GameEngine';
import type { Card, Rank, Suit } from './types';

function makeCard(suit: Suit | 'J', rank: Rank, deck: 1 | 2): Card {
  const id = rank === 'SJ' || rank === 'BJ' ? `D${deck}_${rank}` : `D${deck}_${suit}_${rank}`;
  return { id, suit, rank, deck };
}

describe('GameEngine trick resolution', () => {
  it('determines trick winner correctly', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [makeCard('S', '9', 1)],
      [makeCard('S', '10', 1)],
      [makeCard('S', '3', 1)],
      [makeCard('S', '4', 1)]
    ];
    engine.setHands(hands, []);
    engine.phase = 'TRICK_PLAY';
    engine.trick = { leaderSeat: 0, turnSeat: 0, plays: [] };

    engine.play(0, [hands[0][0].id]);
    engine.play(1, [hands[1][0].id]);
    engine.play(2, [hands[2][0].id]);
    engine.play(3, [hands[3][0].id]);

    expect(engine.lastTrickWinnerSeat).toBe(1);
  });

  it('captures points for the winning team', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [makeCard('S', '4', 1)],
      [makeCard('S', 'K', 1)],
      [makeCard('S', '5', 1)],
      [makeCard('S', '10', 1)]
    ];
    engine.setHands(hands, []);
    engine.phase = 'TRICK_PLAY';
    engine.trick = { leaderSeat: 0, turnSeat: 0, plays: [] };

    engine.play(0, [hands[0][0].id]);
    engine.play(1, [hands[1][0].id]);
    engine.play(2, [hands[2][0].id]);
    engine.play(3, [hands[3][0].id]);

    expect(engine.capturedPoints[1]).toBe(25);
  });
});

describe('GameEngine round scoring', () => {
  it('applies kitty kill multiplier 2x', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 2
    });

    engine.capturedPoints = [0, 70];
    engine.kitty = [makeCard('S', '10', 1)];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(2);
  });

  it('applies kitty kill multiplier 4x for pair lead', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 2
    });

    engine.capturedPoints = [0, 70];
    engine.kitty = [makeCard('S', '10', 1)];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'PAIR';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(4);
  });

  it('upgrades defenders by +1 when >= 80', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 80];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('4');
  });

  it('upgrades defenders by +2 when >= 120', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 120];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('5');
  });

  it('upgrades defenders by +3 when >= 160', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 160];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('6');
  });

  it('banker upgrades when defenders < 80', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 70];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 0;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('4');
  });

  it('game over when reaching A', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: 'K',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 120];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const gameOver = engine.events.find((e) => e.type === 'GAME_OVER');
    expect(gameOver).toBeTruthy();
  });

  it('no kitty kill when defenders do not win last trick', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 2
    });

    engine.capturedPoints = [70, 0];
    engine.kitty = [makeCard('S', '10', 1)];
    engine.lastTrickWinnerSeat = 0;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(1);
  });
});

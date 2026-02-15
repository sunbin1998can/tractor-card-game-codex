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

describe('GameEngine trump flipping', () => {
  it('accepts BJ pair bid with strength 60', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('J', 'BJ', 1), makeCard('J', 'BJ', 2)], 1000);
    expect(engine.trumpCandidate).toBeTruthy();
    expect(engine.trumpCandidate!.strength).toBe(60);
    // Joker bid preserves the existing trump suit
    expect(engine.trumpCandidate!.trumpSuit).toBe('H');
  });

  it('accepts SJ pair bid with strength 50', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'S',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(1, [makeCard('J', 'SJ', 1), makeCard('J', 'SJ', 2)], 1000);
    expect(engine.trumpCandidate).toBeTruthy();
    expect(engine.trumpCandidate!.strength).toBe(50);
    expect(engine.trumpCandidate!.trumpSuit).toBe('S');
  });

  it('accepts single BJ bid with strength 40', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'D',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(2, [makeCard('J', 'BJ', 1)], 1000);
    expect(engine.trumpCandidate).toBeTruthy();
    expect(engine.trumpCandidate!.strength).toBe(40);
  });

  it('partner cannot reinforce trump bid', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    // Seat 0 bids single level-rank (strength 10)
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    expect(engine.trumpCandidate!.seat).toBe(0);
    // Seat 2 (partner, same team) tries to override with pair (strength 20)
    engine.flipTrump(2, [makeCard('D', '2', 1), makeCard('D', '2', 2)], 1500);
    // Should still be seat 0's bid — partner reinforcement blocked
    expect(engine.trumpCandidate!.seat).toBe(0);
    expect(engine.trumpCandidate!.strength).toBe(10);
  });

  it('opponent can override trump bid', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    // Seat 1 (opponent) overrides with pair (strength 20)
    engine.flipTrump(1, [makeCard('D', '2', 1), makeCard('D', '2', 2)], 1500);
    expect(engine.trumpCandidate!.seat).toBe(1);
    expect(engine.trumpCandidate!.strength).toBe(20);
  });

  it('original bidder can self-reinforce', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    // Same seat upgrades to pair
    engine.flipTrump(0, [makeCard('S', '2', 1), makeCard('S', '2', 2)], 1500);
    expect(engine.trumpCandidate!.seat).toBe(0);
    expect(engine.trumpCandidate!.strength).toBe(20);
  });
});

describe('GameEngine no-bids fallback', () => {
  it('uses first kitty card suit when no bids', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.kitty = [makeCard('S', '5', 1), makeCard('D', '10', 1)];
    engine.finalizeTrumpFallback();
    expect(engine.config.trumpSuit).toBe('S');
    expect(engine.phase).toBe('BURY_KITTY');
  });

  it('skips joker kitty cards for fallback suit', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.kitty = [makeCard('J', 'BJ', 1), makeCard('J', 'SJ', 1), makeCard('C', '3', 1)];
    engine.finalizeTrumpFallback();
    expect(engine.config.trumpSuit).toBe('C');
    expect(engine.phase).toBe('BURY_KITTY');
  });

  it('keeps default trump suit if all kitty cards are jokers', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.kitty = [makeCard('J', 'BJ', 1), makeCard('J', 'SJ', 2)];
    engine.finalizeTrumpFallback();
    expect(engine.config.trumpSuit).toBe('H');
    expect(engine.phase).toBe('BURY_KITTY');
  });

  it('does nothing if a candidate exists', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    engine.kitty = [makeCard('D', '5', 1)];
    engine.finalizeTrumpFallback();
    // Should not have changed — candidate exists, use normal finalizeTrump path
    expect(engine.phase).toBe('FLIP_TRUMP');
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
    engine.lastTrickLeadPairCount = 1;

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(4);
  });

  it('applies kitty kill multiplier 8x for 2-pair tractor lead', () => {
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
    engine.lastTrickLeadKind = 'TRACTOR';
    engine.lastTrickLeadPairCount = 2;

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(8);
  });

  it('applies kitty kill multiplier 16x for 3-pair tractor lead', () => {
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
    engine.lastTrickLeadKind = 'TRACTOR';
    engine.lastTrickLeadPairCount = 3;

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'killMultiplier' in result ? result.killMultiplier : 0).toBe(16);
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

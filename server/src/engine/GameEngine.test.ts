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

  it('keeps earlier play as winner on equal trump single strength', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [makeCard('H', '9', 1)],
      [makeCard('H', '9', 2)],
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

    expect(engine.lastTrickWinnerSeat).toBe(0);
  });

  it('accepts insufficient pair follow and keeps lead pair as winner', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [makeCard('S', 'K', 1), makeCard('S', 'K', 2)],
      [makeCard('S', 'A', 1), makeCard('S', '9', 1)],
      [makeCard('S', 'Q', 1), makeCard('S', 'Q', 2)],
      [makeCard('S', 'J', 1), makeCard('S', 'J', 2)]
    ];
    engine.setHands(hands, []);
    engine.phase = 'TRICK_PLAY';
    engine.trick = { leaderSeat: 0, turnSeat: 0, plays: [] };

    engine.play(0, [hands[0][0].id, hands[0][1].id]);
    engine.play(1, [hands[1][0].id, hands[1][1].id]);
    engine.play(2, [hands[2][0].id, hands[2][1].id]);
    engine.play(3, [hands[3][0].id, hands[3][1].id]);

    expect(engine.hands[1]).toHaveLength(0);
    expect(engine.lastTrickWinnerSeat).toBe(0);
  });

  it('void-in-suit non-pair trump follow to a pair does not win the trick', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [makeCard('S', 'K', 1), makeCard('S', 'K', 2)],
      [makeCard('H', 'A', 1), makeCard('H', 'Q', 1)],
      [makeCard('D', '9', 1), makeCard('D', '10', 1)],
      [makeCard('C', 'J', 1), makeCard('C', 'Q', 1)]
    ];
    engine.setHands(hands, []);
    engine.phase = 'TRICK_PLAY';
    engine.trick = { leaderSeat: 0, turnSeat: 0, plays: [] };

    engine.play(0, [hands[0][0].id, hands[0][1].id]);
    engine.play(1, [hands[1][0].id, hands[1][1].id]);
    engine.play(2, [hands[2][0].id, hands[2][1].id]);
    engine.play(3, [hands[3][0].id, hands[3][1].id]);

    expect(engine.lastTrickWinnerSeat).toBe(0);
  });

  it('ranks connected-pair tractors correctly', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    const hands = [
      [
        makeCard('S', '4', 1), makeCard('S', '4', 2),
        makeCard('S', '5', 1), makeCard('S', '5', 2),
        makeCard('S', '6', 1), makeCard('S', '6', 2)
      ],
      [
        makeCard('S', '5', 1), makeCard('S', '5', 2),
        makeCard('S', '6', 1), makeCard('S', '6', 2),
        makeCard('S', '7', 1), makeCard('S', '7', 2)
      ],
      [
        makeCard('S', '10', 1), makeCard('S', '10', 2),
        makeCard('S', 'J', 1), makeCard('S', 'J', 2),
        makeCard('S', 'Q', 1), makeCard('S', 'Q', 2)
      ],
      [
        makeCard('S', '3', 1), makeCard('S', '3', 2),
        makeCard('S', '8', 1), makeCard('S', '8', 2),
        makeCard('S', '9', 1), makeCard('S', '9', 2)
      ]
    ];
    engine.setHands(hands, []);
    engine.phase = 'TRICK_PLAY';
    engine.trick = { leaderSeat: 0, turnSeat: 0, plays: [] };

    engine.play(0, hands[0].map((c) => c.id));
    engine.play(1, hands[1].map((c) => c.id));
    engine.play(2, hands[2].map((c) => c.id));
    engine.play(3, hands[3].map((c) => c.id));

    expect(engine.lastTrickWinnerSeat).toBe(2);
  });

  it('banker receives kitty cards when entering bury phase', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 2
    });

    const bankerBase = [makeCard('S', '3', 1), makeCard('S', '4', 1)];
    const kitty = [makeCard('D', '5', 1), makeCard('C', '6', 1)];
    engine.setHands([bankerBase, [], [], []], kitty);
    engine.startTrumpPhase();
    engine.flipTrump(0, [makeCard('H', '2', 1)], 0);
    engine.finalizeTrump(5000);

    expect(engine.phase).toBe('BURY_KITTY');
    expect(engine.hands[0]).toHaveLength(4);
    expect(engine.hands[0].map((c) => c.id)).toEqual(
      expect.arrayContaining(kitty.map((c) => c.id))
    );
  });

  it('applies next round settings from pending', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [0, 90];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    expect(engine.phase).toBe('ROUND_SCORE');
    expect(engine.config.bankerSeat).toBe(0);
    expect(engine.pendingNextRound?.bankerSeat).toBe(1);

    const started = engine.startNextRoundFromPending();
    expect(started).toBe(true);
    expect(engine.phase).toBe('FLIP_TRUMP');
    expect(engine.config.bankerSeat).toBe(1);
    expect(engine.pendingNextRound).toBeNull();
    expect(engine.capturedPoints).toEqual([0, 0]);
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
    // Joker bid declares no-trump round
    expect(engine.trumpCandidate!.trumpSuit).toBeNull();
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
    // Joker bid declares no-trump round
    expect(engine.trumpCandidate!.trumpSuit).toBeNull();
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

  it('BJ pair bid finalizes as no-trump round', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('J', 'BJ', 1), makeCard('J', 'BJ', 2)], 1000);
    // Finalize after fairness window
    engine.finalizeTrump(1000 + 2001);
    expect(engine.config.trumpSuit).toBeNull();
    expect(engine.phase).toBe('BURY_KITTY');
  });

  it('original bidder can self-reinforce with same suit', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    // Same seat upgrades to pair of same suit
    engine.flipTrump(0, [makeCard('S', '2', 1), makeCard('S', '2', 2)], 1500);
    expect(engine.trumpCandidate!.seat).toBe(0);
    expect(engine.trumpCandidate!.strength).toBe(20);
  });

  it('original bidder cannot self-reinforce with different suit', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8
    });
    engine.phase = 'FLIP_TRUMP';
    engine.flipTrump(0, [makeCard('S', '2', 1)], 1000);
    // Same seat tries to upgrade to pair of different suit — rejected
    engine.flipTrump(0, [makeCard('D', '2', 1), makeCard('D', '2', 2)], 1500);
    expect(engine.trumpCandidate!.strength).toBe(10); // still original single bid
    expect(engine.trumpCandidate!.trumpSuit).toBe('S'); // still original suit
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

describe('GameEngine redeal conditions', () => {
  it('allows redeal when hand has no trump cards', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8,
    });
    engine.phase = 'FLIP_TRUMP';
    // Hand with no hearts, no 2s, no jokers → no trump
    engine.hands[1] = [
      makeCard('S', '3', 1),
      makeCard('S', '4', 1),
      makeCard('D', '5', 1),
    ];
    expect(engine.canRequestRedeal(1)).toBe(true);
  });

  it('allows redeal when hand has no point cards', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8,
    });
    engine.phase = 'FLIP_TRUMP';
    // Hand with trump but no 5/10/K
    engine.hands[1] = [
      makeCard('H', '3', 1),
      makeCard('H', '4', 1),
      makeCard('S', '6', 1),
    ];
    expect(engine.canRequestRedeal(1)).toBe(true);
  });

  it('rejects redeal when hand has both trump and points', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8,
    });
    engine.phase = 'FLIP_TRUMP';
    engine.hands[1] = [
      makeCard('H', '5', 1),  // trump + point card
      makeCard('S', '3', 1),
    ];
    expect(engine.canRequestRedeal(1)).toBe(false);
  });

  it('rejects redeal outside dealing/flip phase', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 8,
    });
    engine.phase = 'TRICK_PLAY';
    engine.hands[1] = [makeCard('S', '3', 1)]; // no trump
    expect(engine.canRequestRedeal(1)).toBe(false);
  });
});

describe('GameEngine round scoring', () => {
  function getRoundResult(engine: GameEngine) {
    return engine.events.find((e) => e.type === 'ROUND_RESULT') as Extract<
      (typeof engine.events)[number],
      { type: 'ROUND_RESULT' }
    > | undefined;
  }

  function getGameOver(engine: GameEngine) {
    return engine.events.find((e) => e.type === 'GAME_OVER') as Extract<
      (typeof engine.events)[number],
      { type: 'GAME_OVER' }
    > | undefined;
  }

  function makeScoreEngine(opts: {
    bankerSeat?: number;
    teamLevels?: [Rank, Rank];
    defenderPoints: number;
    lastWinner: number;
    lastLeadKind?: 'SINGLE' | 'PAIR' | 'TRACTOR';
    lastLeadPairCount?: number;
    kittyCards?: Card[];
  }) {
    const bankerSeat = opts.bankerSeat ?? 0;
    const teamLevels = opts.teamLevels ?? ['3', '3'] as [Rank, Rank];
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat,
      levelRank: teamLevels[bankerSeat % 2],
      trumpSuit: 'H',
      kittySize: 0,
      teamLevels,
    });
    const bankerTeam = bankerSeat % 2;
    const defenderTeam = bankerTeam === 0 ? 1 : 0;
    engine.capturedPoints = [0, 0];
    engine.capturedPoints[defenderTeam] = opts.defenderPoints;
    engine.kitty = opts.kittyCards ?? [];
    engine.lastTrickWinnerSeat = opts.lastWinner;
    engine.lastTrickLeadKind = opts.lastLeadKind ?? 'SINGLE';
    engine.lastTrickLeadPairCount = opts.lastLeadPairCount ?? 0;
    return engine;
  }

  // --- Kitty multiplier tests ---

  it('applies kitty kill multiplier 2x for single lead', () => {
    const engine = makeScoreEngine({ defenderPoints: 70, lastWinner: 1, kittyCards: [makeCard('S', '10', 1)] });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.killMultiplier).toBe(2);
  });

  it('applies kitty kill multiplier 4x for pair lead', () => {
    const engine = makeScoreEngine({
      defenderPoints: 70, lastWinner: 1, lastLeadKind: 'PAIR', lastLeadPairCount: 1,
      kittyCards: [makeCard('S', '10', 1)],
    });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.killMultiplier).toBe(4);
  });

  it('applies kitty kill multiplier 8x for 2-pair tractor', () => {
    const engine = makeScoreEngine({
      defenderPoints: 70, lastWinner: 1, lastLeadKind: 'TRACTOR', lastLeadPairCount: 2,
      kittyCards: [makeCard('S', '10', 1)],
    });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.killMultiplier).toBe(8);
  });

  it('applies kitty kill multiplier 16x for 3-pair tractor', () => {
    const engine = makeScoreEngine({
      defenderPoints: 70, lastWinner: 1, lastLeadKind: 'TRACTOR', lastLeadPairCount: 3,
      kittyCards: [makeCard('S', '10', 1)],
    });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.killMultiplier).toBe(16);
  });

  it('no kitty kill when defenders do not win last trick', () => {
    const engine = makeScoreEngine({ defenderPoints: 0, lastWinner: 0, kittyCards: [makeCard('S', '10', 1)] });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.killMultiplier).toBe(1);
  });

  // --- 8-tier scoring thresholds ---

  it('shutout (0 points): banker +3', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 0, lastWinner: 0 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(0); // banker team
    expect(r.delta).toBe(3);
    expect(r.levelTo).toBe('6');
    expect(engine.teamLevels[0]).toBe('6');
    expect(engine.teamLevels[1]).toBe('3'); // defender unchanged
  });

  it('defender 5-35 points: banker +2', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 30, lastWinner: 0 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(0);
    expect(r.delta).toBe(2);
    expect(r.levelTo).toBe('5');
  });

  it('defender 40-75 points: banker +1', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 70, lastWinner: 0 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(0);
    expect(r.delta).toBe(1);
    expect(r.levelTo).toBe('4');
  });

  it('defender 80-115 points: swap banker, no level change', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 80, lastWinner: 1 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(-1);
    expect(r.delta).toBe(0);
    expect(r.levelTo).toBe('3');
    expect(engine.teamLevels[0]).toBe('3');
    expect(engine.teamLevels[1]).toBe('3');
    // Banker should swap to last trick winner
    expect(r.nextBankerSeat).toBe(1);
  });

  it('defender 120-155 points: defender +1', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 120, lastWinner: 1 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(1); // defender team
    expect(r.delta).toBe(1);
    expect(r.levelTo).toBe('4');
    expect(engine.teamLevels[1]).toBe('4');
  });

  it('defender 160-195 points: defender +2', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 160, lastWinner: 1 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(1);
    expect(r.delta).toBe(2);
    expect(r.levelTo).toBe('5');
  });

  it('defender >= 200 points: defender +3', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 200, lastWinner: 1 });
    (engine as any).finishRound();
    const r = getRoundResult(engine)!;
    expect(r.advancingTeam).toBe(1);
    expect(r.delta).toBe(3);
    expect(r.levelTo).toBe('6');
  });

  // --- Per-team levels ---

  it('teams have independent levels', () => {
    const engine = makeScoreEngine({ teamLevels: ['5', '8'], defenderPoints: 0, lastWinner: 0 });
    (engine as any).finishRound();
    expect(engine.teamLevels[0]).toBe('8'); // banker team 0 advanced +3
    expect(engine.teamLevels[1]).toBe('8'); // defender team 1 unchanged
  });

  // --- Banker succession ---

  it('banker stays when banker team levels up', () => {
    const engine = makeScoreEngine({ bankerSeat: 0, defenderPoints: 0, lastWinner: 0 });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.nextBankerSeat).toBe(0);
    expect(engine.config.bankerSeat).toBe(0);
  });

  it('last trick winner becomes banker when defender levels up', () => {
    const engine = makeScoreEngine({ bankerSeat: 0, defenderPoints: 120, lastWinner: 3 });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.nextBankerSeat).toBe(3);
    expect(engine.pendingNextRound?.bankerSeat).toBe(3);
  });

  it('last trick winner becomes banker on swap (80-115)', () => {
    const engine = makeScoreEngine({ bankerSeat: 0, defenderPoints: 80, lastWinner: 1 });
    (engine as any).finishRound();
    expect(getRoundResult(engine)?.nextBankerSeat).toBe(1);
    expect(engine.pendingNextRound?.bankerSeat).toBe(1);
  });

  // --- Game over ---

  it('game over when defender team reaches A', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', 'K'], defenderPoints: 120, lastWinner: 1 });
    (engine as any).finishRound();
    const go = getGameOver(engine)!;
    expect(go).toBeTruthy();
    expect(go.winnerTeam).toBe(1); // defender team
  });

  it('game over when banker team reaches A', () => {
    const engine = makeScoreEngine({ teamLevels: ['K', '3'], defenderPoints: 0, lastWinner: 0 });
    (engine as any).finishRound();
    const go = getGameOver(engine)!;
    expect(go).toBeTruthy();
    expect(go.winnerTeam).toBe(0); // banker team
  });

  it('no game over when level does not reach A', () => {
    const engine = makeScoreEngine({ teamLevels: ['3', '3'], defenderPoints: 120, lastWinner: 1 });
    (engine as any).finishRound();
    expect(getGameOver(engine)).toBeUndefined();
  });
});

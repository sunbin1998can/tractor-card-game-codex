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

  it('ranks connected-pair tractors correctly (445566 < 556677 < 1010JJQQ)', () => {
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
});

describe('GameEngine round scoring', () => {
  it('keeps first declaration when later declaration has equal strength', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.startTrumpPhase();
    engine.flipTrump(1, [makeCard('H', '2', 1)], 0);
    engine.flipTrump(2, [makeCard('S', '2', 1)], 100);

    expect(engine.trumpCandidate?.seat).toBe(1);
    expect(engine.trumpCandidate?.trumpSuit).toBe('H');
  });

  it('upgrades declaration by priority: single < pair level < pair SJ < pair BJ', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.startTrumpPhase();
    engine.flipTrump(1, [makeCard('D', '2', 1)], 0);
    expect(engine.trumpCandidate?.seat).toBe(1);
    expect(engine.trumpCandidate?.trumpSuit).toBe('D');

    engine.flipTrump(2, [makeCard('C', '2', 1), makeCard('C', '2', 2)], 200);
    expect(engine.trumpCandidate?.seat).toBe(2);
    expect(engine.trumpCandidate?.trumpSuit).toBe('C');

    engine.flipTrump(3, [makeCard('J', 'SJ', 1), makeCard('J', 'SJ', 2)], 400);
    expect(engine.trumpCandidate?.seat).toBe(3);
    expect(engine.trumpCandidate?.trumpSuit).toBe('N');

    engine.flipTrump(0, [makeCard('J', 'BJ', 1), makeCard('J', 'BJ', 2)], 600);
    expect(engine.trumpCandidate?.seat).toBe(0);
    expect(engine.trumpCandidate?.trumpSuit).toBe('N');
  });

  it('defender wins by +2 when attacker points are below 40', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.capturedPoints = [20, 0];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 0;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'winnerSide' in result ? result.winnerSide : null).toBe('DEFENDER');
    expect(result && 'delta' in result ? result.delta : 0).toBe(2);
    expect(result && 'rolesSwapped' in result ? result.rolesSwapped : true).toBe(false);
  });

  it('attacker wins and swaps roles when attacker points are between 80 and 120 (no level gain)', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '3',
      trumpSuit: 'H',
      kittySize: 0
    });

    // team 1 is attacker when banker seat is 0
    engine.capturedPoints = [0, 90];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const result = engine.events.find((e) => e.type === 'ROUND_RESULT');
    expect(result && 'winnerSide' in result ? result.winnerSide : null).toBe('ATTACKER');
    expect(result && 'delta' in result ? result.delta : 0).toBe(0);
    expect(result && 'rolesSwapped' in result ? result.rolesSwapped : false).toBe(true);
    expect(result && 'newBankerSeat' in result ? result.newBankerSeat : -1).toBe(1);
    expect(engine.config.bankerSeat).toBe(0);
    expect(engine.pendingNextRound?.bankerSeat).toBe(1);
    expect(engine.pendingNextRound?.levelRank).toBe('3');
  });

  it('supports no-trump declaration with a joker pair', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 0
    });

    engine.startTrumpPhase();
    engine.flipTrump(0, [makeCard('J', 'SJ', 1), makeCard('J', 'SJ', 2)], 0);
    engine.finalizeTrump(5000);

    expect(engine.config.trumpSuit).toBe('N');
    expect(engine.phase).toBe('BURY_KITTY');
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

  it('emits KOU_DI reveal event when attackers win last trick', () => {
    const engine = new GameEngine({
      numPlayers: 4,
      bankerSeat: 0,
      levelRank: '2',
      trumpSuit: 'H',
      kittySize: 2
    });

    engine.capturedPoints = [0, 70];
    engine.kitty = [makeCard('S', '5', 1), makeCard('D', '10', 1)];
    engine.lastTrickWinnerSeat = 1;
    engine.lastTrickLeadKind = 'SINGLE';

    (engine as any).finishRound();
    const kouDi = engine.events.find((e) => e.type === 'KOU_DI');
    expect(kouDi).toBeTruthy();
    expect(kouDi && 'total' in kouDi ? kouDi.total : 0).toBe(30);
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

  it('attacker takes deal with no level gain at 80', () => {
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
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('3');
  });

  it('attacker takes deal with no level gain at 120', () => {
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
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('3');
  });

  it('attacker gains +2 at 160, respecting no-skip ranks', () => {
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
    expect(result && 'levelTo' in result ? result.levelTo : '3').toBe('5');
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

    engine.capturedPoints = [20, 0];
    engine.kitty = [];
    engine.lastTrickWinnerSeat = 0;
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

  it('applies next round settings only when starting next round from pending', () => {
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
    expect(engine.config.levelRank).toBe('3');
    expect(engine.pendingNextRound?.bankerSeat).toBe(1);
    expect(engine.pendingNextRound?.levelRank).toBe('3');

    const started = engine.startNextRoundFromPending();
    expect(started).toBe(true);
    expect(engine.phase).toBe('FLIP_TRUMP');
    expect(engine.config.bankerSeat).toBe(1);
    expect(engine.config.levelRank).toBe('3');
    expect(engine.pendingNextRound).toBeNull();
    expect(engine.capturedPoints).toEqual([0, 0]);
  });
});

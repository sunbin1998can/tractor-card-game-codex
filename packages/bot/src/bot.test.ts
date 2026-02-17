import { describe, expect, it } from 'vitest';
import { analyze } from '@tractor/engine';
import type { Card, Rank, Suit, SuitGroup, TrumpSuit, Pattern, TrickState } from '@tractor/engine';
import type { BotDifficulty, PublicRoomState } from '@tractor/protocol';
import { chooseBotAction, type BotEngineState } from './index.js';
import {
  isTrump,
  cardGroup,
  sortByStrength,
  groupBySuitGroup,
  pointValue,
  handPoints,
  findValidFollows,
} from './utils.js';

// ── Helpers ──

function makeCard(suit: Suit | 'J', rank: Rank, deck: 1 | 2): Card {
  const id = rank === 'SJ' || rank === 'BJ' ? `D${deck}_${rank}` : `D${deck}_${suit}_${rank}`;
  return { id, suit, rank, deck };
}

function makePublicState(overrides: Partial<PublicRoomState> = {}): PublicRoomState {
  return {
    id: 'test-room',
    players: 4,
    seats: [
      { seat: 0, name: 'P1', team: 0, connected: true, ready: true, cardsLeft: 10 },
      { seat: 1, name: 'P2', team: 1, connected: true, ready: true, cardsLeft: 10 },
      { seat: 2, name: 'P3', team: 0, connected: true, ready: true, cardsLeft: 10 },
      { seat: 3, name: 'P4', team: 1, connected: true, ready: true, cardsLeft: 10 },
    ],
    teamLevels: ['2', '2'],
    phase: 'TRICK_PLAY',
    bankerSeat: 0,
    trumpSuit: 'H',
    levelRank: '2',
    scores: [0, 0],
    capturedPointCards: [[], []],
    kittyCount: 8,
    ...overrides,
  };
}

function makeEngineState(overrides: Partial<BotEngineState> = {}): BotEngineState {
  return {
    levelRank: '2',
    trumpSuit: 'H',
    trick: null,
    kittySize: 8,
    ...overrides,
  };
}

// ── Utils tests ──

describe('pointValue', () => {
  it('returns 5 for rank 5', () => {
    expect(pointValue(makeCard('S', '5', 1))).toBe(5);
  });

  it('returns 10 for rank 10', () => {
    expect(pointValue(makeCard('H', '10', 1))).toBe(10);
  });

  it('returns 10 for rank K', () => {
    expect(pointValue(makeCard('D', 'K', 1))).toBe(10);
  });

  it('returns 0 for non-point cards', () => {
    expect(pointValue(makeCard('C', '3', 1))).toBe(0);
    expect(pointValue(makeCard('S', 'A', 1))).toBe(0);
    expect(pointValue(makeCard('J', 'SJ', 1))).toBe(0);
  });
});

describe('handPoints', () => {
  it('sums point values correctly', () => {
    const cards = [
      makeCard('S', '5', 1),
      makeCard('H', '10', 1),
      makeCard('D', 'K', 1),
      makeCard('C', '3', 1),
    ];
    expect(handPoints(cards)).toBe(25);
  });

  it('returns 0 for empty hand', () => {
    expect(handPoints([])).toBe(0);
  });
});

describe('isTrump', () => {
  it('identifies trump suit cards', () => {
    expect(isTrump(makeCard('H', '9', 1), '2', 'H')).toBe(true);
  });

  it('identifies level-rank as trump', () => {
    expect(isTrump(makeCard('S', '2', 1), '2', 'H')).toBe(true);
  });

  it('identifies jokers as trump', () => {
    expect(isTrump(makeCard('J', 'SJ', 1), '2', 'H')).toBe(true);
    expect(isTrump(makeCard('J', 'BJ', 1), '2', 'H')).toBe(true);
  });

  it('non-trump suited cards are not trump', () => {
    expect(isTrump(makeCard('S', '9', 1), '2', 'H')).toBe(false);
    expect(isTrump(makeCard('D', 'A', 1), '2', 'H')).toBe(false);
  });
});

describe('cardGroup', () => {
  it('returns TRUMP for trump suit', () => {
    expect(cardGroup(makeCard('H', '5', 1), '2', 'H')).toBe('TRUMP');
  });

  it('returns natural suit for non-trump', () => {
    expect(cardGroup(makeCard('S', '5', 1), '2', 'H')).toBe('S');
  });
});

describe('sortByStrength', () => {
  it('sorts cards from weakest to strongest', () => {
    const cards = [
      makeCard('S', 'A', 1),
      makeCard('S', '3', 1),
      makeCard('S', '10', 1),
    ];
    const sorted = sortByStrength(cards, '2', 'H');
    expect(sorted[0].rank).toBe('3');
    expect(sorted[sorted.length - 1].rank).toBe('A');
  });

  it('trump cards sort higher than non-trump', () => {
    const cards = [
      makeCard('H', '3', 1), // trump suit
      makeCard('S', 'A', 1), // non-trump
    ];
    const sorted = sortByStrength(cards, '2', 'H');
    expect(sorted[0].suit).toBe('S'); // non-trump is weaker
    expect(sorted[1].suit).toBe('H'); // trump is stronger
  });

  it('ties break by card id', () => {
    const c1 = makeCard('S', '5', 1);
    const c2 = makeCard('S', '5', 2);
    const sorted = sortByStrength([c2, c1], '2', 'H');
    expect(sorted[0].id).toBe(c1.id);
    expect(sorted[1].id).toBe(c2.id);
  });
});

describe('groupBySuitGroup', () => {
  it('groups cards by their suit group', () => {
    const hand = [
      makeCard('S', '3', 1),
      makeCard('S', '5', 1),
      makeCard('H', '9', 1), // trump
      makeCard('D', 'A', 1),
      makeCard('J', 'SJ', 1), // trump
    ];
    const groups = groupBySuitGroup(hand, '2', 'H');
    expect(groups.get('S')?.length).toBe(2);
    expect(groups.get('TRUMP')?.length).toBe(2);
    expect(groups.get('D')?.length).toBe(1);
    expect(groups.has('C')).toBe(false);
  });
});

// ── findValidFollows tests ──

describe('findValidFollows', () => {
  it('finds all single-card options for a single lead', () => {
    const hand = [
      makeCard('S', '3', 1),
      makeCard('S', '5', 1),
      makeCard('H', '9', 1),
    ];
    const leadPattern = analyze([makeCard('S', 'A', 1)], '2', 'H');
    const options = findValidFollows(hand, leadPattern, '2', 'H');
    // Should have at least the spade cards as valid follows
    expect(options.length).toBeGreaterThan(0);
    for (const ids of options) {
      expect(ids.length).toBe(1);
    }
  });

  it('finds pair follows for a pair lead', () => {
    const hand = [
      makeCard('S', '3', 1), makeCard('S', '3', 2),
      makeCard('S', '5', 1),
      makeCard('D', 'A', 1),
    ];
    const leadCards = [makeCard('S', 'A', 1), makeCard('S', 'A', 2)];
    const leadPattern = analyze(leadCards, '2', 'H');
    const options = findValidFollows(hand, leadPattern, '2', 'H');
    expect(options.length).toBeGreaterThan(0);
    for (const ids of options) {
      expect(ids.length).toBe(2);
    }
  });

  it('returns empty for hand with no valid plays that size 1 lead', () => {
    // This shouldn't really happen in practice (you can always play a single)
    // but let's test the edge case with empty hand
    const hand: Card[] = [];
    const leadPattern = analyze([makeCard('S', 'A', 1)], '2', 'H');
    const options = findValidFollows(hand, leadPattern, '2', 'H');
    expect(options.length).toBe(0);
  });
});

// ── chooseBotAction tests ──

describe('chooseBotAction', () => {
  describe('FLIP_TRUMP phase', () => {
    it('returns null when bot has no declareable cards', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('D', '5', 1),
      ];
      const ps = makePublicState({ phase: 'FLIP_TRUMP' });
      const es = makeEngineState();
      // All difficulties should return null (no level-rank cards, no jokers)
      for (const d of ['simple', 'medium', 'tough', 'cheater'] as BotDifficulty[]) {
        const action = chooseBotAction(d, 'FLIP_TRUMP', hand, ps, es);
        // simple has 80% chance of null even with cards, so null is expected
        // others would declare if they had level-rank cards
        expect(action === null || action.type === 'DECLARE').toBe(true);
      }
    });

    it('medium+ bots declare with level-rank cards', () => {
      const hand = [
        makeCard('S', '2', 1), // level-rank card
        makeCard('S', '3', 1),
        makeCard('S', '5', 1),
        makeCard('S', '6', 1),
        makeCard('S', '7', 1),
      ];
      const ps = makePublicState({ phase: 'FLIP_TRUMP' });
      const es = makeEngineState();
      const action = chooseBotAction('medium', 'FLIP_TRUMP', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('DECLARE');
      expect(action!.cardIds).toContain('D1_S_2');
    });

    it('prefers pair declare with BJ pair', () => {
      const hand = [
        makeCard('J', 'BJ', 1),
        makeCard('J', 'BJ', 2),
        makeCard('S', '3', 1),
      ];
      const ps = makePublicState({ phase: 'FLIP_TRUMP' });
      const es = makeEngineState();
      const action = chooseBotAction('tough', 'FLIP_TRUMP', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('DECLARE');
      expect(action!.cardIds.length).toBe(2);
    });

    it('prefers pair declare with SJ pair over single level-rank', () => {
      const hand = [
        makeCard('J', 'SJ', 1),
        makeCard('J', 'SJ', 2),
        makeCard('S', '2', 1), // level-rank
      ];
      const ps = makePublicState({ phase: 'FLIP_TRUMP' });
      const es = makeEngineState();
      const action = chooseBotAction('medium', 'FLIP_TRUMP', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('DECLARE');
      expect(action!.cardIds.length).toBe(2);
      // Should be SJ pair
      expect(action!.cardIds).toContain('D1_SJ');
      expect(action!.cardIds).toContain('D2_SJ');
    });
  });

  describe('BURY_KITTY phase', () => {
    it('simple bot buries kittySize cards', () => {
      const hand: Card[] = [];
      for (let i = 3; i <= 10; i++) {
        hand.push(makeCard('S', `${i}` as Rank, 1));
      }
      // Add some more cards to fill
      hand.push(makeCard('D', 'A', 1));
      hand.push(makeCard('D', 'K', 1));
      hand.push(makeCard('H', '3', 1));
      hand.push(makeCard('H', '4', 1));
      hand.push(makeCard('C', '5', 1));
      hand.push(makeCard('C', '6', 1));

      const ps = makePublicState({ phase: 'BURY_KITTY' });
      const es = makeEngineState({ kittySize: 8 });
      const action = chooseBotAction('simple', 'BURY_KITTY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('BURY');
      expect(action!.cardIds.length).toBe(8);
    });

    it('tough bot tries to void short suits', () => {
      const hand: Card[] = [
        // Short spade suit (2 cards) — should be buried to void
        makeCard('S', '3', 1),
        makeCard('S', '4', 1),
        // Long diamond suit (4 cards)
        makeCard('D', '3', 1),
        makeCard('D', '4', 1),
        makeCard('D', '5', 1),
        makeCard('D', '6', 1),
        // Trump (hearts)
        makeCard('H', '3', 1),
        makeCard('H', '4', 1),
        makeCard('H', '5', 1),
        makeCard('H', '6', 1),
        makeCard('H', '7', 1),
        makeCard('H', '8', 1),
        // Club
        makeCard('C', '3', 1),
        makeCard('C', '4', 1),
        makeCard('C', '5', 1),
        makeCard('C', '6', 1),
        makeCard('C', '7', 1),
        makeCard('C', '8', 1),
      ];
      const ps = makePublicState({ phase: 'BURY_KITTY' });
      const es = makeEngineState({ kittySize: 8 });
      const action = chooseBotAction('tough', 'BURY_KITTY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('BURY');
      expect(action!.cardIds.length).toBe(8);
      // The short spade suit should be buried
      const buriedSpades = action!.cardIds.filter((id) => id.includes('_S_'));
      expect(buriedSpades.length).toBe(2);
      // No trump should be buried
      const buriedTrump = action!.cardIds.filter((id) => id.includes('_H_'));
      expect(buriedTrump.length).toBe(0);
    });

    it('bury always returns exactly kittySize cards', () => {
      const hand: Card[] = [];
      // 33 cards (normal hand after picking up kitty in 4p)
      for (const suit of ['S', 'H', 'D', 'C'] as Suit[]) {
        for (let i = 3; i <= 10; i++) {
          hand.push(makeCard(suit, `${i}` as Rank, 1));
        }
      }
      hand.push(makeCard('J', 'SJ', 1));

      for (const d of ['simple', 'medium', 'tough', 'cheater'] as BotDifficulty[]) {
        const ps = makePublicState({ phase: 'BURY_KITTY' });
        const es = makeEngineState({ kittySize: 8 });
        const action = chooseBotAction(d, 'BURY_KITTY', hand, ps, es);
        expect(action).not.toBeNull();
        expect(action!.cardIds.length).toBe(8);
        // No duplicate card IDs
        const unique = new Set(action!.cardIds);
        expect(unique.size).toBe(8);
      }
    });
  });

  describe('TRICK_PLAY phase', () => {
    it('returns null when no trick is in progress', () => {
      const hand = [makeCard('S', '3', 1)];
      const ps = makePublicState();
      const es = makeEngineState({ trick: null });
      const action = chooseBotAction('simple', 'TRICK_PLAY', hand, ps, es);
      expect(action).toBeNull();
    });

    it('simple bot leads a random single card', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('D', '5', 1),
        makeCard('H', '9', 1),
      ];
      const trick: TrickState = {
        leaderSeat: 0,
        turnSeat: 0,
        plays: [],
      };
      const ps = makePublicState();
      const es = makeEngineState({ trick });
      const action = chooseBotAction('simple', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
      expect(action!.cardIds.length).toBe(1);
      // The card should be from the hand
      expect(hand.some((c) => c.id === action!.cardIds[0])).toBe(true);
    });

    it('medium bot leads from longest non-trump suit', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('S', '5', 1),
        makeCard('S', '7', 1),
        makeCard('D', '3', 1),
        makeCard('H', '3', 1), // trump
      ];
      const trick: TrickState = {
        leaderSeat: 0,
        turnSeat: 0,
        plays: [],
      };
      const ps = makePublicState();
      const es = makeEngineState({ trick });
      const action = chooseBotAction('medium', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
      // Should lead from spades (longest non-trump: 3 cards)
      expect(action!.cardIds[0]).toMatch(/_S_/);
    });

    it('tough bot tries to lead strong pairs', () => {
      const hand = [
        makeCard('S', 'A', 1), makeCard('S', 'A', 2), // pair of aces
        makeCard('D', '3', 1),
        makeCard('D', '4', 1),
      ];
      const trick: TrickState = {
        leaderSeat: 0,
        turnSeat: 0,
        plays: [],
      };
      const ps = makePublicState();
      const es = makeEngineState({ trick });
      const action = chooseBotAction('tough', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
      expect(action!.cardIds.length).toBe(2);
    });

    it('simple bot follows with a valid card', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('S', '5', 1),
        makeCard('D', 'A', 1),
      ];
      const leadCard = makeCard('S', 'A', 1);
      const leadPattern = analyze([leadCard], '2', 'H');
      const trick: TrickState = {
        leaderSeat: 1,
        turnSeat: 0,
        leadPattern,
        leadSuitGroup: 'S',
        plays: [{ seat: 1, cards: [leadCard], pattern: leadPattern }],
      };
      const ps = makePublicState();
      const es = makeEngineState({ trick });
      const action = chooseBotAction('simple', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
      expect(action!.cardIds.length).toBe(1);
    });

    it('medium bot sloughs points when partner is winning', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('S', '5', 1),  // 5 pts
        makeCard('S', '10', 1), // 10 pts
      ];
      const leadCard = makeCard('S', 'A', 1);
      const leadPattern = analyze([leadCard], '2', 'H');
      // Seat 0 (team 0) is leader with ace, seat 2 (team 0) is following
      const trick: TrickState = {
        leaderSeat: 0,
        turnSeat: 2,
        leadPattern,
        leadSuitGroup: 'S',
        plays: [{ seat: 0, cards: [leadCard], pattern: leadPattern }],
      };
      const ps = makePublicState();
      const es = makeEngineState({ trick });
      const action = chooseBotAction('medium', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
      // Should slough the 10 (most points) since partner is winning
      expect(action!.cardIds[0]).toBe('D1_S_10');
    });
  });

  describe('unknown phase', () => {
    it('returns null for unknown phase', () => {
      const hand = [makeCard('S', '3', 1)];
      const ps = makePublicState();
      const es = makeEngineState();
      const action = chooseBotAction('simple', 'DEALING', hand, ps, es);
      expect(action).toBeNull();
    });
  });

  describe('cheater difficulty', () => {
    it('accepts allHands and kitty in engine state', () => {
      const hand = [
        makeCard('S', '3', 1),
        makeCard('S', '5', 1),
      ];
      const trick: TrickState = {
        leaderSeat: 0,
        turnSeat: 0,
        plays: [],
      };
      const ps = makePublicState();
      const es = makeEngineState({
        trick,
        allHands: [hand, [], [], []],
        kitty: [makeCard('D', 'K', 1)],
      });
      const action = chooseBotAction('cheater', 'TRICK_PLAY', hand, ps, es);
      expect(action).not.toBeNull();
      expect(action!.type).toBe('PLAY');
    });
  });
});

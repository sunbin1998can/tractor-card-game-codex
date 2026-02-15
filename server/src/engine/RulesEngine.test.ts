import { describe, expect, it } from 'vitest';
import {
  analyze,
  analyzeThrow,
  bestDecomposition,
  cardKey,
  pairKey,
  seqRankForTractor,
  suitGroup,
} from './RulesEngine';
import type { Card, Rank, Suit } from './types';

function makeCard(suit: Suit | 'J', rank: Rank, deck: 1 | 2): Card {
  const id = rank === 'SJ' || rank === 'BJ' ? `D${deck}_${rank}` : `D${deck}_${suit}_${rank}`;
  return { id, suit, rank, deck };
}

describe('RulesEngine basics', () => {
  it('treats level-rank as TRUMP suitGroup', () => {
    const card = makeCard('D', '7', 1);
    expect(suitGroup(card, '7', 'H')).toBe('TRUMP');
  });

  it('treats trump suit as TRUMP suitGroup', () => {
    const card = makeCard('H', '9', 1);
    expect(suitGroup(card, '7', 'H')).toBe('TRUMP');
  });

  it('no-trump: only jokers and level-rank are TRUMP', () => {
    // In no-trump mode (trumpSuit=null), regular suited cards keep their natural suit
    const heartCard = makeCard('H', '9', 1);
    expect(suitGroup(heartCard, '7', null)).toBe('H');
    // Level-rank cards are still TRUMP
    const levelCard = makeCard('D', '7', 1);
    expect(suitGroup(levelCard, '7', null)).toBe('TRUMP');
    // Jokers are still TRUMP
    const bj = makeCard('J', 'BJ', 1);
    expect(suitGroup(bj, '7', null)).toBe('TRUMP');
  });

  it('seqRankForTractor excludes level and jokers', () => {
    expect(seqRankForTractor('SJ', '7')).toBeNull();
    expect(seqRankForTractor('BJ', '7')).toBeNull();
    expect(seqRankForTractor('7', '7')).toBeNull();
    // Ranks above level are compressed down by 1 to bridge the gap
    expect(seqRankForTractor('10', '7')).toBe(9);
  });

  it('seqRankForTractor bridges gap across level rank', () => {
    // When level=7, rank 6 stays at 6, rank 8 compresses to 7 → consecutive
    expect(seqRankForTractor('6', '7')).toBe(6);
    expect(seqRankForTractor('8', '7')).toBe(7);
    // Ranks below level are unchanged
    expect(seqRankForTractor('3', '7')).toBe(3);
    // Ranks well above level
    expect(seqRankForTractor('A', '7')).toBe(13);
  });
});

describe('analyze pattern recognition', () => {
  it('recognizes a pair across two decks', () => {
    const cards = [makeCard('S', '5', 1), makeCard('S', '5', 2)];
    const pattern = analyze(cards, '2', 'H');
    expect(pattern.kind).toBe('PAIR');
  });

  it('does not pair different suits even if both are level-rank', () => {
    const cards = [makeCard('S', '5', 1), makeCard('D', '5', 2)];
    const pattern = analyze(cards, '5', 'H');
    expect(pattern.kind).toBe('INVALID');
  });

  it('recognizes a tractor with level excluded', () => {
    const cards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '7', 1),
      makeCard('S', '7', 2),
    ];
    const pattern = analyze(cards, '9', 'H');
    expect(pattern.kind).toBe('TRACTOR');
    expect(pattern.length).toBe(3);
  });

  it('rejects tractor containing level rank', () => {
    const cards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
    ];
    const pattern = analyze(cards, '6', 'H');
    expect(pattern.kind).toBe('INVALID');
  });

  it('recognizes tractor bridging the level rank gap', () => {
    // When level=7, 6 and 8 are adjacent (gap bridged)
    const cards = [
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '8', 1),
      makeCard('S', '8', 2),
    ];
    const pattern = analyze(cards, '7', 'H');
    expect(pattern.kind).toBe('TRACTOR');
    expect(pattern.length).toBe(2);
  });

  it('rejects non-consecutive tractor', () => {
    const cards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '7', 1),
      makeCard('S', '7', 2),
    ];
    const pattern = analyze(cards, '9', 'H');
    expect(pattern.kind).toBe('INVALID');
  });

  it('rejects mixed suitGroup', () => {
    const cards = [makeCard('S', '5', 1), makeCard('H', '6', 1)];
    const pattern = analyze(cards, '9', 'D');
    expect(pattern.kind).toBe('INVALID');
  });
});

describe('decomposition determinism', () => {
  it('prefers longer/higher tractors first', () => {
    const cards = [
      makeCard('S', '3', 1),
      makeCard('S', '3', 2),
      makeCard('S', '4', 1),
      makeCard('S', '4', 2),
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '9', 1),
      makeCard('S', '9', 2),
      makeCard('S', '10', 1),
      makeCard('S', '10', 2),
      makeCard('S', 'J', 1),
      makeCard('S', 'J', 2),
    ];

    const parts = bestDecomposition(cards, '2', 'H');
    expect(parts[0].kind).toBe('TRACTOR');
    expect(parts[1].kind).toBe('TRACTOR');
    expect(parts[0].topKey).toBeGreaterThan(parts[1].topKey ?? 0);
  });

  it('builds pairs before singles when no tractor', () => {
    const cards = [
      makeCard('S', '7', 1),
      makeCard('S', '7', 2),
      makeCard('S', '9', 1),
      makeCard('S', '5', 1),
    ];
    const parts = bestDecomposition(cards, '2', 'H');
    expect(parts.map((p) => p.kind)).toEqual(['PAIR', 'SINGLE', 'SINGLE']);
    expect(parts[1].topKey).toBeGreaterThan(parts[2].topKey ?? 0);
  });

  it('pairKey and cardKey stay deterministic', () => {
    const card = makeCard('S', '9', 1);
    expect(pairKey(card, '2', 'H')).toBe('S|9|S');
    expect(cardKey(card, '2', 'H')).toBe(9);
  });
});

describe('throw analysis', () => {
  it('orders parts as tractors, pairs, singles', () => {
    const cards = [
      makeCard('S', '5', 1),
      makeCard('S', '5', 2),
      makeCard('S', '6', 1),
      makeCard('S', '6', 2),
      makeCard('S', '9', 1),
      makeCard('S', '9', 2),
      makeCard('S', 'K', 1),
    ];

    const pattern = analyzeThrow(cards, '2', 'H');
    expect(pattern.kind).toBe('THROW');
    expect(pattern.parts?.map((p) => p.kind)).toEqual(['TRACTOR', 'PAIR', 'SINGLE']);
  });

  it('rejects mixed suitGroup throws', () => {
    const cards = [makeCard('S', '5', 1), makeCard('H', '5', 2)];
    const pattern = analyzeThrow(cards, '2', 'D');
    expect(pattern.kind).toBe('INVALID');
  });
});

import type { Card, Pattern, PatternKind, Rank, Suit, SuitGroup, TrumpSuit } from './types.js';

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
  SJ: 15,
  BJ: 16,
};

export function suitGroup(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): SuitGroup {
  if (card.rank === 'BJ' || card.rank === 'SJ') return 'TRUMP';
  if (card.rank === levelRank) return 'TRUMP';
  if (trumpSuit !== null && card.suit === trumpSuit) return 'TRUMP';
  return card.suit as Suit;
}

export function cardKey(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): number {
  const group = suitGroup(card, levelRank, trumpSuit);
  const rv = RANK_VALUE[card.rank];
  if (group !== 'TRUMP') return rv;

  if (card.rank === 'BJ') return 1000;
  if (card.rank === 'SJ') return 900;

  const isLevel = card.rank === levelRank;
  const isTrumpSuit = card.suit === trumpSuit;

  if (isLevel) return 800 + (isTrumpSuit ? 50 : 0) + rv;
  if (isTrumpSuit) return 700 + rv;
  return 600 + rv;
}

/**
 * Returns the sequence rank for tractor detection. Cards with the same seqRank
 * can form pairs; consecutive seqRanks can form tractors.
 *
 * For non-trump cards: jokers and level-rank are excluded (null).
 * Ranks above levelRank are compressed down by 1 to bridge the gap.
 *
 * For trump cards: the full trump hierarchy is mapped to consecutive seqRanks:
 *   regular trump → off-suit level-rank → trump-suit level-rank → SJ → BJ
 */
export function seqRankForTractor(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): number | null {
  const group = suitGroup(card, levelRank, trumpSuit);
  const lv = RANK_VALUE[levelRank];
  // Max adjusted regular rank: A(14) adjusted = (14 > lv) ? 13 : 14
  // When levelRank=A: max regular is K(13), no adjustment → 13
  // Otherwise: A adjusted = 14-1 = 13
  // So max regular is always 13.
  const maxRegular = 13;

  if (group === 'TRUMP') {
    if (card.rank === 'BJ') return maxRegular + 4;  // 17
    if (card.rank === 'SJ') return maxRegular + 3;  // 16
    if (card.rank === levelRank) {
      return trumpSuit !== null && card.suit === trumpSuit
        ? maxRegular + 2  // 15: trump-suit level-rank
        : maxRegular + 1; // 14: off-suit level-rank
    }
    // Regular trump suit card
    const rv = RANK_VALUE[card.rank];
    return rv > lv ? rv - 1 : rv;
  }

  // Non-trump cards
  const rv = RANK_VALUE[card.rank];
  return rv > lv ? rv - 1 : rv;
}

export function pairKey(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): string {
  const group = suitGroup(card, levelRank, trumpSuit);
  const suit = card.rank === 'BJ' || card.rank === 'SJ' ? 'J' : card.suit;
  return `${group}|${card.rank}|${suit}`;
}

function sortCardsAsc(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return [...cards].sort((a, b) => {
    const ka = cardKey(a, levelRank, trumpSuit);
    const kb = cardKey(b, levelRank, trumpSuit);
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
}

function sortCardsDesc(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return [...cards].sort((a, b) => {
    const ka = cardKey(a, levelRank, trumpSuit);
    const kb = cardKey(b, levelRank, trumpSuit);
    if (ka !== kb) return kb - ka;
    return a.id.localeCompare(b.id);
  });
}

function invalidPattern(reason: string): Pattern {
  return { kind: 'INVALID', suitGroup: null, size: 0, cards: [], reason };
}

export function analyze(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Pattern {
  if (cards.length === 0) return invalidPattern('EMPTY');

  const group = suitGroup(cards[0], levelRank, trumpSuit);
  if (cards.some((c) => suitGroup(c, levelRank, trumpSuit) !== group)) {
    return invalidPattern('MIXED_SUITGROUP');
  }

  if (cards.length === 1) {
    const [card] = cards;
    return {
      kind: 'SINGLE',
      suitGroup: group,
      size: 1,
      cards: [card],
      topKey: cardKey(card, levelRank, trumpSuit),
    };
  }

  if (cards.length === 2) {
    const key0 = pairKey(cards[0], levelRank, trumpSuit);
    const key1 = pairKey(cards[1], levelRank, trumpSuit);
    if (key0 !== key1) return invalidPattern('NOT_PAIR');

    const ordered = sortCardsAsc(cards, levelRank, trumpSuit);
    return {
      kind: 'PAIR',
      suitGroup: group,
      size: 2,
      cards: ordered,
      topKey: cardKey(ordered[1], levelRank, trumpSuit),
    };
  }

  if (cards.length % 2 !== 0) return invalidPattern('ODD_COUNT');

  const byPairKey = new Map<string, Card[]>();
  for (const card of cards) {
    const key = pairKey(card, levelRank, trumpSuit);
    const list = byPairKey.get(key) ?? [];
    list.push(card);
    byPairKey.set(key, list);
  }

  const pairRanks: number[] = [];
  for (const list of byPairKey.values()) {
    if (list.length !== 2) return invalidPattern('NOT_ALL_PAIRS');
    const sr = seqRankForTractor(list[0], levelRank, trumpSuit);
    if (sr === null) return invalidPattern('TRACTOR_HAS_LEVEL_OR_JOKER');
    pairRanks.push(sr);
  }

  pairRanks.sort((a, b) => a - b);
  for (let i = 1; i < pairRanks.length; i += 1) {
    if (pairRanks[i] !== pairRanks[i - 1] + 1) return invalidPattern('NOT_CONSECUTIVE');
  }

  const ordered = sortCardsAsc(cards, levelRank, trumpSuit);
  const top = ordered[ordered.length - 1];
  return {
    kind: 'TRACTOR',
    suitGroup: group,
    size: cards.length,
    length: pairRanks.length,
    cards: ordered,
    topKey: cardKey(top, levelRank, trumpSuit),
  };
}

export function bestDecomposition(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Pattern[] {
  if (cards.length === 0) return [];

  const group = suitGroup(cards[0], levelRank, trumpSuit);
  if (cards.some((c) => suitGroup(c, levelRank, trumpSuit) !== group)) {
    throw new Error('bestDecomposition requires a single SuitGroup');
  }

  const byPairKey = new Map<string, Card[]>();
  for (const card of cards) {
    const key = pairKey(card, levelRank, trumpSuit);
    const list = byPairKey.get(key) ?? [];
    list.push(card);
    byPairKey.set(key, list);
  }

  for (const [key, list] of byPairKey.entries()) {
    byPairKey.set(key, sortCardsAsc(list, levelRank, trumpSuit));
  }

  const seqRankToPairKey = new Map<number, string>();
  for (const [key, list] of byPairKey.entries()) {
    if (list.length === 0) continue;
    const sr = seqRankForTractor(list[0], levelRank, trumpSuit);
    if (sr === null) continue;
    if (seqRankToPairKey.has(sr)) {
      // Multiple pairKeys at the same seqRank (e.g., off-suit level-rank from
      // different suits). Only one pair per seqRank slot can participate in a
      // tractor; keep the first one encountered.
      continue;
    } else {
      seqRankToPairKey.set(sr, key);
    }
  }

  const tractors: Pattern[] = [];

  while (true) {
    const availableRanks = [...seqRankToPairKey.keys()]
      .filter((sr) => {
        const key = seqRankToPairKey.get(sr);
        const list = key ? byPairKey.get(key) : undefined;
        return list ? Math.floor(list.length / 2) >= 1 : false;
      })
      .sort((a, b) => a - b);

    if (availableRanks.length < 2) break;

    let bestStart = -1;
    let bestEnd = -1;
    let bestLen = 0;

    let runStart = availableRanks[0];
    let prev = availableRanks[0];

    for (let i = 1; i <= availableRanks.length; i += 1) {
      const curr = availableRanks[i];
      if (curr !== undefined && curr === prev + 1) {
        prev = curr;
        continue;
      }

      const runEnd = prev;
      const runLen = runEnd - runStart + 1;
      if (runLen >= 2) {
        if (runLen > bestLen || (runLen === bestLen && runEnd > bestEnd)) {
          bestLen = runLen;
          bestStart = runStart;
          bestEnd = runEnd;
        }
      }

      if (curr === undefined) break;
      runStart = curr;
      prev = curr;
    }

    if (bestLen < 2) break;

    const tractorCards: Card[] = [];
    for (let sr = bestStart; sr <= bestEnd; sr += 1) {
      const key = seqRankToPairKey.get(sr);
      if (!key) continue;
      const list = byPairKey.get(key);
      if (!list || list.length < 2) continue;
      const pair = list.splice(0, 2);
      tractorCards.push(...pair);
    }

    const ordered = sortCardsAsc(tractorCards, levelRank, trumpSuit);
    const top = ordered[ordered.length - 1];
    tractors.push({
      kind: 'TRACTOR',
      suitGroup: group,
      size: ordered.length,
      length: bestLen,
      cards: ordered,
      topKey: cardKey(top, levelRank, trumpSuit),
    });
  }

  const pairs: Pattern[] = [];
  const pairKeys = [...byPairKey.keys()].sort();
  for (const key of pairKeys) {
    const list = byPairKey.get(key);
    if (!list) continue;
    while (list.length >= 2) {
      const pair = list.splice(0, 2);
      const ordered = sortCardsAsc(pair, levelRank, trumpSuit);
      pairs.push({
        kind: 'PAIR',
        suitGroup: group,
        size: 2,
        cards: ordered,
        topKey: cardKey(ordered[1], levelRank, trumpSuit),
      });
    }
  }

  pairs.sort((a, b) => {
    const ka = a.topKey ?? 0;
    const kb = b.topKey ?? 0;
    if (ka !== kb) return kb - ka;
    const aKey = a.cards.map((c) => c.id).join(',');
    const bKey = b.cards.map((c) => c.id).join(',');
    return aKey.localeCompare(bKey);
  });

  const singles: Pattern[] = [];
  const remaining: Card[] = [];
  for (const list of byPairKey.values()) remaining.push(...list);

  for (const card of sortCardsDesc(remaining, levelRank, trumpSuit)) {
    singles.push({
      kind: 'SINGLE',
      suitGroup: group,
      size: 1,
      cards: [card],
      topKey: cardKey(card, levelRank, trumpSuit),
    });
  }

  return [...tractors, ...pairs, ...singles];
}

export function analyzeThrow(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Pattern {
  if (cards.length === 0) return invalidPattern('EMPTY');
  const group = suitGroup(cards[0], levelRank, trumpSuit);
  if (cards.some((c) => suitGroup(c, levelRank, trumpSuit) !== group)) {
    return invalidPattern('MIXED_SUITGROUP');
  }

  const parts = bestDecomposition(cards, levelRank, trumpSuit);
  const ordered = sortCardsAsc(cards, levelRank, trumpSuit);
  return {
    kind: 'THROW',
    suitGroup: group,
    size: cards.length,
    cards: ordered,
    parts,
  };
}

export type { Card, Pattern, PatternKind, Rank, Suit, SuitGroup } from './types.js';

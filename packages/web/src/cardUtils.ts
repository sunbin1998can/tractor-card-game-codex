export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'SJ' | 'BJ';
export type Suit = 'S' | 'H' | 'D' | 'C' | 'N';
export type SuitGroup = Suit | 'TRUMP';

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, SJ: 15, BJ: 16
};

export const SUIT_ORDER: Record<Suit | 'J', number> = { S: 0, H: 1, D: 2, C: 3, N: 4, J: 5 };

export function parseCardId(id: string): { rank: Rank; suit: Suit | 'J' } | null {
  const parts = id.split('_');
  if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ')) {
    return { rank: parts[1], suit: 'J' };
  }
  if (parts.length === 3) {
    const suit = parts[1];
    const rank = parts[2];
    if ((suit === 'S' || suit === 'H' || suit === 'D' || suit === 'C') && rank in RANK_VALUE) {
      return { rank: rank as Rank, suit };
    }
  }
  return null;
}

export function isJoker(id: string): 'SJ' | 'BJ' | null {
  const parts = id.split('_');
  const value = parts[parts.length - 1];
  if (value === 'SJ') return 'SJ';
  if (value === 'BJ') return 'BJ';
  return null;
}

export function cardIdToLibFormat(id: string): string | null {
  const parts = id.split('_');
  const value = parts[parts.length - 1];
  const suit = parts.length >= 3 ? parts[parts.length - 2] : '';

  if (value === 'SJ' || value === 'BJ') return null;

  const suitLower = suit === 'H' ? 'h' : suit === 'S' ? 's' : suit === 'D' ? 'd' : suit === 'C' ? 'c' : '';
  if (!suitLower) return null;

  const rank = value === '10' ? 'T' : value;
  return `${rank}${suitLower}`;
}

export function suitGroupForCard(id: string, levelRank: Rank, trumpSuit: Suit): SuitGroup | null {
  const parsed = parseCardId(id);
  if (!parsed) return null;
  if (parsed.rank === 'BJ' || parsed.rank === 'SJ') return 'TRUMP';
  if (parsed.rank === levelRank) return 'TRUMP';
  if (parsed.suit === trumpSuit) return 'TRUMP';
  return parsed.suit;
}

export function pairKeyForCard(id: string, levelRank: Rank, trumpSuit: Suit): string | null {
  const parsed = parseCardId(id);
  const group = suitGroupForCard(id, levelRank, trumpSuit);
  if (!parsed || !group) return null;
  const suitForPair = parsed.rank === 'BJ' || parsed.rank === 'SJ' ? 'J' : parsed.suit;
  return `${group}|${parsed.rank}|${suitForPair}`;
}

export function cardGroupSortKey(id: string, levelRank: Rank, trumpSuit: Suit): [number, number, number, string] {
  const parsed = parseCardId(id);
  if (!parsed) return [99, 99, 99, id];

  const rv = RANK_VALUE[parsed.rank];
  const suitOrder = SUIT_ORDER[parsed.suit];
  const isLevel = parsed.rank === levelRank;
  const isTrumpSuit = parsed.suit === trumpSuit;

  const band =
    parsed.rank === 'BJ' ? 0 :
    parsed.rank === 'SJ' ? 1 :
    (isLevel && isTrumpSuit) ? 2 :
    isLevel ? 3 :
    isTrumpSuit ? 4 : 5;

  return [band, suitOrder, -rv, id];
}

export function cardStrength(id: string, levelRank: string, trumpSuit: string): number {
  const c = parseCardId(id);
  if (!c) return -1;
  const rv = RANK_VALUE[c.rank] ?? 0;
  if (c.rank === 'BJ') return 1000;
  if (c.rank === 'SJ') return 900;
  const isLevel = c.rank === levelRank;
  const isTrumpSuit = c.suit === trumpSuit;
  if (isLevel && isTrumpSuit) return 850 + rv;
  if (isLevel) return 800 + rv;
  if (isTrumpSuit) return 700 + rv;
  return rv;
}

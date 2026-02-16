import { suitGroup, cardKey, analyze, validateFollowPlay } from '@tractor/engine';
import type { Card, Rank, TrumpSuit, SuitGroup, Pattern } from '@tractor/engine';

export function isTrump(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): boolean {
  return suitGroup(card, levelRank, trumpSuit) === 'TRUMP';
}

export function cardGroup(card: Card, levelRank: Rank, trumpSuit: TrumpSuit): SuitGroup {
  return suitGroup(card, levelRank, trumpSuit);
}

export function sortByStrength(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return [...cards].sort((a, b) => {
    const ka = cardKey(a, levelRank, trumpSuit);
    const kb = cardKey(b, levelRank, trumpSuit);
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
}

export function groupBySuitGroup(
  hand: Card[],
  levelRank: Rank,
  trumpSuit: TrumpSuit
): Map<SuitGroup, Card[]> {
  const map = new Map<SuitGroup, Card[]>();
  for (const card of hand) {
    const sg = suitGroup(card, levelRank, trumpSuit);
    const list = map.get(sg) ?? [];
    list.push(card);
    map.set(sg, list);
  }
  return map;
}

export function pointValue(card: Card): number {
  if (card.rank === '5') return 5;
  if (card.rank === '10' || card.rank === 'K') return 10;
  return 0;
}

export function handPoints(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + pointValue(c), 0);
}

/**
 * Find all valid follow options for a given lead pattern.
 * Returns arrays of card IDs that are valid plays.
 * For simplicity, returns a limited set of options rather than exhaustive enumeration.
 */
export function findValidFollows(
  hand: Card[],
  leadPattern: Pattern,
  levelRank: Rank,
  trumpSuit: TrumpSuit
): string[][] {
  const state = { levelRank, trumpSuit };
  const size = leadPattern.size;

  // Generate candidate plays
  const candidates: string[][] = [];

  if (size === 1) {
    // Single: every card in hand is a candidate
    for (const card of hand) {
      const ids = [card.id];
      const r = validateFollowPlay(leadPattern, ids, hand, state);
      if (r.ok) candidates.push(ids);
    }
    return candidates;
  }

  // For pairs and tractors, try combinations
  // Group by suitGroup for efficiency
  const groups = groupBySuitGroup(hand, levelRank, trumpSuit);

  if (size === 2) {
    // Try all 2-card combos within same suit group first, then cross
    for (const [, cards] of groups) {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const ids = [cards[i].id, cards[j].id];
          const r = validateFollowPlay(leadPattern, ids, hand, state);
          if (r.ok) candidates.push(ids);
        }
      }
    }
    // Also try cross-group if needed (shouldn't usually happen but defensive)
    if (candidates.length === 0) {
      for (let i = 0; i < hand.length; i++) {
        for (let j = i + 1; j < hand.length; j++) {
          const ids = [hand[i].id, hand[j].id];
          const r = validateFollowPlay(leadPattern, ids, hand, state);
          if (r.ok) {
            candidates.push(ids);
            if (candidates.length >= 50) return candidates;
          }
        }
      }
    }
    return candidates;
  }

  // For larger patterns (tractors, throws): use a brute-force approach with limit
  // Start with the expected IDs from a failed validation to find the template
  const testIds = hand.slice(0, size).map((c) => c.id);
  const testResult = validateFollowPlay(leadPattern, testIds, hand, state);
  if (testResult.ok) candidates.push(testIds);

  // Try to enumerate by picking cards from the lead's suit group first
  const leadGroup = leadPattern.suitGroup;
  const sameGroupCards = leadGroup ? (groups.get(leadGroup) ?? []) : [];
  const otherCards = hand.filter(
    (c) => suitGroup(c, levelRank, trumpSuit) !== leadGroup
  );

  // Generate combinations of the right size
  const pool = [...sameGroupCards, ...otherCards];
  if (pool.length >= size && size <= 6) {
    const combos = generateCombos(pool, size, 200);
    for (const combo of combos) {
      const ids = combo.map((c) => c.id);
      const r = validateFollowPlay(leadPattern, ids, hand, state);
      if (r.ok) candidates.push(ids);
    }
  }

  // If no valid options found yet, use expectedIds from validation as hint
  if (candidates.length === 0 && testResult.expectedIds) {
    candidates.push(testResult.expectedIds);
  }

  return candidates;
}

function generateCombos(pool: Card[], size: number, limit: number): Card[][] {
  const result: Card[][] = [];
  const combo: Card[] = [];

  function recurse(start: number) {
    if (result.length >= limit) return;
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    const remaining = size - combo.length;
    for (let i = start; i <= pool.length - remaining; i++) {
      combo.push(pool[i]);
      recurse(i + 1);
      combo.pop();
    }
  }

  recurse(0);
  return result;
}

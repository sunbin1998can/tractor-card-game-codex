import { analyze, cardKey, pairKey, seqRankForTractor, suitGroup } from './RulesEngine.js';
import type { Card, Pattern, Rank, Suit, SuitGroup, TrumpSuit } from './types.js';

export interface FollowState {
  levelRank: Rank;
  trumpSuit: TrumpSuit;
}

export interface FollowResult {
  ok: boolean;
  reason?: string;
  expectedIds?: string[];
}

function invalid(reason: string, expectedIds?: string[]): FollowResult {
  return { ok: false, reason, expectedIds };
}

function arrayEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sortCardsAsc(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return [...cards].sort((a, b) => {
    const ka = cardKey(a, levelRank, trumpSuit);
    const kb = cardKey(b, levelRank, trumpSuit);
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
}

function maxTractorLen(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): number {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const sr = seqRankForTractor(card, levelRank, trumpSuit);
    if (sr === null) continue;
    counts.set(sr, (counts.get(sr) ?? 0) + 1);
  }

  const ranks = [...counts.keys()]
    .filter((sr) => (counts.get(sr) ?? 0) >= 2)
    .sort((a, b) => a - b);

  if (ranks.length < 2) return 0;

  let best = 0;
  let run = 1;
  for (let i = 1; i < ranks.length; i += 1) {
    if (ranks[i] === ranks[i - 1] + 1) {
      run += 1;
    } else {
      if (run > best) best = run;
      run = 1;
    }
  }
  if (run > best) best = run;
  return best >= 2 ? best : 0;
}

function selectLongestRun(ranks: number[]): number[] {
  if (ranks.length === 0) return [];
  let bestStart = ranks[0];
  let bestEnd = ranks[0];
  let bestLen = 1;

  let runStart = ranks[0];
  let prev = ranks[0];
  for (let i = 1; i <= ranks.length; i += 1) {
    const curr = ranks[i];
    if (curr !== undefined && curr === prev + 1) {
      prev = curr;
      continue;
    }

    const runEnd = prev;
    const runLen = runEnd - runStart + 1;
    if (runLen > bestLen || (runLen === bestLen && runEnd < bestEnd)) {
      bestLen = runLen;
      bestStart = runStart;
      bestEnd = runEnd;
    }

    if (curr === undefined) break;
    runStart = curr;
    prev = curr;
  }

  if (bestLen < 2) return [];
  const result: number[] = [];
  for (let r = bestStart; r <= bestEnd; r += 1) result.push(r);
  return result;
}

function buildExpectedInsufficient(
  cardsInGroup: Card[],
  levelRank: Rank,
  trumpSuit: TrumpSuit,
  leadPairs: number,
  requiredCount: number
): Card[] {
  const byRank = new Map<number, Card[]>();
  const byPair = new Map<string, Card[]>();

  for (const card of cardsInGroup) {
    const sr = seqRankForTractor(card, levelRank, trumpSuit);
    if (sr !== null) {
      const list = byRank.get(sr) ?? [];
      list.push(card);
      byRank.set(sr, list);
    }
    const pk = pairKey(card, levelRank, trumpSuit);
    const plist = byPair.get(pk) ?? [];
    plist.push(card);
    byPair.set(pk, plist);
  }

  for (const list of byRank.values()) list.sort((a, b) => a.id.localeCompare(b.id));
  for (const list of byPair.values()) list.sort((a, b) => a.id.localeCompare(b.id));

  const availableRanks = [...byRank.keys()]
    .filter((r) => (byRank.get(r)?.length ?? 0) >= 2)
    .sort((a, b) => a - b);

  const runRanks = selectLongestRun(availableRanks);
  const tractorRanks = runRanks.slice(0, Math.min(runRanks.length, leadPairs));

  const result: Card[] = [];
  for (const r of tractorRanks) {
    const list = byRank.get(r);
    if (!list || list.length < 2) continue;
    const pair = list.splice(0, 2);
    result.push(...pair);

    const pk = pairKey(pair[0], levelRank, trumpSuit);
    const plist = byPair.get(pk);
    if (plist) {
      const remaining = plist.filter((c) => !pair.some((p) => p.id === c.id));
      byPair.set(pk, remaining);
    }
  }

  if (result.length >= requiredCount) {
    return sortCardsAsc(result, levelRank, trumpSuit).slice(0, requiredCount);
  }

  const pairCandidates: { cards: Card[]; key: number; ids: string }[] = [];
  for (const list of byPair.values()) {
    if (list.length >= 2) {
      const ordered = sortCardsAsc(list, levelRank, trumpSuit);
      const pair = ordered.slice(0, 2);
      pairCandidates.push({
        cards: pair,
        key: cardKey(pair[1], levelRank, trumpSuit),
        ids: pair.map((c) => c.id).join(',')
      });
    }
  }

  pairCandidates.sort((a, b) => {
    if (a.key !== b.key) return a.key - b.key;
    return a.ids.localeCompare(b.ids);
  });

  for (const pc of pairCandidates) {
    if (result.length + 2 > requiredCount) break;
    result.push(...pc.cards);

    const pk = pairKey(pc.cards[0], levelRank, trumpSuit);
    const list = byPair.get(pk);
    if (list) {
      const remaining = list.filter((c) => !pc.cards.some((p) => p.id === c.id));
      byPair.set(pk, remaining);
    }
  }

  const remaining: Card[] = [];
  for (const list of byPair.values()) remaining.push(...list);
  const singles = sortCardsAsc(remaining, levelRank, trumpSuit);
  for (const card of singles) {
    if (result.length >= requiredCount) break;
    result.push(card);
  }

  return result;
}

function countPairs(cardsInGroup: Card[], levelRank: Rank, trumpSuit: TrumpSuit): number {
  const counts = new Map<string, number>();
  for (const card of cardsInGroup) {
    const pk = pairKey(card, levelRank, trumpSuit);
    counts.set(pk, (counts.get(pk) ?? 0) + 1);
  }
  let pairs = 0;
  for (const count of counts.values()) {
    pairs += Math.floor(count / 2);
  }
  return pairs;
}

function hasPair(cardsInGroup: Card[], levelRank: Rank, trumpSuit: TrumpSuit): boolean {
  const counts = new Map<string, number>();
  for (const card of cardsInGroup) {
    const pk = pairKey(card, levelRank, trumpSuit);
    counts.set(pk, (counts.get(pk) ?? 0) + 1);
  }
  for (const count of counts.values()) {
    if (count >= 2) return true;
  }
  return false;
}

function getSuitGroupCards(hand: Card[], group: SuitGroup, levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return hand.filter((c) => suitGroup(c, levelRank, trumpSuit) === group);
}

export function validateFollowPlay(
  leadPat: Pattern,
  playIds: string[],
  hand: Card[],
  state: FollowState
): FollowResult {
  if (leadPat.kind !== 'SINGLE' && leadPat.kind !== 'PAIR' && leadPat.kind !== 'TRACTOR' && leadPat.kind !== 'THROW') {
    return invalid('LEAD_PATTERN_NOT_SUPPORTED');
  }

  if (playIds.length !== leadPat.size) return invalid('CARD_COUNT_MISMATCH');
  if (!leadPat.suitGroup) return invalid('LEAD_SUITGROUP_MISSING');

  const handMap = new Map<string, Card>();
  for (const card of hand) handMap.set(card.id, card);

  const played: Card[] = [];
  const seen = new Set<string>();
  for (const id of playIds) {
    if (seen.has(id)) return invalid('DUPLICATE_CARD');
    const card = handMap.get(id);
    if (!card) return invalid('CARD_NOT_IN_HAND');
    seen.add(id);
    played.push(card);
  }

  const { levelRank, trumpSuit } = state;
  const leadGroup = leadPat.suitGroup;
  const groupCards = getSuitGroupCards(hand, leadGroup, levelRank, trumpSuit);
  const playedGroup = getSuitGroupCards(played, leadGroup, levelRank, trumpSuit);

  if (groupCards.length > 0) {
    if (groupCards.length >= leadPat.size) {
      if (playedGroup.length !== played.length) return invalid('MUST_FOLLOW_SUITGROUP');
    } else {
      const groupIds = groupCards.map((c) => c.id).sort();
      const playedIds = playedGroup.map((c) => c.id).sort();
      if (!arrayEq(groupIds, playedIds)) return invalid('MUST_PLAY_ALL_IN_GROUP');
      return { ok: true };
    }
  }

  if (leadPat.kind === 'SINGLE') {
    return { ok: true };
  }

  if (leadPat.kind === 'PAIR') {
    // When void in lead suit and playing trump, must play trump pair if available
    if (leadPat.suitGroup !== 'TRUMP' && groupCards.length === 0) {
      const playedTrumps = getSuitGroupCards(played, 'TRUMP', levelRank, trumpSuit);
      if (playedTrumps.length === 2) {
        const trumpCardsInHand = getSuitGroupCards(hand, 'TRUMP', levelRank, trumpSuit);
        if (hasPair(trumpCardsInHand, levelRank, trumpSuit)) {
          const k0 = pairKey(playedTrumps[0], levelRank, trumpSuit);
          const k1 = pairKey(playedTrumps[1], levelRank, trumpSuit);
          if (k0 !== k1) return invalid('TRUMP_RESPONSE_TO_PAIR_MUST_BE_PAIR');
        }
      }
    }

    if (groupCards.length >= 2 && hasPair(groupCards, levelRank, trumpSuit)) {
      if (playedGroup.length !== 2) return invalid('MUST_PLAY_PAIR');
      const k0 = pairKey(playedGroup[0], levelRank, trumpSuit);
      const k1 = pairKey(playedGroup[1], levelRank, trumpSuit);
      if (k0 !== k1) return invalid('MUST_PLAY_PAIR');
    }
    return { ok: true };
  }

  if (leadPat.kind === 'THROW') {
    // For THROW leads, enforce structural following per each throw part.
    if (!leadPat.parts || groupCards.length === 0) return { ok: true };

    // When enough cards in lead suitGroup, keep pair structure if available.
    if (groupCards.length >= leadPat.size) {
      const leadPairUnits = (leadPat.parts ?? []).reduce((sum, part) => {
        if (part.kind === 'PAIR') return sum + 1;
        if (part.kind === 'TRACTOR') return sum + (part.length ?? part.size / 2);
        return sum;
      }, 0);

      if (leadPairUnits > 0) {
        const availablePairUnits = countPairs(groupCards, levelRank, trumpSuit);
        const requiredPairUnits = Math.min(leadPairUnits, availablePairUnits);
        const playedPairUnits = countPairs(playedGroup, levelRank, trumpSuit);
        if (playedPairUnits < requiredPairUnits) {
          return invalid('MUST_FOLLOW_THROW_STRUCTURE');
        }
      }
    }

    return { ok: true };
  }

  // If follower has no pairs at all in lead suitGroup, they cannot satisfy any
  // pair/tractor structure, so any same-group cards of required count are legal.
  if (countPairs(groupCards, levelRank, trumpSuit) === 0) {
    return { ok: true };
  }

  const leadPairs = leadPat.length ?? leadPat.size / 2;
  const maxLen = maxTractorLen(groupCards, levelRank, trumpSuit);

  if (maxLen >= 2 && leadPairs <= maxLen) {
    const pat = analyze(playedGroup, levelRank, trumpSuit);
    if (pat.kind !== 'TRACTOR' || pat.length !== leadPairs) {
      return invalid('MUST_PLAY_FULL_TRACTOR');
    }
    return { ok: true };
  }

  const expected = buildExpectedInsufficient(
    groupCards,
    levelRank,
    trumpSuit,
    leadPairs,
    leadPat.size
  );
  const expectedIds = expected.map((c) => c.id).sort();
  const playedIds = playedGroup.map((c) => c.id).sort();
  if (!arrayEq(expectedIds, playedIds)) {
    return invalid('INSUFFICIENT_TRACTOR_TEMPLATE_MISMATCH', expectedIds);
  }

  return { ok: true };
}

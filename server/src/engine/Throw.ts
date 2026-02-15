import { analyze, analyzeThrow, cardKey, pairKey, seqRankForTractor, suitGroup } from './RulesEngine';
import type { Card, Pattern, Rank, Suit, SuitGroup, TrumpSuit } from './types';

export interface ThrowState {
  levelRank: Rank;
  trumpSuit: TrumpSuit;
}

export interface ThrowStandingResult {
  stands: boolean;
  beatenBy?: number;
  beatenPart?: Pattern;
  reason?: string;
}

export interface ThrowPunishResult {
  punished: Pattern;
  reason: string;
}

function sortCardsAsc(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[] {
  return [...cards].sort((a, b) => {
    const ka = cardKey(a, levelRank, trumpSuit);
    const kb = cardKey(b, levelRank, trumpSuit);
    if (ka !== kb) return ka - kb;
    return a.id.localeCompare(b.id);
  });
}

function patternTopKey(pattern: Pattern, levelRank: Rank, trumpSuit: TrumpSuit): number {
  if (pattern.topKey !== undefined) return pattern.topKey;
  const pat = analyze(pattern.cards, levelRank, trumpSuit);
  return pat.topKey ?? 0;
}

function bestPairTopKey(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit): number | null {
  const counts = new Map<string, Card[]>();
  for (const card of cards) {
    const pk = pairKey(card, levelRank, trumpSuit);
    const list = counts.get(pk) ?? [];
    list.push(card);
    counts.set(pk, list);
  }

  let best: number | null = null;
  for (const list of counts.values()) {
    if (list.length >= 2) {
      const ordered = sortCardsAsc(list, levelRank, trumpSuit);
      const top = cardKey(ordered[1], levelRank, trumpSuit);
      if (best === null || top > best) best = top;
    }
  }
  return best;
}

function bestTractorTopKey(cards: Card[], levelRank: Rank, trumpSuit: TrumpSuit, length: number): number | null {
  const byRank = new Map<number, Card[]>();
  for (const card of cards) {
    const sr = seqRankForTractor(card, levelRank, trumpSuit);
    if (sr === null) continue;
    const list = byRank.get(sr) ?? [];
    list.push(card);
    byRank.set(sr, list);
  }

  const ranks = [...byRank.keys()]
    .filter((r) => (byRank.get(r)?.length ?? 0) >= 2)
    .sort((a, b) => a - b);

  if (ranks.length < length) return null;

  let bestTop: number | null = null;
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
    if (runLen >= length) {
      const topRank = runEnd;
      const list = byRank.get(topRank);
      if (list && list.length >= 2) {
        const ordered = sortCardsAsc(list, levelRank, trumpSuit);
        const top = cardKey(ordered[1], levelRank, trumpSuit);
        if (bestTop === null || top > bestTop) bestTop = top;
      }
    }

    if (curr === undefined) break;
    runStart = curr;
    prev = curr;
  }

  return bestTop;
}

function canBeatPartWithGroup(part: Pattern, cards: Card[], state: ThrowState, trumping: boolean): boolean {
  const { levelRank, trumpSuit } = state;
  const partTop = patternTopKey(part, levelRank, trumpSuit);

  if (part.kind === 'SINGLE') {
    if (cards.length === 0) return false;
    if (trumping) return true;
    const top = sortCardsAsc(cards, levelRank, trumpSuit).pop();
    return top ? cardKey(top, levelRank, trumpSuit) > partTop : false;
  }

  if (part.kind === 'PAIR') {
    const best = bestPairTopKey(cards, levelRank, trumpSuit);
    if (best === null) return false;
    if (trumping) return true;
    return best > partTop;
  }

  if (part.kind === 'TRACTOR') {
    const length = part.length ?? part.size / 2;
    const best = bestTractorTopKey(cards, levelRank, trumpSuit, length);
    if (best === null) return false;
    if (trumping) return true;
    return best > partTop;
  }

  return false;
}

export function canBeatPart(part: Pattern, hand: Card[], state: ThrowState): boolean {
  if (!part.suitGroup) return false;
  const { levelRank, trumpSuit } = state;
  const leadGroup = part.suitGroup as SuitGroup;

  const groupCards = hand.filter((c) => suitGroup(c, levelRank, trumpSuit) === leadGroup);
  if (groupCards.length > 0) {
    return canBeatPartWithGroup(part, groupCards, state, false);
  }

  if (leadGroup !== 'TRUMP') {
    const trumpCards = hand.filter((c) => suitGroup(c, levelRank, trumpSuit) === 'TRUMP');
    if (trumpCards.length === 0) return false;
    return canBeatPartWithGroup(part, trumpCards, state, true);
  }

  return false;
}

export function checkThrowStanding(
  throwPattern: Pattern,
  opponentsHands: Card[][],
  state: ThrowState
): ThrowStandingResult {
  if (throwPattern.kind !== 'THROW') {
    return { stands: false, reason: 'NOT_THROW_PATTERN' };
  }
  if (!throwPattern.parts) {
    return { stands: false, reason: 'THROW_PARTS_MISSING' };
  }

  for (let i = 0; i < opponentsHands.length; i += 1) {
    const hand = opponentsHands[i];
    for (const part of throwPattern.parts) {
      if (canBeatPart(part, hand, state)) {
        return { stands: false, beatenBy: i, beatenPart: part, reason: 'OPPONENT_CAN_BEAT' };
      }
    }
  }

  return { stands: true };
}

export function punishThrow(throwPattern: Pattern, state: ThrowState): ThrowPunishResult {
  if (throwPattern.kind !== 'THROW' || !throwPattern.parts) {
    throw new Error('punishThrow requires THROW pattern with parts');
  }

  const { levelRank, trumpSuit } = state;
  const parts = throwPattern.parts;

  const singles = parts.filter((p) => p.kind === 'SINGLE');
  const pairs = parts.filter((p) => p.kind === 'PAIR');
  const tractors = parts.filter((p) => p.kind === 'TRACTOR');

  const pickLowest = (items: Pattern[]): Pattern => {
    return [...items].sort((a, b) => {
      const ka = patternTopKey(a, levelRank, trumpSuit);
      const kb = patternTopKey(b, levelRank, trumpSuit);
      if (ka !== kb) return ka - kb;
      const aIds = a.cards.map((c) => c.id).sort().join(',');
      const bIds = b.cards.map((c) => c.id).sort().join(',');
      return aIds.localeCompare(bIds);
    })[0];
  };

  if (singles.length > 0) {
    return { punished: pickLowest(singles), reason: 'PUNISH_SINGLE' };
  }
  if (pairs.length > 0) {
    return { punished: pickLowest(pairs), reason: 'PUNISH_PAIR' };
  }
  if (tractors.length > 0) {
    return { punished: pickLowest(tractors), reason: 'PUNISH_TRACTOR' };
  }

  throw new Error('No parts to punish');
}

export interface ThrowEvent {
  type: 'TRICK_UPDATE' | 'THROW_PUNISHED';
  seat: number;
  cards?: Card[];
  originalCards?: Card[];
  punishedCards?: Card[];
  reason?: string;
}

export interface HandleThrowResult {
  ok: boolean;
  stands?: boolean;
  playedCards?: Card[];
  events?: ThrowEvent[];
  reason?: string;
}

export function handleLeaderThrow(
  seat: number,
  leaderSeat: number,
  cardIds: string[],
  hand: Card[],
  opponentsHands: Card[][],
  state: ThrowState
): HandleThrowResult {
  if (seat !== leaderSeat) return { ok: false, reason: 'NOT_LEADER' };

  const handMap = new Map<string, Card>();
  for (const card of hand) handMap.set(card.id, card);

  const cards: Card[] = [];
  const seen = new Set<string>();
  for (const id of cardIds) {
    if (seen.has(id)) return { ok: false, reason: 'DUPLICATE_CARD' };
    const card = handMap.get(id);
    if (!card) return { ok: false, reason: 'CARD_NOT_IN_HAND' };
    seen.add(id);
    cards.push(card);
  }

  const throwPattern = analyzeThrow(cards, state.levelRank, state.trumpSuit);
  if (throwPattern.kind !== 'THROW') {
    return { ok: false, reason: throwPattern.reason ?? 'INVALID_THROW' };
  }

  const standing = checkThrowStanding(throwPattern, opponentsHands, state);
  if (standing.stands) {
    return {
      ok: true,
      stands: true,
      playedCards: cards,
      events: [{ type: 'TRICK_UPDATE', seat, cards }]
    };
  }

  const punished = punishThrow(throwPattern, state);
  return {
    ok: true,
    stands: false,
    playedCards: punished.punished.cards,
    events: [
      {
        type: 'THROW_PUNISHED',
        seat,
        originalCards: cards,
        punishedCards: punished.punished.cards,
        reason: punished.reason
      },
      {
        type: 'TRICK_UPDATE',
        seat,
        cards: punished.punished.cards
      }
    ]
  };
}

export type { Card, Pattern, Rank, Suit } from './types';

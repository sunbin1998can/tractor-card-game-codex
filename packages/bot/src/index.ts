import { suitGroup, cardKey, analyze, validateFollowPlay } from '@tractor/engine';
import type { Card, Rank, TrumpSuit, SuitGroup, Pattern, TrickState } from '@tractor/engine';
import type { BotDifficulty, PublicRoomState } from '@tractor/protocol';
import {
  isTrump,
  cardGroup,
  sortByStrength,
  groupBySuitGroup,
  pointValue,
  handPoints,
  findValidFollows,
} from './utils.js';

export type BotAction =
  | { type: 'DECLARE'; cardIds: string[] }
  | { type: 'BURY'; cardIds: string[] }
  | { type: 'PLAY'; cardIds: string[] };

export interface BotEngineState {
  levelRank: Rank;
  trumpSuit: TrumpSuit;
  trick: TrickState | null;
  kittySize: number;
  kitty?: Card[];
  allHands?: Card[][];
}

export function chooseBotAction(
  difficulty: BotDifficulty,
  phase: string,
  hand: Card[],
  publicState: PublicRoomState,
  engineState: BotEngineState
): BotAction | null {
  const { levelRank, trumpSuit } = engineState;

  if (phase === 'FLIP_TRUMP') {
    return chooseDeclare(difficulty, hand, levelRank, trumpSuit, publicState);
  }
  if (phase === 'BURY_KITTY') {
    return chooseBury(difficulty, hand, engineState);
  }
  if (phase === 'TRICK_PLAY') {
    return choosePlay(difficulty, hand, publicState, engineState);
  }
  return null;
}

// ── DECLARE ──

function chooseDeclare(
  difficulty: BotDifficulty,
  hand: Card[],
  levelRank: Rank,
  trumpSuit: TrumpSuit,
  publicState: PublicRoomState
): BotAction | null {
  const levelCards = hand.filter((c) => c.rank === levelRank && c.suit !== 'J');
  const sjCards = hand.filter((c) => c.rank === 'SJ');
  const bjCards = hand.filter((c) => c.rank === 'BJ');

  if (difficulty === 'simple') {
    // 20% chance to declare if holding level-rank
    if (Math.random() > 0.2) return null;
    if (levelCards.length >= 1) {
      return { type: 'DECLARE', cardIds: [levelCards[0].id] };
    }
    return null;
  }

  // medium/tough/cheater: prefer pair declares, then single
  if (bjCards.length >= 2) {
    return { type: 'DECLARE', cardIds: bjCards.slice(0, 2).map((c) => c.id) };
  }
  if (sjCards.length >= 2) {
    return { type: 'DECLARE', cardIds: sjCards.slice(0, 2).map((c) => c.id) };
  }

  // Group level cards by suit
  const levelBySuit = new Map<string, Card[]>();
  for (const c of levelCards) {
    const list = levelBySuit.get(c.suit) ?? [];
    list.push(c);
    levelBySuit.set(c.suit, list);
  }

  // Find pair declares
  for (const [, cards] of levelBySuit) {
    if (cards.length >= 2) {
      return { type: 'DECLARE', cardIds: cards.slice(0, 2).map((c) => c.id) };
    }
  }

  if (difficulty === 'medium' || difficulty === 'tough' || difficulty === 'cheater') {
    // Prefer suits with more cards for single declares
    if (levelCards.length > 0) {
      const groups = groupBySuitGroup(hand, levelRank, null);
      let bestSuit: string | null = null;
      let bestCount = 0;
      for (const c of levelCards) {
        const suitCards = groups.get(c.suit as SuitGroup) ?? [];
        if (suitCards.length > bestCount) {
          bestCount = suitCards.length;
          bestSuit = c.suit;
        }
      }
      const chosen = levelCards.find((c) => c.suit === bestSuit) ?? levelCards[0];
      return { type: 'DECLARE', cardIds: [chosen.id] };
    }
  }

  return null;
}

// ── BURY ──

function chooseBury(
  difficulty: BotDifficulty,
  hand: Card[],
  engineState: BotEngineState
): BotAction | null {
  const { levelRank, trumpSuit, kittySize } = engineState;
  const sorted = sortByStrength(hand, levelRank, trumpSuit);

  if (difficulty === 'simple') {
    // Bury lowest-value non-trump cards, or lowest cards overall
    const nonTrump = sorted.filter((c) => !isTrump(c, levelRank, trumpSuit));
    const pool = nonTrump.length >= kittySize ? nonTrump : sorted;
    // Sort by point value ascending, then by key ascending (bury low-value cards)
    const byValue = [...pool].sort((a, b) => {
      const pa = pointValue(a);
      const pb = pointValue(b);
      if (pa !== pb) return pa - pb;
      return cardKey(a, levelRank, trumpSuit) - cardKey(b, levelRank, trumpSuit);
    });
    return { type: 'BURY', cardIds: byValue.slice(0, kittySize).map((c) => c.id) };
  }

  // medium/tough/cheater: bury point cards from short non-trump suits, keep trump
  const groups = groupBySuitGroup(hand, levelRank, trumpSuit);
  const trumpCards = groups.get('TRUMP') ?? [];
  const nonTrumpSuits: { suit: SuitGroup; cards: Card[] }[] = [];
  for (const [sg, cards] of groups) {
    if (sg !== 'TRUMP') nonTrumpSuits.push({ suit: sg, cards });
  }
  // Sort by suit length (short suits first — good for voiding)
  nonTrumpSuits.sort((a, b) => a.cards.length - b.cards.length);

  const toBury: Card[] = [];

  if (difficulty === 'medium') {
    // Bury from short suits, preferring point cards
    for (const { cards } of nonTrumpSuits) {
      const pointFirst = [...cards].sort((a, b) => pointValue(b) - pointValue(a));
      for (const c of pointFirst) {
        if (toBury.length >= kittySize) break;
        toBury.push(c);
      }
    }
  } else {
    // tough/cheater: be strategic — void short suits for trump kills
    for (const { cards } of nonTrumpSuits) {
      if (cards.length <= kittySize - toBury.length) {
        // Can void the whole suit
        for (const c of cards) {
          if (toBury.length >= kittySize) break;
          toBury.push(c);
        }
      }
    }
    // Fill remaining with high-point non-trump cards
    if (toBury.length < kittySize) {
      const remaining = hand
        .filter((c) => !toBury.includes(c) && !isTrump(c, levelRank, trumpSuit))
        .sort((a, b) => pointValue(b) - pointValue(a));
      for (const c of remaining) {
        if (toBury.length >= kittySize) break;
        toBury.push(c);
      }
    }
  }

  // Fill with lowest-key cards if still short
  if (toBury.length < kittySize) {
    const remaining = sorted.filter((c) => !toBury.includes(c));
    for (const c of remaining) {
      if (toBury.length >= kittySize) break;
      toBury.push(c);
    }
  }

  return { type: 'BURY', cardIds: toBury.slice(0, kittySize).map((c) => c.id) };
}

// ── PLAY ──

function choosePlay(
  difficulty: BotDifficulty,
  hand: Card[],
  publicState: PublicRoomState,
  engineState: BotEngineState
): BotAction | null {
  const { levelRank, trumpSuit, trick } = engineState;
  if (!trick) return null;

  const isLeader = trick.plays.length === 0;

  if (isLeader) {
    return chooseLead(difficulty, hand, publicState, engineState);
  }
  return chooseFollow(difficulty, hand, publicState, engineState);
}

function chooseLead(
  difficulty: BotDifficulty,
  hand: Card[],
  publicState: PublicRoomState,
  engineState: BotEngineState
): BotAction | null {
  const { levelRank, trumpSuit } = engineState;
  const sorted = sortByStrength(hand, levelRank, trumpSuit);

  if (difficulty === 'simple') {
    // Random single card
    const idx = Math.floor(Math.random() * sorted.length);
    return { type: 'PLAY', cardIds: [sorted[idx].id] };
  }

  const groups = groupBySuitGroup(hand, levelRank, trumpSuit);

  if (difficulty === 'medium') {
    // Lead from longest non-trump suit, or a strong trump pair
    let bestSuit: SuitGroup | null = null;
    let bestLen = 0;
    for (const [sg, cards] of groups) {
      if (sg === 'TRUMP') continue;
      if (cards.length > bestLen) {
        bestLen = cards.length;
        bestSuit = sg;
      }
    }
    if (bestSuit) {
      const suitCards = sortByStrength(groups.get(bestSuit)!, levelRank, trumpSuit);
      // Lead lowest from longest suit
      return { type: 'PLAY', cardIds: [suitCards[0].id] };
    }
    // All trump — play lowest
    return { type: 'PLAY', cardIds: [sorted[0].id] };
  }

  // tough/cheater: lead from shortest non-trump to draw out cards, or strong pairs
  // Try leading pairs first
  const pairs = findPairs(hand, levelRank, trumpSuit);
  if (pairs.length > 0) {
    // Lead a strong pair
    const best = pairs[pairs.length - 1]; // highest pair
    return { type: 'PLAY', cardIds: best.map((c) => c.id) };
  }

  // Lead from shortest non-trump suit
  let shortestSuit: SuitGroup | null = null;
  let shortestLen = Infinity;
  for (const [sg, cards] of groups) {
    if (sg === 'TRUMP') continue;
    if (cards.length > 0 && cards.length < shortestLen) {
      shortestLen = cards.length;
      shortestSuit = sg;
    }
  }
  if (shortestSuit) {
    const suitCards = sortByStrength(groups.get(shortestSuit)!, levelRank, trumpSuit);
    // Lead highest from short suit
    return { type: 'PLAY', cardIds: [suitCards[suitCards.length - 1].id] };
  }

  // All trump — play highest
  return { type: 'PLAY', cardIds: [sorted[sorted.length - 1].id] };
}

function chooseFollow(
  difficulty: BotDifficulty,
  hand: Card[],
  publicState: PublicRoomState,
  engineState: BotEngineState
): BotAction | null {
  const { levelRank, trumpSuit, trick } = engineState;
  if (!trick || !trick.leadPattern) return null;

  const leadPattern = trick.leadPattern;
  const state = { levelRank, trumpSuit };

  // Find valid follows
  const validOptions = findValidFollows(hand, leadPattern, levelRank, trumpSuit);

  if (validOptions.length === 0) {
    // Fallback: try every combo of the right size
    const size = leadPattern.size;
    if (hand.length <= size) {
      return { type: 'PLAY', cardIds: hand.map((c) => c.id) };
    }
    // Last resort: pick first N cards
    return { type: 'PLAY', cardIds: hand.slice(0, size).map((c) => c.id) };
  }

  if (difficulty === 'simple') {
    // Pick first valid option
    return { type: 'PLAY', cardIds: validOptions[0] };
  }

  // Evaluate options
  const trickSeat = trick.plays.length;
  const numPlayers = publicState.players;
  const myTeam = (trick.turnSeat) % 2;
  const leaderTeam = trick.leaderSeat % 2;
  const isPartnerLeading = myTeam === leaderTeam;

  // Current trick points
  let trickPoints = 0;
  for (const play of trick.plays) {
    trickPoints += play.cards.reduce((sum, c) => sum + pointValue(c), 0);
  }

  // Determine current winner
  let currentWinnerTeam = leaderTeam;
  if (trick.plays.length > 0) {
    // Simplified: assume leader is winning unless someone played trump on non-trump lead
    const leadGroup = trick.leadSuitGroup;
    let bestKey = -1;
    let winnerSeat = trick.leaderSeat;
    for (const play of trick.plays) {
      const pat = play.pattern;
      if (pat.suitGroup === leadGroup || pat.suitGroup === 'TRUMP') {
        const key = pat.topKey ?? 0;
        if (pat.suitGroup === 'TRUMP' && leadGroup !== 'TRUMP') {
          // Trump beat always wins over non-trump
          if (key + 10000 > bestKey) {
            bestKey = key + 10000;
            winnerSeat = play.seat;
          }
        } else if (key > bestKey) {
          bestKey = key;
          winnerSeat = play.seat;
        }
      }
    }
    currentWinnerTeam = winnerSeat % 2;
  }

  const partnerWinning = currentWinnerTeam === myTeam;
  const isLastPlayer = trick.plays.length === numPlayers - 1;

  if (difficulty === 'medium') {
    return chooseMediumFollow(validOptions, hand, partnerWinning, isLastPlayer, trickPoints, leadPattern, levelRank, trumpSuit);
  }

  // tough/cheater: smarter evaluation
  return chooseToughFollow(validOptions, hand, partnerWinning, isLastPlayer, trickPoints, leadPattern, levelRank, trumpSuit, engineState);
}

function chooseMediumFollow(
  options: string[][],
  hand: Card[],
  partnerWinning: boolean,
  isLastPlayer: boolean,
  trickPoints: number,
  leadPattern: Pattern,
  levelRank: Rank,
  trumpSuit: TrumpSuit
): BotAction {
  const handMap = new Map(hand.map((c) => [c.id, c]));
  const resolveCards = (ids: string[]) => ids.map((id) => handMap.get(id)!).filter(Boolean);

  if (partnerWinning) {
    // Slough points if partner is winning
    let bestOption = options[0];
    let bestPoints = -1;
    for (const ids of options) {
      const cards = resolveCards(ids);
      const pts = handPoints(cards);
      if (pts > bestPoints) {
        bestPoints = pts;
        bestOption = ids;
      }
    }
    return { type: 'PLAY', cardIds: bestOption };
  }

  // Try to win with minimum card strength
  const leadGroup = leadPattern.suitGroup;
  let bestWinOption: string[] | null = null;
  let bestWinKey = Infinity;
  let bestLoseOption: string[] | null = null;
  let bestLosePoints = Infinity;

  for (const ids of options) {
    const cards = resolveCards(ids);
    const pat = analyze(cards, levelRank, trumpSuit);
    const isWinning =
      (pat.suitGroup === leadGroup || pat.suitGroup === 'TRUMP') &&
      (pat.topKey ?? 0) > 0;

    if (isWinning) {
      const key = pat.topKey ?? 0;
      if (key < bestWinKey) {
        bestWinKey = key;
        bestWinOption = ids;
      }
    } else {
      const pts = handPoints(cards);
      if (pts < bestLosePoints) {
        bestLosePoints = pts;
        bestLoseOption = ids;
      }
    }
  }

  if (bestWinOption) return { type: 'PLAY', cardIds: bestWinOption };
  if (bestLoseOption) return { type: 'PLAY', cardIds: bestLoseOption };
  return { type: 'PLAY', cardIds: options[0] };
}

function chooseToughFollow(
  options: string[][],
  hand: Card[],
  partnerWinning: boolean,
  isLastPlayer: boolean,
  trickPoints: number,
  leadPattern: Pattern,
  levelRank: Rank,
  trumpSuit: TrumpSuit,
  engineState: BotEngineState
): BotAction {
  const handMap = new Map(hand.map((c) => [c.id, c]));
  const resolveCards = (ids: string[]) => ids.map((id) => handMap.get(id)!).filter(Boolean);

  // Score each option
  let bestOption = options[0];
  let bestScore = -Infinity;

  for (const ids of options) {
    const cards = resolveCards(ids);
    const pat = analyze(cards, levelRank, trumpSuit);
    let score = 0;

    const pts = handPoints(cards);
    const leadGroup = leadPattern.suitGroup;
    const canWin =
      (pat.suitGroup === leadGroup || pat.suitGroup === 'TRUMP') &&
      (pat.topKey ?? 0) > 0;

    if (partnerWinning) {
      // Maximize points dumped
      score = pts * 10;
      // Prefer keeping strong cards
      score -= (pat.topKey ?? 0);
    } else if (canWin) {
      // Win with minimum strength
      score = 1000 - (pat.topKey ?? 0);
      // Bonus for winning high-point tricks
      if (trickPoints >= 10) score += 500;
    } else {
      // Can't win — dump lowest point cards
      score = -pts * 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestOption = ids;
    }
  }

  return { type: 'PLAY', cardIds: bestOption };
}

// ── Helpers ──

function findPairs(hand: Card[], levelRank: Rank, trumpSuit: TrumpSuit): Card[][] {
  const pairs: Card[][] = [];
  const byKey = new Map<string, Card[]>();

  for (const card of hand) {
    // Group by rank+suit for identical pairs
    const key = `${card.rank}|${card.suit}`;
    const list = byKey.get(key) ?? [];
    list.push(card);
    byKey.set(key, list);
  }

  for (const [, cards] of byKey) {
    if (cards.length >= 2) {
      pairs.push(cards.slice(0, 2));
    }
  }

  // Sort pairs by strength
  pairs.sort((a, b) => {
    const ka = cardKey(a[0], levelRank, trumpSuit);
    const kb = cardKey(b[0], levelRank, trumpSuit);
    return ka - kb;
  });

  return pairs;
}

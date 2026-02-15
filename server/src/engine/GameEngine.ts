import { analyze, cardKey, suitGroup } from './RulesEngine';
import { handleLeaderThrow } from './Throw';
import { validateFollowPlay } from './Follow';
import type { Card, Pattern, Rank, Suit, SuitGroup } from './types';

export type Phase =
  | 'DEALING'
  | 'FLIP_TRUMP'
  | 'BURY_KITTY'
  | 'TRICK_PLAY'
  | 'ROUND_SCORE'
  | 'GAME_OVER';

export type Event =
  | { type: 'ROOM_STATE'; phase: Phase }
  | { type: 'DEAL'; seat: number; cards: Card[] }
  | { type: 'PHASE'; phase: Phase }
  | { type: 'REQUEST_ACTION'; seat: number }
  | { type: 'TRICK_UPDATE'; seat: number; cards: Card[] }
  | { type: 'TRICK_END'; winnerSeat: number; cards: Card[] }
  | { type: 'THROW_PUNISHED'; seat: number; originalCards: Card[]; punishedCards: Card[]; reason: string }
  | {
      type: 'ROUND_RESULT';
      advancingTeam: number;
      levelFrom: Rank;
      levelTo: Rank;
      delta: number;
      defenderPoints: number;
      kittyPoints: number;
      killMultiplier: number;
      nextBankerSeat: number;
    }
  | { type: 'GAME_OVER'; winnerTeam: number };

export interface GameConfig {
  numPlayers: number;
  bankerSeat: number;
  levelRank: Rank;
  trumpSuit: Suit;
  kittySize: number;
  fairnessWindowMs?: number;
  rngSeed?: number;
  teamLevels?: [Rank, Rank];
}

export interface TrumpCandidate {
  seat: number;
  strength: number;
  trumpSuit: Suit;
  expiresAt: number;
}

export interface TrickState {
  leaderSeat: number;
  turnSeat: number;
  leadPattern?: Pattern;
  leadSuitGroup?: SuitGroup;
  plays: { seat: number; cards: Card[]; pattern: Pattern }[];
}

const LEVELS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function rankIndex(rank: Rank): number {
  return LEVELS.indexOf(rank);
}

function nextLevel(rank: Rank, delta: number): Rank {
  const idx = rankIndex(rank);
  const next = Math.min(idx + delta, LEVELS.length - 1);
  return LEVELS[next];
}

function isPointCard(card: Card): number {
  if (card.rank === '5') return 5;
  if (card.rank === '10' || card.rank === 'K') return 10;
  return 0;
}

function handPoints(cards: Card[]): number {
  return cards.reduce((sum, c) => sum + isPointCard(c), 0);
}

function teamOfSeat(seat: number): number {
  return seat % 2;
}

function comparePattern(
  a: Pattern,
  b: Pattern,
  leadSuitGroup: SuitGroup,
  levelRank: Rank,
  trumpSuit: Suit
): number {
  if (a.suitGroup !== b.suitGroup) {
    if (leadSuitGroup !== 'TRUMP') {
      if (a.suitGroup === 'TRUMP') return 1;
      if (b.suitGroup === 'TRUMP') return -1;
    }
  }
  const ka = a.topKey ?? 0;
  const kb = b.topKey ?? 0;
  if (ka !== kb) return ka - kb;
  const aIds = a.cards.map((c) => c.id).sort().join(',');
  const bIds = b.cards.map((c) => c.id).sort().join(',');
  return aIds.localeCompare(bIds);
}

export class GameEngine {
  phase: Phase = 'DEALING';
  config: GameConfig;
  fairnessWindowMs: number;
  events: Event[] = [];

  hands: Card[][] = [];
  kitty: Card[] = [];
  trick: TrickState | null = null;

  capturedPoints: [number, number] = [0, 0];
  lastTrickLeadKind: 'SINGLE' | 'PAIR' | 'TRACTOR' | null = null;
  lastTrickLeadPairCount: number = 0;
  lastTrickWinnerSeat: number | null = null;
  teamLevels: [Rank, Rank] = ['2', '2'];

  trumpCandidate: TrumpCandidate | null = null;
  rngSeed: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.fairnessWindowMs = config.fairnessWindowMs ?? 2000;
    this.rngSeed = config.rngSeed ?? 1;
    this.teamLevels = config.teamLevels ? [...config.teamLevels] : ['2', '2'];
    // Derive levelRank from banker's team level
    const bankerTeam = teamOfSeat(config.bankerSeat);
    this.config.levelRank = this.teamLevels[bankerTeam];
    this.hands = Array.from({ length: config.numPlayers }, () => []);
    this.emit({ type: 'ROOM_STATE', phase: this.phase });
  }

  emit(event: Event) {
    this.events.push(event);
  }

  setHands(hands: Card[][], kitty: Card[]) {
    this.hands = hands.map((h) => [...h]);
    this.kitty = [...kitty];
  }

  startTrumpPhase() {
    this.phase = 'FLIP_TRUMP';
    this.emit({ type: 'PHASE', phase: this.phase });
  }

  flipTrump(seat: number, cards: Card[], nowMs: number) {
    if (this.phase !== 'FLIP_TRUMP') return;

    const strength = trumpStrength(cards, this.config.levelRank);
    if (strength === null) return;

    const suit = trumpSuitFromCards(cards, this.config.trumpSuit);

    // Partner reinforcement restriction: partner cannot reinforce the current bid
    if (this.trumpCandidate) {
      const candidateTeam = teamOfSeat(this.trumpCandidate.seat);
      const bidderTeam = teamOfSeat(seat);
      if (bidderTeam === candidateTeam && seat !== this.trumpCandidate.seat) return;
    }

    const candidate: TrumpCandidate = {
      seat,
      strength,
      trumpSuit: suit,
      expiresAt: nowMs + this.fairnessWindowMs,
    };

    if (!this.trumpCandidate || candidate.strength > this.trumpCandidate.strength) {
      this.trumpCandidate = candidate;
    }
  }

  finalizeTrump(nowMs: number) {
    if (this.phase !== 'FLIP_TRUMP') return;
    if (!this.trumpCandidate) return;
    if (nowMs < this.trumpCandidate.expiresAt) return;

    this.config.trumpSuit = this.trumpCandidate.trumpSuit;
    this.trumpCandidate = null;
    this.phase = 'BURY_KITTY';
    this.emit({ type: 'PHASE', phase: this.phase });
  }

  finalizeTrumpFallback() {
    if (this.phase !== 'FLIP_TRUMP') return;
    if (this.trumpCandidate) return; // use normal path if a candidate exists

    // No bids: first non-joker kitty card determines trump suit
    for (const card of this.kitty) {
      if (card.rank !== 'BJ' && card.rank !== 'SJ') {
        this.config.trumpSuit = card.suit as Suit;
        break;
      }
    }
    // If all kitty cards are jokers, keep the existing config trump suit

    this.phase = 'BURY_KITTY';
    this.emit({ type: 'PHASE', phase: this.phase });
  }

  buryKitty(seat: number, cardIds: string[]) {
    if (this.phase !== 'BURY_KITTY') return;
    if (seat !== this.config.bankerSeat) return;

    const hand = this.hands[seat];
    const map = new Map(hand.map((c) => [c.id, c]));
    const buried: Card[] = [];
    for (const id of cardIds) {
      const card = map.get(id);
      if (!card) return;
      buried.push(card);
    }
    if (buried.length !== this.config.kittySize) return;

    this.hands[seat] = hand.filter((c) => !buried.some((b) => b.id === c.id));
    this.kitty = buried;

    this.phase = 'TRICK_PLAY';
    this.trick = {
      leaderSeat: seat,
      turnSeat: seat,
      plays: [],
    };
    this.emit({ type: 'PHASE', phase: this.phase });
    this.emit({ type: 'REQUEST_ACTION', seat });
  }

  play(seat: number, cardIds: string[]) {
    if (this.phase !== 'TRICK_PLAY' || !this.trick) return;
    if (seat !== this.trick.turnSeat) return;

    const hand = this.hands[seat];
    const map = new Map(hand.map((c) => [c.id, c]));
    const cards: Card[] = [];
    const seen = new Set<string>();
    for (const id of cardIds) {
      if (seen.has(id)) return;
      const card = map.get(id);
      if (!card) return;
      seen.add(id);
      cards.push(card);
    }

    const state = { levelRank: this.config.levelRank, trumpSuit: this.config.trumpSuit };

    if (seat === this.trick.leaderSeat) {
      const leadPat = analyze(cards, state.levelRank, state.trumpSuit);
      if (leadPat.kind === 'INVALID') {
        const oppHands = this.hands.filter((_, i) => i !== seat);
        const result = handleLeaderThrow(seat, seat, cardIds, hand, oppHands, state);
        if (!result.ok || !result.playedCards) return;

        const played = result.playedCards;
        this.applyPlay(seat, played);
        const pat = analyze(played, state.levelRank, state.trumpSuit);
        if (pat.kind === 'INVALID') return;
        this.trick.leadPattern = pat;
        this.trick.leadSuitGroup = pat.suitGroup ?? undefined;
        this.trick.plays.push({ seat, cards: played, pattern: pat });
        for (const ev of result.events ?? []) this.emit(ev as Event);
      } else {
        this.applyPlay(seat, cards);
        this.trick.leadPattern = leadPat;
        this.trick.leadSuitGroup = leadPat.suitGroup ?? undefined;
        this.trick.plays.push({ seat, cards, pattern: leadPat });
        this.emit({ type: 'TRICK_UPDATE', seat, cards });
      }
    } else {
      if (!this.trick.leadPattern || !this.trick.leadSuitGroup) return;
      const res = validateFollowPlay(this.trick.leadPattern, cardIds, hand, state);
      if (!res.ok) return;
      const pat = analyze(cards, state.levelRank, state.trumpSuit);
      if (pat.kind === 'INVALID') return;
      this.applyPlay(seat, cards);
      this.trick.plays.push({ seat, cards, pattern: pat });
      this.emit({ type: 'TRICK_UPDATE', seat, cards });
    }

    if (this.trick.plays.length === this.config.numPlayers) {
      this.finishTrick();
      return;
    }

    this.trick.turnSeat = (seat + 1) % this.config.numPlayers;
    this.emit({ type: 'REQUEST_ACTION', seat: this.trick.turnSeat });
  }

  private applyPlay(seat: number, cards: Card[]) {
    const ids = new Set(cards.map((c) => c.id));
    this.hands[seat] = this.hands[seat].filter((c) => !ids.has(c.id));
  }

  private finishTrick() {
    if (!this.trick || !this.trick.leadPattern || !this.trick.leadSuitGroup) return;

    const state = { levelRank: this.config.levelRank, trumpSuit: this.config.trumpSuit };
    let winner = this.trick.plays[0];
    for (let i = 1; i < this.trick.plays.length; i += 1) {
      const challenger = this.trick.plays[i];
      const cmp = comparePattern(
        challenger.pattern,
        winner.pattern,
        this.trick.leadSuitGroup,
        state.levelRank,
        state.trumpSuit
      );
      if (cmp > 0) winner = challenger;
    }

    const trickCards = this.trick.plays.flatMap((p) => p.cards);
    const points = handPoints(trickCards);
    const team = teamOfSeat(winner.seat);
    this.capturedPoints[team] += points;

    this.lastTrickLeadKind = this.trick.leadPattern.kind === 'TRACTOR' || this.trick.leadPattern.kind === 'PAIR'
      ? this.trick.leadPattern.kind
      : 'SINGLE';
    if (this.trick.leadPattern.kind === 'TRACTOR') {
      this.lastTrickLeadPairCount = this.trick.leadPattern.length ?? this.trick.leadPattern.size / 2;
    } else if (this.trick.leadPattern.kind === 'PAIR') {
      this.lastTrickLeadPairCount = 1;
    } else {
      this.lastTrickLeadPairCount = 0;
    }
    this.lastTrickWinnerSeat = winner.seat;

    this.emit({ type: 'TRICK_END', winnerSeat: winner.seat, cards: trickCards });

    if (this.hands.every((h) => h.length === 0)) {
      this.finishRound();
      return;
    }

    this.trick = {
      leaderSeat: winner.seat,
      turnSeat: winner.seat,
      plays: [],
    };
    this.emit({ type: 'REQUEST_ACTION', seat: winner.seat });
  }

  private finishRound() {
    const bankerTeam = teamOfSeat(this.config.bankerSeat);
    const defenderTeam = bankerTeam === 0 ? 1 : 0;

    let defenderPoints = this.capturedPoints[defenderTeam];
    const kittyPoints = handPoints(this.kitty);
    let killMultiplier = 1;

    if (this.lastTrickWinnerSeat !== null && teamOfSeat(this.lastTrickWinnerSeat) === defenderTeam) {
      killMultiplier = 2 * Math.pow(2, this.lastTrickLeadPairCount);
      defenderPoints += kittyPoints * killMultiplier;
      this.capturedPoints[defenderTeam] = defenderPoints;
    }

    // Standard 8-tier scoring per RULES.md §9.3
    let advancingTeam: number;
    let delta: number;

    if (defenderPoints === 0) {
      advancingTeam = bankerTeam;
      delta = 3;
    } else if (defenderPoints < 40) {
      advancingTeam = bankerTeam;
      delta = 2;
    } else if (defenderPoints < 80) {
      advancingTeam = bankerTeam;
      delta = 1;
    } else if (defenderPoints < 120) {
      advancingTeam = -1; // swap banker, no level change
      delta = 0;
    } else if (defenderPoints < 160) {
      advancingTeam = defenderTeam;
      delta = 1;
    } else if (defenderPoints < 200) {
      advancingTeam = defenderTeam;
      delta = 2;
    } else {
      advancingTeam = defenderTeam;
      delta = 3;
    }

    // Apply level change to the correct team
    let levelFrom: Rank;
    let levelTo: Rank;
    if (advancingTeam >= 0) {
      levelFrom = this.teamLevels[advancingTeam];
      levelTo = nextLevel(levelFrom, delta);
      this.teamLevels[advancingTeam] = levelTo;
    } else {
      levelFrom = this.teamLevels[bankerTeam];
      levelTo = levelFrom;
    }

    // Banker succession
    let nextBankerSeat: number;
    if (advancingTeam === bankerTeam) {
      nextBankerSeat = this.config.bankerSeat;
    } else {
      nextBankerSeat = this.lastTrickWinnerSeat ?? (this.config.bankerSeat + 1) % this.config.numPlayers;
    }

    this.phase = 'ROUND_SCORE';
    this.emit({
      type: 'ROUND_RESULT',
      advancingTeam,
      levelFrom,
      levelTo,
      delta,
      defenderPoints,
      kittyPoints,
      killMultiplier,
      nextBankerSeat,
    });

    if (levelTo === 'A' && advancingTeam >= 0) {
      this.emit({ type: 'GAME_OVER', winnerTeam: advancingTeam });
      this.phase = 'GAME_OVER';
      this.emit({ type: 'PHASE', phase: this.phase });
      return;
    }

    // Set up for next round
    this.config.bankerSeat = nextBankerSeat;
    const nextBankerTeam = teamOfSeat(nextBankerSeat);
    this.config.levelRank = this.teamLevels[nextBankerTeam];
    this.emit({ type: 'PHASE', phase: this.phase });
  }
}

function trumpStrength(cards: Card[], levelRank: Rank): number | null {
  if (cards.length === 0) return null;
  if (cards.length > 2) return null;

  const ranks = cards.map((c) => c.rank);
  const isPair = cards.length === 2 && ranks[0] === ranks[1];
  const single = cards.length === 1;

  if (isPair && ranks[0] === 'BJ') return 60;
  if (isPair && ranks[0] === 'SJ') return 50;
  if (single && ranks[0] === 'BJ') return 40;
  if (single && ranks[0] === 'SJ') return 30;
  if (isPair && ranks[0] === levelRank) return 20;
  if (single && ranks[0] === levelRank) return 10;

  return null;
}

function trumpSuitFromCards(cards: Card[], fallback: Suit): Suit {
  for (const card of cards) {
    if (card.rank === 'BJ' || card.rank === 'SJ') continue;
    return card.suit as Suit;
  }
  // Joker-only bid: preserve the current/default trump suit
  return fallback;
}

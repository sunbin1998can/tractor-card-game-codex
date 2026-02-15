import { analyze, analyzeThrow, cardKey, suitGroup } from './RulesEngine';
import { handleLeaderThrow } from './Throw';
import { validateFollowPlay } from './Follow';
import type { Card, Pattern, Rank, Suit, SuitGroup } from './types';
import { resolveNextRound } from "./NextRoundBinSun.ts";

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
  | { type: 'KOU_DI'; cards: Card[]; pointSteps: number[]; total: number; multiplier: number }
  | { type: 'TRUMP_LED'; seat: number }
  | { type: 'LEAD_PATTERN'; seat: number; kind: 'PAIR' | 'TRACTOR' }
  | { type: 'TRICK_UPDATE'; seat: number; cards: Card[] }
  | { type: 'TRICK_END'; winnerSeat: number; cards: Card[] }
  | { type: 'THROW_PUNISHED'; seat: number; originalCards: Card[]; punishedCards: Card[]; reason: string }
  | {
      type: 'ROUND_RESULT';
      levelFrom: Rank;
      levelTo: Rank;
      delta: number;
      defenderPoints: number;
      attackerPoints: number;
      kittyPoints: number;
      killMultiplier: number;
      winnerTeam: number;
      winnerSide: 'DEFENDER' | 'ATTACKER';
      rolesSwapped: boolean;
      newBankerSeat: number;
      playedBySeat: Card[][];
      kittyCards: Card[];
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
  leadPattern: Pattern,
  leadSuitGroup: SuitGroup,
  levelRank: Rank,
  trumpSuit: Suit
): number {
  const requiredKind = leadPattern.kind;
  const requiredTractorLen = leadPattern.length;
  const canCompete = (p: Pattern): boolean => {
    if (requiredKind === 'SINGLE') return p.kind === 'SINGLE';
    if (requiredKind === 'PAIR') return p.kind === 'PAIR';
    if (requiredKind === 'TRACTOR') {
      return p.kind === 'TRACTOR' && p.length === requiredTractorLen;
    }
    return false;
  };

  const aCanCompete = canCompete(a);
  const bCanCompete = canCompete(b);
  if (aCanCompete !== bCanCompete) return aCanCompete ? 1 : -1;
  if (!aCanCompete && !bCanCompete) return 0;

  if (a.suitGroup !== b.suitGroup) {
    if (leadSuitGroup !== 'TRUMP') {
      if (a.suitGroup === 'TRUMP') return 1;
      if (b.suitGroup === 'TRUMP') return -1;
    }
  }
  const ka = a.topKey ?? 0;
  const kb = b.topKey ?? 0;
  if (ka !== kb) return ka - kb;
  // For exact strength ties, keep the current winner (earlier play) stable.
  // The caller only switches winner when cmp > 0.
  return 0;
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
  capturedPointCards: [Card[], Card[]] = [[], []];
  lastTrickLeadKind: 'SINGLE' | 'PAIR' | 'TRACTOR' | null = null;
  lastTrickWinnerSeat: number | null = null;
  pendingNextRound: { bankerSeat: number; levelRank: Rank } | null = null;
  roundPlayedCards: Card[][] = [];

  trumpCandidate: TrumpCandidate | null = null;
  rngSeed: number;

  constructor(config: GameConfig) {
    this.config = config;
    this.fairnessWindowMs = config.fairnessWindowMs ?? 2000;
    this.rngSeed = config.rngSeed ?? 1;
    this.hands = Array.from({ length: config.numPlayers }, () => []);
    this.roundPlayedCards = Array.from({ length: config.numPlayers }, () => []);
    this.emit({ type: 'ROOM_STATE', phase: this.phase });
  }

  emit(event: Event) {
    this.events.push(event);
  }

  setHands(hands: Card[][], kitty: Card[]) {
    this.hands = hands.map((h) => [...h]);
    this.kitty = [...kitty];
    this.roundPlayedCards = Array.from({ length: this.config.numPlayers }, () => []);
  }

  startTrumpPhase() {
    this.phase = 'FLIP_TRUMP';
    this.emit({ type: 'PHASE', phase: this.phase });
  }

  startNextRoundFromPending(): boolean {
    if (this.phase !== 'ROUND_SCORE') return false;
    if (!this.pendingNextRound) return false;

    this.config.bankerSeat = this.pendingNextRound.bankerSeat;
    this.config.levelRank = this.pendingNextRound.levelRank;
    this.pendingNextRound = null;

    this.capturedPoints = [0, 0];
    this.capturedPointCards = [[], []];
    this.lastTrickLeadKind = null;
    this.lastTrickWinnerSeat = null;
    this.trumpCandidate = null;
    this.trick = null;
    this.kitty = [];
    this.hands = Array.from({ length: this.config.numPlayers }, () => []);
    this.roundPlayedCards = Array.from({ length: this.config.numPlayers }, () => []);

    this.startTrumpPhase();
    return true;
  }

  flipTrump(seat: number, cards: Card[], nowMs: number) {
    if (this.phase !== 'FLIP_TRUMP') return;

    const strength = trumpStrength(cards, this.config.levelRank);
    if (strength === null) return;

    const suit = trumpSuitFromCards(cards, this.config.trumpSuit);
    if (!suit) return;

    const candidate: TrumpCandidate = {
      seat,
      strength,
      trumpSuit: suit,
      expiresAt: nowMs + this.fairnessWindowMs,
    };

    const shouldOverride =
      !this.trumpCandidate ||
      candidate.strength > this.trumpCandidate.strength;

    if (shouldOverride) {
      this.trumpCandidate = candidate;
    }
  }

  finalizeTrump(nowMs: number) {
    if (this.phase !== 'FLIP_TRUMP') return;
    if (!this.trumpCandidate) return;
    if (nowMs < this.trumpCandidate.expiresAt) return;

    this.config.trumpSuit = this.trumpCandidate.trumpSuit;
    this.trumpCandidate = null;
    // Banker picks up kitty before choosing which cards to bury.
    this.hands[this.config.bankerSeat] = [
      ...this.hands[this.config.bankerSeat],
      ...this.kitty
    ];
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
        if (result.stands) {
          const throwPat = analyzeThrow(played, state.levelRank, state.trumpSuit);
          if (throwPat.kind !== 'THROW') return;
          this.trick.leadPattern = throwPat;
          this.trick.leadSuitGroup = throwPat.suitGroup ?? undefined;
          this.trick.plays.push({ seat, cards: played, pattern: throwPat });
        } else {
          const pat = analyze(played, state.levelRank, state.trumpSuit);
          if (pat.kind === 'INVALID') return;
          this.trick.leadPattern = pat;
          this.trick.leadSuitGroup = pat.suitGroup ?? undefined;
          this.trick.plays.push({ seat, cards: played, pattern: pat });
          if (pat.kind === 'PAIR' || pat.kind === 'TRACTOR') {
            this.emit({ type: 'LEAD_PATTERN', seat, kind: pat.kind });
          }
        }
        if (this.trick.leadSuitGroup === 'TRUMP') this.emit({ type: 'TRUMP_LED', seat });
        for (const ev of result.events ?? []) this.emit(ev as Event);
      } else {
        this.applyPlay(seat, cards);
        this.trick.leadPattern = leadPat;
        this.trick.leadSuitGroup = leadPat.suitGroup ?? undefined;
        this.trick.plays.push({ seat, cards, pattern: leadPat });
        if (leadPat.kind === 'PAIR' || leadPat.kind === 'TRACTOR') {
          this.emit({ type: 'LEAD_PATTERN', seat, kind: leadPat.kind });
        }
        if (this.trick.leadSuitGroup === 'TRUMP') this.emit({ type: 'TRUMP_LED', seat });
        this.emit({ type: 'TRICK_UPDATE', seat, cards });
      }
    } else {
      if (!this.trick.leadPattern || !this.trick.leadSuitGroup) return;
      const res = validateFollowPlay(this.trick.leadPattern, cardIds, hand, state);
      if (!res.ok) return;
      const analyzed = analyze(cards, state.levelRank, state.trumpSuit);
      const pat =
        analyzed.kind === 'INVALID'
          ? this.trick.leadPattern.kind === 'THROW'
            ? analyzeThrow(cards, state.levelRank, state.trumpSuit)
            : {
                kind: 'INVALID' as const,
                suitGroup: suitGroup(cards[0], state.levelRank, state.trumpSuit),
                size: cards.length,
                cards: [...cards],
                reason: analyzed.reason ?? 'VALIDATED_FOLLOW_NON_STANDARD_STRUCTURE'
              }
          : analyzed;
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
    this.roundPlayedCards[seat].push(...cards);
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
        this.trick.leadPattern,
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
    this.capturedPointCards[team].push(...trickCards.filter((c) => isPointCard(c) > 0));

    this.lastTrickLeadKind = this.trick.leadPattern.kind === 'TRACTOR' || this.trick.leadPattern.kind === 'PAIR'
      ? this.trick.leadPattern.kind
      : 'SINGLE';
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
    const defenderTeam = teamOfSeat(this.config.bankerSeat);
    const attackerTeam = defenderTeam === 0 ? 1 : 0;

    const defenderPoints = this.capturedPoints[defenderTeam];
    let attackerPoints = this.capturedPoints[attackerTeam];
    const kittyPoints = handPoints(this.kitty);
    let killMultiplier = 1;

    if (this.lastTrickWinnerSeat !== null && teamOfSeat(this.lastTrickWinnerSeat) === attackerTeam) {
      killMultiplier = this.lastTrickLeadKind === 'PAIR' || this.lastTrickLeadKind === 'TRACTOR' ? 4 : 2;
      attackerPoints += kittyPoints * killMultiplier;
      this.capturedPoints[attackerTeam] = attackerPoints;
      this.capturedPointCards[attackerTeam].push(...this.kitty.filter((c) => isPointCard(c) > 0));
      const pointSteps: number[] = [];
      let running = 0;
      for (const c of this.kitty) {
        const p = isPointCard(c);
        if (p <= 0) continue;
        running += p * killMultiplier;
        pointSteps.push(running);
      }
      this.emit({
        type: 'KOU_DI',
        cards: [...this.kitty],
        pointSteps,
        total: kittyPoints * killMultiplier,
        multiplier: killMultiplier
      });
    }

    const winnerSide: 'DEFENDER' | 'ATTACKER' = attackerPoints < 80 ? 'DEFENDER' : 'ATTACKER';
    const winnerTeam = winnerSide === 'DEFENDER' ? defenderTeam : attackerTeam;

    const dealerTeam = defenderTeam as 0 | 1;
    const nextRound = resolveNextRound({
      playerCount: this.config.numPlayers,
      dealerTeam,
      bankerSeat: this.config.bankerSeat,
      sAttacker: attackerPoints,
      // Existing engine does not currently track this special condition explicitly.
      duiKou: false,
      teamLevel: {
        0: this.config.levelRank,
        1: this.config.levelRank
      }
    });

    const delta = nextRound.appliedDelta;
    const rolesSwapped = nextRound.nextDealerTeam !== dealerTeam;
    const newBankerSeat = nextRound.nextBankerSeat;

    const oldLevel = this.config.levelRank;
    const newLevel = nextRound.nextTrumpRank as Rank;

    this.phase = 'ROUND_SCORE';
    this.emit({
      type: 'ROUND_RESULT',
      levelFrom: oldLevel,
      levelTo: newLevel,
      delta,
      defenderPoints,
      attackerPoints,
      kittyPoints,
      killMultiplier,
      winnerTeam,
      winnerSide,
      rolesSwapped,
      newBankerSeat,
      playedBySeat: this.roundPlayedCards.map((cards) => [...cards]),
      kittyCards: [...this.kitty]
    });

    if (newLevel === 'A') {
      this.emit({ type: 'GAME_OVER', winnerTeam });
      this.phase = 'GAME_OVER';
      this.emit({ type: 'PHASE', phase: this.phase });
      this.config.levelRank = newLevel;
      return;
    }

    this.pendingNextRound = { bankerSeat: newBankerSeat, levelRank: newLevel };
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

function trumpSuitFromCards(cards: Card[], _fallback: Suit): Suit | null {
  if (
    cards.length === 2 &&
    (cards[0].rank === 'SJ' || cards[0].rank === 'BJ') &&
    cards[0].rank === cards[1].rank
  ) {
    return 'N';
  }

  for (const card of cards) {
    if (card.rank === 'BJ' || card.rank === 'SJ') continue;
    return card.suit as Suit;
  }
  return null;
}

import { useStore } from './store';
import type { ClientMessage, ServerMessage } from '@tractor/protocol';
import {
  playTurnNotification as _playTurnNotification,
  playTrickWinSound as _playTrickWinSound,
  playVictoryFanfare as _playVictoryFanfare,
  playDefeatSound as _playDefeatSound,
  playChatSound as _playChatSound,
  playCardPlaySound as _playCardPlaySound,
  playCardSwoosh as _playCardSwoosh,
  playTrumpDeclareFanfare as _playTrumpDeclareFanfare,
  playDealingSound as _playDealingSound,
  playKittyRevealSound as _playKittyRevealSound,
  playScreenShakeImpact as _playScreenShakeImpact,
  playLevelUpSound as _playLevelUpSound,
  playThrowPunishedSound as _playThrowPunishedSound,
  playPairLeadSound as _playPairLeadSound,
  playTractorLeadSound as _playTractorLeadSound,
  playTrickCollectSound as _playTrickCollectSound,
} from './audio';

class WsClient {
  ws: WebSocket | null = null;
  url: string;
  reconnectDelay = 500;
  shouldReconnect = true;
  lastJoin: { roomId: string; name: string; players: number } | null = null;
  forceFreshJoin = false;
  pendingJoinFallback: number | null = null;
  lastRoundResultKey: string | null = null;
  pendingRoundResultText: string | null = null;
  waitingKouDiAck = false;
  trickClearTimer: number | null = null;
  prevHandEmpty = true;
  speechLifecycleBound = false;
  speechQueue: string[] = [];
  speaking = false;

  constructor(url: string) {
    this.url = url;
  }

  private playTurnNotification() { _playTurnNotification(); }
  private playChatSound() { _playChatSound(); }
  private playTrickWinSound(isMyTeam: boolean) { _playTrickWinSound(isMyTeam); }
  private playVictoryFanfare() { _playVictoryFanfare(); }
  private playDefeatSound() { _playDefeatSound(); }
  private playCardPlaySound() { _playCardPlaySound(); }
  private playCardSwoosh(cardCount: number) { _playCardSwoosh(cardCount); }
  private playTrumpDeclareFanfare(isOverride: boolean) { _playTrumpDeclareFanfare(isOverride); }
  private playDealingSound() { _playDealingSound(); }
  private playKittyRevealSound() { _playKittyRevealSound(); }
  private playScreenShakeImpact() { _playScreenShakeImpact(); }
  private playLevelUpSound() { _playLevelUpSound(); }
  private playThrowPunishedSound() { _playThrowPunishedSound(); }
  private playPairLeadSound() { _playPairLeadSound(); }
  private playTractorLeadSound() { _playTractorLeadSound(); }
  private playTrickCollectSound() { _playTrickCollectSound(); }

  private bindSpeechLifecycle() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.speechLifecycleBound) return;
    this.speechLifecycleBound = true;
    const resumeAndFlush = () => {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
      this.flushSpeechQueue();
    };
    window.addEventListener('focus', resumeAndFlush);
    document.addEventListener('visibilitychange', resumeAndFlush);
    window.addEventListener('pointerdown', resumeAndFlush);
    window.addEventListener('keydown', resumeAndFlush);
  }

  private flushSpeechQueue() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.speaking) return;
    const text = this.speechQueue.shift();
    if (!text) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      const storeState = useStore.getState();
      utterance.lang = storeState.lang === 'en' ? 'en-US' : 'zh-CN';
      // Apply user-selected voice if available
      if (storeState.ttsVoiceName) {
        const voices = window.speechSynthesis.getVoices();
        const selected = voices.find((v) => v.name === storeState.ttsVoiceName);
        if (selected) utterance.voice = selected;
      }
      utterance.volume = 0.75;
      utterance.rate = 0.85;
      utterance.pitch = 1;
      utterance.onend = () => {
        this.speaking = false;
        this.flushSpeechQueue();
      };
      utterance.onerror = () => {
        this.speaking = false;
        this.flushSpeechQueue();
      };
      this.speaking = true;
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    } catch {
      this.speaking = false;
      // ignore speech errors
    }
  }

  private speak(text: string) {
    if (!text) return;
    const store = useStore.getState();
    // Visual announcement + event log alongside TTS
    store.pushAnnouncement(text);
    store.pushEvent(text);
    if (store.muted || store.muteTts) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.bindSpeechLifecycle();
    this.speechQueue.push(text);
    this.flushSpeechQueue();
  }

  private isEn(): boolean {
    return useStore.getState().lang === 'en';
  }

  announceNextRound() {
    this.speak(this.isEn() ? 'Next round' : '下一局开始');
  }

  private attackerScore(state: any): number {
    const defenderTeam = state.bankerSeat % 2;
    const attackerTeam = defenderTeam === 0 ? 1 : 0;
    return state.scores?.[attackerTeam] ?? 0;
  }

  private suitLabel(suit: string): string {
    if (this.isEn()) {
      if (suit === 'S') return 'spades';
      if (suit === 'H') return 'hearts';
      if (suit === 'D') return 'diamonds';
      if (suit === 'C') return 'clubs';
      return '';
    }
    if (suit === 'S') return '黑桃';
    if (suit === 'H') return '红桃';
    if (suit === 'D') return '方块';
    if (suit === 'C') return '梅花';
    return '';
  }

  private rankFromCardId(cardId: string): string {
    const parts = cardId.split('_');
    if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ')) return parts[1];
    if (parts.length === 3) return parts[2];
    return '';
  }

  private chooseDeclareMarkerCard(cardIds: string[]): string | null {
    if (!Array.isArray(cardIds) || cardIds.length === 0) return null;
    const value = (id: string) => {
      const r = this.rankFromCardId(id);
      if (r === 'BJ') return 16;
      if (r === 'SJ') return 15;
      if (r === 'A') return 14;
      if (r === 'K') return 13;
      if (r === 'Q') return 12;
      if (r === 'J') return 11;
      const n = Number(r);
      return Number.isFinite(n) ? n : 99;
    };
    return [...cardIds].sort((a, b) => value(a) - value(b) || a.localeCompare(b))[0];
  }

  private parsedCard(cardId: string): { suit: string; rank: string } | null {
    const parts = cardId.split('_');
    if (parts.length === 2 && (parts[1] === 'SJ' || parts[1] === 'BJ')) {
      return { suit: 'J', rank: parts[1] };
    }
    if (parts.length === 3) {
      return { suit: parts[1], rank: parts[2] };
    }
    return null;
  }

  private rankValue(rank: string): number {
    if (rank === '2') return 2;
    if (rank === '3') return 3;
    if (rank === '4') return 4;
    if (rank === '5') return 5;
    if (rank === '6') return 6;
    if (rank === '7') return 7;
    if (rank === '8') return 8;
    if (rank === '9') return 9;
    if (rank === '10') return 10;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    if (rank === 'A') return 14;
    if (rank === 'SJ') return 15;
    if (rank === 'BJ') return 16;
    return 0;
  }

  private trumpCardKey(cardId: string, levelRank: string, trumpSuit: string): number | null {
    const card = this.parsedCard(cardId);
    if (!card) return null;
    const group = this.cardSuitGroup(cardId, levelRank, trumpSuit);
    if (group !== 'TRUMP') return null;

    const rv = this.rankValue(card.rank);
    if (card.rank === 'BJ') return 1000;
    if (card.rank === 'SJ') return 900;

    const isLevel = card.rank === levelRank;
    const isTrumpSuit = card.suit === trumpSuit;
    if (isLevel) return 800 + (isTrumpSuit ? 50 : 0) + rv;
    if (isTrumpSuit) return 700 + rv;
    return 600 + rv;
  }

  private isPair(cards: string[]): boolean {
    if (!Array.isArray(cards) || cards.length !== 2) return false;
    const a = this.parsedCard(cards[0]);
    const b = this.parsedCard(cards[1]);
    if (!a || !b) return false;
    const suitA = a.rank === 'BJ' || a.rank === 'SJ' ? 'J' : a.suit;
    const suitB = b.rank === 'BJ' || b.rank === 'SJ' ? 'J' : b.suit;
    return a.rank === b.rank && suitA === suitB;
  }

  private trumpPlayTopKey(cards: string[], levelRank: string, trumpSuit: string): number | null {
    if (cards.length !== 1 && cards.length !== 2) return null;
    if (!cards.every((id) => this.cardSuitGroup(id, levelRank, trumpSuit) === 'TRUMP')) return null;
    if (cards.length === 2 && !this.isPair(cards)) return null;
    const keys = cards.map((id) => this.trumpCardKey(id, levelRank, trumpSuit));
    if (keys.some((k) => k === null)) return null;
    return Math.max(...(keys as number[]));
  }

  private isConsecutive(values: number[]): boolean {
    if (values.length <= 1) return true;
    const sorted = [...values].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
  }

  private isStandardLeadPattern(cards: string[], levelRank: string, trumpSuit: string): boolean {
    if (!Array.isArray(cards) || cards.length === 0) return false;
    if (cards.length === 1) return true;

    const groups = cards.map((id) => this.cardSuitGroup(id, levelRank, trumpSuit));
    if (groups.some((g) => !g) || groups.some((g) => g !== groups[0])) return false;

    if (cards.length === 2) return this.isPair(cards);
    if (cards.length % 2 !== 0) return false;

    const counts = new Map<string, number>();
    const seqValues: number[] = [];
    for (const id of cards) {
      const c = this.parsedCard(id);
      if (!c) return false;
      const suit = c.rank === 'BJ' || c.rank === 'SJ' ? 'J' : c.suit;
      const key = `${c.rank}|${suit}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of counts.entries()) {
      if (count !== 2) return false;
      const rank = key.split('|')[0];
      if (rank === 'BJ' || rank === 'SJ' || rank === levelRank) return false;
      const rv = this.rankValue(rank);
      if (!rv) return false;
      seqValues.push(rv);
    }
    return this.isConsecutive(seqValues);
  }

  private isThrowLead(
    msg: { seat: number; cards: string[] },
    state: any,
    trickSoFar: { seat: number; cards: string[] }[]
  ): boolean {
    if (!state?.levelRank || !state?.trumpSuit) return false;
    if (!Array.isArray(trickSoFar) || trickSoFar.length !== 0) return false;
    if (msg.seat !== state?.leaderSeat) return false;
    if (msg.cards.length < 2 || msg.cards.length > 8) return false;
    return !this.isStandardLeadPattern(msg.cards, state.levelRank, state.trumpSuit);
  }

  private rankSpoken(rank: string): string {
    if (this.isEn()) {
      if (rank === 'A') return 'ace';
      if (rank === 'K') return 'king';
      if (rank === 'Q') return 'queen';
      if (rank === 'J') return 'jack';
      return rank;
    }
    if (rank === 'Q') return '嘎哒';
    if (rank === 'J') return '勾子';
    if (rank === 'A') return '腰';
    return rank;
  }

  private cardSpokenName(cardId: string): string {
    const card = this.parsedCard(cardId);
    if (!card) return cardId;
    if (this.isEn()) {
      if (card.rank === 'BJ') return 'big joker';
      if (card.rank === 'SJ') return 'small joker';
      return `${this.rankSpoken(card.rank)} of ${this.suitLabel(card.suit)}`;
    }
    if (card.rank === 'BJ') return '大王';
    if (card.rank === 'SJ') return '小王';
    return `${this.suitLabel(card.suit)}${this.rankSpoken(card.rank)}`;
  }

  private seatName(seat: number): string {
    const store = useStore.getState();
    return store.publicState?.seats.find((s) => s.seat === seat)?.name || (this.isEn() ? `Seat ${seat + 1}` : `座位${seat + 1}`);
  }

  private trickWinnerSpeech(winnerSeat: number, cards: string[]): string {
    const name = this.seatName(winnerSeat);
    const cardCount = Array.isArray(cards) ? cards.length : 0;
    if (this.isEn()) {
      return cardCount > 0
        ? `${name} takes the trick, ${cardCount} cards`
        : `${name} takes the trick`;
    }
    return cardCount > 0
      ? `${name}收下这墩，${cardCount}张牌`
      : `${name}收下这墩`;
  }

  private maybeSpeakPlayedCards(
    msg: { seat: number; cards: string[] },
    state: any,
    trickSoFar: { seat: number; cards: string[] }[]
  ) {
    if (!Array.isArray(msg.cards) || msg.cards.length === 0) return;
    const levelRank = `${state?.levelRank ?? ''}`.trim();
    const trumpSuit = `${state?.trumpSuit ?? ''}`.trim();
    if (!levelRank || !trumpSuit) return;

    const name = this.seatName(msg.seat);

    const en = this.isEn();
    const sep = en ? ', ' : '，';

    if (this.isThrowLead(msg, state, trickSoFar)) {
      this.speak(`${name}${sep}${en ? 'throw' : '甩牌'}${sep}${msg.cards.map((id) => this.cardSpokenName(id)).join(sep)}`);
      return;
    }

    if (msg.cards.length === 1) {
      const singleRank = this.rankFromCardId(msg.cards[0]);
      if (singleRank === 'BJ' || singleRank === 'SJ') return;
      this.speak(`${name}${sep}${this.cardSpokenName(msg.cards[0])}`);
      return;
    }

    if (msg.cards.length === 2 && this.isPair(msg.cards)) {
      this.speak(en ? `${name}, pair of ${this.cardSpokenName(msg.cards[0])}s` : `${name}，对${this.cardSpokenName(msg.cards[0])}`);
      return;
    }

    if (msg.cards.length >= 4 && msg.cards.length % 2 === 0 && this.isStandardLeadPattern(msg.cards, levelRank, trumpSuit)) {
      const groups = new Map<string, string>();
      for (const id of msg.cards) {
        const card = this.parsedCard(id);
        if (!card) continue;
        const suit = card.rank === 'BJ' || card.rank === 'SJ' ? 'J' : card.suit;
        const key = `${card.rank}|${suit}`;
        if (!groups.has(key)) groups.set(key, this.cardSpokenName(id));
      }
      const labels = [...groups.entries()]
        .sort((a, b) => this.rankValue(a[0].split('|')[0]) - this.rankValue(b[0].split('|')[0]))
        .map((x) => en ? `pair of ${x[1]}s` : `对${x[1]}`);
      if (labels.length >= 2) {
        this.speak(`${name}${sep}${en ? 'tractor' : '拖拉机'}${sep}${labels.join(sep)}`);
        return;
      }
    }

    this.speak(`${name}${sep}${msg.cards.map((id) => this.cardSpokenName(id)).join(sep)}`);
  }

  private cardSuitGroup(cardId: string, levelRank: string, trumpSuit: string): string | null {
    const card = this.parsedCard(cardId);
    if (!card) return null;
    if (card.suit === 'J') return 'TRUMP';
    if (card.rank === levelRank) return 'TRUMP';
    if (card.suit === trumpSuit) return 'TRUMP';
    return card.suit;
  }

  private maybeSpeakTrumpKill(
    msg: { seat: number; cards: string[] },
    state: any,
    trickSoFar: { seat: number; cards: string[] }[]
  ) {
    if (!state?.trumpSuit || !state?.levelRank) return;
    const trick = Array.isArray(trickSoFar) ? trickSoFar : [];
    if (trick.length === 0) return;
    const leaderSeat = trick[0]?.seat;
    const leadFirstCard = trick[0]?.cards?.[0];
    if (leaderSeat === undefined || !leadFirstCard) return;
    if (msg.seat === leaderSeat) return;
    if (msg.cards.length !== 1 && msg.cards.length !== 2) return;

    const leadGroup = this.cardSuitGroup(leadFirstCard, state.levelRank, state.trumpSuit);
    if (!leadGroup || leadGroup === 'TRUMP') return;

    const allTrump = msg.cards.every(
      (id) => this.cardSuitGroup(id, state.levelRank, state.trumpSuit) === 'TRUMP'
    );
    if (!allTrump) return;

    const leadCardCount = Array.isArray(trick[0]?.cards) ? trick[0].cards.length : 0;
    if (leadCardCount === 2 && msg.cards.length !== 2) return;
    const incomingKey = this.trumpPlayTopKey(msg.cards, state.levelRank, state.trumpSuit);
    if (incomingKey === null) return;

    let priorBestKey: number | null = null;
    for (const p of trick.slice(1)) {
      if (!Array.isArray(p?.cards)) continue;
      if (leadCardCount === 2 && p.cards.length !== 2) continue;
      const k = this.trumpPlayTopKey(p.cards, state.levelRank, state.trumpSuit);
      if (k === null) continue;
      if (priorBestKey === null || k > priorBestKey) priorBestKey = k;
    }

    const killName = this.seatName(msg.seat);
    if (priorBestKey !== null && incomingKey > priorBestKey) {
      this.speak(this.isEn() ? `${killName}, big trump kill` : `${killName}，大毙`);
      return;
    }
    this.speak(this.isEn() ? `${killName}, trump kill` : `${killName}，毙了`);
  }

  private maybeSpeakJokers(msg: { seat: number; cards: string[] }) {
    if (!Array.isArray(msg.cards) || msg.cards.length === 0) return;
    const ranks = msg.cards.map((id) => this.rankFromCardId(id)).filter(Boolean);
    if (ranks.length !== msg.cards.length) return;
    const name = this.seatName(msg.seat);
    const en = this.isEn();
    if (ranks.every((r) => r === 'BJ')) {
      this.speak(en ? `${name}, big joker` : `${name}，大王`);
      return;
    }
    if (ranks.every((r) => r === 'SJ')) {
      this.speak(en ? `${name}, small joker` : `${name}，小王`);
    }
  }

  private maybeSpeakLevelTrump(msg: { cards: string[] }, state: any) {
    const levelRank = `${state?.levelRank ?? ''}`.trim();
    const trumpSuit = `${state?.trumpSuit ?? ''}`.trim();
    if (!levelRank) return;
    if (!trumpSuit || trumpSuit === 'N') return;
    if (!Array.isArray(msg.cards) || msg.cards.length === 0) return;
    const hasDeclaredSuitLevel = msg.cards.some((id) => {
      const card = this.parsedCard(id);
      return !!card && card.rank === levelRank && card.suit === trumpSuit;
    });
    if (!hasDeclaredSuitLevel) return;
    this.speak(this.isEn() ? `trump ${this.rankSpoken(levelRank)}` : `主${levelRank}`);
  }

  private trumpDeclaredSpeech(msg: { trumpSuit: string; cardIds: string[] }): string {
    const en = this.isEn();
    const cardIds = msg.cardIds ?? [];
    if (cardIds.length === 2) {
      const r0 = this.rankFromCardId(cardIds[0]);
      const r1 = this.rankFromCardId(cardIds[1]);
      if (r0 === 'BJ' && r1 === 'BJ') return en ? 'pair of big jokers, no trump' : '对大王，无将';
      if (r0 === 'SJ' && r1 === 'SJ') return en ? 'pair of small jokers, no trump' : '对小王，无将';
    }

    const rank = cardIds.length > 0 ? this.rankFromCardId(cardIds[0]) : '';
    const suit = this.suitLabel(msg.trumpSuit);
    if (!rank || !suit) return en ? 'trump declared' : '亮主';
    if (en) {
      return cardIds.length === 2
        ? `trump declared, pair of ${this.rankSpoken(rank)} of ${suit}`
        : `trump declared, ${this.rankSpoken(rank)} of ${suit}`;
    }
    if (cardIds.length === 2) return `亮主对${suit}${rank}`;
    return `亮主${suit}${rank}`;
  }

  private roundResultText(
    msg: Pick<
      Extract<ServerMessage, { type: 'ROUND_RESULT' }>,
      | 'winnerSide'
      | 'winnerTeam'
      | 'defenderPoints'
      | 'attackerPoints'
      | 'levelFrom'
      | 'levelTo'
      | 'delta'
      | 'rolesSwapped'
      | 'newBankerSeat'
    >,
    state: any
  ): string {
    const winnerNames = state
      ? state.seats
          .filter((s: any) => s.team === msg.winnerTeam)
          .map((s: any) => s.name || `Seat ${s.seat + 1}`)
          .join(' & ')
      : '';
    const winnerLabel =
      msg.winnerSide === 'DEFENDER'
        ? winnerNames || "Banker's team"
        : winnerNames || "Attacker's team";
    const swapLine = msg.rolesSwapped
      ? `\nRoles swapped. New banker: Seat ${msg.newBankerSeat + 1}.`
      : '';
    const finalLine =
      msg.levelTo === 'A'
        ? `\nFinal winners: ${winnerLabel}\nGame over.`
        : '';
    return `${winnerLabel} won.
Defender points: ${msg.defenderPoints}
Attacker points: ${msg.attackerPoints}
Level: ${msg.levelFrom} -> ${msg.levelTo} (+${msg.delta})${swapLine}${finalLine}`;
  }

  private maybeShowRoundPopupFromState(state: any) {
    const rr = state?.lastRoundResult;
    if (!rr) return;
    const key = `${state?.id ?? ''}:${rr.seq}`;
    if (this.lastRoundResultKey === key) return;
    this.lastRoundResultKey = key;
    const store = useStore.getState();
    const text = this.roundResultText(rr, state);
    if (this.waitingKouDiAck) {
      this.pendingRoundResultText = text;
      return;
    }
    store.setRoundPopup(text);
    store.pushToast(text.replace(/\n/g, ' '));
  }

  private speakPhasePrompts(prevState: any, nextState: any) {
    if (!nextState) return;
    if (!prevState || prevState.id !== nextState.id) return;

    const prevCards =
      Array.isArray(prevState.seats)
        ? prevState.seats.reduce((sum: number, s: any) => sum + (s.cardsLeft ?? 0), 0)
        : 0;
    const nextCards =
      Array.isArray(nextState.seats)
        ? nextState.seats.reduce((sum: number, s: any) => sum + (s.cardsLeft ?? 0), 0)
        : 0;

    const en = this.isEn();
    // Speak once when trump-declare window effectively starts: first dealt cards appear.
    if (nextState.phase === 'FLIP_TRUMP' && prevCards === 0 && nextCards > 0) {
      useStore.getState().setTrumpDeclareMarker(null);
      const rank = `${nextState.levelRank ?? ''}`.trim();
      if (rank) this.speak(en ? `playing ${this.rankSpoken(rank)}` : `打${rank}`);
      this.speak(en ? 'waiting for trump declaration' : '等待亮主');
    }

    const prevDeclareUntil = Number(prevState?.declareUntilMs ?? 0);
    const nextDeclareUntil = Number(nextState?.declareUntilMs ?? 0);
    const enteredOrExtendedDeclareWindow =
      nextState.phase === 'FLIP_TRUMP' &&
      nextDeclareUntil > Date.now() &&
      nextDeclareUntil > prevDeclareUntil;
    if (enteredOrExtendedDeclareWindow) {
      this.speak(en ? 'anyone want to override trump?' : '有人反主吗？');
    }

    if (prevState.phase !== 'BURY_KITTY' && nextState.phase === 'BURY_KITTY') {
      this.speak(en ? 'waiting for bank burial' : '等待扣底牌');
    }

    if (prevState.phase === 'BURY_KITTY' && nextState.phase === 'TRICK_PLAY') {
      this.speak(en ? 'bank buried, let\'s play' : '扣底牌完毕');
    }
  }

  private speakSurrenderVote(prevState: any, nextState: any) {
    if (!prevState || !nextState || prevState.id !== nextState.id) return;
    const prevVote = prevState.surrenderVote;
    const nextVote = nextState.surrenderVote;
    const en = this.isEn();
    if (!prevVote && nextVote) {
      const name = this.seatName(nextVote.proposerSeat);
      this.speak(en ? `${name} proposed surrender` : `${name}提议投降`);
    } else if (prevVote && !nextVote && nextState.phase === 'TRICK_PLAY') {
      this.speak(en ? 'surrender vote cancelled' : '投降投票取消');
    }
  }

  private speakKouDi(pointSteps: number[], total: number) {
    const steps = Array.isArray(pointSteps) && pointSteps.length > 0 ? pointSteps : [total];
    this.speak(this.isEn() ? `bank points: ${steps.join(', ')}` : `抠底${steps.join('，')}`);
  }

  onKouDiAcknowledged() {
    this.waitingKouDiAck = false;
    if (!this.pendingRoundResultText) return;
    const store = useStore.getState();
    const text = this.pendingRoundResultText;
    this.pendingRoundResultText = null;
    this.speak(this.isEn() ? 'victory' : '凯旋');
    store.setRoundPopup(text);
    store.pushToast(text.replace(/\n/g, ' '));
  }

  private speakPlayersReady(prevState: any, nextState: any) {
    if (!prevState || prevState.id !== nextState?.id) return;
    const prevBySeat = new Map<number, any>(
      Array.isArray(prevState.seats) ? prevState.seats.map((s: any) => [s.seat, s]) : []
    );
    const nextSeats = Array.isArray(nextState?.seats) ? nextState.seats : [];
    for (const seat of nextSeats) {
      const prevSeat = prevBySeat.get(seat.seat);
      const wasReady = !!prevSeat?.ready;
      const isReady = !!seat?.ready;
      if (!wasReady && isReady) {
        const name = (seat?.name || '').trim();
        if (name) this.speak(this.isEn() ? `${name} is ready` : `${name}准备好了`);
      }
    }
  }

  private speakLeftPlayers(prevState: any, nextState: any) {
    if (!prevState || prevState.id !== nextState?.id) return;
    const nextBySeat = new Map<number, any>(
      Array.isArray(nextState.seats) ? nextState.seats.map((s: any) => [s.seat, s]) : []
    );
    const prevSeats = Array.isArray(prevState?.seats) ? prevState.seats : [];
    for (const seat of prevSeats) {
      const nextSeat = nextBySeat.get(seat.seat);
      const wasConnected = !!seat?.connected;
      const isConnected = !!nextSeat?.connected;
      if (wasConnected && !isConnected) {
        const name = (seat?.name || '').trim();
        if (name) this.speak(this.isEn() ? `${name} left` : `${name}走了`);
      }
    }
  }

  private clearPendingJoinFallback() {
    if (this.pendingJoinFallback !== null) {
      window.clearTimeout(this.pendingJoinFallback);
      this.pendingJoinFallback = null;
    }
  }

  private clearTrickClearTimer() {
    if (this.trickClearTimer !== null) {
      window.clearTimeout(this.trickClearTimer);
      this.trickClearTimer = null;
    }
  }

  sendChat(text: string) {
    const payload = text.trim();
    if (!payload) return;
    this.send({ type: 'CHAT_SEND', text: payload });
  }

  sendLobbyChat(text: string) {
    const payload = text.trim();
    if (!payload) return;
    this.send({ type: 'LOBBY_CHAT_SEND', text: payload });
  }

  private sendJoinWithFallback(join: { roomId: string; name: string; players: number }) {
    const token = sessionStorage.getItem('sessionToken');
    const lastRoomId = sessionStorage.getItem('lastRoomId');
    this.clearPendingJoinFallback();
    if (token && lastRoomId === join.roomId) {
      this.send({ type: 'REJOIN_ROOM', roomId: join.roomId, sessionToken: token });
      this.pendingJoinFallback = window.setTimeout(() => {
        this.pendingJoinFallback = null;
        const authToken = useStore.getState().authToken ?? undefined;
        this.send({ type: 'JOIN_ROOM', ...join, authToken });
      }, 900);
      return;
    }
    const authToken = useStore.getState().authToken ?? undefined;
    this.send({ type: 'JOIN_ROOM', ...join, authToken });
  }

  connect() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.shouldReconnect = true;
    this.bindSpeechLifecycle();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      // Register with lobby chat channel
      const lobbyName = useStore.getState().nickname || 'Guest';
      this.send({ type: 'LOBBY_JOIN', name: lobbyName });

      if (this.forceFreshJoin && this.lastJoin) {
        this.sendJoinWithFallback(this.lastJoin);
        this.forceFreshJoin = false;
      } else if (this.lastJoin) {
        this.sendJoinWithFallback(this.lastJoin);
      } else {
        // Page refresh: lastJoin lost but sessionStorage may have room info
        const token = sessionStorage.getItem('sessionToken');
        const roomId = sessionStorage.getItem('lastRoomId') || sessionStorage.getItem('roomId');
        if (token && roomId) {
          const nickname = sessionStorage.getItem('nickname') || 'Player';
          this.lastJoin = { roomId, name: nickname, players: 4 };
          this.sendJoinWithFallback(this.lastJoin);
        }
      }
      this.reconnectDelay = 500;
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;
      const store = useStore.getState();
      if (msg.type === 'SESSION' || msg.type === 'ROOM_STATE') {
        this.clearPendingJoinFallback();
      }

      if (msg.type === 'SESSION') {
        store.setSession(msg.seat, msg.sessionToken);
        if (this.lastJoin) {
          store.setRoomId(this.lastJoin.roomId);
        }
      } else if (msg.type === 'AUTH_INFO') {
        // Server acknowledged our auth status — no store action needed for now
      } else if (msg.type === 'LOBBY_CHAT') {
        store.pushLobbyMessage({ name: msg.name, text: msg.text, atMs: msg.atMs });
      } else if (msg.type === 'LOBBY_HISTORY') {
        store.setLobbyHistory(msg.messages);
      } else if (msg.type === 'ROOM_STATE') {
        const prevState = store.publicState;
        store.setPublicState(msg.state);
        if (Array.isArray(msg.state?.trick) && msg.state.trick.length > 0) {
          this.clearTrickClearTimer();
          store.setTrickDisplay(msg.state.trick);
        }
        // Clear trick display when transitioning out of TRICK_PLAY
        if (
          prevState?.phase === 'TRICK_PLAY' &&
          msg.state.phase !== 'TRICK_PLAY'
        ) {
          this.clearTrickClearTimer();
          store.clearTrickDisplay();
        }
        this.maybeShowRoundPopupFromState(msg.state);
        this.speakPhasePrompts(prevState, msg.state);
        this.speakSurrenderVote(prevState, msg.state);
        this.speakPlayersReady(prevState, msg.state);
        // Play turn notification when it becomes this player's turn
        if (
          msg.state.turnSeat === store.youSeat &&
          msg.state.turnSeat !== undefined &&
          prevState?.turnSeat !== msg.state.turnSeat
        ) {
          this.playTurnNotification();
        }
        // Auto-play last card
        if (
          msg.state.phase === 'TRICK_PLAY' &&
          msg.state.turnSeat === store.youSeat &&
          store.hand.length === 1
        ) {
          const cardToPlay = store.hand[0];
          setTimeout(() => {
            const s = useStore.getState();
            if (s.hand.length === 1 && s.hand[0] === cardToPlay) {
              this.send({ type: 'PLAY', cardIds: [cardToPlay] });
            }
          }, 300);
        }
        if (
          prevState &&
          prevState.id === msg.state.id &&
          prevState.phase === 'TRICK_PLAY' &&
          msg.state.phase === 'TRICK_PLAY'
        ) {
          const prevAttacker = this.attackerScore(prevState);
          const nextAttacker = this.attackerScore(msg.state);
          if (nextAttacker > prevAttacker) {
            this.speak(this.isEn() ? `score ${nextAttacker}` : `得分${nextAttacker}`);
            store.pushFloatingPoint(nextAttacker - prevAttacker);
          }
        }
      } else if (msg.type === 'DEAL') {
        if (this.prevHandEmpty && msg.hand.length > 0) {
          this.playDealingSound();
        }
        this.prevHandEmpty = msg.hand.length === 0;
        store.setHand(msg.hand);
      } else if (msg.type === 'REQUEST_ACTION') {
        store.setLegalActions(msg.legalActions);
      } else if (msg.type === 'CHAT') {
        store.pushChatMessage({ seat: msg.seat, name: msg.name, text: msg.text, atMs: msg.atMs });
        if (msg.seat !== store.youSeat) {
          this.playChatSound();
        }
      } else if (msg.type === 'KOU_DI') {
        this.waitingKouDiAck = true;
        this.pendingRoundResultText = null;
        store.setKouDiPopup({
          cards: msg.cards,
          pointSteps: msg.pointSteps,
          total: msg.total,
          multiplier: msg.multiplier
        });
        this.playKittyRevealSound();
        this.speakKouDi(msg.pointSteps, msg.total);
      } else if (msg.type === 'ACTION_REJECTED') {
        const expected = msg.expectedIds?.length
          ? ` Expected: ${msg.expectedIds.join(', ')}`
          : '';
        store.pushToast(`${msg.action} rejected: ${msg.reason}.${expected}`);
      } else if (msg.type === 'TRUMP_DECLARED') {
        const speakerName =
          store.publicState?.seats.find((s) => s.seat === msg.seat)?.name || `Seat ${msg.seat + 1}`;
        store.pushToast(`${speakerName} 亮主`);
        const markerCard = this.chooseDeclareMarkerCard(msg.cardIds);
        if (markerCard) {
          store.setTrumpDeclareMarker({ seat: msg.seat, cardId: markerCard });
        }
        this.playTrumpDeclareFanfare(false);
        store.setTrumpDeclareFlash({ suit: msg.trumpSuit, isOverride: false });
        this.speak(this.trumpDeclaredSpeech(msg));
        if (msg.seat === store.youSeat) {
          store.pushBadge('Trump Master');
        }
      } else if (msg.type === 'TRUMP_LED') {
        const speakerName =
          store.publicState?.seats.find((s) => s.seat === msg.seat)?.name || `Seat ${msg.seat + 1}`;
        store.pushToast(`${speakerName} 调主`);
        this.playTrumpDeclareFanfare(true);
        store.setTrumpDeclareFlash({ suit: (msg as any).trumpSuit ?? '', isOverride: true });
        this.speak(this.isEn() ? 'trump override' : '调主');
      } else if (msg.type === 'LEAD_PATTERN') {
        const speakerName =
          store.publicState?.seats.find((s) => s.seat === msg.seat)?.name || `Seat ${msg.seat + 1}`;
        if (msg.kind === 'PAIR') {
          store.pushToast(`${speakerName} 对`);
          this.playPairLeadSound();
          this.speak(this.isEn() ? 'pair' : '对');
        } else {
          store.pushToast(`${speakerName} 拖拉机`);
          this.playTractorLeadSound();
          this.speak(this.isEn() ? 'tractor' : '拖拉机');
        }
      } else if (msg.type === 'THROW_PUNISHED') {
        store.pushToast(`Throw punished: ${msg.reason}`);
        this.playThrowPunishedSound();
        store.triggerThrowPunished();
        this.speak(this.isEn() ? 'throw punished, play smallest' : '捡小的出');
      } else if (msg.type === 'TRICK_UPDATE') {
        this.clearTrickClearTimer();
        const current = useStore.getState().trickDisplay;
        const next = [...current];
        const idx = next.findIndex((p) => p.seat === msg.seat);
        if (idx >= 0) next[idx] = { seat: msg.seat, cards: msg.cards };
        else next.push({ seat: msg.seat, cards: msg.cards });
        store.setTrickDisplay(next);
        this.playCardPlaySound();
        this.playCardSwoosh(msg.cards.length);
        this.playScreenShakeImpact();
        store.triggerScreenShake();
        // Determine suit color for impact particles
        const firstCard = msg.cards[0];
        const parsed = firstCard ? this.parsedCard(firstCard) : null;
        const suitColor = parsed?.suit === 'H' || parsed?.suit === 'D' ? '#e53935' : '#1a1a2e';
        store.triggerImpactBurst(suitColor);
        this.maybeSpeakJokers(msg);
        this.maybeSpeakLevelTrump(msg, store.publicState);
        this.maybeSpeakTrumpKill(msg, store.publicState, current);
        this.maybeSpeakPlayedCards(msg, store.publicState, current);
      } else if (msg.type === 'TRICK_END') {
        this.clearTrickClearTimer();
        store.setTrickWinnerSeat(msg.winnerSeat);
        this.playTrickCollectSound();
        this.playScreenShakeImpact();
        store.triggerScreenShake();
        store.triggerImpactBurst('#ffd700');
        // Play trick-win sound effect
        const myTeam = (store.youSeat ?? -1) % 2;
        const winnerTeam = msg.winnerSeat % 2;
        this.playTrickWinSound(myTeam === winnerTeam);
        this.speak(this.trickWinnerSpeech(msg.winnerSeat, msg.cards));
        this.trickClearTimer = window.setTimeout(() => {
          useStore.getState().clearTrickDisplay();
          this.trickClearTimer = null;
        }, 2000);
      } else if (msg.type === 'ROUND_RESULT') {
        // Clear any remaining trick display when round ends
        this.clearTrickClearTimer();
        store.clearTrickDisplay();
        const text = this.roundResultText(msg, store.publicState);
        // Determine win/loss for round-end effect
        const youSeat = store.youSeat;
        if (youSeat !== null) {
          const myTeam = youSeat % 2;
          const didWin = myTeam === msg.winnerTeam;
          store.setRoundEndEffect(didWin ? 'win' : 'loss');
          // Play victory or defeat sound
          if (didWin) {
            this.playVictoryFanfare();
            if (msg.delta > 0) {
              this.playLevelUpSound();
              store.setLevelUpEffect({ delta: msg.delta });
            }
          } else {
            this.playDefeatSound();
          }
          // Update win streak
          if (didWin) {
            const prev = (store as any).winStreak ?? 0;
            const next = prev + 1;
            useStore.setState({ winStreak: next });
            if (next === 3) store.pushBadge('Streak x3');
            if (next === 5) store.pushBadge('Streak x5');
          } else {
            useStore.setState({ winStreak: 0 });
          }
          // Sweep badge: attacker scored 0 and player is defender
          const defenderTeam = store.publicState?.bankerSeat !== undefined ? store.publicState.bankerSeat % 2 : -1;
          if (msg.attackerPoints === 0 && myTeam === defenderTeam) {
            store.pushBadge('Sweep');
          }
        }
        if (this.waitingKouDiAck || store.kouDiPopup) {
          this.pendingRoundResultText = text;
        } else {
          store.setRoundPopup(text);
          store.pushToast(text.replace(/\n/g, ' '));
        }
      }
    };

    this.ws.onclose = () => {
      this.clearPendingJoinFallback();
      const intentionalLeave = !this.shouldReconnect;
      this.ws = null;
      const store = useStore.getState();
      if (store.roomId && intentionalLeave) {
        // Only wipe session data on intentional leave, not on disconnect/refresh.
        // This preserves lastRoomId and sessionToken so reconnect can rejoin.
        sessionStorage.removeItem('lastRoomId');
        store.leaveRoom();
      } else if (store.roomId && !intentionalLeave) {
        // Unintentional disconnect: keep session data, just show toast
        store.pushToast('Connection lost. Reconnecting...');
      }
      this.waitingKouDiAck = false;
      this.pendingRoundResultText = null;
      this.clearTrickClearTimer();
      store.clearTrickDisplay();
      this.speechQueue = [];
      this.speaking = false;
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
      this.lastRoundResultKey = null;
      if (!this.shouldReconnect) return;
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
    };
  }

  joinRoom(join: { roomId: string; name: string; players: number }) {
    this.lastJoin = join;
    this.forceFreshJoin = true;
    this.shouldReconnect = true;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
      return;
    }
    if (this.ws.readyState === WebSocket.OPEN) {
      this.sendJoinWithFallback(join);
    }
  }

  leave() {
    this.clearPendingJoinFallback();
    this.lastJoin = null;
    this.forceFreshJoin = false;
    this.shouldReconnect = false;
    sessionStorage.removeItem('lastRoomId');
    sessionStorage.removeItem('sessionToken');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: 'LEAVE_ROOM' });
    }
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    this.waitingKouDiAck = false;
    this.pendingRoundResultText = null;
    this.clearTrickClearTimer();
    useStore.getState().clearTrickDisplay();
    this.speechQueue = [];
    this.speaking = false;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    this.lastRoundResultKey = null;
    this.ws = null;
  }

  send(msg: ClientMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  addBot(seat: number, difficulty: 'simple' | 'medium' | 'tough' | 'cheater') {
    this.send({ type: 'ADD_BOT', seat, difficulty });
  }

  removeBot(seat: number) {
    this.send({ type: 'REMOVE_BOT', seat });
  }

  standUp() {
    this.send({ type: 'STAND_UP' });
  }

  swapSeat(targetSeat: number) {
    this.send({ type: 'SWAP_SEAT', targetSeat });
  }
}

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const url = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}/ws`;
export const wsClient = new WsClient(url);

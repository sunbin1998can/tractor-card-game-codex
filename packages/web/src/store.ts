import { create } from 'zustand';
import type { PublicRoomState, PublicSeat } from '@tractor/protocol';

export type { PublicSeat };
export type PublicState = PublicRoomState;

export type Lang = 'en' | 'zh';

type LegalAction = { count: number };

export type Toast = {
  id: number;
  text: string;
  expiresAt: number;
};

let toastIdCounter = 0;

export type Badge = {
  id: number;
  label: string;
  expiresAt: number;
};

export type FloatingPoint = {
  id: number;
  value: number;
  expiresAt: number;
};

type StoreState = {
  lang: Lang;
  muted: boolean;
  muteTts: boolean;
  ttsVoiceName: string;
  eventLog: Toast[];
  roomId: string | null;
  youSeat: number | null;
  sessionToken: string | null;
  nickname: string;
  players: number;
  authToken: string | null;
  userId: string | null;
  isGuest: boolean;
  email: string | null;
  publicState: PublicState | null;
  trickDisplay: { seat: number; cards: string[] }[];
  trickWinnerSeat: number | null;
  trumpDeclareMarker: { seat: number; cardId: string } | null;
  hand: string[];
  selected: Set<string>;
  legalActions: LegalAction[];
  toasts: Toast[];
  announcements: Toast[];
  chatMessages: { seat: number; name: string; text: string; atMs: number }[];
  lobbyMessages: { name: string; text: string; atMs: number }[];
  chatHidden: boolean;
  kouDiPopup: { cards: string[]; pointSteps: number[]; total: number; multiplier: number } | null;
  roundPopup: string | null;
  roundEndEffect: 'win' | 'loss' | null;
  cardScale: number;
  winStreak: number;
  badges: Badge[];
  floatingPoints: FloatingPoint[];
  screenShake: boolean;
  impactBurst: { id: number; suitColor: string } | null;
  trumpDeclareFlash: { suit: string; isOverride: boolean } | null;
  levelUpEffect: { delta: number } | null;
  throwPunishedFlash: boolean;
  chatBubbles: Record<number, { text: string; atMs: number }>;
  bgMusic: string;
  dragActive: boolean;
  setBgMusic: (track: string) => void;
  setDragActive: (v: boolean) => void;
  setCardScale: (scale: number) => void;
  setNickname: (name: string) => void;
  setRoomId: (roomId: string) => void;
  setPlayers: (players: number) => void;
  setSession: (seat: number, token: string) => void;
  setPublicState: (state: PublicState) => void;
  setTrickDisplay: (plays: { seat: number; cards: string[] }[]) => void;
  setTrickWinnerSeat: (seat: number | null) => void;
  clearTrickDisplay: () => void;
  setTrumpDeclareMarker: (marker: { seat: number; cardId: string } | null) => void;
  setHand: (hand: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelect: () => void;
  setLegalActions: (actions: LegalAction[]) => void;
  pushToast: (msg: string) => void;
  expireToasts: () => void;
  pushAnnouncement: (msg: string, durationMs?: number) => void;
  expireAnnouncements: () => void;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  toggleMuted: () => void;
  toggleMuteTts: () => void;
  setTtsVoiceName: (name: string) => void;
  pushEvent: (msg: string) => void;
  pushChatMessage: (msg: { seat: number; name: string; text: string; atMs: number }) => void;
  pushLobbyMessage: (msg: { name: string; text: string; atMs: number }) => void;
  setLobbyHistory: (messages: { name: string; text: string; atMs: number }[]) => void;
  clearChatMessages: () => void;
  toggleChatHidden: () => void;
  setRoundPopup: (msg: string | null) => void;
  setKouDiPopup: (msg: { cards: string[]; pointSteps: number[]; total: number; multiplier: number } | null) => void;
  setAuth: (token: string, userId: string, isGuest: boolean, email?: string | null) => void;
  clearAuth: () => void;
  leaveRoom: () => void;
  setRoundEndEffect: (effect: 'win' | 'loss' | null) => void;
  pushBadge: (label: string) => void;
  expireBadges: () => void;
  pushFloatingPoint: (value: number) => void;
  expireFloatingPoints: () => void;
  triggerScreenShake: () => void;
  triggerImpactBurst: (suitColor: string) => void;
  setTrumpDeclareFlash: (flash: { suit: string; isOverride: boolean } | null) => void;
  setLevelUpEffect: (effect: { delta: number } | null) => void;
  triggerThrowPunished: () => void;
};

export const useStore = create<StoreState>((set, get) => ({
  lang: (sessionStorage.getItem('lang') as Lang) || 'zh',
  muted: sessionStorage.getItem('muted') === 'true',
  muteTts: sessionStorage.getItem('muteTts') === 'true',
  ttsVoiceName: sessionStorage.getItem('ttsVoiceName') || '',
  eventLog: [],
  roomId: sessionStorage.getItem('roomId'),
  youSeat: null,
  sessionToken: null,
  nickname: sessionStorage.getItem('nickname') || '',
  players: 4,
  authToken: localStorage.getItem('authToken'),
  userId: localStorage.getItem('userId'),
  isGuest: localStorage.getItem('isGuest') !== 'false',
  email: localStorage.getItem('email'),
  publicState: null,
  trickDisplay: [],
  trickWinnerSeat: null,
  trumpDeclareMarker: null,
  hand: [],
  selected: new Set(),
  legalActions: [],
  toasts: [],
  announcements: [],
  chatMessages: [],
  lobbyMessages: [],
  chatHidden: sessionStorage.getItem('chatHidden') !== 'false',
  kouDiPopup: null,
  roundPopup: null,
  roundEndEffect: null,
  cardScale: Number(sessionStorage.getItem('cardScale')) || 1.5,
  winStreak: 0,
  badges: [],
  floatingPoints: [],
  screenShake: false,
  impactBurst: null,
  trumpDeclareFlash: null,
  levelUpEffect: null,
  throwPunishedFlash: false,
  chatBubbles: {},
  bgMusic: sessionStorage.getItem('bgMusic') || 'none',
  dragActive: false,
  setBgMusic: (track) => {
    sessionStorage.setItem('bgMusic', track);
    set({ bgMusic: track });
  },
  setDragActive: (v) => set({ dragActive: v }),
  setCardScale: (scale) => {
    sessionStorage.setItem('cardScale', String(scale));
    set({ cardScale: scale });
  },
  setNickname: (name) => {
    sessionStorage.setItem('nickname', name);
    set({ nickname: name });
  },
  setRoomId: (roomId) => {
    sessionStorage.setItem('roomId', roomId);
    sessionStorage.setItem('lastRoomId', roomId);
    set({ roomId });
  },
  setPlayers: (players) => set({ players }),
  setSession: (seat, token) => {
    sessionStorage.setItem('sessionToken', token);
    set({ youSeat: seat, sessionToken: token });
  },
  setPublicState: (state) => {
    const current = get();
    // Detect if our seat was removed (e.g. STAND_UP) — clear youSeat
    if (current.youSeat !== null && state.seats && !state.seats.some((s) => s.seat === current.youSeat)) {
      set({ publicState: state, youSeat: null, hand: [], selected: new Set(), legalActions: [] });
      return;
    }
    set({ publicState: state });
  },
  setTrickDisplay: (plays) => set({ trickDisplay: plays }),
  setTrickWinnerSeat: (seat) => set({ trickWinnerSeat: seat }),
  clearTrickDisplay: () => set({ trickDisplay: [], trickWinnerSeat: null }),
  setTrumpDeclareMarker: (marker) => set({ trumpDeclareMarker: marker }),
  setHand: (hand) => {
    const handSet = new Set(hand);
    const selected = new Set([...get().selected].filter((id) => handSet.has(id)));
    set({ hand, selected });
  },
  toggleSelect: (id) => {
    const next = new Set(get().selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ selected: next });
  },
  clearSelect: () => set({ selected: new Set() }),
  setLegalActions: (actions) => set({ legalActions: actions }),
  pushToast: (msg) => {
    const toast: Toast = { id: ++toastIdCounter, text: msg, expiresAt: Date.now() + 4000 };
    const now = Date.now();
    const next = [...get().toasts.filter((t) => t.expiresAt > now), toast].slice(-5);
    set({ toasts: next });
  },
  expireToasts: () => {
    const now = Date.now();
    const filtered = get().toasts.filter((t) => t.expiresAt > now);
    if (filtered.length !== get().toasts.length) set({ toasts: filtered });
  },
  pushAnnouncement: (msg, durationMs = 3000) => {
    const a: Toast = { id: ++toastIdCounter, text: msg, expiresAt: Date.now() + durationMs };
    const now = Date.now();
    const next = [...get().announcements.filter((t) => t.expiresAt > now), a].slice(-3);
    set({ announcements: next });
  },
  expireAnnouncements: () => {
    const now = Date.now();
    const filtered = get().announcements.filter((t) => t.expiresAt > now);
    if (filtered.length !== get().announcements.length) set({ announcements: filtered });
  },
  setLang: (lang) => {
    sessionStorage.setItem('lang', lang);
    set({ lang });
  },
  toggleLang: () => {
    const next = get().lang === 'en' ? 'zh' : 'en';
    sessionStorage.setItem('lang', next);
    set({ lang: next });
  },
  toggleMuted: () => {
    const next = !get().muted;
    sessionStorage.setItem('muted', String(next));
    set({ muted: next });
    if (next) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  },
  toggleMuteTts: () => {
    const next = !get().muteTts;
    sessionStorage.setItem('muteTts', String(next));
    set({ muteTts: next });
    if (next) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  },
  setTtsVoiceName: (name) => {
    sessionStorage.setItem('ttsVoiceName', name);
    set({ ttsVoiceName: name });
  },
  pushEvent: (msg) => {
    const evt: Toast = { id: ++toastIdCounter, text: msg, expiresAt: Date.now() + 30000 };
    const next = [...get().eventLog, evt].slice(-20);
    set({ eventLog: next });
  },
  pushChatMessage: (msg) => {
    const next = [...get().chatMessages, msg].slice(-50);
    const bubbles = { ...get().chatBubbles, [msg.seat]: { text: msg.text, atMs: msg.atMs } };
    set({ chatMessages: next, chatBubbles: bubbles });
    // Auto-clear bubble after 5 seconds
    setTimeout(() => {
      const current = useStore.getState().chatBubbles[msg.seat];
      if (current && current.atMs === msg.atMs) {
        const updated = { ...useStore.getState().chatBubbles };
        delete updated[msg.seat];
        useStore.setState({ chatBubbles: updated });
      }
    }, 5000);
  },
  pushLobbyMessage: (msg) => {
    const next = [...get().lobbyMessages, msg].slice(-100);
    set({ lobbyMessages: next });
  },
  setLobbyHistory: (messages) => set({ lobbyMessages: messages.slice(-100) }),
  clearChatMessages: () => set({ chatMessages: [] }),
  toggleChatHidden: () => {
    const next = !get().chatHidden;
    sessionStorage.setItem('chatHidden', String(next));
    set({ chatHidden: next });
  },
  setKouDiPopup: (msg) => set({ kouDiPopup: msg }),
  setRoundPopup: (msg) => set({ roundPopup: msg }),
  setAuth: (token, userId, isGuest, email) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('isGuest', String(isGuest));
    if (email) localStorage.setItem('email', email);
    else localStorage.removeItem('email');
    set({ authToken: token, userId, isGuest, email: email ?? null });
  },
  clearAuth: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('isGuest');
    localStorage.removeItem('email');
    set({ authToken: null, userId: null, isGuest: true, email: null });
  },
  setRoundEndEffect: (effect) => set({ roundEndEffect: effect }),
  pushBadge: (label) => {
    const badge: Badge = { id: ++toastIdCounter, label, expiresAt: Date.now() + 4000 };
    const now = Date.now();
    const next = [...get().badges.filter((b) => b.expiresAt > now), badge].slice(-5);
    set({ badges: next });
  },
  expireBadges: () => {
    const now = Date.now();
    const filtered = get().badges.filter((b) => b.expiresAt > now);
    if (filtered.length !== get().badges.length) set({ badges: filtered });
  },
  pushFloatingPoint: (value) => {
    const pt: FloatingPoint = { id: ++toastIdCounter, value, expiresAt: Date.now() + 2000 };
    const now = Date.now();
    const next = [...get().floatingPoints.filter((p) => p.expiresAt > now), pt].slice(-5);
    set({ floatingPoints: next });
  },
  expireFloatingPoints: () => {
    const now = Date.now();
    const filtered = get().floatingPoints.filter((p) => p.expiresAt > now);
    if (filtered.length !== get().floatingPoints.length) set({ floatingPoints: filtered });
  },
  triggerScreenShake: () => {
    set({ screenShake: true });
    setTimeout(() => useStore.setState({ screenShake: false }), 300);
  },
  triggerImpactBurst: (suitColor) => {
    set({ impactBurst: { id: ++toastIdCounter, suitColor } });
    setTimeout(() => useStore.setState({ impactBurst: null }), 500);
  },
  setTrumpDeclareFlash: (flash) => {
    set({ trumpDeclareFlash: flash });
    if (flash) setTimeout(() => useStore.setState({ trumpDeclareFlash: null }), 1000);
  },
  setLevelUpEffect: (effect) => {
    set({ levelUpEffect: effect });
    if (effect) setTimeout(() => useStore.setState({ levelUpEffect: null }), 2500);
  },
  triggerThrowPunished: () => {
    set({ throwPunishedFlash: true });
    setTimeout(() => useStore.setState({ throwPunishedFlash: false }), 600);
  },
  leaveRoom: () => {
    sessionStorage.removeItem('roomId');
    const prevToken = get().sessionToken || sessionStorage.getItem('sessionToken');
    set({
      roomId: null,
      youSeat: null,
      sessionToken: prevToken,
      publicState: null,
      trickDisplay: [],
      trickWinnerSeat: null,
      trumpDeclareMarker: null,
      hand: [],
      selected: new Set(),
      legalActions: [],
      toasts: [],
      announcements: [],
      eventLog: [],
      chatMessages: [],
      kouDiPopup: null,
      roundPopup: null,
      roundEndEffect: null,
      badges: [],
      floatingPoints: [],
      screenShake: false,
      impactBurst: null,
      trumpDeclareFlash: null,
      levelUpEffect: null,
      throwPunishedFlash: false,
      dragActive: false
    });
  }
}));

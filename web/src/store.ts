import { create } from 'zustand';

export type PublicSeat = {
  seat: number;
  name: string;
  team: number;
  connected: boolean;
  ready: boolean;
  cardsLeft: number;
};

export type PublicState = {
  id: string;
  players: number;
  seats: PublicSeat[];
  phase: string;
  bankerSeat: number;
  leaderSeat?: number;
  turnSeat?: number;
  trumpSuit: string;
  levelRank: string;
  scores: [number, number];
  capturedPointCards: [string[], string[]];
  kittyCount: number;
  declareSeat?: number;
  declareUntilMs?: number;
  declareEnabled?: boolean;
  noSnatchSeats?: number[];
  trick?: { seat: number; cards: string[] }[];
  lastRoundResult?: {
    seq: number;
    levelFrom: string;
    levelTo: string;
    delta: number;
    defenderPoints: number;
    attackerPoints: number;
    kittyPoints: number;
    killMultiplier: number;
    winnerTeam: number;
    winnerSide: 'DEFENDER' | 'ATTACKER';
    rolesSwapped: boolean;
    newBankerSeat: number;
    playedBySeat: string[][];
    kittyCards: string[];
  };
};

type LegalAction = { count: number };

export type Toast = {
  id: number;
  text: string;
  expiresAt: number;
};

let toastIdCounter = 0;

type StoreState = {
  roomId: string | null;
  youSeat: number | null;
  sessionToken: string | null;
  nickname: string;
  players: number;
  publicState: PublicState | null;
  trickDisplay: { seat: number; cards: string[] }[];
  trumpDeclareMarker: { seat: number; cardId: string } | null;
  hand: string[];
  selected: Set<string>;
  legalActions: LegalAction[];
  toasts: Toast[];
  announcements: Toast[];
  chatMessages: { seat: number; name: string; text: string; atMs: number }[];
  kouDiPopup: { cards: string[]; pointSteps: number[]; total: number; multiplier: number } | null;
  roundPopup: string | null;
  setNickname: (name: string) => void;
  setRoomId: (roomId: string) => void;
  setPlayers: (players: number) => void;
  setSession: (seat: number, token: string) => void;
  setPublicState: (state: PublicState) => void;
  setTrickDisplay: (plays: { seat: number; cards: string[] }[]) => void;
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
  pushChatMessage: (msg: { seat: number; name: string; text: string; atMs: number }) => void;
  clearChatMessages: () => void;
  setRoundPopup: (msg: string | null) => void;
  setKouDiPopup: (msg: { cards: string[]; pointSteps: number[]; total: number; multiplier: number } | null) => void;
  leaveRoom: () => void;
};

export const useStore = create<StoreState>((set, get) => ({
  roomId: sessionStorage.getItem('roomId'),
  youSeat: null,
  sessionToken: null,
  nickname: sessionStorage.getItem('nickname') || '',
  players: 4,
  publicState: null,
  trickDisplay: [],
  trumpDeclareMarker: null,
  hand: [],
  selected: new Set(),
  legalActions: [],
  toasts: [],
  announcements: [],
  chatMessages: [],
  kouDiPopup: null,
  roundPopup: null,
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
  setPublicState: (state) => set({ publicState: state }),
  setTrickDisplay: (plays) => set({ trickDisplay: plays }),
  clearTrickDisplay: () => set({ trickDisplay: [] }),
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
  pushChatMessage: (msg) => {
    const next = [...get().chatMessages, msg].slice(-50);
    set({ chatMessages: next });
  },
  clearChatMessages: () => set({ chatMessages: [] }),
  setKouDiPopup: (msg) => set({ kouDiPopup: msg }),
  setRoundPopup: (msg) => set({ roundPopup: msg }),
  leaveRoom: () => {
    sessionStorage.removeItem('roomId');
    const prevToken = get().sessionToken || sessionStorage.getItem('sessionToken');
    set({
      roomId: null,
      youSeat: null,
      sessionToken: prevToken,
      publicState: null,
      trickDisplay: [],
      trumpDeclareMarker: null,
      hand: [],
      selected: new Set(),
      legalActions: [],
      toasts: [],
      announcements: [],
      chatMessages: [],
      kouDiPopup: null,
      roundPopup: null
    });
  }
}));

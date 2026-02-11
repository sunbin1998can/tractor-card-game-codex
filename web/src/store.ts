import { create } from 'zustand';

export type PublicSeat = {
  seat: number;
  name: string;
  team: number;
  connected: boolean;
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
  kittyCount: number;
  trick?: { seat: number; cards: string[] }[];
};

type LegalAction = { count: number };

type StoreState = {
  roomId: string | null;
  youSeat: number | null;
  sessionToken: string | null;
  nickname: string;
  players: number;
  publicState: PublicState | null;
  hand: string[];
  selected: Set<string>;
  legalActions: LegalAction[];
  toasts: string[];
  setNickname: (name: string) => void;
  setRoomId: (roomId: string) => void;
  setPlayers: (players: number) => void;
  setSession: (seat: number, token: string) => void;
  setPublicState: (state: PublicState) => void;
  setHand: (hand: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelect: () => void;
  setLegalActions: (actions: LegalAction[]) => void;
  pushToast: (msg: string) => void;
};

export const useStore = create<StoreState>((set, get) => ({
  roomId: localStorage.getItem('roomId'),
  youSeat: null,
  sessionToken: null,
  nickname: localStorage.getItem('nickname') || '',
  players: 4,
  publicState: null,
  hand: [],
  selected: new Set(),
  legalActions: [],
  toasts: [],
  setNickname: (name) => {
    localStorage.setItem('nickname', name);
    set({ nickname: name });
  },
  setRoomId: (roomId) => {
    localStorage.setItem('roomId', roomId);
    set({ roomId });
  },
  setPlayers: (players) => set({ players }),
  setSession: (seat, token) => {
    localStorage.setItem('sessionToken', token);
    set({ youSeat: seat, sessionToken: token });
  },
  setPublicState: (state) => set({ publicState: state }),
  setHand: (hand) => set({ hand }),
  toggleSelect: (id) => {
    const next = new Set(get().selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    set({ selected: next });
  },
  clearSelect: () => set({ selected: new Set() }),
  setLegalActions: (actions) => set({ legalActions: actions }),
  pushToast: (msg) => {
    const next = [...get().toasts, msg].slice(-3);
    set({ toasts: next });
  }
}));

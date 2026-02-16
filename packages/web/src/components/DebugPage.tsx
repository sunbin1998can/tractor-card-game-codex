import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, type PublicSeat, type PublicState } from '../store';
import { playTurnNotification, playTrickWinSound, playVictoryFanfare, playCardPlaySound } from '../audio';
import GameTable, { SeatSidebar } from './GameTable';
import Hand from './Hand';
import ActionPanel from './ActionPanel';
import ScoreBoard from './ScoreBoard';
import RoundPopup from './RoundPopup';
import RoundEndOverlay from './RoundEndOverlay';
import FloatingPoints from './FloatingPoints';
import GameBadges from './GameBadges';
import ChatBox from './ChatBox';
import EventLog from './EventLog';
import Toasts from './Toasts';
import KouDiPopup from './KouDiPopup';

type Tab = 'lobby' | 'game' | 'round-result' | 'kou-di' | 'badges';
type DebugPlayerCount = 4 | 6;

function DebugLabel({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="debug-label-wrap">
      <span className="debug-label-tag">{name}</span>
      {children}
    </div>
  );
}

const MOCK_SEATS_4 = [
  { seat: 0, name: 'Alice', team: 0, connected: true, ready: true, cardsLeft: 18 },
  { seat: 1, name: 'Bob', team: 1, connected: true, ready: true, cardsLeft: 18 },
  { seat: 2, name: 'Charlie', team: 0, connected: true, ready: false, cardsLeft: 18 },
  { seat: 3, name: 'Diana', team: 1, connected: false, ready: false, cardsLeft: 18 },
];

const MOCK_HAND = [
  '0_S_A', '1_S_A', '0_S_K', '0_S_Q', '0_S_J', '0_S_10', '0_S_9', '0_S_8',
  '0_H_K', '0_H_Q', '0_H_J', '0_H_10', '0_H_9',
  '0_D_A', '0_D_K', '0_D_Q',
  '0_C_5', '0_C_10',
  '0_SJ', '1_BJ',
  '0_S_5', '0_H_5', '0_D_5',
  '0_S_2', '1_S_2',
];

const MOCK_TRICK = [
  { seat: 0, cards: ['0_S_A', '1_S_A'] },
  { seat: 1, cards: ['0_S_K', '0_S_Q'] },
  { seat: 2, cards: ['0_H_3', '0_H_4'] },
];

const MOCK_SEATS_6 = [
  { seat: 0, name: 'Alice', team: 0, connected: true, ready: true, cardsLeft: 18 },
  { seat: 1, name: 'Bob', team: 1, connected: true, ready: true, cardsLeft: 18 },
  { seat: 2, name: 'Charlie', team: 0, connected: true, ready: true, cardsLeft: 18 },
  { seat: 3, name: 'Diana', team: 1, connected: true, ready: false, cardsLeft: 18 },
  { seat: 4, name: 'Eve', team: 0, connected: false, ready: false, cardsLeft: 18 },
  { seat: 5, name: 'Frank', team: 1, connected: true, ready: true, cardsLeft: 18 },
];

const MOCK_STATE = {
  id: 'debug-room',
  players: 4,
  seats: MOCK_SEATS_4,
  teamLevels: ['5', '3'] as [string, string],
  phase: 'TRICK_PLAY',
  bankerSeat: 0,
  leaderSeat: 0,
  turnSeat: 0,
  trumpSuit: 'S',
  levelRank: '5',
  scores: [45, 30] as [number, number],
  capturedPointCards: [[], []] as [string[], string[]],
  kittyCount: 8,
  trick: MOCK_TRICK,
};

const DEBUG_PLAYER_COUNTS: DebugPlayerCount[] = [4, 6];
const DEBUG_SEAT_CONFIGS: Record<DebugPlayerCount, PublicSeat[]> = {
  4: MOCK_SEATS_4,
  6: MOCK_SEATS_6,
};

function createMockStateForSeats(seats: PublicSeat[]): PublicState {
  return {
    ...MOCK_STATE,
    players: seats.length,
    seats,
  };
}

const CARDS_PER_HAND: Record<DebugPlayerCount, number> = {
  4: 24,
  6: 16,
};

const HAND_BATCH_SIZE = 4;

function handForPlayers(count: DebugPlayerCount) {
  return MOCK_HAND.slice(0, CARDS_PER_HAND[count]);
}

const MOCK_ROUND_RESULT = {
  seq: 1,
  levelFrom: '3',
  levelTo: '5',
  delta: 2,
  defenderPoints: 45,
  attackerPoints: 75,
  kittyPoints: 20,
  killMultiplier: 1,
  winnerTeam: 1,
  winnerSide: 'ATTACKER' as const,
  rolesSwapped: true,
  newBankerSeat: 1,
  playedBySeat: [
    ['0_S_A', '1_S_A', '0_S_K', '0_S_Q', '0_H_K', '0_H_Q', '0_H_J', '0_H_10', '0_S_9', '0_S_8', '0_D_A', '0_D_K', '0_D_Q', '0_C_5', '0_C_10', '0_SJ', '1_BJ', '0_S_5'],
    ['0_H_A', '1_H_A', '0_H_K', '0_H_9', '0_D_10', '0_D_9', '0_D_8', '0_C_A', '0_C_K', '0_C_Q', '0_C_J', '0_C_9', '0_C_8', '0_D_J', '0_D_7', '0_D_6', '1_SJ', '0_H_5'],
    ['0_S_J', '0_S_10', '0_S_7', '0_S_6', '0_S_3', '0_H_8', '0_H_7', '0_H_6', '0_H_3', '0_D_5', '0_D_4', '0_D_3', '0_C_7', '0_C_6', '0_C_4', '0_C_3', '0_C_2', '0_S_4'],
    ['1_S_K', '1_S_Q', '1_S_J', '1_S_10', '1_S_9', '1_S_8', '1_S_7', '1_H_8', '1_H_7', '1_H_6', '1_H_4', '1_H_3', '1_D_A', '1_D_K', '1_D_Q', '1_C_A', '1_C_K', '1_S_6'],
  ],
  kittyCards: ['0_H_2', '1_H_2', '0_D_2', '1_D_2', '0_C_2', '1_C_2', '0_S_3', '1_S_3'],
  trickHistory: [
    { plays: [{ seat: 0, cards: ['0_S_A', '1_S_A'] }, { seat: 1, cards: ['0_H_A', '1_H_A'] }, { seat: 2, cards: ['0_S_J', '0_S_10'] }, { seat: 3, cards: ['1_S_K', '1_S_Q'] }], winnerSeat: 0 },
    { plays: [{ seat: 0, cards: ['0_S_K'] }, { seat: 1, cards: ['0_D_10'] }, { seat: 2, cards: ['0_S_7'] }, { seat: 3, cards: ['1_S_J'] }], winnerSeat: 0 },
    { plays: [{ seat: 0, cards: ['0_H_K', '0_H_Q'] }, { seat: 1, cards: ['0_H_K', '0_H_9'] }, { seat: 2, cards: ['0_H_8', '0_H_7'] }, { seat: 3, cards: ['1_H_8', '1_H_7'] }], winnerSeat: 0 },
    { plays: [{ seat: 0, cards: ['0_S_Q'] }, { seat: 1, cards: ['0_D_9'] }, { seat: 2, cards: ['0_S_6'] }, { seat: 3, cards: ['1_S_10'] }], winnerSeat: 3 },
    { plays: [{ seat: 3, cards: ['1_D_A'] }, { seat: 0, cards: ['0_D_A'] }, { seat: 1, cards: ['0_D_8'] }, { seat: 2, cards: ['0_D_5'] }], winnerSeat: 0 },
  ],
};

const MOCK_KOUDI = {
  cards: ['0_H_5', '1_H_5', '0_D_10', '1_D_10', '0_C_K', '1_C_K', '0_S_5', '1_S_5'],
  pointSteps: [10, 20, 40, 80],
  total: 80,
  multiplier: 4,
};

/* ------------------------------------------------------------------ */
/*  Scripted trick data for the simulation                             */
/* ------------------------------------------------------------------ */

// Seat 0 plays come from MOCK_HAND so they animate out of the user's hand.
// Other seats play arbitrary cards.
const SCRIPTED_TRICKS_4: {
  leader: number;
  plays: { seat: number; cards: string[] }[];
  winnerSeat: number;
  points: number;
}[] = [
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_A', '1_S_A'] },
      { seat: 1, cards: ['0_H_A', '1_H_A'] },
      { seat: 2, cards: ['0_S_7', '0_S_6'] },
      { seat: 3, cards: ['1_S_K', '1_S_Q'] },
    ],
    winnerSeat: 0,
    points: 10,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_K'] },
      { seat: 1, cards: ['0_D_10'] },
      { seat: 2, cards: ['0_H_3'] },
      { seat: 3, cards: ['1_S_J'] },
    ],
    winnerSeat: 0,
    points: 20,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_H_K', '0_H_Q'] },
      { seat: 1, cards: ['0_C_A', '0_C_K'] },
      { seat: 2, cards: ['0_H_8', '0_H_7'] },
      { seat: 3, cards: ['1_H_8', '1_H_7'] },
    ],
    winnerSeat: 0,
    points: 10,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_Q'] },
      { seat: 1, cards: ['0_D_9'] },
      { seat: 2, cards: ['0_S_3'] },
      { seat: 3, cards: ['1_S_10'] },
    ],
    winnerSeat: 3,
    points: 10,
  },
  {
    leader: 3,
    plays: [
      { seat: 3, cards: ['1_D_A'] },
      { seat: 0, cards: ['0_D_A'] },
      { seat: 1, cards: ['0_D_8'] },
      { seat: 2, cards: ['0_D_4'] },
    ],
    winnerSeat: 0,
    points: 0,
  },
];

const SCRIPTED_TRICKS_6: typeof SCRIPTED_TRICKS_4 = [
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_A', '1_S_A'] },
      { seat: 1, cards: ['0_H_A', '1_H_A'] },
      { seat: 2, cards: ['0_S_7', '0_S_6'] },
      { seat: 3, cards: ['1_S_K', '1_S_Q'] },
      { seat: 4, cards: ['0_C_9', '0_C_8'] },
      { seat: 5, cards: ['1_D_K', '1_D_Q'] },
    ],
    winnerSeat: 0,
    points: 10,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_K'] },
      { seat: 1, cards: ['0_D_10'] },
      { seat: 2, cards: ['0_H_3'] },
      { seat: 3, cards: ['1_S_J'] },
      { seat: 4, cards: ['0_C_J'] },
      { seat: 5, cards: ['1_D_J'] },
    ],
    winnerSeat: 0,
    points: 20,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_H_K', '0_H_Q'] },
      { seat: 1, cards: ['0_C_A', '0_C_K'] },
      { seat: 2, cards: ['0_H_8', '0_H_7'] },
      { seat: 3, cards: ['1_H_8', '1_H_7'] },
      { seat: 4, cards: ['0_D_7', '0_D_6'] },
      { seat: 5, cards: ['1_C_Q', '1_C_J'] },
    ],
    winnerSeat: 0,
    points: 10,
  },
  {
    leader: 0,
    plays: [
      { seat: 0, cards: ['0_S_Q'] },
      { seat: 1, cards: ['0_D_9'] },
      { seat: 2, cards: ['0_S_3'] },
      { seat: 3, cards: ['1_S_10'] },
      { seat: 4, cards: ['0_C_7'] },
      { seat: 5, cards: ['1_D_7'] },
    ],
    winnerSeat: 3,
    points: 10,
  },
  {
    leader: 3,
    plays: [
      { seat: 3, cards: ['1_D_A'] },
      { seat: 0, cards: ['0_D_A'] },
      { seat: 1, cards: ['0_D_8'] },
      { seat: 2, cards: ['0_D_4'] },
      { seat: 4, cards: ['0_S_5'] },
      { seat: 5, cards: ['1_S_5'] },
    ],
    winnerSeat: 0,
    points: 0,
  },
];

function getScriptedTricksForPlayers(count: number) {
  return count === 6 ? SCRIPTED_TRICKS_6 : SCRIPTED_TRICKS_4;
}

/* ------------------------------------------------------------------ */
/*  useSimulation hook                                                  */
/* ------------------------------------------------------------------ */

function useSimulation(active: boolean, seatConfig: PublicSeat[], playerCount: DebugPlayerCount) {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelledRef = useRef(false);

  const clearTimers = useCallback(() => {
    cancelledRef.current = true;
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const delay = useCallback((ms: number): Promise<void> => {
    return new Promise((resolve) => {
      if (cancelledRef.current) return;
      const t = setTimeout(() => {
        const idx = timersRef.current.indexOf(t);
        if (idx !== -1) timersRef.current.splice(idx, 1);
        if (!cancelledRef.current) resolve();
      }, ms);
      timersRef.current.push(t);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    cancelledRef.current = false;
    const totalPlayers = seatConfig.length;
    const trickSequence = getScriptedTricksForPlayers(totalPlayers);
    const baseState = createMockStateForSeats(seatConfig);

    const store = useStore.getState;
    const ss = useStore.setState;

    // Helper to update public state fields
    const updatePublic = (patch: Record<string, unknown>) => {
      const cur = store().publicState;
      if (cur) ss({ publicState: { ...cur, ...patch } as any });
    };

    const updateSeatCards = (seatIdx: number, delta: number) => {
      const cur = store().publicState;
      if (!cur) return;
      const seats = cur.seats.map((s: any) =>
        s.seat === seatIdx ? { ...s, cardsLeft: Math.max(0, s.cardsLeft + delta) } : s,
      );
      ss({ publicState: { ...cur, seats } as any });
    };

    const cardsPerSeat = CARDS_PER_HAND[playerCount];
    const handCopy = handForPlayers(playerCount);
    const batchSize = HAND_BATCH_SIZE;

    async function runLoop() {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelledRef.current) return;

        /* ============ Phase 1: Initialize & Deal ============ */
        store().setRoomId('debug-room');
        ss({ youSeat: 0, sessionToken: 'debug-token' });
        store().setHand([]);
        store().clearTrickDisplay();
        store().setRoundPopup(null);
        ss({ kouDiPopup: null, roundEndEffect: null });
        store().setLegalActions([]);

        // Set initial state with 0 cards
        const initialSeats = seatConfig.map((s) => ({ ...s, cardsLeft: 0 }));
        store().setPublicState({
          ...baseState,
          seats: initialSeats,
          scores: [0, 0],
          trick: [],
          turnSeat: -1,
        } as any);

        // Deal cards into hand in batches
        for (let i = 0; i < handCopy.length; i += batchSize) {
          if (cancelledRef.current) return;
          const batch = handCopy.slice(0, i + batchSize);
          store().setHand(batch);
          // Update all seats' card counts proportionally
          const dealtPerSeat = Math.min(i + batchSize, cardsPerSeat);
          const seatCounts = seatConfig.map((s) => ({
            ...s,
            cardsLeft: dealtPerSeat,
          }));
          updatePublic({ seats: seatCounts });
          await delay(150);
        }

        // All cards dealt — set final hand count
        const fullSeats = seatConfig.map((s) => ({ ...s, cardsLeft: cardsPerSeat }));
        updatePublic({ seats: fullSeats, turnSeat: 0 });
        store().setLegalActions([{ count: 2 }]);
        await delay(500);

        /* ============ Phase 2: Play tricks ============ */
        let currentHand = [...MOCK_HAND];
        let scores: [number, number] = [0, 0];

        for (let ti = 0; ti < trickSequence.length; ti++) {
          if (cancelledRef.current) return;
          const trick = trickSequence[ti];

          // Clear trick display for new trick
          store().clearTrickDisplay();
          updatePublic({ leaderSeat: trick.leader, trick: [] });
          await delay(300);

          // Determine play order from leader
          const order = Array.from({ length: totalPlayers }, (_, i) => (trick.leader + i) % totalPlayers);
          const trickPlays: { seat: number; cards: string[] }[] = [];

          for (const seatIdx of order) {
            if (cancelledRef.current) return;
            const play = trick.plays.find((p) => p.seat === seatIdx)!;

            // Update turn seat
            updatePublic({ turnSeat: seatIdx });
            if (seatIdx === 0) playTurnNotification();

            await delay(600);

            // Add this play to trick display
            trickPlays.push(play);
            store().setTrickDisplay([...trickPlays]);
            updatePublic({ trick: [...trickPlays] });
            playCardPlaySound();

            // If seat 0, remove cards from hand
            if (seatIdx === 0) {
              currentHand = currentHand.filter((c) => !play.cards.includes(c));
              store().setHand([...currentHand]);
            }

            // Decrease cards left
            updateSeatCards(seatIdx, -play.cards.length);

            await delay(400);
          }

          // All plays in — show winner
          store().setTrickWinnerSeat(trick.winnerSeat);
          updatePublic({ turnSeat: -1 });
          playTrickWinSound(trick.winnerSeat % 2 === 0);
          await delay(2000);

          // Update scores
          if (trick.points > 0) {
            const team = trick.winnerSeat % 2 === 0 ? 0 : 1;
            scores = [...scores] as [number, number];
            scores[team] += trick.points;
            updatePublic({ scores: [...scores] });
            store().pushFloatingPoint(trick.points);
          }

          // Clear trick
          store().clearTrickDisplay();
          await delay(500);
        }

        /* ============ Phase 3: Round end ============ */
        if (cancelledRef.current) return;

        store().setRoundEndEffect('win');
        playVictoryFanfare();
        store().pushBadge('Trump Master');
        await delay(300);
        store().pushBadge('Streak x3');
        await delay(300);
        store().pushBadge('Sweep');

        await delay(2500);

        // Show round result popup
        updatePublic({
          phase: 'ROUND_SCORE',
          lastRoundResult: MOCK_ROUND_RESULT,
        });
        store().setRoundPopup('Round complete! Attackers win with 75 points.');

        await delay(5000);

        // Dismiss and loop
        store().setRoundPopup(null);
        ss({ roundEndEffect: null });
        await delay(500);
      }
    }

    runLoop();

    return clearTimers;
  }, [active, delay, clearTimers, seatConfig, playerCount]);
}

/* ------------------------------------------------------------------ */
/*  Static tab seeders (unchanged)                                     */
/* ------------------------------------------------------------------ */

function seedGameState(store: ReturnType<typeof useStore.getState>, seats: PublicSeat[]) {
  store.setRoomId('debug-room');
  useStore.setState({ youSeat: 0, sessionToken: 'debug-token' });
  store.setPublicState(createMockStateForSeats(seats) as any);
  store.setHand(MOCK_HAND);
  store.setTrickDisplay(MOCK_TRICK);
  store.setLegalActions([{ count: 2 }]);
}

const VALID_TABS = new Set<Tab>(['lobby', 'game', 'round-result', 'kou-di', 'badges']);

function getTabFromHash(): Tab {
  try {
    const hash = window.location.hash; // e.g. "#/debug?view=kou-di"
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return 'game';
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const view = params.get('view') as Tab | null;
    return view && VALID_TABS.has(view) ? view : 'game';
  } catch {
    return 'game';
  }
}

function setTabInHash(tab: Tab) {
  const base = '#/debug';
  window.history.replaceState(null, '', tab === 'game' ? base : `${base}?view=${tab}`);
}

export default function DebugPage() {
  const [tab, setTabState] = useState<Tab>(getTabFromHash);
  const [open, setOpen] = useState(false);
  const [playerCount, setPlayerCount] = useState<DebugPlayerCount>(4);
  const store = useStore.getState();
  const playerSeats = DEBUG_SEAT_CONFIGS[playerCount];

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setTabInHash(t);
  }, []);

  // Run simulation when game tab is active
  useSimulation(tab === 'game', playerSeats);

  useEffect(() => {
    // Seed chat messages for demo
    useStore.setState({
      chatMessages: [
        { seat: 1, name: 'Bob', text: 'Nice play!', atMs: Date.now() - 5000 },
        { seat: 2, name: 'Charlie', text: '\uD83D\uDC4D', atMs: Date.now() - 3000 },
        { seat: 0, name: 'Alice', text: 'Thanks!', atMs: Date.now() - 1000 },
      ],
      eventLog: [
        { text: 'Alice played pair of Aces', atMs: Date.now() - 4000, id: 1 },
        { text: 'Bob played King of Hearts', atMs: Date.now() - 3000, id: 2 },
        { text: 'Trump declared: Spades', atMs: Date.now() - 2000, id: 3 },
      ],
    });
  }, []);

  useEffect(() => {
    return () => {
      const state = useStore.getState();
      if (state.roomId !== 'debug-room' && state.sessionToken !== 'debug-token') return;
      state.leaveRoom();
      if (state.sessionToken === 'debug-token') {
        sessionStorage.removeItem('sessionToken');
        useStore.setState({ sessionToken: null });
      }
    };
  }, []);

  useEffect(() => {
    if (tab === 'lobby') {
      useStore.setState({ roomId: null, youSeat: null });
    } else if (tab === 'game') {
      // Simulation hook handles this tab
    } else if (tab === 'round-result') {
      seedGameState(store, playerSeats);
      store.setPublicState({
        ...createMockStateForSeats(playerSeats),
        phase: 'ROUND_SCORE',
        lastRoundResult: MOCK_ROUND_RESULT,
      } as any);
      store.setRoundPopup('Round result text');
    } else if (tab === 'kou-di') {
      seedGameState(store, playerSeats);
      useStore.setState({ kouDiPopup: MOCK_KOUDI });
    } else if (tab === 'badges') {
      seedGameState(store, playerSeats);
      store.pushBadge('Trump Master');
      setTimeout(() => store.pushBadge('Streak x3'), 300);
      setTimeout(() => store.pushBadge('Sweep'), 600);
      store.pushFloatingPoint(15);
      setTimeout(() => store.pushFloatingPoint(10), 500);
    }
  }, [tab, playerCount]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'game', label: 'Game' },
    { id: 'round-result', label: 'Round Result' },
    { id: 'kou-di', label: 'Kou Di' },
    { id: 'badges', label: 'Badges & Effects' },
  ];

  return (
    <div style={{ height: '100vh', overflow: 'hidden' }}>
      <div className={`debug-tab-bar ${open ? 'open' : ''}`}>
        <button className="debug-tab-toggle" onClick={() => setOpen(!open)}>
          {open ? '\u2716' : '\u2699 Debug'}
        </button>
        <div className="debug-player-toggle">
          {DEBUG_PLAYER_COUNTS.map((count) => (
            <button
              key={`dbg-players-${count}`}
              className={`debug-player-count ${playerCount === count ? 'active' : ''}`}
              onClick={() => setPlayerCount(count)}
            >
              {count} Players
            </button>
          ))}
        </div>
        {open && tabs.map((t) => (
          <button
            key={t.id}
            className={`debug-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); setOpen(false); }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ height: '100%', overflow: 'hidden' }}>
        <DebugContent tab={tab} />
      </div>
    </div>
  );
}

function DebugContent({ tab }: { tab: Tab }) {
  const roomId = useStore((s) => s.roomId);
  const nickname = useStore((s) => s.nickname);
  const cardScale = useStore((s) => s.cardScale);
  const layoutStyle = {
    '--card-scale': cardScale,
    '--card-scale-trick': 'calc(var(--card-scale-trick-base) * var(--card-scale, 1))',
  } as React.CSSProperties;

  if (tab === 'lobby') {
    // Render a lightweight lobby preview inline
    return (
      <div className="app lobby-screen">
        <div className="lobby-particles" />
        <div className="lobby-container">
          <div className="lobby-hero">
            <h1 className="lobby-title">Tractor</h1>
            <p className="lobby-subtitle">Debug Lobby Preview</p>
          </div>
          <div className="lobby-main">
            <div className="panel lobby-join-panel">
              <h3 className="lobby-panel-heading">Quick Play</h3>
              <div className="form-group">
                <input placeholder="Nickname" defaultValue={nickname || 'Player'} readOnly />
              </div>
              <div className="form-group">
                <input placeholder="Room ID" defaultValue="room1" readOnly />
              </div>
              <div className="form-row">
                <select defaultValue={4}><option value={4}>4 players</option></select>
                <button className="btn-primary">Join</button>
              </div>
            </div>
            <div className="panel lobby-profile-panel">
              <div className="profile-avatar">A</div>
              <div className="profile-name">Alice</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!roomId) return null;

  return (
    <div className="game-layout" style={layoutStyle}>
      <DebugLabel name="ScoreBoard">
        <ScoreBoard playerLabel="Alice" seatLabel="Seat 1" roomId="debug-room" />
      </DebugLabel>
      <div className="game-main">
        <div className="game-content">
          <div className="game-body">
            <DebugLabel name="SeatSidebar">
              <SeatSidebar />
            </DebugLabel>
            <DebugLabel name="GameTable">
              <GameTable />
            </DebugLabel>
          </div>
          <div className="game-footer">
            <DebugLabel name="ActionPanel">
              <ActionPanel />
            </DebugLabel>
            <DebugLabel name="Hand">
              <Hand />
            </DebugLabel>
          </div>
          <DebugLabel name="EventLog">
            <EventLog />
          </DebugLabel>
        </div>
        <DebugLabel name="ChatBox">
          <ChatBox />
        </DebugLabel>
      </div>
      <FloatingPoints />
      <GameBadges />
      <Toasts />
      <KouDiPopup />
      <RoundEndOverlay />
      <RoundPopup />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStore } from '../store';
import GameTable from './GameTable';
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

function seedGameState(store: ReturnType<typeof useStore.getState>) {
  store.setRoomId('debug-room');
  useStore.setState({ youSeat: 0, sessionToken: 'debug-token' });
  store.setPublicState(MOCK_STATE as any);
  store.setHand(MOCK_HAND);
  store.setTrickDisplay(MOCK_TRICK);
  store.setLegalActions([{ count: 2 }]);
}

export default function DebugPage() {
  const [tab, setTab] = useState<Tab>('game');
  const store = useStore.getState();

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
    if (tab === 'lobby') {
      useStore.setState({ roomId: null, youSeat: null });
    } else if (tab === 'game') {
      seedGameState(store);
      store.setRoundPopup(null);
      useStore.setState({ kouDiPopup: null });
    } else if (tab === 'round-result') {
      seedGameState(store);
      store.setPublicState({
        ...MOCK_STATE,
        phase: 'ROUND_SCORE',
        lastRoundResult: MOCK_ROUND_RESULT,
      } as any);
      store.setRoundPopup('Round result text');
    } else if (tab === 'kou-di') {
      seedGameState(store);
      useStore.setState({ kouDiPopup: MOCK_KOUDI });
    } else if (tab === 'badges') {
      seedGameState(store);
      store.pushBadge('Trump Master');
      setTimeout(() => store.pushBadge('Streak x3'), 300);
      setTimeout(() => store.pushBadge('Sweep'), 600);
      store.pushFloatingPoint(15);
      setTimeout(() => store.pushFloatingPoint(10), 500);
    }
  }, [tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'lobby', label: 'Lobby' },
    { id: 'game', label: 'Game' },
    { id: 'round-result', label: 'Round Result' },
    { id: 'kou-di', label: 'Kou Di' },
    { id: 'badges', label: 'Badges & Effects' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="debug-tab-bar">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`debug-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DebugContent tab={tab} />
      </div>
    </div>
  );
}

function DebugContent({ tab }: { tab: Tab }) {
  const roomId = useStore((s) => s.roomId);

  if (tab === 'lobby') {
    // The main App will render lobby since roomId is null
    return null;
  }

  if (!roomId) return null;

  return (
    <>
      <div className="game-layout">
        <ScoreBoard playerLabel="Alice" seatLabel="Seat 1" roomId="debug-room" />
        <div className="game-body">
          <GameTable />
        </div>
        <div className="game-footer">
          <ActionPanel />
          <Hand />
        </div>
        <EventLog />
        <ChatBox />
        <FloatingPoints />
        <GameBadges />
        <Toasts />
        <KouDiPopup />
        <RoundEndOverlay />
        <RoundPopup />
      </div>
    </>
  );
}

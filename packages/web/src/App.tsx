import { lazy, Suspense, useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import { useT } from './i18n';
import { guestLogin, sendEmailCode, verifyEmailCode as apiVerifyEmail, getMe, getRooms, createRoom } from './api';
import type { ApiRoom } from './api';
import GameTable, { SeatSidebar } from './components/GameTable';
import Hand from './components/Hand';
import ActionPanel from './components/ActionPanel';
import ScoreBoard from './components/ScoreBoard';
import RoundPopup from './components/RoundPopup';
import KouDiPopup from './components/KouDiPopup';
import ChatBox from './components/ChatBox';
import Toasts from './components/Toasts';
import EventLog from './components/EventLog';
import RoundEndOverlay from './components/RoundEndOverlay';
import FloatingPoints from './components/FloatingPoints';
import GameBadges from './components/GameBadges';
import DemoPage from './components/DemoPage';
import InsightsPage from './components/InsightsPage';
import MatchHistory from './components/MatchHistory';
import DevDebugHint from './components/DevDebugHint';
import LobbyChat from './components/LobbyChat';
import CardImpactParticles from './components/CardImpactParticles';
import TrumpDeclareOverlay from './components/TrumpDeclareOverlay';
import LevelUpOverlay from './components/LevelUpOverlay';
import ThrowPunishedFlash from './components/ThrowPunishedFlash';
import FeedbackTab from './components/FeedbackTab';
const GameGuide = lazy(() => import('./components/GameGuide'));

export default function App() {
  const [isDemo, setIsDemo] = useState(
    () => typeof window !== 'undefined' && window.location.hash.startsWith('#/demo'),
  );
  const [isInsights, setIsInsights] = useState(
    () => typeof window !== 'undefined' && window.location.hash.startsWith('#/insights'),
  );
  const [isGuide, setIsGuide] = useState(
    () => typeof window !== 'undefined' && window.location.hash.startsWith('#/guide'),
  );

  // Redirect empty hash or #/ to #/lobby
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash || hash === '#' || hash === '#/' || hash === '#/lobby') {
      window.history.replaceState(null, '', '#/lobby');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncHash = () => {
      const hash = window.location.hash;
      // Redirect empty/root to #/lobby
      if (!hash || hash === '#' || hash === '#/') {
        window.history.replaceState(null, '', '#/lobby');
      }
      setIsDemo(hash.startsWith('#/demo'));
      setIsInsights(hash.startsWith('#/insights'));
      setIsGuide(hash.startsWith('#/guide'));
    };
    window.addEventListener('hashchange', syncHash);
    window.addEventListener('popstate', syncHash);
    return () => {
      window.removeEventListener('hashchange', syncHash);
      window.removeEventListener('popstate', syncHash);
    };
  }, []);

  // Demo mode: /#/demo
  if (isDemo) return <DemoPage />;
  // Insights mode: /#/insights
  if (isInsights) return <InsightsPage />;
  // Guide mode: /#/guide
  if (isGuide) return <Suspense fallback={<div style={{ padding: 24, color: '#aaa' }}>Loading...</div>}><GameGuide /></Suspense>;
  return <MainApp />;
}

function MainApp() {
  const roomId = useStore((s) => s.roomId);
  const youSeat = useStore((s) => s.youSeat);
  const publicState = useStore((s) => s.publicState);
  const nickname = useStore((s) => s.nickname);
  const setNickname = useStore((s) => s.setNickname);
  const pushToast = useStore((s) => s.pushToast);
  const players = useStore((s) => s.players);
  const setPlayers = useStore((s) => s.setPlayers);
  const toggleLang = useStore((s) => s.toggleLang);
  const authToken = useStore((s) => s.authToken);
  const email = useStore((s) => s.email);
  const setAuth = useStore((s) => s.setAuth);
  const clearAuth = useStore((s) => s.clearAuth);
  const t = useT();
  const cardScale = useStore((s) => s.cardScale);

  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ApiRoom[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [creating, setCreating] = useState(false);

  // Auto-guest login and auth validation on mount
  useEffect(() => {
    (async () => {
      const stored = localStorage.getItem('authToken');
      if (stored) {
        try {
          const { user } = await getMe(stored);
          setAuth(stored, user.id, user.isGuest, user.email);
          return;
        } catch {
          // Token invalid, will create new guest below
        }
      }
      try {
        const displayName = sessionStorage.getItem('nickname') || 'Guest';
        const { authToken: token, user } = await guestLogin(displayName);
        setAuth(token, user.id, user.isGuest, user.email);
      } catch {
        // DB not available — no-op, game still works without auth
      }
    })();
  }, []);

  useEffect(() => {
    wsClient.connect();
    // Auto-join room from URL hash
    const match = window.location.hash.match(/^#\/room\/(.+)$/);
    if (match && !roomId) {
      const hashRoom = decodeURIComponent(match[1]);
      if (hashRoom) {
        // Delay to let WS connect first
        setTimeout(() => {
          wsClient.joinRoom({ roomId: hashRoom, name: nickname || 'Player', players });
        }, 500);
      }
    }
    // If hash is #/lobby but sessionStorage has stale roomId, clear it
    if (window.location.hash === '#/lobby' || window.location.hash === '#/lobby/') {
      sessionStorage.removeItem('roomId');
      sessionStorage.removeItem('lastRoomId');
    }
  }, []);

  // Poll active rooms while in lobby
  useEffect(() => {
    if (roomId) return;
    let cancelled = false;
    const poll = () => {
      getRooms().then((rooms) => { if (!cancelled) setActiveRooms(rooms); }).catch(() => {});
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [roomId]);

  const seatName =
    youSeat === null ? null : publicState?.seats.find((s) => s.seat === youSeat)?.name ?? null;
  const playerLabel = nickname.trim() || seatName || 'Player';
  const seatLabel = youSeat === null ? 'Unseated' : `${t('seat.seat')} ${youSeat + 1}`;

  useEffect(() => {
    if (!roomId) {
      document.title = `Tractor | ${playerLabel} | Lobby`;
      if (window.location.hash.startsWith('#/room/')) {
        window.history.replaceState(null, '', '#/lobby');
      }
      return;
    }
    document.title = `${seatLabel} | ${playerLabel} | Tractor | ${roomId}`;
    window.history.replaceState(null, '', `#/room/${encodeURIComponent(roomId)}`);
  }, [playerLabel, roomId, seatLabel]);

  if (!roomId) {
    return (
      <div className="app lobby-screen">
        <DevDebugHint />
        <div className="lobby-particles" />
        <div className="lobby-container">
          <div className="lobby-hero">
            <h1 className="lobby-title">{t('lobby.title')}</h1>
            <p className="lobby-subtitle">{t('lobby.subtitle')}</p>
          </div>
          {/* Quick Play */}
          <div className="panel lobby-join-panel">
            <h3 className="lobby-panel-heading">{t('lobby.quickPlay')}</h3>
            <div className="form-group">
              <input
                placeholder={t('lobby.nickname')}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <span className="form-hint">{t('lobby.nicknameHint')}</span>
            </div>
            <div className="form-row">
              <select value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
                <option value={4}>{t('lobby.4players')}</option>
                <option value={6}>{t('lobby.6players')}</option>
              </select>
            </div>
            <button
              className="btn-primary btn-full"
              aria-label={t('lobby.createRoom')}
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                try {
                  const { roomId: newRoomId } = await createRoom(players);
                  wsClient.joinRoom({ roomId: newRoomId, name: nickname || 'Player', players });
                } catch {
                  pushToast(t('lobby.createFailed'));
                } finally {
                  setCreating(false);
                }
              }}
            >
              {creating ? t('lobby.creating') : t('lobby.createRoom')}
            </button>
          </div>
          <div className="panel room-list-panel">
            <h3 className="lobby-panel-heading">{t('lobby.activeRooms')}</h3>
            {activeRooms.length === 0 ? (
              <div className="room-list-empty">{t('lobby.noRooms')}</div>
            ) : (
              <div className="room-list">
                {activeRooms.map((room) => {
                  const ageMs = Date.now() - (room.createdAt || Date.now());
                  const ageMins = Math.floor(ageMs / 60000);
                  const ageLabel = ageMins < 1 ? '<1m' : ageMins < 60 ? `${ageMins}m` : `${Math.floor(ageMins / 60)}h`;
                  return (
                    <div key={room.id} className="room-list-row">
                      <span className="room-list-id">{room.id}</span>
                      <span className="room-list-players">{room.seated}/{room.players}</span>
                      <span className="room-list-phase">{t(`lobby.phase.${room.phase}`)}</span>
                      <span className="room-list-age">{ageLabel} {t('lobby.ago')}</span>
                      <div className="room-list-seats">
                        {room.seats.map((s, i) => (
                          <span key={i} className={`room-list-dot ${s.isConnected ? 'online' : 'offline'}`} title={s.name}>
                            {s.isBot ? '\u{1F916}' : ''}
                          </span>
                        ))}
                      </div>
                      <div className="room-list-names">
                        {room.seats.map((s) => s.name).join(', ')}
                      </div>
                      <button
                        className="room-list-join-btn"
                        onClick={() => {
                          setPlayers(room.players);
                          wsClient.joinRoom({ roomId: room.id, name: nickname || 'Player', players: room.players });
                        }}
                      >
                        {t('lobby.join')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <LobbyChat />
          <MatchHistory />
          <div className="lobby-footer">
            <a href="#/guide" className="guide-link-btn">{t('guide.title')}</a>
            <FeedbackTab />
            <button className="lang-toggle" onClick={toggleLang}>{t('lang.toggle')}</button>
            <button className="settings-gear-btn" onClick={() => setShowSettings(true)} aria-label={t('lobby.settings')}>
              {'\u2699'}
            </button>
            <span className="lobby-version">v0.1</span>
          </div>
        </div>
        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
            <div className="settings-modal panel">
              <div className="settings-header">
                <h3 className="lobby-panel-heading">{t('lobby.settings')}</h3>
                <button className="chat-drawer-btn" onClick={() => setShowSettings(false)}>{'\u2716'}</button>
              </div>
              <div className="form-group">
                <label className="form-label">{t('lobby.nickname')}</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t('lobby.nickname')}
                />
                <span className="form-hint">{t('lobby.nicknameHint')}</span>
              </div>
              <hr className="settings-divider" />
              <h4 className="settings-section-title">{t('lobby.linkAccount')}</h4>
              <span className="form-hint">{t('lobby.emailHint')}</span>
              {email ? (
                <div className="profile-email-section" style={{ marginTop: 8 }}>
                  <span className="profile-email-badge">{email}</span>
                  <button className="profile-logout-btn" onClick={clearAuth}>{t('lobby.logout')}</button>
                </div>
              ) : (
                <div className="profile-email-form" style={{ marginTop: 8 }}>
                  {!emailSent ? (
                    <div className="form-row">
                      <input
                        placeholder="Email"
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                      />
                      <button
                        disabled={authLoading}
                        onClick={async () => {
                          if (!emailInput.trim()) return;
                          setAuthLoading(true);
                          try {
                            await sendEmailCode(emailInput.trim());
                            setEmailSent(true);
                            pushToast(t('lobby.codeSent'));
                          } catch {
                            setEmailSent(true);
                            pushToast(t('lobby.sendFailed'));
                          } finally {
                            setAuthLoading(false);
                          }
                        }}
                      >
                        {t('lobby.sendCode')}
                      </button>
                    </div>
                  ) : (
                    <div className="form-row">
                      <input
                        placeholder="Code"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value)}
                      />
                      <button
                        disabled={authLoading}
                        onClick={async () => {
                          if (!codeInput.trim()) return;
                          setAuthLoading(true);
                          try {
                            const { authToken: token, user } = await apiVerifyEmail(emailInput.trim(), codeInput.trim());
                            setAuth(token, user.id, user.isGuest, user.email);
                            setEmailSent(false);
                            setEmailInput('');
                            setCodeInput('');
                          } catch {
                            pushToast(t('lobby.verifyFailed'));
                          } finally {
                            setAuthLoading(false);
                          }
                        }}
                      >
                        {t('lobby.verify')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // H7: Keyboard shortcuts
  useEffect(() => {
    if (!roomId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const store = useStore.getState();
      const state = store.publicState;
      if (!state) return;

      if (e.key === 'Enter') {
        // Play selected cards (respects confirmBeforePlay setting)
        if (state.phase === 'TRICK_PLAY' && state.turnSeat === store.youSeat && store.selected.size > 0) {
          e.preventDefault();
          // Enforce required card count when following (not leading)
          const requiredCount = store.legalActions[0]?.count ?? 0;
          const isLeaderTurn = state.leaderSeat === store.youSeat && (state.trick ?? []).length === 0;
          if (!isLeaderTurn && requiredCount > 0 && store.selected.size !== requiredCount) return;
          if (store.confirmBeforePlay) {
            // Dispatch custom event so ActionPanel can show confirmation
            window.dispatchEvent(new CustomEvent('tractor-play-confirm'));
          } else {
            wsClient.send({ type: 'PLAY', cardIds: Array.from(store.selected) });
          }
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        const totalCards = state.seats.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0);
        if (state.phase === 'FLIP_TRUMP' && totalCards === 0) {
          // Ready / Unready
          const youReady = store.youSeat !== null ? !!state.seats.find((s) => s.seat === store.youSeat)?.ready : false;
          wsClient.send({ type: youReady ? 'UNREADY' : 'READY' });
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        store.clearSelect();
      } else if (e.key === 'd' || e.key === 'D') {
        if (state.phase === 'FLIP_TRUMP' && state.declareEnabled !== false) {
          e.preventDefault();
          // Auto-select best declare cards
          const selectedIds = Array.from(store.selected);
          if (selectedIds.length > 0) {
            wsClient.send({ type: 'DECLARE', cardIds: selectedIds });
          }
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [roomId]);

  const layoutStyle = {
    '--card-scale': cardScale,
    '--card-scale-trick': 'calc(var(--card-scale-trick-base) * var(--card-scale, 1))',
  } as React.CSSProperties;

  return (
    <div className="game-layout" style={layoutStyle}>
      <DevDebugHint />
      <ScoreBoard playerLabel={playerLabel} seatLabel={seatLabel} roomId={roomId} />
      <div className="game-main">
        <div className="game-content">
          <div className="game-body">
            <SeatSidebar />
            <GameTable />
          </div>
          <div className="game-footer">
            <ActionPanel />
            <Hand />
          </div>
          <EventLog />
        </div>
        <ChatBox />
      </div>
      <FloatingPoints />
      <GameBadges />
      <CardImpactParticles />
      <TrumpDeclareOverlay />
      <LevelUpOverlay />
      <ThrowPunishedFlash />
      <FeedbackTab />
      <Toasts />
      <KouDiPopup />
      <RoundEndOverlay />
      <RoundPopup />
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import { useT } from './i18n';
import { guestLogin, sendEmailCode, verifyEmailCode as apiVerifyEmail, getMe, getRooms } from './api';
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

export default function App() {
  const [isDemo, setIsDemo] = useState(
    () => typeof window !== 'undefined' && window.location.hash.startsWith('#/demo'),
  );
  const [isInsights, setIsInsights] = useState(
    () => typeof window !== 'undefined' && window.location.hash.startsWith('#/insights'),
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncHash = () => {
      setIsDemo(window.location.hash.startsWith('#/demo'));
      setIsInsights(window.location.hash.startsWith('#/insights'));
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

  const [roomInput, setRoomInput] = useState(() => {
    // Parse room from hash: #/room/roomId
    if (typeof window !== 'undefined') {
      const match = window.location.hash.match(/^#\/room\/(.+)$/);
      if (match) return decodeURIComponent(match[1]);
    }
    return 'room1';
  });
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [activeRooms, setActiveRooms] = useState<ApiRoom[]>([]);
  const [showSettings, setShowSettings] = useState(false);

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
        setRoomInput(hashRoom);
        // Delay to let WS connect first
        setTimeout(() => {
          wsClient.joinRoom({ roomId: hashRoom, name: nickname || 'Player', players });
        }, 500);
      }
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
        window.history.replaceState(null, '', '#/');
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
            <div className="form-group">
              <input
                placeholder={t('lobby.roomId')}
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
              />
            </div>
            <div className="form-row">
              <select value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
                <option value={4}>{t('lobby.4players')}</option>
                <option value={6}>{t('lobby.6players')}</option>
              </select>
            </div>
            <button
              className="btn-primary btn-full"
              aria-label={t('lobby.join')}
              onClick={() => {
                const room = roomInput.trim();
                if (!room) return;
                wsClient.joinRoom({ roomId: room, name: nickname || 'Player', players });
              }}
            >
              {t('lobby.join')}
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
                          setRoomInput(room.id);
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

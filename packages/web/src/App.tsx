import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import { useT } from './i18n';
import { guestLogin, sendEmailCode, verifyEmailCode as apiVerifyEmail, getMe } from './api';
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
import DebugPage from './components/DebugPage';
import MatchHistory from './components/MatchHistory';
import DevDebugHint from './components/DevDebugHint';
import CardImpactParticles from './components/CardImpactParticles';
import TrumpDeclareOverlay from './components/TrumpDeclareOverlay';
import LevelUpOverlay from './components/LevelUpOverlay';
import ThrowPunishedFlash from './components/ThrowPunishedFlash';

export default function App() {
  // Debug mode: /#/debug
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#/debug')) {
    return <DebugPage />;
  }
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

  const [roomInput, setRoomInput] = useState('room1');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

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
  }, []);

  const seatName =
    youSeat === null ? null : publicState?.seats.find((s) => s.seat === youSeat)?.name ?? null;
  const playerLabel = nickname.trim() || seatName || 'Player';
  const seatLabel = youSeat === null ? 'Unseated' : `${t('seat.seat')} ${youSeat + 1}`;

  useEffect(() => {
    if (!roomId) {
      document.title = `Tractor | ${playerLabel} | Lobby`;
      return;
    }
    document.title = `${seatLabel} | ${playerLabel} | Tractor | ${roomId}`;
  }, [playerLabel, roomId, seatLabel]);

  if (!roomId) {
    const avatarLetter = (nickname || email || 'G').charAt(0).toUpperCase();

    return (
      <div className="app lobby-screen">
        <DevDebugHint />
        <div className="lobby-particles" />
        <div className="lobby-container">
          <div className="lobby-hero">
            <h1 className="lobby-title">{t('lobby.title')}</h1>
            <p className="lobby-subtitle">{t('lobby.subtitle')}</p>
          </div>
          <div className="lobby-main">
            <div className="panel lobby-join-panel">
              <h3 className="lobby-panel-heading">{t('lobby.quickPlay')}</h3>
              <div className="form-group">
                <input
                  placeholder={t('lobby.nickname')}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
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
                <button
                  className="btn-primary"
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
            </div>
            <div className="panel lobby-profile-panel">
              <div className="profile-avatar">{avatarLetter}</div>
              <div className="profile-name">{nickname || email || t('lobby.guest')}</div>
              {email ? (
                <div className="profile-email-section">
                  <span className="profile-email-badge">{email}</span>
                  <button className="profile-logout-btn" onClick={clearAuth}>{t('lobby.logout')}</button>
                </div>
              ) : (
                <div className="profile-email-form">
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
          <MatchHistory />
          <div className="lobby-footer">
            <button className="lang-toggle" onClick={toggleLang}>{t('lang.toggle')}</button>
            <span className="lobby-version">v0.1</span>
          </div>
        </div>
      </div>
    );
  }

  const cardScale = useStore((s) => s.cardScale);

  return (
    <div className="game-layout" style={{ '--card-scale': cardScale } as React.CSSProperties}>
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
      <Toasts />
      <KouDiPopup />
      <RoundEndOverlay />
      <RoundPopup />
    </div>
  );
}

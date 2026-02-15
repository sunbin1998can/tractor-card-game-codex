import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import { useT } from './i18n';
import { guestLogin, sendEmailCode, verifyEmailCode as apiVerifyEmail, getMe } from './api';
import GameTable from './components/GameTable';
import Hand from './components/Hand';
import ActionPanel from './components/ActionPanel';
import ScoreBoard from './components/ScoreBoard';
import RoundPopup from './components/RoundPopup';
import KouDiPopup from './components/KouDiPopup';
import ChatBox from './components/ChatBox';
import Toasts from './components/Toasts';
import EventLog from './components/EventLog';

export default function App() {
  const roomId = useStore((s) => s.roomId);
  const youSeat = useStore((s) => s.youSeat);
  const publicState = useStore((s) => s.publicState);
  const nickname = useStore((s) => s.nickname);
  const setNickname = useStore((s) => s.setNickname);
  const setRoomId = useStore((s) => s.setRoomId);
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
    return (
      <div className="app lobby-screen">
        <div className="panel lobby-card">
          <div className="lobby-header">
            <h2>{t('lobby.title')}</h2>
            <button className="lang-toggle" onClick={toggleLang}>{t('lang.toggle')}</button>
          </div>
          <div className="identity-bar">
            <span className="identity-chip">{t('lobby.thisTab')}: {playerLabel}</span>
            <span className="identity-chip">{t('lobby.status')}</span>
          </div>
          <div className="row">
            <input
              placeholder={t('lobby.nickname')}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <input
              placeholder={t('lobby.roomId')}
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
            />
            <select value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
              <option value={4}>{t('lobby.4players')}</option>
              <option value={6}>{t('lobby.6players')}</option>
            </select>
            <button
              onClick={() => {
                const room = roomInput.trim();
                if (!room) return;
                setRoomId(room);
                wsClient.joinRoom({ roomId: room, name: nickname || 'Player', players });
              }}
            >
              {t('lobby.join')}
            </button>
          </div>
          {email ? (
            <div className="identity-bar">
              <span className="identity-chip">Email: {email}</span>
              <button onClick={clearAuth}>Logout</button>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 8 }}>
              {!emailSent ? (
                <>
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
                      } catch {
                        // Email service unavailable
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                  >
                    Send Code
                  </button>
                </>
              ) : (
                <>
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
                        // Verification failed
                      } finally {
                        setAuthLoading(false);
                      }
                    }}
                  >
                    Verify
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout">
      <ScoreBoard playerLabel={playerLabel} seatLabel={seatLabel} roomId={roomId} />
      <EventLog />
      <GameTable />
      <Hand />
      <ActionPanel />
      <ChatBox />
      <Toasts />
      <KouDiPopup />
      <RoundPopup />
    </div>
  );
}

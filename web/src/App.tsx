import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import { useT } from './i18n';
import GameTable from './components/GameTable';
import Hand from './components/Hand';
import ActionPanel from './components/ActionPanel';
import ScoreBoard from './components/ScoreBoard';
import RoundPopup from './components/RoundPopup';
import KouDiPopup from './components/KouDiPopup';
import ChatBox from './components/ChatBox';
import Toasts from './components/Toasts';

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
  const t = useT();

  const [roomInput, setRoomInput] = useState('room1');

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
        </div>
      </div>
    );
  }

  return (
    <div className="game-layout">
      <ScoreBoard playerLabel={playerLabel} seatLabel={seatLabel} roomId={roomId} />
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

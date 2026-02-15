import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import GameTable from './components/GameTable';
import Hand from './components/Hand';
import ActionPanel from './components/ActionPanel';
import ScoreBoard from './components/ScoreBoard';
import RoundPopup from './components/RoundPopup';
import KouDiPopup from './components/KouDiPopup';
import ChatBox from './components/ChatBox';

export default function App() {
  const roomId = useStore((s) => s.roomId);
  const youSeat = useStore((s) => s.youSeat);
  const publicState = useStore((s) => s.publicState);
  const nickname = useStore((s) => s.nickname);
  const setNickname = useStore((s) => s.setNickname);
  const setRoomId = useStore((s) => s.setRoomId);
  const players = useStore((s) => s.players);
  const setPlayers = useStore((s) => s.setPlayers);

  const [roomInput, setRoomInput] = useState('room1');

  useEffect(() => {
    wsClient.connect();
  }, []);

  const seatName =
    youSeat === null ? null : publicState?.seats.find((s) => s.seat === youSeat)?.name ?? null;
  const playerLabel = nickname.trim() || seatName || 'Player';
  const seatLabel = youSeat === null ? 'Unseated' : `Seat ${youSeat + 1}`;

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
          <h2>Tractor Online</h2>
          <div className="identity-bar">
            <span className="identity-chip">This tab: {playerLabel}</span>
            <span className="identity-chip">Status: Lobby</span>
          </div>
          <div className="row">
            <input
              placeholder="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <input
              placeholder="Room ID"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
            />
            <select value={players} onChange={(e) => setPlayers(Number(e.target.value))}>
              <option value={4}>4 players</option>
              <option value={6}>6 players</option>
            </select>
            <button
              onClick={() => {
                const room = roomInput.trim();
                if (!room) return;
                setRoomId(room);
                wsClient.joinRoom({ roomId: room, name: nickname || 'Player', players });
              }}
            >
              Join
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
      <KouDiPopup />
      <RoundPopup />
    </div>
  );
}

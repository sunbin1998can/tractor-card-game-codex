import { useEffect, useState } from 'react';
import { useStore } from './store';
import { wsClient } from './wsClient';
import PlayersBar from './components/PlayersBar';
import TableCenter from './components/TableCenter';
import Hand from './components/Hand';
import ActionPanel from './components/ActionPanel';
import ScoreBoard from './components/ScoreBoard';
import Toasts from './components/Toasts';

export default function App() {
  const roomId = useStore((s) => s.roomId);
  const nickname = useStore((s) => s.nickname);
  const setNickname = useStore((s) => s.setNickname);
  const setRoomId = useStore((s) => s.setRoomId);
  const players = useStore((s) => s.players);
  const setPlayers = useStore((s) => s.setPlayers);

  const [roomInput, setRoomInput] = useState('room1');

  useEffect(() => {
    wsClient.connect();
  }, []);

  if (!roomId) {
    return (
      <div className="app">
        <div className="panel">
          <h2>Tractor Online</h2>
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
                wsClient.lastJoin = { roomId: room, name: nickname || 'Player', players };
                wsClient.send({ type: 'JOIN_ROOM', roomId: room, name: nickname || 'Player', players });
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
    <div className="app">
      <ScoreBoard />
      <PlayersBar />
      <TableCenter />
      <Hand />
      <ActionPanel />
      <Toasts />
    </div>
  );
}

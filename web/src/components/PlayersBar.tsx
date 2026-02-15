import { useStore } from '../store';
import { wsClient } from '../wsClient';

function markerLabel(id: string) {
  const parts = id.split('_');
  if (parts.length === 2) {
    if (parts[1] === 'SJ') return '小王';
    if (parts[1] === 'BJ') return '大王';
    return parts[1];
  }
  if (parts.length === 3) {
    const suit = parts[1];
    const rank = parts[2];
    const sym = suit === 'S' ? '\u2660' : suit === 'H' ? '\u2665' : suit === 'D' ? '\u2666' : suit === 'C' ? '\u2663' : '';
    return `${rank}${sym}`;
  }
  return id;
}

export default function PlayersBar() {
  const state = useStore((s) => s.publicState);
  const marker = useStore((s) => s.trumpDeclareMarker);
  const youSeat = useStore((s) => s.youSeat);
  if (!state) return null;
  const defenderTeam = state.bankerSeat % 2;
  const totalCards = state.seats.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0);
  const isPreDealLobby = state.phase === 'FLIP_TRUMP' && totalCards === 0;

  return (
    <div className="panel seats">
      {state.seats.map((seat) => (
        <div
          key={seat.seat}
          className={`seat ${state.turnSeat === seat.seat ? 'active' : ''}`}
        >
          <div>Seat {seat.seat + 1}: {seat.name || 'Player'}</div>
          <div>{seat.team === defenderTeam ? 'Defender' : 'Attacker'}</div>
          <div>{seat.connected ? 'Connected' : 'Disconnected'}</div>
          <div className={`ready-state ${seat.ready ? 'ready' : 'not-ready'}`}>
            {seat.ready ? 'Ready' : 'Not Ready'}
          </div>
          {isPreDealLobby && seat.seat === youSeat && (
            <button
              className="seat-ready-btn"
              disabled={seat.ready}
              onClick={() => wsClient.send({ type: 'READY' })}
            >
              {seat.ready ? 'Ready' : 'Ready Up'}
            </button>
          )}
          <div>Cards: {seat.cardsLeft}</div>
          {marker?.seat === seat.seat && (
            <div className="declare-marker" title="Declared trump">
              亮主 {markerLabel(marker.cardId)}
            </div>
          )}
          {state.bankerSeat === seat.seat && <div>Banker</div>}
          {state.leaderSeat === seat.seat && <div>Leader</div>}
        </div>
      ))}
    </div>
  );
}

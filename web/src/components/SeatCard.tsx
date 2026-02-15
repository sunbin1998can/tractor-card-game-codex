import { useStore } from '../store';
import { wsClient } from '../wsClient';
import type { PublicSeat } from '../store';
import type { RelativePosition } from './GameTable';

function markerLabel(id: string) {
  const parts = id.split('_');
  if (parts.length === 2) {
    if (parts[1] === 'SJ') return '\u5c0f\u738b';
    if (parts[1] === 'BJ') return '\u5927\u738b';
    return parts[1];
  }
  if (parts.length === 3) {
    const suit = parts[1];
    const rank = parts[2];
    const sym =
      suit === 'S' ? '\u2660' :
      suit === 'H' ? '\u2665' :
      suit === 'D' ? '\u2666' :
      suit === 'C' ? '\u2663' : '';
    return `${rank}${sym}`;
  }
  return id;
}

type Props = {
  seat: PublicSeat;
  position: RelativePosition;
};

export default function SeatCard({ seat }: Props) {
  const state = useStore((s) => s.publicState);
  const marker = useStore((s) => s.trumpDeclareMarker);
  const youSeat = useStore((s) => s.youSeat);

  if (!state) return null;

  const defenderTeam = state.bankerSeat % 2;
  const isDefender = seat.team === defenderTeam;
  const isTurn = state.turnSeat === seat.seat;
  const isBanker = state.bankerSeat === seat.seat;
  const isLeader = state.leaderSeat === seat.seat;
  const isYou = seat.seat === youSeat;
  const totalCards = state.seats.reduce((sum, s) => sum + (s.cardsLeft ?? 0), 0);
  const isPreDealLobby = state.phase === 'FLIP_TRUMP' && totalCards === 0;

  const name = seat.name || `Seat ${seat.seat + 1}`;
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`seat-card ${isTurn ? 'is-turn' : ''}`}>
      <span className={`seat-connection ${seat.connected ? 'online' : 'offline'}`} />
      <div className={`seat-avatar ${isDefender ? 'defender' : 'attacker'}`}>
        {initial}
      </div>
      <div className="seat-name" title={name}>
        {isYou ? `${name} (You)` : name}
      </div>
      {(isBanker || isLeader) && (
        <span className="seat-badge">
          {isBanker ? 'Banker' : ''}{isBanker && isLeader ? ' / ' : ''}{isLeader ? 'Leader' : ''}
        </span>
      )}
      {seat.cardsLeft > 0 && (
        <span className="seat-cards-pill">{seat.cardsLeft} cards</span>
      )}
      {marker?.seat === seat.seat && (
        <div className="declare-marker">
          {'亮主'} {markerLabel(marker.cardId)}
        </div>
      )}
      {!isPreDealLobby && (
        <span className={`ready-state ${seat.ready ? 'ready' : 'not-ready'}`}>
          {seat.ready ? 'Ready' : 'Not Ready'}
        </span>
      )}
      {isPreDealLobby && isYou && (
        <button
          className={`seat-ready-btn ${seat.ready ? 'is-ready' : ''}`}
          onClick={() => wsClient.send({ type: seat.ready ? 'UNREADY' : 'READY' })}
        >
          {seat.ready ? 'Cancel Ready' : 'Ready Up'}
        </button>
      )}
    </div>
  );
}

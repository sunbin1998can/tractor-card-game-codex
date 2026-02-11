import { useStore } from '../store';

export default function PlayersBar() {
  const state = useStore((s) => s.publicState);

  if (!state) return null;

  return (
    <div className="panel seats">
      {state.seats.map((seat) => (
        <div
          key={seat.seat}
          className={`seat ${state.turnSeat === seat.seat ? 'active' : ''}`}
        >
          <div>{seat.name || `Seat ${seat.seat}`}</div>
          <div>Team {seat.team}</div>
          <div>{seat.connected ? 'Connected' : 'Disconnected'}</div>
          <div>Cards: {seat.cardsLeft}</div>
          {state.bankerSeat === seat.seat && <div>Banker</div>}
          {state.leaderSeat === seat.seat && <div>Leader</div>}
        </div>
      ))}
    </div>
  );
}

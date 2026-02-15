import { useStore } from '../store';
import SeatCard from './SeatCard';
import TableCenter from './TableCenter';

export type RelativePosition =
  | 'bottom'
  | 'top'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const POSITIONS_4: RelativePosition[] = ['bottom', 'right', 'top', 'left'];
const POSITIONS_6: RelativePosition[] = [
  'bottom',
  'bottom-right',
  'top-right',
  'top',
  'top-left',
  'bottom-left'
];

export function getRelativePosition(
  youSeat: number,
  targetSeat: number,
  totalPlayers: number
): RelativePosition {
  const positions = totalPlayers === 6 ? POSITIONS_6 : POSITIONS_4;
  const offset = (targetSeat - youSeat + totalPlayers) % totalPlayers;
  return positions[offset];
}

export default function GameTable() {
  const state = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);

  if (!state) return null;

  const totalPlayers = state.players;
  const mySeat = youSeat ?? 0;

  return (
    <div className="game-table">
      {state.seats.map((seat) => {
        const pos = getRelativePosition(mySeat, seat.seat, totalPlayers);
        return (
          <div key={seat.seat} className={`seat-slot pos-${pos}`}>
            <SeatCard seat={seat} position={pos} />
          </div>
        );
      })}
      <TableCenter />
    </div>
  );
}

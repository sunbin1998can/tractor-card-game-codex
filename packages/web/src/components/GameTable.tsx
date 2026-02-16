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

/** Sidebar listing all seats in play order from your perspective */
export function SeatSidebar() {
  const state = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);

  if (!state) return null;

  const totalPlayers = state.players;
  const mySeat = youSeat ?? 0;

  // Order seats starting from player's own seat
  const ordered = Array.from({ length: totalPlayers }, (_, i) => (mySeat + i) % totalPlayers);

  return (
    <div className="seat-sidebar">
      {ordered.map((seatIdx) => {
        const seat = state.seats.find((s) => s.seat === seatIdx);
        if (!seat) return null;
        const pos = getRelativePosition(mySeat, seatIdx, totalPlayers);
        return <SeatCard key={seatIdx} seat={seat} position={pos} />;
      })}
    </div>
  );
}

export default function GameTable() {
  const state = useStore((s) => s.publicState);

  if (!state) return null;

  return (
    <div className="game-table">
      <TableCenter />
    </div>
  );
}

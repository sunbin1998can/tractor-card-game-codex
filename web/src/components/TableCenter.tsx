import { useStore } from '../store';
import CardFace from './CardFace';

export default function TableCenter() {
  const liveTrick = useStore((s) => s.publicState?.trick ?? []);
  const trickDisplay = useStore((s) => s.trickDisplay);
  const seats = useStore((s) => s.publicState?.seats ?? []);
  const trick = liveTrick.length > 0 ? liveTrick : trickDisplay;

  if (!trick || trick.length === 0) {
    return <div className="panel">No trick in progress.</div>;
  }

  return (
    <div className="panel table">
      {trick.map((play) => (
        <div key={play.seat}>
          <div>
            Seat {play.seat + 1}: {seats.find((s) => s.seat === play.seat)?.name || 'Player'}
          </div>
          <div>
            {play.cards.map((c) => (
              <CardFace key={c} cardId={c} mini />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

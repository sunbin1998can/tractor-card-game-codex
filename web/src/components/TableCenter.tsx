import { useStore } from '../store';
import CardFace from './CardFace';

export default function TableCenter() {
  const trick = useStore((s) => s.trickDisplay);
  const seats = useStore((s) => s.publicState?.seats ?? []);
  if (!trick || trick.length === 0) {
    return <div className="panel">No trick in progress.</div>;
  }

  return (
    <div className="panel table">
      {trick.map((play) => (
        <div key={play.seat}>
          <div>{seats.find((s) => s.seat === play.seat)?.name || `Seat ${play.seat + 1}`}</div>
          <div>
            {play.cards.map((c) => (
              <CardFace key={c} id={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useStore } from '../store';

export default function TableCenter() {
  const trick = useStore((s) => s.publicState?.trick);

  if (!trick || trick.length === 0) {
    return <div className="panel">No trick in progress.</div>;
  }

  return (
    <div className="panel table">
      {trick.map((play) => (
        <div key={play.seat}>
          <div>Seat {play.seat}</div>
          <div>
            {play.cards.map((c) => (
              <span key={c} className="card">{c}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useStore } from '../store';

export default function Hand() {
  const hand = useStore((s) => s.hand);
  const selected = useStore((s) => s.selected);
  const toggle = useStore((s) => s.toggleSelect);

  if (!hand.length) return <div className="panel">No cards dealt yet.</div>;

  const sorted = [...hand].sort();

  return (
    <div className="panel">
      <div>Your hand</div>
      <div>
        {sorted.map((id) => (
          <span
            key={id}
            className={`card ${selected.has(id) ? 'selected' : ''}`}
            onClick={() => toggle(id)}
          >
            {id}
          </span>
        ))}
      </div>
    </div>
  );
}

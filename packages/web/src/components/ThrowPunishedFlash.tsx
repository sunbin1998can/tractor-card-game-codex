import { useStore } from '../store';

export default function ThrowPunishedFlash() {
  const active = useStore((s) => s.throwPunishedFlash);

  if (!active) return null;

  return (
    <div className="throw-punished-overlay">
      <div className="punished-x-icon">{'\u2716'}</div>
    </div>
  );
}

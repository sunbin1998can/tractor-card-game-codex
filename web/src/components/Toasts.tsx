import { useStore } from '../store';

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  if (!toasts.length) return null;

  return (
    <div>
      {toasts.map((t, i) => (
        <div key={`${t}-${i}`} className="toast">{t}</div>
      ))}
    </div>
  );
}

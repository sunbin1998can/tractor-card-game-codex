import { useEffect } from 'react';
import { useStore } from '../store';

export default function FloatingPoints() {
  const points = useStore((s) => s.floatingPoints);
  const expire = useStore((s) => s.expireFloatingPoints);

  useEffect(() => {
    if (points.length === 0) return;
    const timer = window.setInterval(expire, 500);
    return () => window.clearInterval(timer);
  }, [points.length, expire]);

  if (points.length === 0) return null;

  return (
    <div className="floating-points-container">
      {points.map((pt) => (
        <div key={pt.id} className="floating-point">+{pt.value} pts</div>
      ))}
    </div>
  );
}

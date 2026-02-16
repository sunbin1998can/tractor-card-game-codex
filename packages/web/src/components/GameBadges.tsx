import { useEffect } from 'react';
import { useStore } from '../store';

export default function GameBadges() {
  const badges = useStore((s) => s.badges);
  const expire = useStore((s) => s.expireBadges);

  useEffect(() => {
    if (badges.length === 0) return;
    const timer = window.setInterval(expire, 500);
    return () => window.clearInterval(timer);
  }, [badges.length, expire]);

  if (badges.length === 0) return null;

  return (
    <div className="game-badges-container">
      {badges.map((badge) => (
        <div key={badge.id} className="game-badge">{badge.label}</div>
      ))}
    </div>
  );
}

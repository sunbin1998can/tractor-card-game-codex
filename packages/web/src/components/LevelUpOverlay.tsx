import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';

export default function LevelUpOverlay() {
  const effect = useStore((s) => s.levelUpEffect);

  useEffect(() => {
    if (!effect) return;
    const defaults = {
      spread: 90,
      ticks: 100,
      gravity: 1,
      decay: 0.92,
      startVelocity: 35,
      colors: ['#ffd700', '#ff9800', '#ffeb3b', '#fff176'],
    };
    confetti({ ...defaults, particleCount: 60, origin: { x: 0.3, y: 0.5 } });
    setTimeout(() => confetti({ ...defaults, particleCount: 60, origin: { x: 0.7, y: 0.5 } }), 150);
    setTimeout(() => confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.6 } }), 300);
  }, [effect]);

  if (!effect) return null;

  return (
    <div className="level-up-overlay">
      <div className="level-up-text">
        Level Up! +{effect.delta}
      </div>
    </div>
  );
}

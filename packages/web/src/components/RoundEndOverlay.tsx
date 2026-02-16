import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';
import { useT } from '../i18n';

function fireVictoryConfetti() {
  const defaults = {
    spread: 60,
    ticks: 80,
    gravity: 1.2,
    decay: 0.94,
    startVelocity: 30,
    colors: ['#ffd700', '#ff9800', '#f44336', '#e91e63'],
  };

  confetti({ ...defaults, particleCount: 40, origin: { x: 0.3, y: 0.6 } });
  setTimeout(() => confetti({ ...defaults, particleCount: 30, origin: { x: 0.7, y: 0.5 } }), 200);
  setTimeout(() => confetti({ ...defaults, particleCount: 50, origin: { x: 0.5, y: 0.7 } }), 400);
}

export default function RoundEndOverlay() {
  const effect = useStore((s) => s.roundEndEffect);
  const setRoundEndEffect = useStore((s) => s.setRoundEndEffect);
  const t = useT();

  useEffect(() => {
    if (!effect) return;
    if (effect === 'win') {
      fireVictoryConfetti();
    }
    const timer = window.setTimeout(() => {
      setRoundEndEffect(null);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [effect, setRoundEndEffect]);

  if (!effect) return null;

  return (
    <div className="round-end-overlay">
      <div className={`round-end-banner ${effect}`}>
        <span className="round-end-text">
          {effect === 'win' ? t('round.victory') : t('round.goodGame')}
        </span>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
import { useStore } from '../store';

function randomAngle(i: number, total: number) {
  return (360 / total) * i + (Math.random() - 0.5) * 30;
}

export default function CardImpactParticles() {
  const burst = useStore((s) => s.impactBurst);

  const particles = useMemo(() => {
    if (!burst) return [];
    const count = 12;
    return Array.from({ length: count }, (_, i) => {
      const angle = randomAngle(i, count);
      const distance = 40 + Math.random() * 60;
      const rad = (angle * Math.PI) / 180;
      const tx = Math.cos(rad) * distance;
      const ty = Math.sin(rad) * distance;
      const size = 4 + Math.random() * 6;
      return { angle, tx, ty, size, delay: Math.random() * 0.05 };
    });
  }, [burst?.id]);

  if (!burst) return null;

  return (
    <div className="impact-burst-container">
      {particles.map((p, i) => (
        <div
          key={i}
          className="impact-particle"
          style={{
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, ${burst.suitColor}, transparent)`,
            '--tx': `${p.tx}px`,
            '--ty': `${p.ty}px`,
            animationDelay: `${p.delay}s`,
            transform: `translate(${p.tx}px, ${p.ty}px)`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

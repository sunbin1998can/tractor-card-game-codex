import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useStore } from '../store';

const SUIT_SYMBOLS: Record<string, string> = {
  S: '\u2660',
  H: '\u2665',
  D: '\u2666',
  C: '\u2663',
};

export default function TrumpDeclareOverlay() {
  const flash = useStore((s) => s.trumpDeclareFlash);

  useEffect(() => {
    if (!flash) return;
    if (flash.isOverride) {
      confetti({
        particleCount: 60,
        spread: 80,
        colors: ['#ffd700', '#ffb300', '#ff8f00'],
        origin: { x: 0.5, y: 0.5 },
      });
    }
  }, [flash]);

  if (!flash) return null;

  const symbol = SUIT_SYMBOLS[flash.suit] || '\u2660';
  const isRed = flash.suit === 'H' || flash.suit === 'D';

  return (
    <div className="trump-declare-overlay">
      <div className="trump-flash-bg" />
      <div className="trump-suit-icon" style={{ color: isRed ? '#e53935' : '#1a1a2e' }}>
        {symbol}
      </div>
    </div>
  );
}

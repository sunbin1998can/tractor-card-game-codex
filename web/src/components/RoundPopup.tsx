import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import CardFace from './CardFace';

function playCheer() {
  if (typeof window === 'undefined') return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  try {
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.12);
    });
    window.setTimeout(() => {
      void ctx.close();
    }, 900);
  } catch {
    // ignore audio errors
  }
}

export default function RoundPopup() {
  const text = useStore((s) => s.roundPopup);
  const setRoundPopup = useStore((s) => s.setRoundPopup);
  const state = useStore((s) => s.publicState);
  const lastCheerText = useRef<string | null>(null);
  const t = useT();

  const isFinal = !!text && text.includes('Final winners:');

  useEffect(() => {
    if (!text || !isFinal) return;
    if (lastCheerText.current === text) return;
    lastCheerText.current = text;
    playCheer();
  }, [isFinal, text]);

  if (!text) return null;

  const players = state?.players ?? 4;
  const playedBySeat = state?.lastRoundResult?.playedBySeat ?? [];
  const kittyCards = state?.lastRoundResult?.kittyCards ?? [];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel modal-card round-result-card">
        <div className="round-result-scroll">
          <div className="modal-title round-result-title">{t('round.title')}</div>
          <pre className="modal-text round-result-text">{text}</pre>
          <div className={`round-cards-grid ${players === 6 ? 'six' : 'four'}`}>
            {(state?.seats ?? []).map((seat) => (
              <div key={seat.seat} className="round-seat-block">
                <div className="round-seat-title">{seat.name || `${t('seat.seat')} ${seat.seat + 1}`}:</div>
                <div className="round-seat-cards">
                  {(playedBySeat[seat.seat] ?? []).map((id, idx) => (
                    <CardFace key={`${seat.seat}-${id}-${idx}`} id={id} mini />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="round-kitty-block">
            <div className="round-seat-title">{t('round.buried')}:</div>
            <div className="round-seat-cards">
              {kittyCards.map((id, idx) => (
                <CardFace key={`kitty-${id}-${idx}`} id={id} mini />
              ))}
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            wsClient.announceNextRound();
            wsClient.send({ type: 'NEXT_ROUND' });
            setRoundPopup(null);
          }}
        >
          {t('round.ok')}
        </button>
      </div>
    </div>
  );
}

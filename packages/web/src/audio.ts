import { useStore } from './store';

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  try { return new Ctor(); } catch { return null; }
}

function isMuted(): boolean {
  return useStore.getState().muted;
}

export function playTurnNotification() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [587.33, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0.0001, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.3);
  });
  window.setTimeout(() => { void ctx.close(); }, 600);
}

export function playTrickWinSound(isMyTeam: boolean) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (isMyTeam) {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.0001, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.25);
    });
    window.setTimeout(() => { void ctx.close(); }, 600);
  } else {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);
    window.setTimeout(() => { void ctx.close(); }, 500);
  }
}

export function playVictoryFanfare() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const fanfare = [
    { freq: 523.25, start: 0, dur: 0.15 },
    { freq: 659.25, start: 0.12, dur: 0.15 },
    { freq: 783.99, start: 0.24, dur: 0.15 },
    { freq: 1046.50, start: 0.5, dur: 0.5 },
  ];
  fanfare.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + start);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + start); osc.stop(now + start + dur + 0.05);
  });
  window.setTimeout(() => { void ctx.close(); }, 1200);
}

export function playDefeatSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [392.00, 329.63, 261.63].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.2);
    gain.gain.setValueAtTime(0.0001, now + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.1, now + i * 0.2 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.2 + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + i * 0.2); osc.stop(now + i * 0.2 + 0.4);
  });
  window.setTimeout(() => { void ctx.close(); }, 1000);
}

export function playChatSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
  window.setTimeout(() => { void ctx.close(); }, 300);
}

export function playCardPlaySound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.15);
  window.setTimeout(() => { void ctx.close(); }, 200);
}

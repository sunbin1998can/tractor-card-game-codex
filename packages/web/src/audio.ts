import { useStore } from './store';

let sharedCtx: AudioContext | null = null;

/** Warm up the AudioContext on the first user gesture so later calls can use it. */
function initOnGesture() {
  if (sharedCtx) return;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return;
  try { sharedCtx = new Ctor(); } catch { /* unsupported */ }
  for (const evt of ['click', 'touchstart', 'keydown'] as const) {
    window.removeEventListener(evt, initOnGesture, true);
  }
}

if (typeof window !== 'undefined') {
  for (const evt of ['click', 'touchstart', 'keydown'] as const) {
    window.addEventListener(evt, initOnGesture, { capture: true, once: false });
  }
}

function getCtx(): AudioContext | null {
  if (!sharedCtx || sharedCtx.state === 'closed') return null;
  if (sharedCtx.state === 'suspended') sharedCtx.resume();
  return sharedCtx;
}

function isMuted(): boolean {
  return useStore.getState().muted;
}

export function playTurnNotification() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  [330, 440].forEach((freq, i) => {
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
}

export function playTrickWinSound(isMyTeam: boolean) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (isMyTeam) {
    [262, 330, 392, 523].forEach((freq, i) => {
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
  }
}

export function playVictoryFanfare() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const fanfare = [
    { freq: 262, start: 0, dur: 0.15 },
    { freq: 330, start: 0.12, dur: 0.15 },
    { freq: 392, start: 0.24, dur: 0.15 },
    { freq: 523, start: 0.5, dur: 0.5 },
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
}

export function playChatSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(250, now + 0.08);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
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
}

// --- New sound functions ---

export function playTrumpDeclareFanfare(isOverride: boolean) {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, now);
  filter.connect(ctx.destination);

  const notes = [220, 293, 370];
  if (isOverride) notes.push(440);

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    gain.gain.setValueAtTime(0.0001, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.12, now + i * 0.15 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.25);
    osc.connect(gain); gain.connect(filter);
    osc.start(now + i * 0.15); osc.stop(now + i * 0.15 + 0.3);
  });
}

export function playDealingSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(300, now);
  filter.Q.setValueAtTime(2, now);
  filter.connect(ctx.destination);

  const bufferSize = Math.floor(ctx.sampleRate * 1.2);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);

  for (let i = 0; i < 8; i++) {
    const t = now + i * 0.15;
    gain.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  }

  source.connect(gain); gain.connect(filter);
  source.start(now); source.stop(now + 1.2);
}

export function playKittyRevealSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(150, now);
  osc1.frequency.exponentialRampToValueAtTime(400, now + 0.8);
  gain1.gain.setValueAtTime(0.0001, now);
  gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
  osc1.connect(gain1); gain1.connect(ctx.destination);
  osc1.start(now); osc1.stop(now + 0.85);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(80, now + 0.8);
  gain2.gain.setValueAtTime(0.0001, now + 0.8);
  gain2.gain.exponentialRampToValueAtTime(0.15, now + 0.82);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
  osc2.connect(gain2); gain2.connect(ctx.destination);
  osc2.start(now + 0.8); osc2.stop(now + 1.0);
}

export function playScreenShakeImpact() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(60, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(200, now);
  filter.Q.setValueAtTime(3, now);
  filter.connect(ctx.destination);

  const bufferSize = Math.floor(ctx.sampleRate * 0.1);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.0001, now);
  nGain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  source.connect(nGain); nGain.connect(filter);
  source.start(now); source.stop(now + 0.15);
}

export function playLevelUpSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  [262, 330, 392, 440, 523].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0.0001, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + i * 0.12); osc.stop(now + i * 0.12 + 0.25);
  });

  const chordStart = now + 0.6;
  [262, 330, 392].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, chordStart);
    gain.gain.setValueAtTime(0.0001, chordStart);
    gain.gain.exponentialRampToValueAtTime(0.1, chordStart + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, chordStart + 0.6);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(chordStart); osc.stop(chordStart + 0.65);
  });
}

export function playThrowPunishedSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(600, now);
  filter.connect(ctx.destination);

  const slides = [
    { from: 350, to: 300, start: 0, dur: 0.3 },
    { from: 300, to: 220, start: 0.35, dur: 0.35 },
  ];
  slides.forEach(({ from, to, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, now + start);
    osc.frequency.exponentialRampToValueAtTime(to, now + start + dur);
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(0.1, now + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
    osc.connect(gain); gain.connect(filter);
    osc.start(now + start); osc.stop(now + start + dur + 0.05);
  });
}

export function playTractorLeadSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(700, now);
  filter.connect(ctx.destination);

  [220, 330].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain); gain.connect(filter);
    osc.start(now); osc.stop(now + 0.35);
  });
}

export function playPairLeadSound() {
  if (isMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.2);
}

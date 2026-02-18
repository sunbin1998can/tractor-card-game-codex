// Simple chiptune background music generator using Web Audio API

type TrackId = 'arcade' | 'chill' | 'tension' | 'none';

const TRACKS: { id: TrackId; label: string; labelZh: string }[] = [
  { id: 'none', label: 'Off', labelZh: '关闭' },
  { id: 'arcade', label: 'Arcade', labelZh: '街机' },
  { id: 'chill', label: 'Chill', labelZh: '轻松' },
  { id: 'tension', label: 'Tension', labelZh: '紧张' },
];

let ctx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let currentTrack: TrackId = 'none';
let activeOscillators: OscillatorNode[] = [];
let loopTimer: number | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    gainNode = ctx.createGain();
    gainNode.gain.value = 0.08;
    gainNode.connect(ctx.destination);
  }
  return ctx;
}

function stopAll() {
  for (const osc of activeOscillators) {
    try { osc.stop(); } catch {}
  }
  activeOscillators = [];
  if (loopTimer !== null) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

function playNote(freq: number, duration: number, startTime: number, type: OscillatorType = 'square') {
  const c = getCtx();
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const env = c.createGain();
  env.gain.setValueAtTime(0.3, startTime);
  env.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.9);

  osc.connect(env);
  env.connect(gainNode!);
  osc.start(startTime);
  osc.stop(startTime + duration);
  activeOscillators.push(osc);
  osc.onended = () => {
    const idx = activeOscillators.indexOf(osc);
    if (idx >= 0) activeOscillators.splice(idx, 1);
  };
}

// Arcade melody - upbeat Tetris-inspired loop
const ARCADE_NOTES = [
  659, 494, 523, 587, 523, 494, 440, 440, 523, 659, 587, 523, 494, 494, 523, 587,
  659, 523, 440, 440, 0, 587, 698, 880, 784, 698, 659, 523, 659, 587, 523, 494,
];

function playArcadeLoop() {
  const c = getCtx();
  const now = c.currentTime;
  const noteLen = 0.18;

  ARCADE_NOTES.forEach((freq, i) => {
    if (freq > 0) {
      playNote(freq, noteLen * 0.9, now + i * noteLen, 'square');
    }
  });

  const loopMs = ARCADE_NOTES.length * noteLen * 1000;
  loopTimer = window.setInterval(() => {
    const t = getCtx().currentTime;
    ARCADE_NOTES.forEach((freq, i) => {
      if (freq > 0) {
        playNote(freq, noteLen * 0.9, t + i * noteLen, 'square');
      }
    });
  }, loopMs);
}

// Chill melody - slower, relaxed
const CHILL_NOTES = [
  262, 330, 392, 523, 392, 330, 262, 0, 294, 349, 440, 523, 440, 349, 294, 0,
];

function playChillLoop() {
  const c = getCtx();
  const now = c.currentTime;
  const noteLen = 0.4;

  CHILL_NOTES.forEach((freq, i) => {
    if (freq > 0) {
      playNote(freq, noteLen * 0.8, now + i * noteLen, 'sine');
    }
  });

  const loopMs = CHILL_NOTES.length * noteLen * 1000;
  loopTimer = window.setInterval(() => {
    const t = getCtx().currentTime;
    CHILL_NOTES.forEach((freq, i) => {
      if (freq > 0) {
        playNote(freq, noteLen * 0.8, t + i * noteLen, 'sine');
      }
    });
  }, loopMs);
}

// Tension melody - minor key, dramatic
const TENSION_NOTES = [
  330, 311, 294, 277, 262, 0, 330, 349, 392, 370, 330, 0, 294, 277, 262, 247,
];

function playTensionLoop() {
  const c = getCtx();
  const now = c.currentTime;
  const noteLen = 0.3;

  TENSION_NOTES.forEach((freq, i) => {
    if (freq > 0) {
      playNote(freq, noteLen * 0.85, now + i * noteLen, 'sawtooth');
    }
  });

  const loopMs = TENSION_NOTES.length * noteLen * 1000;
  loopTimer = window.setInterval(() => {
    const t = getCtx().currentTime;
    TENSION_NOTES.forEach((freq, i) => {
      if (freq > 0) {
        playNote(freq, noteLen * 0.85, t + i * noteLen, 'sawtooth');
      }
    });
  }, loopMs);
}

function playTrack(track: TrackId) {
  stopAll();
  currentTrack = track;
  if (track === 'none') return;
  if (track === 'arcade') playArcadeLoop();
  else if (track === 'chill') playChillLoop();
  else if (track === 'tension') playTensionLoop();
}

function setVolume(vol: number) {
  if (gainNode) gainNode.gain.value = Math.max(0, Math.min(1, vol));
}

function getCurrentTrack(): TrackId {
  return currentTrack;
}

export { TRACKS, playTrack, stopAll, setVolume, getCurrentTrack, type TrackId };

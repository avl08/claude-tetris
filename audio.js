'use strict';

// Efectos de sonido sintetizados con WebAudio (sin ficheros externos).
// El AudioContext se crea de forma perezosa en el primer gesto del usuario
// porque los navegadores bloquean el autoplay antes de esa interacción.

const Sfx = (() => {
  const MUTE_KEY = 'tetris-muted';
  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem(MUTE_KEY) === 'true';
  } catch {
    // localStorage puede fallar en navegación privada; se queda sin silenciar
  }

  function ensureContext() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      ctx = null; // el navegador no soporta WebAudio; los sonidos se ignoran
    }
    return ctx;
  }

  function armOnGesture() {
    const arm = () => {
      ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    };
    ['pointerdown', 'keydown'].forEach(evt =>
      window.addEventListener(evt, arm, { once: true })
    );
  }

  function tone(freq, duration, { type = 'sine', gain = 0.2, freqEnd, delay = 0 } = {}) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.linearRampToValueAtTime(freqEnd, t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  function noiseBurst(duration, { filterStart = 4000, filterEnd = 200, gain = 0.3 } = {}) {
    if (muted) return;
    const audioCtx = ensureContext();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterStart, t0);
    filter.frequency.exponentialRampToValueAtTime(filterEnd, t0 + duration);
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

    source.connect(filter).connect(g).connect(audioCtx.destination);
    source.start(t0);
    source.stop(t0 + duration);
  }

  const recipes = {
    explosion: () => noiseBurst(0.4, { filterStart: 3000, filterEnd: 120, gain: 0.35 }),
    zap: () => tone(1600, 0.25, { type: 'sawtooth', freqEnd: 200, gain: 0.18 }),
    dye: () => {
      tone(660, 0.18, { type: 'sine', gain: 0.15 });
      tone(990, 0.22, { type: 'sine', gain: 0.15, delay: 0.08 });
    },
    gravity: () => tone(220, 0.3, { type: 'triangle', freqEnd: 80, gain: 0.25 }),
    freeze: () => tone(500, 0.3, { type: 'sine', freqEnd: 1400, gain: 0.15 }),
    unfreeze: () => tone(1400, 0.25, { type: 'sine', freqEnd: 500, gain: 0.15 }),
  };

  function play(name) {
    const recipe = recipes[name];
    if (recipe) recipe();
  }

  function setMuted(value) {
    muted = value;
    try {
      localStorage.setItem(MUTE_KEY, String(muted));
    } catch {
      // ver comentario de arriba
    }
  }

  function isMuted() {
    return muted;
  }

  armOnGesture();

  return { play, setMuted, isMuted };
})();

// Quiet seasonal ambience synthesised with WebAudio (no audio files): rain, a crackling fireplace,
// birds in the breeze, and a little music-box "Happy Birthday". Off by default.

let ac = null;
let master = null;
let current = null; // { kind, stop() }

function context() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = 0.55;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function noiseBuffer(seconds = 2, brown = false) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else data[i] = white;
  }
  return buf;
}

function loopNoise({ brown = false, type, freq, q = 0.7, gain }) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(3, brown);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ac.createGain();
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(gain, ac.currentTime + 1.5);
  src.connect(filter).connect(g).connect(master);
  src.start();
  return { src, g };
}

/** Repeats `fn` at random intervals between min and max seconds until stopped. */
function every(min, max, fn) {
  let timer = 0;
  const tick = () => {
    fn();
    timer = setTimeout(tick, (min + Math.random() * (max - min)) * 1000);
  };
  timer = setTimeout(tick, min * 1000);
  return () => clearTimeout(timer);
}

function blip({ freq, to, dur, type = 'sine', gain = 0.08, delay = 0 }) {
  const t = ac.currentTime + delay;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function crackle() {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(0.04);
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 1800 + Math.random() * 2500;
  const g = ac.createGain();
  g.gain.value = 0.05 + Math.random() * 0.12;
  src.connect(f).connect(g).connect(master);
  src.start();
}

const HAPPY_BIRTHDAY = [
  [392, 0.75],
  [392, 0.25],
  [440, 1],
  [392, 1],
  [523, 1],
  [494, 2],
  [392, 0.75],
  [392, 0.25],
  [440, 1],
  [392, 1],
  [587, 1],
  [523, 2],
  [392, 0.75],
  [392, 0.25],
  [784, 1],
  [659, 1],
  [523, 1],
  [494, 1],
  [440, 2],
  [698, 0.75],
  [698, 0.25],
  [659, 1],
  [523, 1],
  [587, 1],
  [523, 3],
];

function musicBox() {
  const beat = 0.42;
  let t = 0;
  for (const [freq, len] of HAPPY_BIRTHDAY) {
    blip({ freq, dur: len * beat * 1.6, type: 'triangle', gain: 0.07, delay: t });
    blip({ freq: freq * 2, dur: len * beat, type: 'sine', gain: 0.02, delay: t });
    t += len * beat;
  }
  return t;
}

const AMBIENCE = {
  rain() {
    const hiss = loopNoise({ type: 'bandpass', freq: 1400, q: 0.5, gain: 0.16 });
    const low = loopNoise({ brown: true, type: 'lowpass', freq: 500, gain: 0.2 });
    const drips = every(0.2, 0.9, () => blip({ freq: 1800 + Math.random() * 1600, to: 900, dur: 0.06, gain: 0.025 }));
    return () => {
      drips();
      hiss.src.stop();
      low.src.stop();
    };
  },
  fire() {
    const rumble = loopNoise({ brown: true, type: 'lowpass', freq: 320, gain: 0.3 });
    const pops = every(0.05, 0.45, crackle);
    return () => {
      pops();
      rumble.src.stop();
    };
  },
  birds() {
    const breeze = loopNoise({ type: 'lowpass', freq: 700, gain: 0.05 });
    const chirps = every(3, 9, () => {
      const base = 2400 + Math.random() * 1600;
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) blip({ freq: base, to: base * 1.35, dur: 0.09, gain: 0.03, delay: i * 0.13 });
    });
    return () => {
      chirps();
      breeze.src.stop();
    };
  },
  musicbox() {
    let timer = 0;
    const play = () => {
      const len = musicBox();
      timer = setTimeout(play, (len + 8) * 1000);
    };
    play();
    return () => clearTimeout(timer);
  },
};

/** Plays the ambience `kind` (or nothing for null). Must first be called from a click/tap. */
export function setAmbience(kind) {
  if (current?.kind === kind) {
    if (ac?.state === 'suspended') ac.resume(); // first click after launch unlocks audio
    return;
  }
  current?.stop();
  current = null;
  if (!kind || !AMBIENCE[kind]) return;
  try {
    context();
    current = { kind, stop: AMBIENCE[kind]() };
  } catch {
    current = null;
  }
}

export const ambienceOn = () => Boolean(current);

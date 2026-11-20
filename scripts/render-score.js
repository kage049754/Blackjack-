#!/usr/bin/env node
/**
 * Offline score renderer.
 *
 * The live synth in js/bgm.js is realtime: it has to run on a phone while the
 * game is running, so it is thin. This script has no such limit. It renders
 * the same music with far more voices, a proper Schroeder reverb, and real
 * envelopes, then bakes it to MP3 so the device only has to decode.
 *
 *   node scripts/render-score.js
 *
 * Output: assets/audio/*.mp3 (+ manifest.json)
 * Deterministic: the RNG is seeded, so a rebuild produces the same files.
 */
const fs = require('fs');
const path = require('path');

/* lamejs is only used here at build time, never shipped. The maintained fork
   ships an ES module, which is the one that actually works on modern Node. */
let Mp3Encoder = null;

async function loadEncoder() {
  const candidates = [
    path.resolve(__dirname, '..', 'node_modules', '@breezystack', 'lamejs', 'dist', 'lamejs.js'),
    path.resolve(__dirname, '..', '.tmp', 'tools', 'node_modules', '@breezystack', 'lamejs', 'dist', 'lamejs.js')
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const mod = await import('file://' + file);
    Mp3Encoder = mod.Mp3Encoder;
    return true;
  }
  return false;
}

const SR = 44100;
const OUT = path.resolve(__dirname, '..', 'assets', 'audio');

/* ---------- deterministic RNG ---------- */
function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/* ---------- voice primitives (all mono, added into a float array) ---------- */

function addAt(buf, start, samples, gain, pan) {
  const l = gain * (1 - Math.max(0, pan)) ;
  const r = gain * (1 + Math.min(0, pan));
  for (let i = 0; i < samples.length; i++) {
    const idx = start + i;
    if (idx < 0 || idx >= buf.length) continue;
    buf[idx] += samples[i] * (l + r) * 0.5;
  }
}

/* bowed string section: five detuned saws through a one-pole lowpass */
function strings(dur, freq, opts) {
  const o = opts || {};
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const voices = o.voices || 5;
  const attack = o.attack || 0.55;
  const release = o.release || 1.1;
  const cut = o.cutoff || 1500;
  const vib = o.vibrato === undefined ? 0.0025 : o.vibrato;

  for (let v = 0; v < voices; v++) {
    const detune = (v - (voices - 1) / 2) * (o.spread || 1.6);
    const f = freq * Math.pow(2, detune / 1200);
    let phase = Math.random();
    let lp = 0;
    const k = Math.min(0.99, (2 * Math.PI * cut) / SR);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const wobble = 1 + Math.sin(2 * Math.PI * (4.6 + v * 0.13) * t) * vib;
      phase += (f * wobble) / SR;
      if (phase >= 1) phase -= 1;
      const saw = 2 * phase - 1;
      lp += k * (saw - lp);

      let env = 1;
      if (t < attack) env = t / attack;
      if (t > dur - release) env = Math.max(0, (dur - t) / release);

      out[i] += lp * env / voices;
    }
  }
  return out;
}

/* wordless choir: a saw pushed through three formant resonators */
function choir(dur, freq, opts) {
  const o = opts || {};
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const formants = o.formants || [[520, 90], [1180, 120], [2600, 180]];
  const attack = o.attack || 0.9;
  const release = o.release || 1.4;

  for (let v = 0; v < 3; v++) {
    const f = freq * Math.pow(2, ((v - 1) * 7) / 1200);
    let phase = Math.random();
    const bp = formants.map(() => ({ y1: 0, y2: 0 }));
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      phase += f / SR;
      if (phase >= 1) phase -= 1;
      const saw = 2 * phase - 1;
      let acc = 0;
      for (let k = 0; k < formants.length; k++) {
        const [cf, bw] = formants[k];
        const w = (2 * Math.PI * cf) / SR;
        const r = Math.exp(-Math.PI * bw / SR);
        const st = bp[k];
        const y = saw + 2 * r * Math.cos(w) * st.y1 - r * r * st.y2;
        st.y2 = st.y1; st.y1 = y;
        acc += y * (k === 0 ? 0.9 : k === 1 ? 0.55 : 0.28);
      }
      let env = 1;
      if (t < attack) env = t / attack;
      if (t > dur - release) env = Math.max(0, (dur - t) / release);
      out[i] += acc * env * 0.06;
    }
  }
  return out;
}

/* plucked harp: additive partials with fast decay */
function harp(dur, freq, opts) {
  const o = opts || {};
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const partials = [[1, 1], [2, 0.4], [3, 0.2], [4, 0.1], [5, 0.05]];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    for (let p = 0; p < partials.length; p++) {
      const [mult, amp] = partials[p];
      s += Math.sin(2 * Math.PI * freq * mult * t) * amp *
           Math.exp(-t * (2.4 + mult * 1.7));
    }
    out[i] = s * Math.exp(-t * 1.2) * 0.5;
  }
  return out;
}

/* pipe organ: odd harmonics, steady */
function organ(dur, freq, opts) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  const attack = (opts && opts.attack) || 0.25;
  const release = (opts && opts.release) || 0.5;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    [1, 3, 5, 7, 9].forEach((h, k) => {
      s += Math.sin(2 * Math.PI * freq * h * t + k) / (h * 1.3);
    });
    let env = 1;
    if (t < attack) env = t / attack;
    if (t > dur - release) env = Math.max(0, (dur - t) / release);
    out[i] = s * env * 0.28;
  }
  return out;
}

/* timpani: pitched thump with a felt beater */
function timpani(dur, freq) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = freq * (1 + 0.5 * Math.exp(-t * 26));
    phase += f / SR;
    const body = Math.sin(2 * Math.PI * phase) * Math.exp(-t * 3.1);
    const noise = (Math.random() * 2 - 1) * Math.exp(-t * 42) * 0.5;
    out[i] = (body + noise) * 0.55;
  }
  return out;
}

/* inharmonic bell */
function bellVoice(dur, freq) {
  const n = Math.floor(dur * SR);
  const out = new Float32Array(n);
  [[1, 1, 1.1], [2.76, 0.55, 1.7], [5.4, 0.28, 2.4], [8.9, 0.12, 3.2]]
    .forEach(([mult, amp, decay]) => {
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        out[i] += Math.sin(2 * Math.PI * freq * mult * t) * amp * Math.exp(-t * decay) * 0.35;
      }
    });
  return out;
}

/* ---------- reverb (Schroeder) ---------- */
function reverb(input, wet, size) {
  const out = new Float32Array(input.length);
  const scale = size / 1.0;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491].map((d) =>
    Math.round(d * scale));
  const feedback = 0.79;
  const damp = 0.32;

  combs.forEach((d, ci) => {
    const buf = new Float32Array(d);
    let idx = 0, filt = 0;
    const gain = 1 / combs.length;
    for (let i = 0; i < input.length; i++) {
      const y = buf[idx];
      filt = y * (1 - damp) + filt * damp;
      buf[idx] = input[i] + filt * feedback;
      out[i] += y * wet * gain;
      idx = (idx + 1) % d;
    }
  });

  [556, 441, 341].forEach((dd) => {
    const d = Math.round(dd * scale);
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < input.length; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  });

  return out;
}

/* ---------- composition ---------- */

const SCALE = [50, 51, 53, 55, 57, 58, 61, 62, 65, 67, 69, 70, 73]; // D phrygian dominant
const ROOTS = [38, 34, 41, 36];   // D2 Bb1 F2 C2
const FIFTHS = [45, 41, 48, 43];  // A2 F2 C3 G2

function compose(mood) {
  const cfg = {
    menu:  { bpm: 44, bars: 24, wet: 0.55, seed: 1337, dense: 0.35, timp: false },
    duel:  { bpm: 52, bars: 24, wet: 0.42, seed: 90210, dense: 0.6,  timp: true  },
    final: { bpm: 58, bars: 20, wet: 0.5,  seed: 66613, dense: 0.85, timp: true  }
  }[mood];

  const beat = 60 / cfg.bpm;
  const bar = beat * 4;
  const total = Math.floor((cfg.bars * bar + 3.5) * SR);
  const dry = new Float32Array(total);
  const send = new Float32Array(total);
  const rng = makeRng(cfg.seed);

  const put = (samples, atSec, gain, pan, wet) => {
    const start = Math.floor(atSec * SR);
    addAt(dry, start, samples, gain, pan || 0);
    if (wet) addAt(send, start, samples, gain, pan || 0);
  };

  for (let b = 0; b < cfg.bars; b++) {
    const t0 = b * bar;
    const chordIdx = Math.floor(b / 4) % ROOTS.length;
    const root = ROOTS[chordIdx];
    const fifth = FIFTHS[chordIdx];

    /* the room: always present, changes every four bars */
    put(strings(bar * 3.4, midi(root), { cutoff: 900, attack: 1.2, voices: 5 }),
        t0, 0.30, 0, true);
    put(strings(bar * 3.2, midi(fifth), { cutoff: 1100, attack: 1.4, voices: 4 }),
        t0 + 0.12, 0.20, -0.2, true);

    /* the choir only appears in the last act */
    if (mood === 'final' && b % 2 === 0) {
      put(choir(bar * 3.0, midi(root + 12), { attack: 1.4 }),
          t0 + 0.2, 0.7, 0.15, true);
    }

    if (mood === 'final' && b >= 8) {
      put(organ(bar * 1.9, midi(root + 12)), t0, 0.22, 0.1, true);
    }

    /* harp: sparse arpeggios, higher when dense */
    const notes = cfg.dense > 0.5 ? 5 : 3;
    for (let i = 0; i < notes; i++) {
      if (rng() > cfg.dense) continue;
      const deg = SCALE[Math.floor(rng() * SCALE.length)];
      const when = t0 + beat * (Math.floor(rng() * 4) + rng());
      put(harp(beat * 2.6, midi(deg)), when, 0.16, (rng() - 0.5) * 0.7, true);
    }

    /* the melody line: a cello fragment, never busy */
    if (rng() < 0.55) {
      const deg = SCALE[Math.floor(rng() * SCALE.length)];
      const when = t0 + beat * Math.floor(rng() * 2);
      put(strings(beat * (1.6 + rng() * 1.6), midi(deg), {
        cutoff: 2200, attack: 0.12, release: 0.8, voices: 3, vibrato: 0.006
      }), when, 0.34, 0.05, true);
    }

    /* a bell somewhere else in the building */
    if (rng() < (mood === 'menu' ? 0.22 : 0.3)) {
      put(bellVoice(3.2, midi(74 + Math.floor(rng() * 8))), t0 + beat * 2, 0.30, 0.3, true);
    }

    /* timpani on the downbeat of every second bar */
    if (cfg.timp && b % 2 === 0) {
      put(timpani(2.4, midi(root - 12)), t0, 0.55, 0, true);
    }
  }

  /* mix: dry + reverb */
  const wet = reverb(send, cfg.wet, mood === 'final' ? 1.15 : 1.0);
  const mix = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    mix[i] = dry[i] + wet[i] * 0.9 + send[i] * 0.15;
  }

  return { samples: mix, loopAt: Math.floor(cfg.bars * bar * SR), total };
}

/* equal-power crossfade of the tail into the head so the loop is seamless */
function makeLoop(samples, loopAt) {
  const fade = Math.floor(1.8 * SR);
  const body = samples.slice(0, loopAt);
  const tail = samples.slice(loopAt, loopAt + fade);
  for (let i = 0; i < fade && i < body.length; i++) {
    const w = i / fade;
    body[i] = body[i] * Math.sqrt(w) + tail[i] * Math.sqrt(1 - w);
  }
  // normalise
  let peak = 0;
  for (let i = 0; i < body.length; i++) peak = Math.max(peak, Math.abs(body[i]));
  const g = peak > 0 ? 0.89 / peak : 1;
  for (let i = 0; i < body.length; i++) body[i] *= g;
  return body;
}

function toMp3(mono, kbps) {
  const enc = new Mp3Encoder(2, SR, kbps);
  const blockSize = 1152;
  const chunks = [];
  const left = new Int16Array(blockSize);
  const right = new Int16Array(blockSize);

  for (let i = 0; i < mono.length; i += blockSize) {
    const n = Math.min(blockSize, mono.length - i);
    for (let j = 0; j < n; j++) {
      // a touch of width: right channel delayed by 12 samples
      const l = mono[i + j];
      const r = mono[Math.max(0, i + j - 12)] * 0.98;
      left[j] = Math.max(-32768, Math.min(32767, Math.round(l * 32767)));
      right[j] = Math.max(-32768, Math.min(32767, Math.round(r * 32767)));
    }
    const buf = enc.encodeBuffer(
      n === blockSize ? left : left.subarray(0, n),
      n === blockSize ? right : right.subarray(0, n)
    );
    if (buf.length) chunks.push(Buffer.from(buf));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

/* ---------- main ---------- */
async function main() {
  if (!await loadEncoder()) {
    console.error('No MP3 encoder. Run: npm install --save-dev @breezystack/lamejs');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = {};
  ['menu', 'duel', 'final'].forEach((mood) => {
    process.stdout.write(`  rendering ${mood}… `);
    const { samples, loopAt } = compose(mood);
    const loop = makeLoop(samples, loopAt);

    // A silent or NaN-filled buffer encodes to a perfectly valid MP3 that
    // sounds like nothing. Measure it before we ship it.
    let peak = 0, sumSq = 0, nan = 0;
    for (let i = 0; i < loop.length; i++) {
      const v = loop[i];
      if (!Number.isFinite(v)) { nan++; continue; }
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / loop.length);
    if (nan || peak < 0.05 || rms < 0.005) {
      console.error(`\n  ✗ ${mood} rendered badly (nan=${nan} peak=${peak.toFixed(3)} rms=${rms.toFixed(4)})`);
      process.exit(1);
    }

    const mp3 = toMp3(loop, 96);
    const file = path.join(OUT, mood + '.mp3');
    fs.writeFileSync(file, mp3);
    const secs = loop.length / SR;
    manifest[mood] = {
      file: 'assets/audio/' + mood + '.mp3',
      seconds: Number(secs.toFixed(2)),
      bytes: mp3.length,
      loop: true
    };
    console.log(`${secs.toFixed(1)}s, ${(mp3.length / 1024).toFixed(0)} KB, peak ${peak.toFixed(2)}, rms ${rms.toFixed(3)}`);
  });

  fs.writeFileSync(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ tracks: manifest, sampleRate: SR, codec: 'mp3', bitrate: 96 }, null, 2) + '\n'
  );

  const total = Object.values(manifest).reduce((n, t) => n + t.bytes, 0);
  console.log(`  ✓ score rendered — ${(total / 1024 / 1024).toFixed(2)} MB across 3 loops`);
}

main().catch((e) => { console.error(e); process.exit(1); });

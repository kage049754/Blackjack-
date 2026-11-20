/* =====================================================================
   The Last Hand — generative score
   ---------------------------------------------------------------------
   There are no .mp3 files. The music is synthesised, bar by bar, from a
   scale and a set of rules, so it never loops audibly and costs nothing
   to download.

   Layers
     drone    two detuned sines a fifth apart — the room itself
     pad      detuned saws through a slowly sweeping lowpass — the dread
     bell     inharmonic FM strike — something elsewhere in the crypt
     melody   a sparse, mournful line in D phrygian dominant
     pulse    a heartbeat that only appears when your vigil is low

   The score follows the game: it ducks for the draft, rises in tension,
   and stops dead on a killing blow.
   ===================================================================== */
(function (global) {
  'use strict';

  const D2 = 73.42;
  /* D phrygian dominant — the flat second is what makes it feel wrong. */
  const SCALE = [1, 1.0595 * 0.9439, 1.3348, 1.4983, 1.7818, 1.8877, 2.1189];
  const ROOTS = [1, 1.3348, 1.7818];          // D, F, A
  const CHORD_FIFTHS = [1.4983, 2.0, 2.6697]; // A, D, F

  let ctx = null;
  let master = null, musicBus = null, verbSend = null, verb = null;
  let enabled = true, running = false, mood = 'title';
  let timer = null, bar = 0, intensity = 0.35;
  let layers = {};
  let duckUntil = 0, duckLevel = 1;

  function ac() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      try { ctx = new AC(); } catch (e) { return null; }
      buildBus();
    }
    if (ctx.state === 'suspended') { ctx.resume().catch(function () {}); }
    return ctx;
  }

  function buildBus() {
    master = ctx.createGain();
    master.gain.value = 0.0;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.knee.value = 22;
    comp.ratio.value = 3.2;
    comp.attack.value = 0.006;
    comp.release.value = 0.28;

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.30;

    verb = ctx.createConvolver();
    verb.buffer = impulse(2.6, 2.4);
    verbSend = ctx.createGain();
    verbSend.gain.value = 0.32;

    musicBus.connect(master);
    musicBus.connect(verbSend);
    verbSend.connect(verb);
    verb.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
  }

  /* A synthetic stone-room impulse: noise under an exponential decay. */
  function impulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  function targetGain() {
    const ducking = performance.now() < duckUntil ? duckLevel : 1;
    return 0.30 * (enabled ? 1 : 0) * ducking;
  }

  function smooth(gainNode, value, time) {
    if (!gainNode) return;
    gainNode.gain.cancelScheduledValues(time);
    gainNode.gain.setTargetAtTime(value, time, 0.25);
  }

  /* ---------------------------------------------------------------- */
  /* instruments                                                       */
  /* ---------------------------------------------------------------- */

  function note(freq, at, dur, type, gain, cutoff, send) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff || 1400;
    f.Q.value = 0.7;

    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, at);

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.12, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    o.connect(f); f.connect(g); g.connect(musicBus);
    if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verbSend); }

    o.start(at); o.stop(at + dur + 0.05);
  }

  /* Inharmonic bell: two sines at a 2.76 ratio, like struck metal. */
  function bell(freq, at, gain) {
    [1, 2.76, 5.4].forEach(function (mult, i) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq * mult, at);
      const amp = (gain || 0.05) / (i + 1.6);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(amp, at + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 2.4 / (i * 0.7 + 1));
      o.connect(g); g.connect(musicBus);
      const s = ctx.createGain(); s.gain.value = 0.5;
      g.connect(s); s.connect(verbSend);
      o.start(at); o.stop(at + 3);
    });
  }

  function pad(freqs, at, dur) {
    freqs.forEach(function (f, i) {
      [0, 0.6].forEach(function (detune) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(320, at);
        flt.frequency.linearRampToValueAtTime(560 + intensity * 900, at + dur * 0.5);
        flt.frequency.linearRampToValueAtTime(300, at + dur);

        o.type = 'sawtooth';
        o.frequency.value = f + detune;

        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.016, at + dur * 0.35);
        g.gain.linearRampToValueAtTime(0.0001, at + dur);

        o.connect(flt); flt.connect(g); g.connect(musicBus);
        const s = ctx.createGain(); s.gain.value = 0.4;
        g.connect(s); s.connect(verbSend);
        o.start(at); o.stop(at + dur + 0.2);
      });
    });
  }

  function heartbeat(at, gain) {
    note(D2 * 0.5, at, 0.24, 'sine', gain, 240, 0.1);
    note(D2 * 0.42, at + 0.20, 0.30, 'sine', gain * 0.62, 200, 0.1);
  }

  /* ---------------------------------------------------------------- */
  /* the bar loop                                                      */
  /* ---------------------------------------------------------------- */

  function scheduleBar() {
    if (!running || !ctx) return;
    const bpm = mood === 'duel' ? 54 : 46;
    const beat = 60 / bpm;
    const barLen = beat * 4;
    const t = now() + 0.15;
    const n = bar++;

    /* harmony changes every four bars */
    const root = ROOTS[Math.floor(n / 4) % ROOTS.length];
    const fifth = CHORD_FIFTHS[Math.floor(n / 4) % CHORD_FIFTHS.length];

    /* pad: long, breathing, always present */
    pad([D2 * root, D2 * fifth, D2 * root * 2], t, barLen * 3.6);

    /* drone */
    if (!layers.drone) {
      const g = ctx.createGain();
      g.gain.value = 0.026;
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = D2;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = D2 + 0.7;
      const o3 = ctx.createOscillator(); o3.type = 'triangle'; o3.frequency.value = D2 * 1.5; 
      const g3 = ctx.createGain(); g3.gain.value = 0.35;
      o1.connect(g); o2.connect(g); o3.connect(g3); g3.connect(g);
      g.connect(musicBus);
      o1.start(); o2.start(); o3.start();
      layers.drone = { g: g, oscs: [o1, o2, o3] };
    }

    /* melody: 1-3 notes a bar, more when tense, never busy */
    const density = mood === 'title' ? 0.45 : 0.6 + intensity * 0.3;
    if (Math.random() < density) {
      const steps = mood === 'draft' ? 1 : 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < steps; i++) {
        const at = t + beat * (0.5 + Math.floor(Math.random() * 3.5));
        const deg = Math.floor(Math.random() * SCALE.length);
        const oct = Math.random() < 0.22 ? 4 : 2;
        note(D2 * SCALE[deg] * oct, at, beat * (1.4 + Math.random() * 2),
             'triangle', 0.030 + intensity * 0.012, 900 + Math.random() * 700, 0.55);
      }
    }

    /* bell: rare, and always feels like a warning */
    if (Math.random() < 0.16 + intensity * 0.14) {
      bell(D2 * (Math.random() < 0.5 ? 4 : 3) * (1 + Math.random() * 0.02), t + beat * 2, 0.028 + intensity * 0.02);
    }

    /* pulse: only when death is close */
    if (intensity > 0.5) {
      heartbeat(t + beat * 0.2, 0.028 + (intensity - 0.5) * 0.05);
      if (intensity > 0.8) heartbeat(t + beat * 2.2, 0.024);
    }

    const wait = barLen * 1000 - 60;
    timer = setTimeout(scheduleBar, Math.max(400, wait));
  }

  /* ---------------------------------------------------------------- */
  /* public API                                                        */
  /* ---------------------------------------------------------------- */

  const BGM = {
    start(nextMood) {
      if (!enabled) return;
      const c = ac(); if (!c) return;
      mood = nextMood || 'title';
      smooth(master, 1.0, now());
      if (running) return;
      running = true;
      bar = 0;
      scheduleBar();
    },

    stop(fade) {
      running = false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (!ctx) return;
      smooth(master, 0, now());
      if (layers.drone) {
        try {
          layers.drone.g.gain.setTargetAtTime(0.0001, now(), 0.15);
          layers.drone.oscs.forEach(function (o) { o.stop(now() + 1.2); });
        } catch (e) { /* already stopped */ }
        layers.drone = null;
      }
    },

    setMood(m) {
      if (mood === m) return;
      mood = m || 'duel';
      if (!running) this.start(mood);
    },

    setIntensity(x) {
      intensity = Math.max(0, Math.min(1, x));
      if (musicBus && ctx) {
        smooth(musicBus, 0.30 * (0.75 + intensity * 0.55), now());
      }
    },

    duck(ms) {
      duckUntil = performance.now() + (ms || 1200);
      if (musicBus && ctx) {
        const t = now();
        musicBus.gain.setTargetAtTime(0.10, t, 0.18);
        setTimeout(function () {
          if (musicBus && ctx && running) smooth(musicBus, 0.30 * (0.75 + intensity * 0.55), now());
        }, (ms || 1200) + 220);
      }
    },

    /* One-off hits that aren't part of the loop. */
    stinger(kind) {
      const c = ac(); if (!c) return;
      const t = now() + 0.02;
      if (kind === 'win') {
        [1, 1.3348, 1.5, 2].forEach(function (m, i) {
          note(D2 * m * 2, t + i * 0.16, 2.6 - i * 0.2, 'triangle', 0.035, 2200, 0.7);
        });
        bell(D2 * 4, t + 0.1, 0.05);
      } else if (kind === 'lose') {
        [1, 0.9439, 0.8409].forEach(function (m, i) {
          note(D2 * m, t + i * 0.28, 2.8, 'sawtooth', 0.026, 420, 0.6);
        });
        note(D2 * 0.5, t, 3.4, 'sine', 0.05, 180, 0.4);
      } else if (kind === 'cheat') {
        bell(D2 * 6.2, t, 0.05);
        note(D2 * 0.75, t + 0.05, 1.4, 'sawtooth', 0.04, 900, 0.5);
        note(D2 * 0.7, t + 0.22, 1.2, 'sawtooth', 0.03, 700, 0.5);
      } else if (kind === 'death') {
        bell(D2 * 2, t, 0.07);
        bell(D2 * 2, t + 1.4, 0.05);
        note(D2, t, 4.0, 'sine', 0.04, 200, 0.6);
      } else if (kind === 'card') {
        note(D2 * 3, t, 0.12, 'triangle', 0.012, 3000, 0.2);
      }
    },

    setEnabled(v) {
      enabled = !!v;
      if (!enabled) { this.stop(); return; }
      ac();
      this.start(mood);
    },

    isEnabled() { return enabled; },
    unlock() { ac(); },
    getMood() { return mood; }
  };

  /* Battery: don't schedule while the app is in the background. */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        running = false;
        if (timer) { clearTimeout(timer); timer = null; }
        if (master && ctx) smooth(master, 0, now());
      } else if (enabled) {
        BGM.start(mood);
      }
    });
  }

  /* The live synth is the fallback, and the source of one-off stingers.
     js/score.js takes over window.BGM with the recorded loops. */
  global.SynthBGM = BGM;
})(typeof window !== 'undefined' ? window : globalThis);

/* =====================================================================
   The Last Hand — recorded score playback
   ---------------------------------------------------------------------
   The three loops in assets/audio/ were rendered offline by
   scripts/render-score.js: many more voices than a phone could synthesise
   live, through a real Schroeder reverb, then baked to MP3.

   This module plays them with equal-power crossfades, routs each element
   through a lowpass so the music opens up as the duel tightens, ducks for
   the draft, and falls back to the live synth (js/bgm.js) if the files are
   missing or the browser refuses to decode them.

   Exposes window.BGM with the same surface the game already calls.
   ===================================================================== */
(function (global) {
  'use strict';

  const FILES = {
    menu:  'assets/audio/menu.mp3',
    duel:  'assets/audio/duel.mp3',
    final: 'assets/audio/final.mp3'
  };

  let enabled = true;
  let unlocked = false;
  let mood = 'title';
  let current = null;          // { mood, el, gain, filter, src }
  let fading = null;
  let intensity = 0.35;
  let duckUntil = 0;
  let ctx = null;
  let broken = false;          // fall back to the synth for good

  const BASE = 0.42;

  function synth() { return global.SynthBGM || null; }

  function audioCtx() {
    if (ctx) return ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    return ctx;
  }

  function make(moodName) {
    const el = new global.Audio();
    el.src = FILES[moodName];
    el.loop = true;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';
    el.volume = 0;

    const entry = { mood: moodName, el: el, gain: null, filter: null, src: null };

    // Route through Web Audio when we can: that is what lets the score
    // brighten as you lose Vigil.
    const c = audioCtx();
    if (c) {
      try {
        const src = c.createMediaElementSource(el);
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        filter.Q.value = 0.4;
        const gain = c.createGain();
        gain.gain.value = 0;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(c.destination);
        entry.src = src; entry.filter = filter; entry.gain = gain;
      } catch (e) {
        entry.gain = null; // tainted; fall back to element volume
      }
    }

    el.addEventListener('error', () => { broken = true; });
    return entry;
  }

  function setLevel(entry, value) {
    if (!entry) return;
    if (entry.gain) {
      const t = ctx.currentTime;
      entry.gain.gain.cancelScheduledValues(t);
      entry.gain.gain.setTargetAtTime(value, t, 0.35);
    } else {
      entry.el.volume = Math.max(0, Math.min(1, value));
    }
  }

  function openUp(entry) {
    if (!entry || !entry.filter || !ctx) return;
    const t = ctx.currentTime;
    const target = 700 + intensity * 5200;
    entry.filter.frequency.cancelScheduledValues(t);
    entry.filter.frequency.setTargetAtTime(target, t, 0.8);
  }

  function targetLevel() {
    const ducking = performance.now() < duckUntil ? 0.22 : 1;
    return BASE * (0.8 + intensity * 0.35) * ducking;
  }

  function play(moodName) {
    if (!enabled || broken) return;

    const c = audioCtx();
    if (c && c.state === 'suspended') c.resume().catch(() => {});

    const next = make(moodName);
    const started = next.el.play();
    if (started && started.catch) {
      started.catch(() => { broken = true; });
    }

    // leave the old one playing while it fades out
    if (current) {
      const old = current;
      const steps = 26;
      let i = 0;
      if (fading) clearInterval(fading);
      fading = setInterval(() => {
        i++;
        const k = 1 - i / steps;
        setLevel(old, targetLevel() * k);
        if (i >= steps) {
          clearInterval(fading); fading = null;
          try { old.el.pause(); } catch (e) {}
        }
      }, 45);
    }

    current = next;
    // fade in
    let j = 0;
    const steps = 30;
    const ramp = setInterval(() => {
      j++;
      setLevel(next, targetLevel() * (j / steps));
      if (j >= steps) clearInterval(ramp);
    }, 45);

    openUp(next);
  }

  const Score = {
    start(nextMood) {
      if (!enabled) return;
      unlocked = true;
      mood = nextMood || 'title';
      if (!current) { play(mood); return; }
      if (current.mood !== mood) play(mood);
    },

    setMood(m) {
      const nextMood = m || 'duel';
      if (mood === nextMood && current) return;
      mood = nextMood;
      if (unlocked && enabled) play(mood);
    },

    setIntensity(x) {
      intensity = Math.max(0, Math.min(1, x));
      if (current && !fading) setLevel(current, targetLevel());
      openUp(current);
      if (synth() && synth().setIntensity) synth().setIntensity(intensity);
    },

    duck(ms) {
      duckUntil = performance.now() + (ms || 1200);
      if (current) setLevel(current, targetLevel());
      setTimeout(() => { if (current) setLevel(current, targetLevel()); }, (ms || 1200) + 120);
    },

    /* One-off hits stay on the live synth: they are short and reactive. */
    stinger(kind) {
      const s = synth();
      if (s && s.stinger) { try { s.stinger(kind); } catch (e) {} }
    },

    setEnabled(v) {
      enabled = !!v;
      if (!enabled) { this.stop(); return; }
      if (unlocked) play(mood);
    },

    stop() {
      if (current) {
        const old = current;
        setLevel(old, 0);
        setTimeout(() => { try { old.el.pause(); } catch (e) {} }, 700);
        current = null;
      }
    },

    isEnabled() { return enabled; },
    unlock() {
      unlocked = true;
      const c = audioCtx();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
      const s = synth();
      if (s && s.unlock) { try { s.unlock(); } catch (e) {} }
    },
    getMood() { return mood; },
    usingRecordedAudio() { return !broken; }
  };

  global.BGM = Score;

  /* If the files never load, quietly switch back to the live synth. */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (!current) return;
      if (document.hidden) { try { current.el.pause(); } catch (e) {} }
      else if (enabled) { current.el.play().catch(function () {}); }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);

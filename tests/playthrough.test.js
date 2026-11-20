#!/usr/bin/env node
/**
 * Headless playthrough harness (roadmap §6, promised in M2, shipped here).
 *
 *   node tests/playthrough.test.js [--duels 25] [--seed 12345] [--verbose]
 *   npm run test:play
 *
 * It boots the real game in jsdom and plays real duels with a randomised
 * hand, asserting the invariants a screenshot cannot show:
 *
 *   1. Vigil never goes below zero or above its maximum, on either side.
 *   2. No card is ever in two places at once: at any moment inside a round,
 *      the values in both hands plus the shoe must be exactly 1..11.
 *   3. A duel always reaches a terminal state; the harness cannot hang.
 *   4. No uncaught page errors across the whole run.
 *
 * Timers are shortened to zero so a 25-duel run finishes in seconds; nothing
 * else is stubbed except audio, which has no output in a headless browser.
 */
const path = require('path');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? Number(argv[i + 1]) : fallback;
};
const DUELS = argOf('--duels', 25);
const SEED = argOf('--seed', 20261120);
const VERBOSE = argv.includes('--verbose');

/* deterministic randomness, so a failure can be reproduced */
let rngState = SEED >>> 0;
function rnd() {
  rngState ^= rngState << 13; rngState >>>= 0;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5; rngState >>>= 0;
  return rngState / 4294967296;
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* audio has no listeners in a headless browser; give it the shape it expects */
function audioStub() {
  const param = (v) => ({
    value: v || 0, setValueAtTime() {}, setTargetAtTime() {}, setValueCurveAtTime() {},
    linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {},
    cancelScheduledValues() {}, cancelAndHoldAtTime() {}
  });
  const node = () => ({
    gain: param(0), frequency: param(0), Q: param(1), detune: param(0),
    threshold: param(-24), knee: param(30), ratio: param(12), attack: param(0), release: param(0.25),
    delayTime: param(0), pan: param(0), type: 'sine', buffer: null, loop: false,
    playbackRate: param(1), connect() {}, disconnect() {}, start() {}, stop() {}
  });
  return class AudioContextStub {
    constructor() {
      this.destination = {}; this.currentTime = 0; this.state = 'running'; this.sampleRate = 44100;
    }
    createGain() { return node(); }
    createOscillator() { return node(); }
    createBiquadFilter() { return node(); }
    createBufferSource() { return node(); }
    createDynamicsCompressor() { return node(); }
    createStereoPanner() { return node(); }
    createConvolver() { return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(1024) }; }
    resume() { return Promise.resolve(); }
  };
}

const ROOT = path.resolve(__dirname, '..');
const mem = new Map();
const pageErrors = [];
const violations = [];
const stats = { duels: 0, rounds: 0, drafts: 0, trumps: 0, cheats: 0, replays: 0 };

function violation(kind, detail) {
  violations.push({ kind, detail });
}

(async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), {
    url: 'file://' + path.join(ROOT, 'index.html'),
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    beforeParse(win) {
      // save state lives in memory: file:// localStorage is opaque
      mem.set('lastHand.save.v1', JSON.stringify({
        candles: 400, owned: [], cosmetics: { back: 'bone', cloth: 'ash' },
        wins: 7, cleared: false, act: 0, art3d: false, musicOn: false, difficulty: 'standard',
        stats: { hands: 0, busts: 0, best: 0, trumps: 0, losses: 0 },
        dailyBest: { date: '', streak: 0 }, bestArcade: 0
      }));
      Object.defineProperty(win, 'localStorage', {
        configurable: true,
        value: {
          getItem: (k) => (mem.has(k) ? mem.get(k) : null),
          setItem: (k, v) => mem.set(k, String(v)),
          removeItem: (k) => mem.delete(k),
          clear: () => mem.clear(),
          key: (i) => Array.from(mem.keys())[i] || null,
          get length() { return mem.size; }
        }
      });

      const AC = audioStub();
      win.AudioContext = AC;
      win.webkitAudioContext = AC;
      win.matchMedia = win.matchMedia || ((q) => ({
        matches: false, media: q, addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}
      }));

      // Fast-forward the game's own delays. Intervals stay real: the turn
      // clock must be able to fire if a click is ever missed.
      const realTimeout = win.setTimeout.bind(win);
      win.setTimeout = (fn, ms, ...rest) => realTimeout(fn, 0, ...rest);
    }
  });

  const win = dom.window;
  const doc = win.document;
  win.addEventListener('error', (e) => pageErrors.push(String(e.message || e.error)));
  win.addEventListener('unhandledrejection', (e) => pageErrors.push('rejection: ' + e.reason));

  await new Promise((r) => win.addEventListener('load', r, { once: true }));
  await new Promise((r) => setTimeout(r, 200));

  const state = () => (typeof win.__lastHandDebug === 'function' ? win.__lastHandDebug() : null);
  const click = (el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const rail = () => doc.querySelector('#actionRail');
  const railButtons = () => Array.from((rail() || doc).querySelectorAll('button'));
  const byText = (re) => railButtons().find((b) => re.test(b.textContent));
  const overlay = () => {
    const ov = doc.querySelector('#overlay');
    return ov && !ov.hidden ? ov : null;
  };
  const IN_ROUND = ['wager', 'deal', 'yourTurn', 'rivalTurn', 'showdown'];

  let lastRound = 0;
  let lastTape = 0;

  function checkInvariants(tag) {
    const s = state();
    if (!s) return;

    [[s.you, 'you'], [s.rival, 'rival']].forEach(([side, name]) => {
      if (side.vigil < 0) violation('negative vigil', `${name} ${side.vigil} during ${s.phase} (${tag})`);
      if (side.vigil > side.maxVigil) violation('vigil above max', `${name} ${side.vigil}/${side.maxVigil} (${tag})`);
      if (Number.isNaN(side.vigil)) violation('NaN vigil', `${name} (${tag})`);
    });

    if (IN_ROUND.indexOf(s.phase) < 0) return;

    const counts = {};
    const all = s.deck.concat(s.you.cards, s.rival.cards);
    all.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    for (let v = 1; v <= 11; v++) {
      if ((counts[v] || 0) !== 1) {
        violation('card accounted for != once',
          `value ${v} appears ${counts[v] || 0} times in phase ${s.phase} (${tag})`);
      }
    }
    const extra = Object.keys(counts).filter((v) => Number(v) < 1 || Number(v) > 11);
    if (extra.length) violation('card outside the shoe', `${extra.join(',')} (${tag})`);
  }

  click(doc.querySelector('#enterBtn'));

  const deadline = Date.now() + 180000;
  let iterations = 0;
  while (stats.duels < DUELS && Date.now() < deadline) {
    iterations++;
    const ov = overlay();
    const s = state();

    if (ov) {
      const title = doc.querySelector('#ovTitle').textContent;
      if (/Blade Finds You|Hand Ends|Last Hand/.test(title)) {
        stats.duels++;
        const tapeNow = s ? s.tape : 0;
        if (tapeNow > lastTape) {
          // the replay is part of the promise: play it once in a while
          if (stats.duels % 5 === 0) {
            const replay = Array.from(doc.querySelectorAll('#ovButtons button'))
              .find((b) => /Watch it again/.test(b.textContent));
            if (replay) {
              click(replay);
              stats.replays++;
              await new Promise((r) => setTimeout(r, 120));
              const skip = Array.from(doc.querySelectorAll('#actionRail button'))
                .find((b) => /Skip/.test(b.textContent));
              if (skip) click(skip);
              await new Promise((r) => setTimeout(r, 200));
            }
          }
        }
        lastTape = 0;
        const again = Array.from(doc.querySelectorAll('#ovButtons button'))
          .find((b) => /Rise Again|Deal Again|Walk Out/.test(b.textContent));
        if (!again) { violation('dead end', 'terminal overlay with no way forward'); break; }
        click(again);
        await new Promise((r) => setTimeout(r, 120));
        continue;
      }
      const next = doc.querySelector('#ovButtons button');
      if (next) click(next);
      await new Promise((r) => setTimeout(r, 80));
      continue;
    }

    if (s && s.round !== lastRound) { stats.rounds += Math.max(0, s.round - lastRound); lastRound = s.round; }
    if (s) lastTape = s.tape;

    checkInvariants('tick');

    // The draft after a won chair is a screen of its own, not the overlay.
    const draftScreen = doc.querySelector('#draftScreen');
    if (draftScreen && !draftScreen.hidden) {
      const options = Array.from(doc.querySelectorAll('#draftGrid button'));
      if (options.length) {
        click(pick(options));
        stats.drafts++;
        await new Promise((r) => setTimeout(r, 80));
      } else {
        violation('empty draft', 'the draft screen opened with no choices');
        break;
      }
      continue;
    }

    const wager = railButtons().filter((b) => /Wager/.test(b.textContent));
    if (wager.length) {
      click(pick(wager));
      await new Promise((r) => setTimeout(r, 60));
      continue;
    }

    const trumps = Array.from(doc.querySelectorAll('#trumpHand button.trump')).filter((b) => !b.disabled);
    if (trumps.length && rnd() < 0.25) {
      click(pick(trumps));
      stats.trumps++;
      await new Promise((r) => setTimeout(r, 70));
      checkInvariants('after trump');
      continue;
    }

    const draw = byText(/^Draw/);
    const stand = byText(/^Stand/);
    if (draw && stand) {
      const total = (s ? s.you.cards : []).reduce((a, b) => a + b, 0);
      click(total < 16 || (total < 20 && rnd() < 0.45) ? draw : stand);
      await new Promise((r) => setTimeout(r, 60));
      continue;
    }

    await new Promise((r) => setTimeout(r, 40));
    if (iterations > 60000) { violation('harness stall', 'no actionable element for 60k iterations'); break; }
  }

  if (stats.duels < DUELS) {
    violation('incomplete run', `only ${stats.duels}/${DUELS} duels reached a terminal state`);
  }

  const fail = violations.length || pageErrors.length;
  console.log('');
  console.log('  headless playthrough — ' + DUELS + ' duels requested, ' + stats.duels + ' played');
  console.log('  rounds ' + stats.rounds + ' · drafts ' + stats.drafts + ' · trumps played ' + stats.trumps
    + ' · replays ' + stats.replays + ' · seed ' + SEED);
  if (VERBOSE) console.log('  ' + JSON.stringify(violations, null, 2));

  if (pageErrors.length) {
    console.log('  page errors (' + pageErrors.length + '):');
    pageErrors.slice(0, 5).forEach((e) => console.log('    ' + e));
  }
  if (violations.length) {
    console.log('  invariant violations (' + violations.length + '):');
    violations.slice(0, 10).forEach((v) => console.log('    [' + v.kind + '] ' + v.detail));
  }
  console.log(fail ? '\n  FAILED\n' : '\n  PASS — no crash, no negative Vigil, no duplicated card\n');
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('FAIL harness crashed:', e);
  process.exit(2);
});

/* ============================================================
   THE LAST HAND — prototype ruleset, AI, progression
   A gothic duel of twenty-one. No dependencies.
   ============================================================ */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. Constants
     --------------------------------------------------------- */

  const START_VIGIL   = 5;
  const TURN_SECONDS  = 20;
  const DEFAULT_TARGET = 21;
  const MAX_TRUMPS    = 3;
  const SAVE_KEY      = 'lastHand.save.v1';

  const RANKS = [
    { name: 'Aspirant',  wins: 0  },
    { name: 'Acolyte',   wins: 2  },
    { name: 'Seer',      wins: 5  },
    { name: 'Confessor', wins: 9  },
    { name: 'Harbinger', wins: 14 }
  ];

  const SUITS = [
    { glyph: '♠', red: false },
    { glyph: '♥', red: true  },
    { glyph: '♦', red: true  },
    { glyph: '♣', red: false }
  ];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------------------------------------------------
     Deterministic RNG. Daily runs must deal the same shoe to
     everyone, so every gameplay decision goes through rnd().
     --------------------------------------------------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  let rng = Math.random;

  function seedFrom(text) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function rnd() { return rng(); }
  function reseed(text) { rng = text ? mulberry32(seedFrom(text)) : Math.random; }

  /** Short haptic pulse where the platform supports it; silent no-op elsewhere. */
  function haptic(pattern) {
    try {
      if (navigator && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
    } catch (e) { /* not supported — fine */ }
  }

  /* ---------------------------------------------------------
     Vessels — playable characters. Every passive is visible to
     the opponent before the deal, so the matchup is a read.
     --------------------------------------------------------- */

  const VESSELS = {
    widow: {
      name: 'The Widow',
      epithet: 'She buried a husband and kept the debt.',
      passive: 'Begins with six Vigil instead of five.',
      unlockWins: 0,
      maxVigil: 6
    },
    gravedigger: {
      name: 'The Gravedigger',
      epithet: 'He has dug every grave at this table.',
      passive: 'Always sees the next card in the shoe.',
      unlockWins: 2,
      maxVigil: 5
    },
    confessor: {
      name: 'The Confessor',
      epithet: 'He has heard worse sins than yours.',
      passive: 'Draws a second trump every round.',
      unlockWins: 5,
      maxVigil: 5
    },
    bride: {
      name: 'The Hollow Bride',
      epithet: 'Something else wore the ring.',
      passive: 'Takes one less Vigil of damage each round.',
      unlockWins: 8,
      maxVigil: 5
    }
  };

  const VESSEL_ORDER = ['widow', 'gravedigger', 'confessor', 'bride'];

  /* Difficulty changes how much Vigil you have and how well they play.
     It never changes the rules, so the skill you build always transfers. */
  const DIFFICULTY = {
    casual:    { label: 'Casual',    vigil: 2,  accuracy: -0.12, cheats: -1,
                 note: 'Two more Vigil. They misplay far more.' },
    standard:  { label: 'Standard',  vigil: 0,  accuracy: 0,     cheats: 0,
                 note: 'The intended table.' },
    nightmare: { label: 'Nightmare', vigil: -2, accuracy: 0.03,  cheats: 1,
                 note: 'Two fewer Vigil. Everyone cheats more.' }
  };

  /* Cosmetics are bought with candles and grant nothing but a look. */
  const COSMETICS = {
    back: [
      { id: 'classic', name: 'Crypt',  cost: 0 },
      { id: 'bone',    name: 'Bone',   cost: 60 },
      { id: 'blood',   name: 'Blood',  cost: 120 }
    ],
    cloth: [
      { id: 'crypt', name: 'Crypt', cost: 0 },
      { id: 'ash',   name: 'Ash',   cost: 80 },
      { id: 'wine',  name: 'Wine',  cost: 160 }
    ]
  };

  function ownsCosmetic(group, id) {
    const def = COSMETICS[group].find((c) => c.id === id);
    if (!def) return false;
    return def.cost === 0 || (save.owned || []).indexOf(group + ':' + id) !== -1;
  }

  function applyCosmetics() {
    document.body.dataset.back = save.cosmetics.back || 'classic';
    document.body.dataset.cloth = save.cosmetics.cloth || 'crypt';
  }

  function buyOrEquip(group, id) {
    const def = COSMETICS[group].find((c) => c.id === id);
    if (!def) return;
    if (ownsCosmetic(group, id)) {
      save.cosmetics[group] = id;
      writeSave();
      applyCosmetics();
      sfx.chime();
      return;
    }
    if (save.candles < def.cost) {
      say('Not enough candles for ' + def.name + '.');
      render();
      sfx.sting();
      return;
    }
    save.candles -= def.cost;
    save.owned = (save.owned || []).concat([group + ':' + id]);
    save.cosmetics[group] = id;
    writeSave();
    applyCosmetics();
    renderTitle();
    sfx.chime();
  }

  function difficulty() {
    return DIFFICULTY[save.difficulty] || DIFFICULTY.standard;
  }

  /* ---------------------------------------------------------
     Act I — a three-opponent gauntlet. Vigil carries over.
     --------------------------------------------------------- */

  const ACTS = [
    {
      numeral: 'I',
      name: 'Act I \u2014 The Gauntlet',
      healAfterWin: 2,
      opponents: [
        {
          id: 'croupier',
          name: 'The Pale Croupier',
          line: 'Deals without looking at the cards.',
          startTrumps: 1,
          accuracy: 0.62,
          cheats: 0
        },
        {
          id: 'mourner',
          name: 'The Mourner',
          line: 'She bets what she has already lost.',
          startTrumps: 2,
          accuracy: 0.84,
          cheats: 0
        },
        {
          id: 'dealer',
          name: 'The Veiled Dealer',
          line: 'You have never seen its hands in the same place twice.',
          startTrumps: 3,
          accuracy: 0.885,
          cheats: 1,
          cheatKind: 'replace'
        }
      ]
    },
    {
      numeral: 'II',
      name: 'Act II \u2014 The Long Table',
      healAfterWin: 2,
      opponents: [
        {
          id: 'charnel',
          name: 'The Charnel Warden',
          line: 'It deals to a lower number and calls it mercy.',
          startTrumps: 1,
          accuracy: 0.92,
          targetShift: -2,
          cheats: 1,
          cheatKind: 'redeal'   // it takes the whole hand back, not one card
        },
        {
          id: 'twins',
          name: 'The Twins',
          line: 'Two of them. They deal you a third card before you have chosen.',
          startTrumps: 2,
          accuracy: 0.86,
          extraCard: true,
          cheats: 0
        },
        {
          id: 'candle',
          name: 'The Candle-Eater',
          line: 'It eats what you are carrying, and it is always hungry.',
          startTrumps: 2,
          accuracy: 0.978,
          drain: 0.5,
          cheats: 0
        }
      ]
    },
    {
      numeral: 'III',
      name: 'Act III \u2014 The Head of the Table',
      healAfterWin: 3,
      opponents: [
        {
          id: 'choir',
          name: 'The Hollow Choir',
          line: 'Every mouth is open. None of them are singing to you.',
          startTrumps: 3,
          accuracy: 0.982,
          drain: 0.35,
          cheats: 0
        },
        {
          id: 'surgeon',
          name: 'The Bone Surgeon',
          line: 'It measures the table the way it measures a body.',
          startTrumps: 2,
          accuracy: 0.94,
          targetShift: -3,
          cheats: 1,
          cheatKind: 'replace'   // it re-measures the table and finds a better number
        },
        {
          id: 'head',
          name: 'The Thing at the Head of the Table',
          line: 'It has been waiting for you to be worth its time.',
          startTrumps: 3,
          accuracy: 0.985,
          cheats: 1,
          drain: 0.3,
          cheatsAgain: true,
          cheatKind: 'replace'
        }
      ]
    }
  ];

  /* Kept as the first act; tests and older code refer to it by name. */
  const ACT_I = ACTS[0];

  /* Every chair has a voice. The prose lives here, not in the opponent table,
     so the balance harness never has to look at it. Four beats per boss:
     the deal, your bust, the hand you take, the hand they take. */
  const TAUNTS = {
    croupier: {
      deal: ['The Croupier deals without looking. It has never needed to.'],
      yourBust: ['\u201cOver,\u201d it says, the way you would say next.'],
      yourWin: ['It gathers the cards as though the hand had not happened.'],
      theirWin: ['\u201cClose,\u201d it says. It is not a compliment.']
    },
    mourner: {
      deal: ['She wagers a ring she no longer owns. Nobody calls it a lie.'],
      yourBust: ['\u201cThere,\u201d she says. \u201cNow we are both owed something.\u201d'],
      yourWin: ['She pays you with a coin still warm from someone else.'],
      theirWin: ['She apologises while she takes it. She means it.']
    },
    dealer: {
      deal: ['Its hands are somewhere else when the cards land.'],
      yourBust: ['\u201cYou did that yourself,\u201d the veil says. \u201cI only watched.\u201d'],
      yourWin: ['The veil does not move. Under it, something rearranges its patience.'],
      theirWin: ['\u201cThe sleeve,\u201d it says, \u201cis a rumour.\u201d']
    },
    charnel: {
      deal: ['The Warden sets the number lower, and calls it mercy.'],
      yourBust: ['It writes your total down without looking at it.'],
      yourWin: ['It takes its cards back and deals itself a new hand. It still loses.'],
      theirWin: ['\u201cNineteen,\u201d it says. \u201cA number a body can reach.\u201d']
    },
    twins: {
      deal: ['One deals. The other already knows what you were given.'],
      yourBust: ['Both of them say over at once, a half-beat apart.'],
      yourWin: ['\u201cShe cheated,\u201d says one. \u201cShe was allowed to,\u201d says the other.'],
      theirWin: ['They count your cards together, out loud, slowly.']
    },
    candle: {
      deal: ['A candle shortens. It is not one of the ones on the table.'],
      yourBust: ['It swallows the light along with your turn.'],
      yourWin: ['It eats nothing this hand, and that is the worst thing it does.'],
      theirWin: ['The room gets smaller by one candle.']
    },
    choir: {
      deal: ['Nine mouths open on the same breath.'],
      yourBust: ['The choir holds the note of your total until it becomes a word.'],
      yourWin: ['The singing stops. That has not happened in this room before.'],
      theirWin: ['They sing your hand back to you, in order, corrected.']
    },
    surgeon: {
      deal: ['It lays the cards out the way it lays out instruments.'],
      yourBust: ['It notes the exact point where you went over.'],
      yourWin: ['It puts the cards down and looks at you as if at a growth.'],
      theirWin: ['\u201cThe margin,\u201d it says, \u201cwas always on my side.\u201d']
    },
    head: {
      deal: ['It has been waiting for you to be worth its time.'],
      yourBust: ['It does not react. It has watched a great many people do that.'],
      yourWin: ['\u201cAgain,\u201d it says. Not to you.'],
      theirWin: ['Something under the table takes your chair away and puts it back.']
    }
  };

  /* A boss speaks once per beat, and spreads its lines instead of repeating
     the same sentence forever. */
  const tauntSeen = {};
  function taunt(beat) {
    const opp = S.opponent;
    if (!opp) return;
    const set = TAUNTS[opp.id];
    if (!set || !set[beat] || !set[beat].length) return;
    const key = opp.id + ':' + beat;
    const n = (tauntSeen[key] = (tauntSeen[key] || 0) + 1);
    S.taunt = set[beat][(n - 1) % set[beat].length];
    S.tauntBeat = beat;
  }

  function currentAct() {
    const i = Math.max(0, Math.min(save.act || 0, ACTS.length - 1));
    return ACTS[i];
  }

  /* ---------------------------------------------------------
     1. Audio — procedural, no assets
     --------------------------------------------------------- */

  const sfx = (function () {
    let ctx = null;
    let enabled = true;
    let drone = null;

    function ac() {
      if (!enabled) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function tone(freq, dur, type, vol, slideTo) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.07, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur);
    }

    function noise(dur, freq, vol) {
      const c = ac(); if (!c) return;
      const len = Math.floor(c.sampleRate * dur);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
      }
      const src = c.createBufferSource(); src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = 1.1;
      const g = c.createGain(); g.gain.value = vol || 0.1;
      src.connect(f); f.connect(g); g.connect(c.destination);
      src.start();
    }

    return {
      flick()  { noise(0.08, 2800, 0.10); },
      thump()  { tone(60, 0.55, 'sine', 0.15, 34); noise(0.12, 220, 0.06); },
      chime()  { tone(660, 0.55, 'triangle', 0.045); tone(990, 0.55, 'triangle', 0.03); },
      sting()  { tone(300, 0.7, 'sawtooth', 0.045, 68); },
      whisper(){ noise(0.35, 900, 0.05); },

      /* a card leaving the shoe and landing on felt */
      deal()   { noise(0.06, 4200, 0.055); setTimeout(() => noise(0.10, 1500, 0.045), 55); },
      /* a card turning over */
      turn()   { noise(0.11, 2600, 0.065); tone(180, 0.18, 'triangle', 0.014, 140); },
      /* bone china and brass: the wager chips */
      chips()  { tone(1180, 0.09, 'triangle', 0.03); tone(1620, 0.11, 'triangle', 0.02);
                 setTimeout(() => tone(930, 0.10, 'triangle', 0.022), 60); },
      /* the crypt bell, on a death */
      toll()   { tone(146.8, 2.6, 'sine', 0.085); tone(404.9, 1.8, 'sine', 0.026);
                 tone(73.4, 3.0, 'sine', 0.05); },
      /* flesh, promptly */
      crack()  { tone(88, 0.42, 'sawtooth', 0.055, 38); noise(0.34, 620, 0.10); },
      /* the rival does something it should not be able to do */
      wrong()  { tone(320, 1.1, 'sawtooth', 0.04, 96); noise(0.5, 1100, 0.05);
                 setTimeout(() => tone(240, 0.9, 'square', 0.022, 70), 140); },
      setEnabled(v) {
        enabled = v;
        if (!v) this.stopDrone();
      },
      isEnabled() { return enabled; },
      startDrone() {
        const c = ac(); if (!c || drone) return;
        const g = c.createGain(); g.gain.value = 0.018;
        const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = 55;
        const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 55.9;
        const o3 = c.createOscillator(); o3.type = 'sine'; o3.frequency.value = 82.4;
        const g3 = c.createGain(); g3.gain.value = 0.4;
        o1.connect(g); o2.connect(g); o3.connect(g3); g3.connect(g);
        g.connect(c.destination);
        o1.start(); o2.start(); o3.start();
        drone = { g, oscs: [o1, o2, o3] };
      },
      stopDrone() {
        if (!drone) return;
        const c = ctx;
        try {
          drone.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
          drone.oscs.forEach((o) => o.stop(c.currentTime + 0.35));
        } catch (e) { /* already stopped */ }
        drone = null;
      }
    };
  })();

  /* ---------------------------------------------------------
     2. Progression / save
     --------------------------------------------------------- */

  const SAVE_VERSION = 2;

  // NB: must be declared before loadSave() runs — `const` is in the temporal
  // dead zone until this line executes.
  let save = loadSave();

  function blankSave() {
    return { version: SAVE_VERSION, wins: 0, duels: 0, candles: 0,
             seenIntro: false, reduceMotion: false, musicOn: true,
             art3d: false, act: 0, cleared: false, bestArcade: 0,
             difficulty: 'standard', dailyBest: { date: '', streak: 0 },
             stats: { hands: 0, busts: 0, best: 0, trumps: 0, losses: 0 },
             cosmetics: { back: 'classic', cloth: 'crypt' }, owned: [] };
  }

  /** Non-negative integer, or the fallback. Guards against corrupt saves. */
  function safeInt(value, fallback, max) {
    const n = Number(value);
    if (!isFinite(n) || n < 0) return fallback;
    const i = Math.floor(n);
    return typeof max === 'number' ? Math.min(i, max) : i;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          const out = blankSave();
          out.wins = safeInt(p.wins, 0, 1e6);
          out.duels = safeInt(p.duels, 0, 1e6);
          out.candles = safeInt(p.candles, 0, 1e9);
          out.seenIntro = !!p.seenIntro;
          out.reduceMotion = !!p.reduceMotion;
          out.musicOn = p.musicOn === undefined ? true : !!p.musicOn;
          out.art3d = !!p.art3d;
          out.difficulty = DIFFICULTY[p.difficulty] ? p.difficulty : 'standard';
          out.cosmetics = {
            back: ['classic', 'bone', 'blood'].indexOf(p.cosmetics && p.cosmetics.back) !== -1
              ? p.cosmetics.back : 'classic',
            cloth: ['crypt', 'ash', 'wine'].indexOf(p.cosmetics && p.cosmetics.cloth) !== -1
              ? p.cosmetics.cloth : 'crypt'
          };
          out.owned = Array.isArray(p.owned)
            ? p.owned.filter((x) => typeof x === 'string').slice(0, 40) : [];

          const st = (p.stats && typeof p.stats === 'object') ? p.stats : {};
          out.stats = {
            hands: safeInt(st.hands, 0, 1e9),
            busts: safeInt(st.busts, 0, 1e9),
            best: safeInt(st.best, 0, 40),
            trumps: safeInt(st.trumps, 0, 1e9),
            losses: safeInt(st.losses, 0, 1e9)
          };
          out.dailyBest = {
            date: typeof p.dailyBest === 'object' && p.dailyBest && typeof p.dailyBest.date === 'string'
              ? p.dailyBest.date.slice(0, 10) : '',
            streak: safeInt(p.dailyBest && p.dailyBest.streak, 0, 1e6)
          };
          out.act = safeInt(p.act, 0, ACTS.length - 1);
          out.cleared = !!p.cleared;
          out.bestArcade = safeInt(p.bestArcade, 0, 1e6);

          // migration hook: anything older than v2 is upgraded field-by-field
          out.version = SAVE_VERSION;
          return out;
        }
      }
    } catch (e) { /* private mode, corrupt data — fall through to a fresh save */ }
    return blankSave();
  }

  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }

  function rankFor(wins) {
    let r = RANKS[0];
    for (const x of RANKS) if (wins >= x.wins) r = x;
    return r;
  }

  /** Trump pool unlocked by progression — paid cosmetics never gate power. */
  function unlockedPool() {
    const pool = ['seersEye', 'charity', 'graveDebt', 'mirror'];
    if (save.wins >= 2) pool.push('thieves', 'creed17', 'creed24', 'bloodPrice');
    if (save.wins >= 5) pool.push('secondBreath', 'ashWard', 'severing', 'guillotine');
    return pool;
  }

  /* ---------------------------------------------------------
     3. Trump cards
     --------------------------------------------------------- */

  const TRUMPS = {
    seersEye: {
      name: "The Seer's Eye",
      desc: 'Draw the best card left in the shoe.',
      rarity: 1,
      use(c) {
        if (!S.deck.length) return say('The shoe is empty.');
        const need = S.target - handTotal(c);
        let best = null;
        for (const v of S.deck) {
          if (v <= need && (best === null || v > best)) best = v;
        }
        if (best === null) best = Math.min.apply(null, S.deck);
        dealValue(c, best);
      }
    },

    charity: {
      name: 'Charity of the Damned',
      desc: 'Your rival draws one card.',
      rarity: 1,
      hostile: true,
      use(c, r) { dealOne(r); }
    },

    graveDebt: {
      name: 'Grave Debt',
      desc: "Rival's last card returns to the shoe.",
      rarity: 1,
      hostile: true,
      use(c, r) {
        if (r.cards.length < 2) return;
        const card = r.cards.pop();
        S.deck.push(card.v);
        say(`${nameOf(r)} ${sverb(r, 'is', 'are')} forced to return a <em>${card.v}</em>.`);
      }
    },

    mirror: {
      name: "The Liar's Mirror",
      desc: "Reveal your rival's hidden card.",
      rarity: 1,
      use(c, r) {
        r.revealed = true;
        const hole = r.cards.find((x) => x.hidden);
        say(hole
          ? `The mirror clears: your rival's hidden card is a <em>${hole.v}</em>.`
          : 'There is nothing hidden to see.');
      }
    },

    thieves: {
      name: 'Sympathy of Thieves',
      desc: 'Swap your hidden card with your rival\u2019s.',
      rarity: 2,
      hostile: true,
      use(c, r) {
        const ci = c.cards.findIndex((x) => x.hidden);
        const ri = r.cards.findIndex((x) => x.hidden);
        if (ci < 0 || ri < 0) return say('No hidden cards to trade.');
        const tmp = c.cards[ci];
        c.cards[ci] = r.cards[ri];
        r.cards[ri] = tmp;
        say('Two hands trade their darkest card.');
      }
    },

    creed17: {
      name: 'The New Creed: XVII',
      desc: 'The target becomes 17 this round.',
      rarity: 2,
      use() { S.target = 17; say('A new creed is spoken: <em>seventeen</em>.'); }
    },

    creed24: {
      name: 'The New Creed: XXIV',
      desc: 'The target becomes 24 this round.',
      rarity: 2,
      use() { S.target = 24; say('A new creed is spoken: <em>twenty-four</em>.'); }
    },

    bloodPrice: {
      name: 'Blood Price',
      desc: '+2 damage if you take this round.',
      rarity: 2,
      use(c) { c.stakeBonus += 2; say('A price is named in blood.'); }
    },

    ashWard: {
      name: 'Ash Ward',
      desc: 'Negates the next trump played against you.',
      rarity: 3,
      use(c) { c.ward = true; say('Ash circles the table.'); }
    },

    severing: {
      name: 'The Severing',
      desc: "Destroys your rival's Ash Ward.",
      rarity: 3,
      hostile: true,
      piercesWard: true,
      use(c, r) {
        if (!r.ward) return say('There is no ward to sever.');
        r.ward = false;
        say('The ward is cut apart.');
      }
    },

    secondBreath: {
      name: 'Second Breath',
      desc: 'The next card that would bust you returns instead.',
      rarity: 3,
      use(c) { c.reprieved = true; say('Your breath is held back from the grave.'); }
    },

    guillotine: {
      name: 'The Guillotine',
      desc: 'Double the damage if you take this round.',
      rarity: 3,
      use(c) { c.doubled = true; say('The blade is raised twice over.'); }
    }
  };

  /* ---------------------------------------------------------
     4. State
     --------------------------------------------------------- */

  function makeSide(label, isYou, opts) {
    opts = opts || {};
    const max = opts.maxVigil || START_VIGIL;
    return {
      label,
      isYou,
      cards: [],
      vigil: max,
      maxVigil: max,
      wager: 1,
      stood: false,
      trumps: [],
      ward: false,
      reprieved: false,
      stakeBonus: 0,
      doubled: false,
      revealed: false,
      vessel: opts.vessel || null,
      cheat: !!(opts.cheats || opts.cheat),
      cheatKind: opts.cheatKind || 'replace',
      cheatsLeft: opts.cheats || (opts.cheat ? 1 : 0),
      cheatUsed: false,
      accuracy: typeof opts.accuracy === 'number' ? opts.accuracy : 1,
      startTrumps: opts.startTrumps || 0
    };
  }

  const S = {
    phase: 'idle',
    deck: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    target: DEFAULT_TARGET,
    round: 0,
    turn: 'you',
    you: makeSide('You', true),
    rival: makeSide('The Veiled Dealer', false),
    message: '',
    timerId: null,
    timeLeft: TURN_SECONDS,
    running: false,
    vesselId: 'widow',
    opponentIndex: 0,
    loadout: [],
    draftOptions: [],
    lastRound: null,
    taunt: '',
    tauntBeat: '',
    tape: [],
    cheatThisRound: null
  };

  /** The trump deck you start an act with. Deepens via the draft. */
  const BASE_LOADOUT = ['seersEye', 'charity', 'graveDebt', 'mirror'];
  const MAX_COPIES = 3;

  let resolver = null;

  function awaitHuman() {
    return new Promise((res) => { resolver = res; });
  }

  function resolveAction(action) {
    if (!resolver) return;
    const r = resolver;
    resolver = null;
    r(action);
  }

  /* ---------------------------------------------------------
     5. Core helpers
     --------------------------------------------------------- */

  function makeDeck() {
    const d = [];
    for (let v = 1; v <= 11; v++) d.push(v);
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  }

  /**
   * The Warden's redeal: which hand does it keep? A bust scores below every
   * standing hand, so the comparison is "distance from the number, with a
   * bust as the worst possible outcome". Pure, so it can be tested.
   */
  function redealChoice(before, fresh, target) {
    const score = (cards) => {
      const t = cards.reduce((a, c) => a + (typeof c === 'number' ? c : c.v), 0);
      return t > target ? -t : t;
    };
    return score(fresh) > score(before) ? 'fresh' : 'before';
  }

  /* ---------------------------------------------------------
     The tape — a record of each hand, so the defeat screen can play
     the duel back. It stores hands, not input frames: this is a
     "watch what happened", not a simulation of the player.
     --------------------------------------------------------- */
  function tapeFrame(winner, dmg) {
    if (!S.tape) return;
    S.tape.push({
      round: S.round,
      target: S.target,
      you: S.you.cards.map((c) => ({ v: c.v, hidden: !!c.hidden })),
      rival: S.rival.cards.map((c) => ({ v: c.v, hidden: !!c.hidden })),
      yt: handTotal(S.you),
      rt: handTotal(S.rival),
      wagerYou: S.you.wager,
      wagerRival: S.rival.wager,
      winner: winner,
      dmg: dmg || 0,
      cheat: S.cheatThisRound || null
    });
  }

  /**
   * Why that handwas lost, in the player's own numbers. Pure, so the lesson
   * can be tested without a table: pass the recorded round, the total you
   * stood on, and what was left in the shoe.
   */
  function handLesson(r, stood, deck) {
    const parts = ['The last hand: you had ' + r.yt + ', they had ' + r.rt
      + ', the number was ' + r.target + '.'];

    // Both over: "closer to the number" is the rule, so say it plainly.
    if (r.youBust && r.rivalBust) {
      parts.push('You both went over. The closer hand takes it, and theirs was closer.');
      return parts.join(' ');
    }

    if (r.youBust) {
      parts.push('You drew past it. Standing on ' + stood + ' '
        + (stood > r.rt ? 'would have won the hand.'
          : stood === r.rt ? 'would have tied it, and a tie takes nobody.'
            : 'would still have lost, but by less.'));
      return parts.join(' ');
    }

    if (r.rivalBust) {
      parts.push('You both went over. The closer hand takes it, and theirs was closer.');
      return parts.join(' ');
    }

    // They stopped on the number itself: no card in the world beats it.
    if (r.rt >= r.target) {
      parts.push('They stood exactly on the number. There is no card that beats it '
        + '\u2014 the hand was lost the moment they stopped.');
      return parts.join(' ');
    }

    parts.push('You stood. You needed ' + (r.rt + 1) + '.');

    const outs = (deck || []).filter((v) => r.yt + v <= r.target && r.yt + v > r.rt);
    if (outs.length) {
      const best = Math.max.apply(null, outs);
      parts.push('The shoe still held ' + outs.length + ' card'
        + (outs.length === 1 ? '' : 's') + ' that would have won it \u2014 the highest a '
        + best + '.');
    } else {
      parts.push('Nothing left in the shoe could have carried you. '
        + 'That hand was lost when it was dealt.');
    }
    return parts.join(' ');
  }

  function defeatTeaching() {
    const r = S.lastRound;
    if (!r) return '';
    const yours = S.you.cards || [];
    const lastCard = yours.length ? yours[yours.length - 1].v : 0;
    const stood = r.youBust ? r.yt - lastCard : r.yt;
    return handLesson(r, stood, S.deck);
  }

  function other(side) { return side === S.you ? S.rival : S.you; }

  /* --- sentence helpers so "You" conjugates correctly --- */
  function nameOf(side) { return side.isYou ? 'You' : side.label; }
  function sverb(side, singular, plural) { return side.isYou ? plural : singular; }
  function poss(side) { return side.isYou ? 'Your' : side.label + "'s"; }

  function handTotal(side) {
    return side.cards.reduce((a, c) => a + c.v, 0);
  }

  /** What the opponent is allowed to see. */
  function visibleTotal(side) {
    let t = 0;
    for (const c of side.cards) if (!c.hidden || side.revealed) t += c.v;
    return t;
  }

  function hasHidden(side) {
    return side.cards.some((c) => c.hidden) && !side.revealed;
  }

  function isBust(side) { return handTotal(side) > S.target; }

  function say(msg) { S.message = msg; }

  function drawOne(side) {
    if (!S.deck.length) return null;
    const v = S.deck.shift();
    side.cards.push({ v: v, hidden: false });
    afterDraw(side);
    return v;
  }

  function dealValue(side, v) {
    const i = S.deck.indexOf(v);
    if (i === -1) return;
    S.deck.splice(i, 1);
    side.cards.push({ v: v, hidden: false });
    afterDraw(side);
  }

  function dealOne(side) {
    if (!S.deck.length) return say('The shoe is empty.');
    const v = S.deck.shift();
    side.cards.push({ v: v, hidden: false });
    say(`${nameOf(side)} ${sverb(side, 'draws', 'draw')} a <em>${v}</em>.`);
    afterDraw(side);
  }

  function afterDraw(side) {
    if (!isBust(side)) return;
    if (side.reprieved) {
      side.reprieved = false;
      const card = side.cards.pop();
      if (card) S.deck.push(card.v);
      side.stood = true;
      say(`${nameOf(side)} ${sverb(side, 'slips', 'slip')} the blade — <em>Second Breath</em>.`);
      sfx.chime();
      return;
    }
    side.stood = true;
    say(`${nameOf(side)} ${sverb(side, 'busts', 'bust')} <span class="bad">hard</span>.`);
    sfx.thump();
  }

  function grantTrump(side) {
    if (side.trumps.length >= MAX_TRUMPS) return;

    const pool = side.isYou
      ? (S.loadout && S.loadout.length ? S.loadout : unlockedPool())
      : Object.keys(TRUMPS);

    const id = pool[Math.floor(rnd() * pool.length)];
    side.trumps.push(id);
  }

  /**
   * Roll the three trump cards offered after a won duel.
   * Pure + exported so the draft maths can be tested.
   */
  function rollDraft(loadout, pool, count) {
    const owned = {};
    for (const id of loadout) owned[id] = (owned[id] || 0) + 1;

    let available = pool.filter((id) => (owned[id] || 0) < MAX_COPIES);
    if (!available.length) available = pool.slice();

    const bag = available.slice();
    const picked = [];
    while (picked.length < count && bag.length) {
      const i = Math.floor(rnd() * bag.length);
      picked.push(bag.splice(i, 1)[0]);
    }
    return picked;
  }

  function playTrump(side, id) {
    if (side.isYou) { save.stats.trumps++; }
    const idx = side.trumps.indexOf(id);
    if (idx === -1) return;
    const def = TRUMPS[id];
    const rival = other(side);

    if (def.hostile && rival.ward && !def.piercesWard) {
      rival.ward = false;
      side.trumps.splice(idx, 1);
      say(`${poss(rival)} <em>Ash Ward</em> devours ${def.name}.`);
      sfx.sting();
      render();
      return;
    }

    side.trumps.splice(idx, 1);
    const who = side.isYou ? 'You play' : 'The rival plays';
    say(`${who} <em>${def.name}</em>.`);
    def.use(side, rival);
    sfx.whisper();
    render();
  }

  /* ---------------------------------------------------------
     6. Turn timer
     --------------------------------------------------------- */

  function startTimer() {
    stopTimer();
    S.timeLeft = TURN_SECONDS;
    paintClock();
    S.timerId = setInterval(() => {
      S.timeLeft--;
      paintClock();
      if (S.timeLeft <= 0) {
        stopTimer();
        resolveAction({ type: 'stand', timeout: true });
      }
    }, 1000);
  }

  function stopTimer() {
    if (S.timerId) { clearInterval(S.timerId); S.timerId = null; }
  }

  function paintClock() {
    const el = document.getElementById('turnClock');
    if (!el) return;
    el.textContent = S.timeLeft + 's';
    el.classList.toggle('urgent', S.timeLeft <= 6);
  }

  /* ---------------------------------------------------------
     7. Duel flow
     --------------------------------------------------------- */

  function vesselOf(id) { return VESSELS[id] || VESSELS.widow; }

  /** One duel against the current opponent. Resolves true if you survived. */
  async function runDuel() {
    const opp = S.opponent || currentAct().opponents[S.opponentIndex];

    S.round = 0;
    S.tape = [];
    S.you.cards = [];
    S.you.trumps = [];
    S.you.ward = false;

    S.rival = makeSide(opp.name, false, {
      maxVigil: opp.vigil || START_VIGIL,
      startTrumps: opp.startTrumps,
      cheats: Math.max(0, (opp.cheats || 0) + difficulty().cheats),
      cheatKind: opp.cheatKind || 'replace',
      accuracy: Math.max(0.35, Math.min(0.995, (opp.accuracy || 0.8) + difficulty().accuracy))
    });

    grantTrump(S.you); grantTrump(S.you);
    grantTrump(S.rival); grantTrump(S.rival);
    for (let i = 2; i < opp.startTrumps; i++) grantTrump(S.rival);

    say(`${opp.name}. ${opp.line}`);
    render();
    await sleep(700);

    while (S.you.vigil > 0 && S.rival.vigil > 0) {
      await runRound();
      if (S.you.vigil <= 0 || S.rival.vigil <= 0) break;
      await sleep(400);
    }

    return S.you.vigil > 0;
  }

  /** The whole Act. Vigil carries between opponents — that is the pressure. */
  async function runGauntlet() {
    S.running = true;
    S.phase = 'play';

    while (S.opponentIndex < currentAct().opponents.length) {
      S.opponent = currentAct().opponents[S.opponentIndex];
      const survived = await runDuel();

      save.duels++;
      if (!survived) {
        writeSave();
        await endAct(false);
        return;
      }

      save.wins++;
      save.candles += 10;
      writeSave();
      render();

      S.opponentIndex++;
      if (S.opponentIndex >= currentAct().opponents.length) break;

      // a moment to breathe
      S.you.vigil = Math.min(
        vesselOf(S.vesselId).maxVigil,
        S.you.vigil + ACT_I.healAfterWin
      );

      const drafted = await draftTrump();
      if (drafted) {
        S.loadout.push(drafted);
        render();
      }

      await betweenDuels();
    }

    await endAct(true);
  }

  /** Offer three trumps; the chosen one joins your deck for the rest of the act. */
  function draftTrump() {
    S.draftOptions = rollDraft(S.loadout, unlockedPool(), 3);
    if (!S.draftOptions.length) return Promise.resolve(null);

    return new Promise((resolve) => {
      const screen = $('draftScreen');
      const grid = $('draftGrid');
      grid.innerHTML = '';

      S.draftOptions.forEach((id) => {
        const def = TRUMPS[id];
        const owned = S.loadout.filter((x) => x === id).length;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'draft-option';
        btn.dataset.rarity = def.rarity;

        const rarity = document.createElement('span');
        rarity.className = 'draft-rarity';

        const name = document.createElement('span');
        name.className = 'trump-name';
        name.textContent = def.name;

        const desc = document.createElement('span');
        desc.className = 'trump-desc';
        desc.textContent = def.desc;

        const count = document.createElement('span');
        count.className = 'draft-count';
        count.textContent = 'Copies owned: ' + owned + ' / ' + MAX_COPIES;

        btn.appendChild(rarity);
        btn.appendChild(name);
        btn.appendChild(desc);
        btn.appendChild(count);

        btn.addEventListener('click', () => {
          screen.hidden = true;
          sfx.chime();
          if (window.BGM) BGM.stinger('card');
          haptic(30);
          resolve(id);
        });

        grid.appendChild(btn);
      });

      screen.hidden = false;
      if (window.BGM) { BGM.setMood('draft'); BGM.duck(2600); }
    });
  }

  function betweenDuels() {
    return new Promise((resolve) => {
      const next = ACT_I.opponents[S.opponentIndex];
      showOverlay(
        'The Chair Turns',
        `${next.name} sits down opposite you. ${next.line} You bind your wound and take up the next hand.`,
        [{
          label: 'Sit Down',
          cls: 'primary',
          onClick: () => { hideOverlay(); resolve(); }
        }]
      );
    });
  }

  async function showEnding() {
    S.phase = 'over';
    stopTimer();
    hideTitle();
    sfx.chime();
    setTimeout(() => sfx.chime(), 400);
    setTimeout(() => sfx.chime(), 800);
    if (window.BGM) { BGM.setMood('title'); BGM.stinger('win'); }

    save.cleared = true;
    save.candles += 100;
    writeSave();
    render();

    const best = save.bestArcade || 0;
    const body =
      'The thing at the head of the table stands up, and keeps standing up. It was never '
      + 'sitting down. What you took for a chair was its hand.\n\n'
      + 'You do not win. You take the last hand, and the table lets you keep it. The candles '
      + 'go out one at a time. The door you have never seen is open, and it is not dark in there.\n\n'
      + 'Rank ' + rankFor(save.wins).name + ' \u00b7 duels won ' + save.wins
      + ' \u00b7 candles ' + save.candles
      + (best ? ' \u00b7 best arcade run ' + best : '');

    showOverlay('The Last Hand', body, [
      { label: 'Walk Out', cls: 'primary', onClick: () => { hideOverlay(); showTitle(); } }
    ], 'win');
  }

  /* ---------------------------------------------------------
     Replay: play the recorded duel back on the table. No input, no
     consequences — the point is to see the hand that killed you.
     --------------------------------------------------------- */
  async function playTape(onDone) {
    const tape = (S.tape || []).slice();
    if (!tape.length) { if (onDone) onDone(); return; }

    hideOverlay();
    S.phase = 'replay';
    S.skipReplay = false;
    document.body.classList.add('replaying');

    const wait = async (ms) => {
      for (let t = 0; t < ms && !S.skipReplay; t += 60) await sleep(60);
    };
    const skipping = () => S.skipReplay;

    for (const rec of tape) {
      if (skipping()) break;
      S.round = rec.round;
      S.target = rec.target;
      S.you.cards = rec.you.map((c) => ({ v: c.v, hidden: c.hidden }));
      S.rival.cards = rec.rival.map((c) => ({ v: c.v, hidden: c.hidden }));
      S.message = 'Round ' + rec.round + '. You wager ' + rec.wagerYou
        + ', they wager ' + rec.wagerRival + '.';
      render();
      await wait(1000);
      if (skipping()) break;

      if (rec.cheat) {
        S.message = rec.cheat === 'redeal'
          ? 'The Warden takes its hand back off the table and deals itself another.'
          : 'The dealer\u2019s sleeve moves.';
        render();
        sfx.wrong();
        await wait(1150);
        if (skipping()) break;
      }

      S.you.cards.forEach((c) => { c.hidden = false; });
      S.rival.cards.forEach((c) => { c.hidden = false; });
      const outcome = !rec.winner
        ? 'A tie. The blade does not move.'
        : rec.winner === 'you'
          ? 'You take it.'
          : 'They take it. You lose ' + rec.dmg + ' Vigil.';
      S.message = '<em>' + rec.yt + '</em> against <em>' + rec.rt + '</em>. ' + outcome;
      render();
      sfx.turn();
      await wait(1600);
    }

    if (!skipping()) {
      S.message = 'That is how it went. The table does not remember it.';
      render();
      await wait(1100);
    }

    document.body.classList.remove('replaying');
    S.skipReplay = false;
    S.phase = 'over';
    if (onDone) onDone();
  }

  async function endAct(won) {
    S.phase = 'over';
    stopTimer();
    sfx.stopDrone();

    const isFinal = (save.act || 0) >= ACTS.length - 1;

    if (won) {
      save.candles += 25;
      writeSave();
      sfx.chime();
      setTimeout(() => sfx.chime(), 260);
      if (window.BGM) BGM.stinger('win');
    } else {
      sfx.sting();
      sfx.toll();
      if (window.BGM) BGM.stinger('death');
    }
    render();

    if (won && isFinal) { await showEnding(); return; }

    if (won) {
      const next = ACTS[(save.act || 0) + 1];
      if (window.BGM) BGM.setMood('title');

      showOverlay(
        'The Act Is Cleared',
        'You stand up from the last chair of the act. ' + next.name
        + ' is below this room, and ' + next.opponents.length
        + ' are already seated there. ' + next.opponents[0].name + ' does not look up.\n\n'
        + 'Your candles: ' + save.candles + '.',
        [{
          label: 'Descend',
          cls: 'primary',
          onClick: () => {
            hideOverlay();
            save.act = Math.min(ACTS.length - 1, (save.act || 0) + 1);
            writeSave();
            startAct();
          }
        }, {
          label: 'Return to the Crypt',
          onClick: () => { hideOverlay(); showTitle(); }
        }],
        'win'
      );
      return;
    }

    if (window.BGM) BGM.setMood('title');

    let body = 'The blade finds you on chair ' + (S.opponentIndex + 1)
      + ' of ' + currentAct().opponents.length + '. '
      + 'Somewhere above, something with your face reshuffles.';

    const why = defeatTeaching();
    if (why) body += ' ' + why;

    const buttons = [{
      label: 'Rise Again',
      cls: 'primary',
      onClick: () => { hideOverlay(); startAct(); }
    }];

    if (S.tape && S.tape.length) {
      buttons.push({
        label: 'Watch it again',
        onClick: () => { hideOverlay(); playTape(() => endAct(false)); }
      });
    }

    buttons.push({
      label: 'Return to the Crypt',
      onClick: () => { hideOverlay(); showTitle(); }
    });

    showOverlay('The Blade Finds You', body, buttons, 'lose');
  }

  async function runRound() {
    S.round++;
    S.deck = makeDeck();
    S.target = DEFAULT_TARGET;

    // Some opponents deal to a different number, and say so.
    S.cheatThisRound = null;
    const opp = S.opponent || {};
    if (opp.targetShift) {
      S.target = Math.max(12, DEFAULT_TARGET + opp.targetShift);
    }
    S.turn = S.round % 2 === 1 ? 'you' : 'rival';

    [S.you, S.rival].forEach((s) => {
      s.cards = [];
      s.stood = false;
      s.ward = false;
      s.reprieved = false;
      s.stakeBonus = 0;
      s.doubled = false;
      s.revealed = false;
      s.wager = 1;
    });

    grantTrump(S.you);
    grantTrump(S.rival);
    // The Confessor hears confessions: two trumps a round.
    if (S.you.vessel === 'confessor') grantTrump(S.you);

    // Some things eat what you are carrying.
    if (opp.drain && S.you.trumps.length && rnd() < opp.drain) {
      const idx = Math.floor(rnd() * S.you.trumps.length);
      const eaten = S.you.trumps.splice(idx, 1)[0];
      say(`${opp.name} takes the <em>${TRUMPS[eaten].name}</em> out of your hand and swallows it.`);
      sfx.wrong();
      render();
      await sleep(900);
    }

    /* --- wager --- */
    S.phase = 'wager';
    say(`Round ${S.round}. Set your wager in silence.`);
    render();

    const choice = await awaitHuman();
    S.you.wager = choice.value;
    S.rival.wager = aiWager();

    say('Both wagers are sealed.');
    render();
    await sleep(700);

    /* --- deal, first card face down --- */
    S.phase = 'deal';
    if (S.deck.length >= 4) {
      S.you.cards.push({ v: S.deck.shift(), hidden: true });
      S.rival.cards.push({ v: S.deck.shift(), hidden: true });
      render();
      sfx.flick();
      await sleep(420);

      S.you.cards.push({ v: S.deck.shift(), hidden: false });
      S.rival.cards.push({ v: S.deck.shift(), hidden: false });
      render();
      sfx.flick();
      await sleep(420);
    }

    if (opp.extraCard && S.deck.length) {
      S.you.cards.push({ v: S.deck.shift(), hidden: false });
      render();
      sfx.deal();
      say('They deal you a third card unasked, and smile about it.');
      await sleep(650);
    }

    say('The cards are dealt. One remains unseen in each hand.');
    taunt('deal');
    render();
    await sleep(500);

    /* --- playing --- */
    S.phase = 'play';

    while (!(S.you.stood && S.rival.stood)) {
      if (!S.deck.length) {
        S.you.stood = true;
        S.rival.stood = true;
        say('The shoe is empty. Both hands are locked.');
        render();
        break;
      }

      const actor = S.turn === 'you' ? S.you : S.rival;

      if (actor.stood) { S.turn = S.turn === 'you' ? 'rival' : 'you'; continue; }

      if (S.turn === 'you') await humanTurn();
      else await rivalTurn();

      S.turn = S.turn === 'you' ? 'rival' : 'you';
    }

    await showdown();
  }

  async function humanTurn() {
    S.phase = 'yourTurn';

    let done = false;
    while (!done) {
      render();
      if (!S.deck.length) {
        S.you.stood = true;
        done = true;
        break;
      }

      startTimer();
      const a = await awaitHuman();
      stopTimer();

      if (a.type === 'draw') {
        const v = drawOne(S.you);
        if (v !== null) say(`You draw a <em>${v}</em>.`);
        if (isBust(S.you)) taunt('yourBust');
        sfx.flick();
        done = true;
        render();
      } else if (a.type === 'stand') {
        S.you.stood = true;
        say(a.timeout ? 'Time bleeds out. You are forced to stand.' : 'You stand.');
        sfx.flick();
        done = true;
        render();
      } else if (a.type === 'trump') {
        playTrump(S.you, a.id);
        if (S.you.stood) done = true;
      }
    }
  }

  async function rivalTurn() {
    S.phase = 'rivalTurn';
    say('The rival considers the shoe\u2026');
    render();
    await sleep(850);

    maybeAiTrump();
    await sleep(650);

    // Even a perfect reader misplays sometimes. This is the difficulty dial:
    // the Croupier blunders openly, the Dealer almost never does.
    let decision = shouldHit(S.rival);
    if (rnd() > (S.rival.accuracy || 1)) decision = !decision;

    if (decision) {
      const v = drawOne(S.rival);
      if (v !== null) say(`The rival draws a <em>${v}</em>.`);
      sfx.flick();
    } else {
      S.rival.stood = true;
      say('The rival stands.');
      sfx.flick();
    }
    render();
    await sleep(450);
  }

  /* ---------------------------------------------------------
     8. Showdown
     --------------------------------------------------------- */

  /**
   * The whole ruleset, as a pure function. No state, no DOM — so it can be
   * tested directly (see tests/rules.test.js).
   *
   * Returns 'you' | 'rival' | null (null = drawn round, no damage).
   */
  function computeWinner(youTotal, rivalTotal, target) {
    const youBust = youTotal > target;
    const rivalBust = rivalTotal > target;

    // Both bust: the hand CLOSER to the target wins — the lower total.
    if (youBust && rivalBust) {
      if (youTotal === rivalTotal) return null;
      return youTotal < rivalTotal ? 'you' : 'rival';
    }
    if (youBust) return 'rival';
    if (rivalBust) return 'you';

    if (youTotal === rivalTotal) return null;
    return youTotal > rivalTotal ? 'you' : 'rival';
  }

  /** Who wins right now, given the hands as they stand. */
  function resolveWinner() {
    return computeWinner(handTotal(S.you), handTotal(S.rival), S.target);
  }

  /**
   * The Veiled Dealer cheats — once per duel, and only when the round is
   * already lost. It is the act's teaching moment: save a trump for the end.
   */
  /* Slow motion, the sound pulled out of the room, and a held breath.
     The rules were always going to bend; this is about the moment. */
  async function cheatSetPiece() {
    const veil = $('cheatVeil');
    document.body.classList.add('cheat-slow');
    if (veil) veil.classList.add('show');
    if (window.BGM) { BGM.duck(4200); }
    sfx.whisper();
    haptic([0, 70, 50, 180]);
    await sleep(1500);
    document.body.classList.remove('cheat-slow');
    if (veil) veil.classList.remove('show');
  }

  /**
   * The Charnel Warden's trick: it does not fix a card, it takes the whole
   * hand back and deals itself a different one. Stronger than the sleeves —
   * and the only cheat that can come out worse than the hand it discarded.
   */
  async function playRedeal() {
    const r = S.rival;
    const target = S.target;
    S.cheatThisRound = 'redeal';

    say('The Warden lifts its cards off the table and puts them back in the shoe. '
      + 'It deals itself again.');
    render();
    sfx.wrong();
    if (window.BGM) { BGM.stinger('cheat'); BGM.duck(1800); }
    haptic([0, 40, 60, 120]);
    await sleep(1100);

    const side = $('rivalHand');
    if (side) { side.classList.remove('redealt'); void side.offsetWidth; side.classList.add('redealt'); }

    const before = r.cards.slice();
    before.forEach((c) => S.deck.push(c.v));
    for (let i = S.deck.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = S.deck[i]; S.deck[i] = S.deck[j]; S.deck[j] = t;
    }

    const fresh = [];
    if (S.deck.length >= 2) {
      fresh.push({ v: S.deck.shift(), hidden: true });
      fresh.push({ v: S.deck.shift(), hidden: false });
    }

    if (!fresh.length) {
      say('The shoe is empty. It puts the old hand back, and does not look pleased.');
      r.cards = before;
      render();
      await sleep(900);
      return;
    }

    const keepsNew = redealChoice(before, fresh, target) === 'fresh';
    r.cards = keepsNew ? fresh : before;
    if (!keepsNew) {
      // the discarded cards go back in the shoe
      fresh.forEach((c) => S.deck.push(c.v));
    }

    say(keepsNew
      ? 'The new hand is kinder to it. It was always going to be.'
      : 'The new hand is worse. It keeps the old one and says nothing about it.');
    render();
    sfx.thump();
    await sleep(1000);
  }

  async function playCheat() {
    const r = S.rival;
    const kind = r.cheatKind || 'replace';
    S.cheatThisRound = kind;

    await cheatSetPiece();
    r.cheatUsed = true;
    r.cheatsLeft = Math.max(0, r.cheatsLeft - 1);

    if (kind === 'redeal') return playRedeal();

    say('The dealer\u2019s sleeve moves. The card you were watching was never the card.');
    render();
    sfx.wrong();
    if (window.BGM) { BGM.stinger('cheat'); BGM.duck(1800); }
    haptic([0, 40, 60, 120]);
    await sleep(1100);

    const base = r.cards.reduce((a, c) => a + c.v, 0);
    let best = null;
    for (const v of S.deck) {
      if (base + v <= S.target && (best === null || v > best)) best = v;
    }
    if (best === null) {
      say('The dealer reaches, finds nothing, and closes its hand.');
      render();
      await sleep(800);
      return;
    }

    let idx = 0;
    for (let i = 1; i < r.cards.length; i++) {
      if (r.cards[i].v < r.cards[idx].v) idx = i;
    }
    const removed = r.cards[idx].v;
    r.cards[idx] = { v: best, hidden: r.cards[idx].hidden };
    S.deck.splice(S.deck.indexOf(best), 1);
    S.deck.push(removed);

    say('The dealer\u2019s hand is whole again. It was never going to lose that way.');
    render();
    sfx.thump();
    await sleep(900);
  }

  async function showdown() {
    S.phase = 'showdown';
    stopTimer();

    if (S.rival.cheatsLeft > 0 && resolveWinner() === 'you') {
      await playCheat();
    }

    S.you.revealed = true;
    S.rival.revealed = true;
    S.you.cards.forEach((c) => (c.hidden = false));
    S.rival.cards.forEach((c) => (c.hidden = false));

    say('The hidden cards turn.');
    sfx.turn();
    render();
    sfx.flick();
    await sleep(900);

    const yt = handTotal(S.you);
    const rt = handTotal(S.rival);
    const winner = resolveWinner();

    S.lastRound = {
      yt: yt,
      rt: rt,
      target: S.target,
      youBust: isBust(S.you),
      rivalBust: isBust(S.rival)
    };

    if (!winner) {
      tapeFrame(null, 0);
      say(`Both hands at <em>${yt}</em> and <em>${rt}</em>. The blade does not move.`);
      sfx.chime();
      render();
      await sleep(1400);
      return;
    }

    taunt(winner === 'you' ? 'yourWin' : 'theirWin');

    const w = winner === 'you' ? S.you : S.rival;
    const loser = winner === 'you' ? S.rival : S.you;

    let dmg = Math.max(S.you.wager, S.rival.wager) + w.stakeBonus;
    if (w.doubled) dmg *= 2;
    dmg = Math.max(1, dmg);

    // The Hollow Bride wears the wound a little better than most.
    if (loser === S.you && S.you.vessel === 'bride') dmg = Math.max(1, dmg - 1);

    loser.vigil = Math.max(0, loser.vigil - dmg);

    // local record, no telemetry: this never leaves the device
    const st = save.stats;
    st.hands++;
    if (isBust(S.you)) st.busts++;
    if (!isBust(S.you)) st.best = Math.max(st.best, handTotal(S.you));
    if (winner !== 'you') st.losses++;
    writeSave();

    tapeFrame(winner, dmg);

    const bothBust = isBust(S.you) && isBust(S.rival);
    const verb = winner === 'you' ? 'You take' : 'The rival takes';
    const context = bothBust ? 'Both bust \u2014 the closer hand takes it. ' : '';
    say(`${context}${verb} it, <em>${yt}</em> to <em>${rt}</em>. ` +
        `<span class="bad">${nameOf(loser)} ${sverb(loser, 'loses', 'lose')} ${dmg} Vigil.</span>`);
    sfx.thump();
    showDamage(loser, dmg);
    if (loser === S.you) { sfx.crack(); flashBlood(); }
    shakeScreen();
    haptic(winner === 'you' ? [0, 40] : [0, 60, 50, 120]);
    render();
    await sleep(1500);
  }

  /* ---------------------------------------------------------
     9. AI
     --------------------------------------------------------- */

  function aiWager() {
    const t = handTotal(S.rival);
    const vig = S.rival.vigil;
    let w = 1;
    if (vig <= 2) w = rnd() < 0.5 ? 2 : 1;
    else if (rnd() < 0.45) w = 2;
    else if (rnd() < 0.15) w = 3;
    if (t >= 18) w = Math.max(w, 2);
    return Math.min(3, w);
  }

  function bustChance(side) {
    if (!S.deck.length) return 1;
    const need = S.target - handTotal(side);
    const safe = S.deck.filter((v) => v <= need).length;
    return 1 - safe / S.deck.length;
  }

  function shouldHit(side) {
    const t = handTotal(side);
    if (t >= S.target) return false;
    if (!S.deck.length) return false;

    const bc = bustChance(side);
    if (t <= 11) return true;
    if (t <= 14) return bc < 0.55;
    if (t <= 16) return bc < 0.35;
    if (t <= 18) return bc < 0.18;
    return false;
  }

  function aiTrumpScore(id) {
    const r = S.rival;
    const y = S.you;
    const rt = handTotal(r);
    const yt = handTotal(y);

    switch (id) {
      case 'seersEye':   return rt >= 13 && rt <= 19 ? 8 : 1;
      case 'charity':    return y.stood && !isBust(y) ? 7 : 2;
      case 'graveDebt':  return y.stood && !isBust(y) ? 6 : 2;
      case 'thieves':    return 3;
      case 'creed17':    return yt >= 18 && yt <= 20 ? 8 : 0;
      case 'creed24':    return rt >= 18 ? 6 : 0;
      case 'bloodPrice': return r.wager >= 2 ? 6 : 2;
      case 'guillotine': return rt >= 18 && r.vigil >= 2 ? 5 : 0;
      case 'secondBreath': return rt >= 15 && rt <= 20 ? 6 : 1;
      case 'ashWard':    return 2;
      case 'severing':   return y.ward ? 6 : 0;
      case 'mirror':     return 2;
      default:           return 0;
    }
  }

  function maybeAiTrump() {
    if (!S.rival.trumps.length) return;

    let bestId = null;
    let bestScore = -1;
    for (const id of S.rival.trumps) {
      const s = aiTrumpScore(id);
      if (s > bestScore) { bestScore = s; bestId = id; }
    }

    if (bestId && bestScore >= 5 && rnd() < 0.85 * (S.rival.accuracy || 1)) {
      const victim = S.you;
      const def = TRUMPS[bestId];
      if (def.hostile && victim.ward && !def.piercesWard) {
        playTrump(S.rival, bestId);
        render();
        return;
      }
      playTrump(S.rival, bestId);
    }
  }

  /* ---------------------------------------------------------
     9b. Arcade — one hand after another, no acts, no continues
     --------------------------------------------------------- */

  /* Who is allowed to sit down this early in a run. */
  function arcadePool(streak) {
    const all = ACTS.reduce((acc, act) => acc.concat(act.opponents), []);
    const cap = Math.min(0.99, 0.62 + Math.min(streak, 10) * 0.037);
    const pool = all.filter((o) => (o.accuracy || 0) <= cap);
    return pool.length ? pool : all;
  }

  /* The same opponent never sits down twice in a row. */
  function pickArcadeOpponent(streak) {
    const pool = arcadePool(streak);
    const fresh = pool.filter((o) => o.id !== S.lastArcadeId);
    const list = fresh.length ? fresh : pool;
    const pick = list[Math.floor(rnd() * list.length)];
    S.lastArcadeId = pick.id;
    return pick;
  }

  /* Later runs are nastier: accuracy creeps up, and their trump hand fills. */
  function arcadeScaled(opp, streak) {
    const bump = Math.min(0.09, streak * 0.012);
    return Object.assign({}, opp, {
      accuracy: Math.max(0.5, Math.min(0.99, (opp.accuracy || 0.8) + bump)),
      startTrumps: Math.min(4, (opp.startTrumps || 2) + (streak >= 6 ? 1 : 0)),
      cheats: (opp.cheats || 0) + (streak >= 8 ? 1 : 0)
    });
  }

  async function endArcade() {
    S.phase = 'over';
    stopTimer();
    sfx.stopDrone();
    sfx.toll();
    if (window.BGM) { BGM.setMood('title'); BGM.stinger('death'); }

    const streak = S.arcadeStreak || 0;
    const best = Math.max(streak, save.bestArcade || 0);
    save.bestArcade = best;

    if (S.dailyKey) {
      const today = utcDateKey();
      if (S.dailyKey === today && streak > (save.dailyBest.streak || 0)) {
        save.dailyBest = { date: today, streak: streak };
      }
    }
    writeSave();
    render();

    showOverlay(
      'The Hand Ends',
      (streak === 0
        ? 'You lost the first hand. The table did not even lean forward. Try another.'
        : 'You took ' + streak + ' duel' + (streak === 1 ? '' : 's')
          + ' before the blade found you. Best run: ' + best + '.\n\n'
          + 'Candles: ' + save.candles + '.')
        + (defeatTeaching() ? '\n\n' + defeatTeaching() : ''),
      (S.tape && S.tape.length
        ? [{
          label: 'Deal Again',
          cls: 'primary',
          onClick: () => { hideOverlay(); startArcade(); }
        }, {
          label: 'Watch it again',
          onClick: () => { hideOverlay(); playTape(() => endArcade()); }
        }, {
          label: 'Return to the Crypt',
          onClick: () => { hideOverlay(); showTitle(); }
        }]
        : [{
          label: 'Deal Again',
          cls: 'primary',
          onClick: () => { hideOverlay(); startArcade(); }
        }, {
          label: 'Return to the Crypt',
          onClick: () => { hideOverlay(); showTitle(); }
        }]),
      'lose'
    );
  }

  async function runArcade() {
    S.mode = 'arcade';
    S.running = true;
    S.phase = 'play';
    S.arcadeStreak = 0;
    S.loadout = BASE_LOADOUT.slice();
    S.lastRound = null;
    S.opponentIndex = 0;

    while (true) {
      S.opponent = arcadeScaled(pickArcadeOpponent(S.arcadeStreak), S.arcadeStreak);
      // Arcade forgives: everyone sits down with a full Vigil.
      S.you.vigil = S.you.maxVigil;

      const survived = await runDuel();
      if (!survived) { await endArcade(); return; }

      S.arcadeStreak++;
      save.wins++;
      save.candles += 8;
      if (S.arcadeStreak > (save.bestArcade || 0)) save.bestArcade = S.arcadeStreak;
      writeSave();
      render();

      const drafted = await draftTrump();
      if (drafted) {
        S.loadout.push(drafted);
        render();
      }
    }
  }

  function utcDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  /* Everyone who plays today gets the same shoe. No server, no account:
     the date is the seed, and the seed is the whole contract. */
  function startDaily() {
    S.dailyKey = utcDateKey();
    reseed('last-hand-daily:' + S.dailyKey);
    startArcade();
    say('Daily ' + S.dailyKey + ' \u2014 the same shoe for everyone who sits down today.');
    render();
  }

  function startArcade() {
    hideOverlay();
    hideTitle();
    stopTimer();
    resolver = null;

    const v = vesselOf(S.vesselId);
    // One extra Vigil: arcade duels are meant to be survivable.
    S.you = makeSide('You', true, {
      maxVigil: Math.max(1, v.maxVigil + 1 + difficulty().vigil),
      vessel: S.vesselId
    });
    S.opponent = null;
    S.opponentIndex = 0;
    S.act = 0;
    S.message = '';

    save.seenIntro = true;
    writeSave();

    sfx.startDrone();
    if (window.BGM) BGM.start('duel');
    render();
    runArcade();
  }

  /* ---------------------------------------------------------
     10. Rendering
     --------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  function suitFor(v) { return SUITS[(v - 1) % 4]; }

  /* ---- character art ------------------------------------------- */

  /* Art ids differ from opponent ids only for the last of Act I. */
  function opponentArtId() {
    const opp = S.opponent || currentAct().opponents[S.opponentIndex];
    if (!opp) return 'veiled';
    return opp.id === 'dealer' ? 'veiled' : opp.id;
  }

  /* 3D when we can, vector art when we cannot (or when the player opts out). */
  /* The vector portraits read better at 58x72 than the 3D stage does, so 3D
     is opt-in. It is a real renderer, not a mock — flip it and judge. */
  function portraitMode() {
    return (save.art3d && window.Portraits3D) ? '3d' : '2d';
  }

  function paintPortraitInto(el, id) {
    if (!el) return;
    const mode = portraitMode();
    const sig = mode + ':' + id;
    if (el.dataset.art === sig) return;
    el.dataset.art = sig;
    el.innerHTML = '';

    if (mode === '3d') {
      const cv = document.createElement('canvas');
      cv.className = 'portrait-canvas';
      el.appendChild(cv);
      const inst = window.Portraits3D.mount(cv, id);
      if (inst) return;
      el.innerHTML = '';   // no 2D context available: fall through to vector art
    }

    if (window.Art) {
      el.innerHTML = Art.portrait(id);
    } else {
      el.dataset.art = '';
    }
  }

  function paintPortraits() {
    paintPortraitInto($('youPortrait'), S.vesselId);
    paintPortraitInto($('rivalPortrait'), opponentArtId());
  }

  /* ---- impact --------------------------------------------------- */

  /* A damage cue you can read without seeing red: a numeral, a hatch
     pattern, a shake and a haptic. Colour is the least of it. */
  function showDamage(side, dmg) {
    const host = side.isYou ? $('youSide') : $('rivalSide');
    if (!host) return;
    const badge = document.createElement('div');
    badge.className = 'dmg-badge';
    badge.textContent = '\u2212' + dmg + ' Vigil';
    host.appendChild(badge);
    setTimeout(() => badge.remove(), 1500);
  }

  function flashBlood() {
    const el = $('bloodFlash');
    if (!el) return;
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
  }

  function render() {
    const rank = rankFor(save.wins);
    $('rankName').textContent = rank.name;
    $('duelWins').textContent = save.wins;
    if ($('candles')) $('candles').textContent = save.candles;

    if ($('youName')) $('youName').textContent = vesselOf(S.vesselId).name;
    if ($('rivalName')) $('rivalName').textContent = S.rival.label;
    if ($('actLabel')) {
      $('actLabel').textContent = S.dailyKey ? 'Daily' : ('Act ' + currentAct().numeral);
    }
    if ($('actProgress')) {
      $('actProgress').textContent =
        Math.min(S.opponentIndex + 1, currentAct().opponents.length) + ' / ' + currentAct().opponents.length;
    }

    $('targetValue').textContent = S.target;
    $('targetValue').classList.toggle('deviated', S.target !== DEFAULT_TARGET);

    renderVigil($('youVigil'), S.you);
    renderVigil($('rivalVigil'), S.rival);

    renderHand($('youHand'), S.you, false);
    renderHand($('rivalHand'), S.rival, S.rival.revealed);

    renderScore($('youScore'), S.you, true);
    renderScore($('rivalScore'), S.rival, S.rival.revealed);

    $('youSide').classList.toggle('dying', S.you.vigil <= 1 && S.you.vigil > 0);
    $('rivalSide').classList.toggle('dying', S.rival.vigil <= 1 && S.rival.vigil > 0);

    renderShoe();
    renderTrumps();
    renderActions();

    const log = $('log');
    log.innerHTML = S.message || '';

    const tEl = $('taunt');
    if (tEl) {
      const line = S.taunt || '';
      if (tEl.textContent !== line) {
        tEl.textContent = line;
        tEl.classList.remove('show');
        void tEl.offsetWidth;          // restart the fade on a new line
        if (line) tEl.classList.add('show');
      }
      tEl.dataset.beat = S.tauntBeat || '';
    }
    log.classList.toggle('bad', /busts|loses/.test(S.message));

    renderBlade();
    paintPortraits();

    // The candles answer your Vigil: less life, less light.
    const life = S.you.maxVigil ? S.you.vigil / S.you.maxVigil : 1;
    document.body.style.setProperty('--vigil', life.toFixed(3));

    // the score leans with your danger
    const worst = Math.max(S.you.maxVigil - S.you.vigil, S.rival.maxVigil - S.rival.vigil);
    const total = Math.max(1, S.you.maxVigil + S.rival.maxVigil);
    if (window.BGM) {
      BGM.setIntensity(Math.min(1, worst / total + (S.you.vigil <= 2 ? 0.35 : 0)));
    }
  }

  function renderVigil(el, side) {
    if (!el) return;
    el.innerHTML = '';
    for (let i = 0; i < side.maxVigil; i++) {
      const p = document.createElement('div');
      p.className = 'pip' + (i < side.vigil ? '' : ' spent');
      el.appendChild(p);
    }
  }

  function makeCardEl(card, revealHidden, fresh) {
    const d = document.createElement('div');
    d.className = 'card';
    if (card.hidden && !revealHidden) d.classList.add('back');
    if (fresh) d.classList.add('new-glow');

    const suit = suitFor(card.v);
    d.innerHTML =
      '<span class="rank">' + card.v + '</span>' +
      '<span class="suit' + (suit.red ? ' red' : '') + '">' + suit.glyph + '</span>';
    return d;
  }

  function renderHand(el, side, revealHidden) {
    if (!el) return;

    const parts = side.cards.map((c) => ((c.hidden && !revealHidden) ? 'B' : 'F') + c.v);
    const sig = parts.join('|');
    if (el.dataset.sig === sig) return;

    const oldParts = el.dataset.sig ? el.dataset.sig.split('|') : [];
    const extends_ = oldParts.length > 0 &&
                     parts.length > oldParts.length &&
                     oldParts.join('|') === parts.slice(0, oldParts.length).join('|');

    if (extends_) {
      // Only the new cards animate in; the rest stay put.
      for (let i = oldParts.length; i < parts.length; i++) {
        el.appendChild(makeCardEl(side.cards[i], revealHidden, true));
      }
    } else {
      el.innerHTML = '';
      side.cards.forEach((card, i) => {
        el.appendChild(makeCardEl(card, revealHidden, i >= oldParts.length && oldParts.length > 0));
      });
    }

    el.dataset.sig = sig;
  }

  function renderScore(el, side, showAll) {
    if (!el) return;
    const hidden = hasHidden(side) && !showAll;
    const total = hidden ? visibleTotal(side) : handTotal(side);
    const bust = total > S.target && !hidden;

    el.textContent = hidden ? total + '+' : String(total);
    el.classList.toggle('bust', bust);
    el.classList.toggle('hot', !hidden && total === S.target);
    // colour is the least of the cue: the state is also spelled out
    el.dataset.state = bust ? 'bust' : (!hidden && total === S.target ? 'exact' : '');
  }

  function renderShoe() {
    const peek = $('peekNext');
    if (peek) {
      const canPeek = S.you.vessel === 'gravedigger' && S.deck.length > 0;
      peek.hidden = !canPeek;
      if (canPeek) peek.textContent = 'Next: ' + S.deck[0];
    }

    const el = $('shoeCards');
    if (!el) return;
    el.innerHTML = '';
    for (let v = 1; v <= 11; v++) {
      const c = document.createElement('div');
      const gone = S.deck.indexOf(v) === -1;
      c.className = 'chip' + (gone ? ' gone' : '');
      c.textContent = v;
      el.appendChild(c);
    }
  }

  function renderTrumps() {
    const el = $('trumpHand');
    if (!el) return;
    el.innerHTML = '';

    if (!S.you.trumps.length) {
      const p = document.createElement('span');
      p.className = 'rail-label';
      p.textContent = 'Empty';
      el.appendChild(p);
      return;
    }

    for (const id of S.you.trumps) {
      const def = TRUMPS[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'trump';
      btn.dataset.rarity = def.rarity;
      btn.disabled = !(S.phase === 'yourTurn');
      btn.innerHTML =
        '<span class="trump-rarity"></span>' +
        '<span class="trump-name">' + def.name + '</span>' +
        '<span class="trump-desc">' + def.desc + '</span>';
      btn.addEventListener('click', () => {
        if (S.phase !== 'yourTurn') return;
        resolveAction({ type: 'trump', id: id });
      });
      el.appendChild(btn);
    }
  }

  function renderActions() {
    const el = $('actionRail');
    if (!el) return;
    el.innerHTML = '';

    // Replay owns the rail while it plays: one note, one way out.
    if (S.phase === 'replay') {
      appendActionNote(el, 'Replay \u2014 the hand again');
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'btn';
      skip.textContent = 'Skip';
      skip.addEventListener('click', () => { S.skipReplay = true; });
      el.appendChild(skip);
      return;
    }

    if (S.phase === 'wager') {
      appendActionNote(el, 'Set your wager');
      [1, 2, 3].forEach((n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn' + (n === 1 ? ' primary' : '');
        b.innerHTML = 'Wager ' + n + '<small>' + n + ' Vigil at risk</small>';
        b.addEventListener('click', () => resolveAction({ type: 'wager', value: n }));
        el.appendChild(b);
      });
      return;
    }

    if (S.phase === 'yourTurn') {
      const clock = document.createElement('div');
      clock.className = 'turn-clock';
      clock.id = 'turnClock';
      clock.textContent = S.timeLeft + 's';
      el.appendChild(clock);
      paintClock();

      const draw = document.createElement('button');
      draw.type = 'button';
      draw.className = 'btn primary';
      draw.innerHTML = 'Draw<small>take a card</small>';
      draw.addEventListener('click', () => resolveAction({ type: 'draw' }));
      el.appendChild(draw);

      const stand = document.createElement('button');
      stand.type = 'button';
      stand.className = 'btn';
      stand.innerHTML = 'Stand<small>lock your hand</small>';
      stand.addEventListener('click', () => resolveAction({ type: 'stand' }));
      el.appendChild(stand);

      return;
    }

    if (S.phase === 'rivalTurn') { appendActionNote(el, 'The rival deliberates'); return; }
    if (S.phase === 'showdown') { appendActionNote(el, 'The cards turn'); return; }
    if (S.phase === 'deal')    { appendActionNote(el, 'Dealing'); return; }
  }

  function appendActionNote(el, text) {
    const d = document.createElement('div');
    d.className = 'action-note';
    d.textContent = text;
    el.appendChild(d);
  }

  function renderBlade() {
    const blade = $('blade');
    const fill = $('bladeFill');
    if (!blade || !fill) return;

    const minVig = Math.min(S.you.vigil, S.rival.vigil);
    const tension = minVig <= 1 ? 3 : minVig <= 3 ? 2 : 1;
    blade.dataset.tension = String(tension);

    // The blade leans toward whoever is losing.
    const delta = S.you.vigil - S.rival.vigil;
    const pct = Math.max(8, Math.min(92, 50 - delta * 11));
    fill.style.left = pct + '%';
  }

  /* ---------------------------------------------------------
     11. Overlay + effects
     --------------------------------------------------------- */

  function showOverlay(title, body, buttons, tone) {
    const ov = $('overlay');
    const h = $('ovTitle');
    h.textContent = title;
    h.className = tone || '';
    $('ovBody').textContent = body;

    const wrap = $('ovButtons');
    wrap.innerHTML = '';
    (buttons || []).forEach((b) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', b.onClick);
      wrap.appendChild(el);
    });

    ov.hidden = false;
  }

  function hideOverlay() { $('overlay').hidden = true; }

  function shakeScreen() {
    const t = document.querySelector('.table');
    if (!t) return;
    t.classList.remove('shake');
    void t.offsetWidth;
    t.classList.add('shake');
  }

  /* ---------------------------------------------------------
     12. Boot
     --------------------------------------------------------- */

  /* ---------------------------------------------------------
     Title screen / Vessel select
     --------------------------------------------------------- */

  function applyMotionPreference() {
    document.body.classList.toggle('reduce-motion', !!save.reduceMotion);
    const btn = $('motionBtn');
    if (btn) btn.textContent = 'Motion: ' + (save.reduceMotion ? 'Off' : 'On');
  }

  function showTitle() {
    S.phase = 'title';
    stopTimer();
    resolver = null;
    hideOverlay();
    renderTitle();
    $('titleScreen').hidden = false;
    if (window.BGM) BGM.setMood('title');
  }

  function hideTitle() { $('titleScreen').hidden = true; }

  function paintCosmetics() {
    ['back', 'cloth'].forEach((group) => {
      const host = $('cosmetic' + group.charAt(0).toUpperCase() + group.slice(1));
      if (!host) return;
      host.innerHTML = '';
      COSMETICS[group].forEach((c) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'swatch' + (save.cosmetics[group] === c.id ? ' on' : '');
        b.dataset.group = group;
        b.dataset.id = c.id;
        b.innerHTML = '<span class="swatch-chip" data-chip="' + group + '-' + c.id + '"></span>' +
          '<span class="swatch-name">' + c.name + '</span>' +
          '<span class="swatch-cost">' + (ownsCosmetic(group, c.id) ? 'owned' : c.cost + ' candles') + '</span>';
        b.addEventListener('click', () => buyOrEquip(group, c.id));
        host.appendChild(b);
      });
    });
  }

  function renderTitle() {
    const rankEl = $('titleRank');
    if (rankEl) rankEl.textContent = rankFor(save.wins).name;
    const candleEl = $('titleCandles');
    if (candleEl) candleEl.textContent = save.candles;
    if ($('titleAct')) {
      $('titleAct').textContent = 'Act ' + currentAct().numeral + (save.cleared ? ' \u2014 cleared' : '');
    }
    if ($('titleBest')) $('titleBest').textContent = save.bestArcade || 0;
    paintCosmetics();

    if ($('statLine')) {
      const st = save.stats;
      const bustRate = st.hands ? Math.round((st.busts / st.hands) * 100) : 0;
      $('statLine').textContent = st.hands
        ? `${st.hands} hands \u00b7 ${bustRate}% bust \u00b7 best ${st.best || '\u2014'} \u00b7 ${st.trumps} trumps played`
        : 'No hands played yet.';
    }
    if ($('titleDaily')) {
      const today = utcDateKey();
      $('titleDaily').textContent = save.dailyBest.date === today
        ? String(save.dailyBest.streak)
        : '\u2014';
    }

    const grid = $('vesselGrid');
    if (!grid) return;
    grid.innerHTML = '';

    VESSEL_ORDER.forEach((id) => {
      const v = VESSELS[id];
      const locked = save.wins < v.unlockWins;
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'vessel'
        + (id === S.vesselId ? ' chosen' : '')
        + (locked ? ' locked' : '');
      el.disabled = locked;

      const por = document.createElement('div');
      por.className = 'portrait vessel-portrait';
      el.appendChild(por);
      paintPortraitInto(por, id);

      const name = document.createElement('span');
      name.className = 'vessel-name';
      name.textContent = v.name;

      const epi = document.createElement('span');
      epi.className = 'vessel-epithet';
      epi.textContent = v.epithet;

      const pas = document.createElement('span');
      pas.className = 'vessel-passive';
      pas.textContent = v.passive;

      el.appendChild(name);
      el.appendChild(epi);
      el.appendChild(pas);

      if (locked) {
        const lock = document.createElement('span');
        lock.className = 'vessel-lock';
        lock.textContent = 'Unlocks at ' + v.unlockWins + ' duels won';
        el.appendChild(lock);
      }

      el.addEventListener('click', () => {
        S.vesselId = id;
        sfx.flick();
        renderTitle();
      });

      grid.appendChild(el);
    });
  }

  function startAct() {
    const v = vesselOf(S.vesselId);
    S.dailyKey = null;
    reseed(null);
    stopTimer();
    resolver = null;
    hideOverlay();
    hideTitle();

    S.act = Math.max(0, Math.min(save.act || 0, ACTS.length - 1));
    S.opponent = null;
    // Your Vigil deepens as you descend.
    S.you = makeSide('You', true, {
      maxVigil: Math.max(1, v.maxVigil + S.act + difficulty().vigil),
      vessel: S.vesselId
    });
    S.opponentIndex = 0;
    S.loadout = BASE_LOADOUT.slice();
    S.lastRound = null;
    S.message = '';

    save.seenIntro = true;
    writeSave();

    sfx.startDrone();
    if (window.BGM) BGM.start('duel');
    render();
    runGauntlet();
  }

  /* PWA: makes the browser build fully offline-installable.
     Inside the Android WebView the files are already local, so this is a no-op. */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {});
    });
  }

  /* Mobile: don't let the turn clock burn out while the app is backgrounded. */
  function bindLifecycle() {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stopTimer();
      } else if (S.phase === 'yourTurn' && resolver) {
        startTimer();
      }
    });

    // long-press shouldn't pop a context menu on the table
    document.addEventListener('contextmenu', function (e) {
      if (e.target && e.target.closest && e.target.closest('.table, .controls')) {
        e.preventDefault();
      }
    });
  }

  function boot() {
    const r = rankFor(save.wins);
    $('rankName').textContent = r.name;
    $('duelWins').textContent = save.wins;

    renderVigil($('youVigil'), S.you);
    renderVigil($('rivalVigil'), S.rival);
    renderShoe();
    render();

    const mute = $('muteBtn');
    mute.addEventListener('click', () => {
      const next = !sfx.isEnabled();
      sfx.setEnabled(next);
      if (next) sfx.startDrone();
      mute.textContent = 'Sound: ' + (next ? 'On' : 'Off');
    });

    // ---- music -------------------------------------------------
    const musicBtn = $('musicBtn');
    function paintMusicBtn() {
      if (musicBtn) musicBtn.textContent = 'Music: ' + (save.musicOn === false ? 'Off' : 'On');
    }
    if (musicBtn) {
      musicBtn.addEventListener('click', () => {
        save.musicOn = save.musicOn === false;
        writeSave();
        paintMusicBtn();
        if (window.BGM) {
          BGM.setEnabled(save.musicOn !== false);
          if (save.musicOn !== false) BGM.start(S.phase === 'title' ? 'title' : 'duel');
        }
      });
    }
    paintMusicBtn();
    applyCosmetics();

    // ---- portrait style ----------------------------------------
    const artBtn = $('artBtn');
    function paintArtBtn() {
      if (artBtn) artBtn.textContent = 'Portraits: ' + (portraitMode() === '3d' ? '3D' : '2D');
    }
    if (artBtn) {
      artBtn.addEventListener('click', () => {
        save.art3d = !save.art3d;
        writeSave();
        paintArtBtn();
        // force a repaint of every mounted portrait
        ['youPortrait', 'rivalPortrait'].forEach((id) => {
          const el = $(id);
          if (el) el.dataset.art = '';
        });
        document.querySelectorAll('.vessel-portrait').forEach((el) => {
          el.dataset.art = '';
        });
        if (!save.art3d && window.Portraits3D) Portraits3D.unmountAll();
        renderTitle();
        paintPortraits();
      });
    }
    // ---- dust in the candlelight -------------------------------
    const dust = $('dust');
    if (dust && !dust.childElementCount) {
      for (let i = 0; i < 26; i++) {
        const mote = document.createElement('i');
        mote.style.left = (Math.random() * 100).toFixed(1) + '%';
        mote.style.top = (55 + Math.random() * 55).toFixed(1) + '%';
        mote.style.width = mote.style.height = (1 + Math.random() * 2).toFixed(1) + 'px';
        mote.style.animationDuration = (16 + Math.random() * 26).toFixed(1) + 's';
        mote.style.animationDelay = (-Math.random() * 30).toFixed(1) + 's';
        mote.style.opacity = (0.2 + Math.random() * 0.6).toFixed(2);
        dust.appendChild(mote);
      }
    }

    // Browsers refuse to start audio without a gesture. The first tap is it.
    let audioOpened = false;
    function openAudio() {
      if (audioOpened) return;
      audioOpened = true;
      if (window.BGM) {
        BGM.unlock();
        if (save.musicOn !== false) BGM.start(S.phase === 'title' ? 'title' : 'duel');
      }
      window.removeEventListener('pointerdown', openAudio);
      window.removeEventListener('keydown', openAudio);
    }
    window.addEventListener('pointerdown', openAudio);
    window.addEventListener('keydown', openAudio);

    // Respect the OS setting on a first run, then let the player override.
    if (!save.seenIntro && window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      save.reduceMotion = true;
    }
    applyMotionPreference();

    const motionBtn = $('motionBtn');
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        save.reduceMotion = !save.reduceMotion;
        writeSave();
        applyMotionPreference();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (S.phase === 'wager' && ['1', '2', '3'].includes(e.key)) {
        resolveAction({ type: 'wager', value: Number(e.key) });
      } else if (S.phase === 'yourTurn') {
        if (e.key === 'd' || e.key === 'D') resolveAction({ type: 'draw' });
        if (e.key === 's' || e.key === 'S') resolveAction({ type: 'stand' });
      }
    });

    bindLifecycle();
    registerServiceWorker();

    const arcadeBtn = $('arcadeBtn');
    if (arcadeBtn) {
      arcadeBtn.addEventListener('click', () => {
        S.dailyKey = null;
        reseed(null);
        startArcade();
      });
    }

    const dailyBtn = $('dailyBtn');
    if (dailyBtn) dailyBtn.addEventListener('click', () => { startDaily(); });

    // ---- difficulty --------------------------------------------
    function paintDifficulty() {
      const row = $('difficultyRow');
      if (!row) return;
      Array.from(row.querySelectorAll('.diff')).forEach((b) => {
        const on = b.dataset.diff === (save.difficulty || 'standard');
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      const hint = $('titleHint');
      if (hint) hint.textContent = difficulty().note;
    }
    paintDifficulty();

    const diffRow = $('difficultyRow');
    if (diffRow) {
      diffRow.addEventListener('click', (e) => {
        const b = e.target.closest('.diff');
        if (!b || !DIFFICULTY[b.dataset.diff]) return;
        save.difficulty = b.dataset.diff;
        writeSave();
        paintDifficulty();
        sfx.flick();
      });
    }

    const enter = $('enterBtn');
    if (enter) enter.addEventListener('click', startAct);

    showTitle();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  // Node (test harness) hook — the browser ignores this entirely.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      computeWinner: computeWinner,
      rollDraft: rollDraft,
      MAX_COPIES: MAX_COPIES,
      BASE_LOADOUT: BASE_LOADOUT,
      totalOf: function (cards) { return cards.reduce(function (a, c) { return a + c.v; }, 0); },
      TRUMPS: TRUMPS,
      VESSELS: VESSELS,
      ACT_I: ACT_I,
      ACTS: ACTS,
      arcadePool: arcadePool,
      arcadeScaled: arcadeScaled,
      DIFFICULTY: DIFFICULTY,
      reseed: reseed,
      rnd: rnd,
      seedFrom: seedFrom,
      TAUNTS: TAUNTS,
      COSMETICS: COSMETICS,
      redealChoice: redealChoice,
      handLesson: handLesson
    };
  }

})();

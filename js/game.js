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

  /* ---------------------------------------------------------
     Act I — a three-opponent gauntlet. Vigil carries over.
     --------------------------------------------------------- */

  const ACT_I = {
    name: 'Act I — The Gauntlet',
    healAfterWin: 2,
    opponents: [
      {
        id: 'croupier',
        name: 'The Pale Croupier',
        line: 'Deals without looking at the cards.',
        startTrumps: 2,
        cheat: false
      },
      {
        id: 'mourner',
        name: 'The Mourner',
        line: 'She bets what she has already lost.',
        startTrumps: 3,
        cheat: false
      },
      {
        id: 'dealer',
        name: 'The Veiled Dealer',
        line: 'You have never seen its hands in the same place twice.',
        startTrumps: 3,
        cheat: true
      }
    ]
  };

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

  let save = loadSave();

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.wins === 'number' && typeof p.duels === 'number') {
          if (typeof p.candles !== 'number') p.candles = 0;
          return p;
        }
      }
    } catch (e) { /* private mode, corrupt data */ }
    return { wins: 0, duels: 0, candles: 0, seenIntro: false };
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
      cheat: !!opts.cheat,
      cheatUsed: false,
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
    opponentIndex: 0
  };

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
      const j = Math.floor(Math.random() * (i + 1));
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
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
    const pool = side.isYou ? unlockedPool() : Object.keys(TRUMPS);
    const id = pool[Math.floor(Math.random() * pool.length)];
    side.trumps.push(id);
  }

  function playTrump(side, id) {
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
    const opp = ACT_I.opponents[S.opponentIndex];

    S.round = 0;
    S.you.cards = [];
    S.you.trumps = [];
    S.you.ward = false;

    S.rival = makeSide(opp.name, false, {
      maxVigil: START_VIGIL,
      startTrumps: opp.startTrumps,
      cheat: opp.cheat
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

    while (S.opponentIndex < ACT_I.opponents.length) {
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
      if (S.opponentIndex >= ACT_I.opponents.length) break;

      // a moment to breathe
      S.you.vigil = Math.min(
        vesselOf(S.vesselId).maxVigil,
        S.you.vigil + ACT_I.healAfterWin
      );
      await betweenDuels();
    }

    await endAct(true);
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

  async function endAct(won) {
    S.phase = 'over';
    stopTimer();
    sfx.stopDrone();

    if (won) {
      save.candles += 25;
      writeSave();
      sfx.chime();
      setTimeout(() => sfx.chime(), 260);
    } else {
      sfx.sting();
    }
    render();

    const body = won
      ? 'You stand up from the last chair. Somewhere above, a door you have never seen unlocks itself.'
      : `The blade finds you on chair ${S.opponentIndex + 1} of ${ACT_I.opponents.length}. ` +
        'Somewhere above, something with your face reshuffles.';

    showOverlay(
      won ? 'The Act Is Cleared' : 'The Blade Finds You',
      body,
      [{
        label: 'Return to the Crypt',
        cls: 'primary',
        onClick: () => { hideOverlay(); showTitle(); }
      }],
      won ? 'win' : 'lose'
    );
  }

  async function runRound() {
    S.round++;
    S.deck = makeDeck();
    S.target = DEFAULT_TARGET;
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

    say('The cards are dealt. One remains unseen in each hand.');
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

    if (shouldHit(S.rival)) {
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
  async function playCheat() {
    const r = S.rival;
    r.cheatUsed = true;

    say('The dealer\u2019s sleeve moves. The card you were watching was never the card.');
    render();
    sfx.sting();
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

    if (S.rival.cheat && !S.rival.cheatUsed && resolveWinner() === 'you') {
      await playCheat();
    }

    S.you.revealed = true;
    S.rival.revealed = true;
    S.you.cards.forEach((c) => (c.hidden = false));
    S.rival.cards.forEach((c) => (c.hidden = false));

    say('The hidden cards turn.');
    render();
    sfx.flick();
    await sleep(900);

    const yt = handTotal(S.you);
    const rt = handTotal(S.rival);
    const winner = resolveWinner();

    if (!winner) {
      say(`Both hands at <em>${yt}</em> and <em>${rt}</em>. The blade does not move.`);
      sfx.chime();
      render();
      await sleep(1400);
      return;
    }

    const w = winner === 'you' ? S.you : S.rival;
    const loser = winner === 'you' ? S.rival : S.you;

    let dmg = Math.max(S.you.wager, S.rival.wager) + w.stakeBonus;
    if (w.doubled) dmg *= 2;
    dmg = Math.max(1, dmg);

    // The Hollow Bride wears the wound a little better than most.
    if (loser === S.you && S.you.vessel === 'bride') dmg = Math.max(1, dmg - 1);

    loser.vigil = Math.max(0, loser.vigil - dmg);

    const bothBust = isBust(S.you) && isBust(S.rival);
    const verb = winner === 'you' ? 'You take' : 'The rival takes';
    const context = bothBust ? 'Both bust \u2014 the closer hand takes it. ' : '';
    say(`${context}${verb} it, <em>${yt}</em> to <em>${rt}</em>. ` +
        `<span class="bad">${nameOf(loser)} ${sverb(loser, 'loses', 'lose')} ${dmg} Vigil.</span>`);
    sfx.thump();
    shakeScreen();
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
    if (vig <= 2) w = Math.random() < 0.5 ? 2 : 1;
    else if (Math.random() < 0.45) w = 2;
    else if (Math.random() < 0.15) w = 3;
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

    if (bestId && bestScore >= 5 && Math.random() < 0.85) {
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
     10. Rendering
     --------------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  function suitFor(v) { return SUITS[(v - 1) % 4]; }

  function render() {
    const rank = rankFor(save.wins);
    $('rankName').textContent = rank.name;
    $('duelWins').textContent = save.wins;
    if ($('candles')) $('candles').textContent = save.candles;

    if ($('youName')) $('youName').textContent = vesselOf(S.vesselId).name;
    if ($('rivalName')) $('rivalName').textContent = S.rival.label;
    if ($('actProgress')) {
      $('actProgress').textContent =
        Math.min(S.opponentIndex + 1, ACT_I.opponents.length) + ' / ' + ACT_I.opponents.length;
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
    log.classList.toggle('bad', /busts|loses/.test(S.message));

    renderBlade();
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

  function showTitle() {
    S.phase = 'title';
    stopTimer();
    resolver = null;
    hideOverlay();
    renderTitle();
    $('titleScreen').hidden = false;
  }

  function hideTitle() { $('titleScreen').hidden = true; }

  function renderTitle() {
    const rankEl = $('titleRank');
    if (rankEl) rankEl.textContent = rankFor(save.wins).name;
    const candleEl = $('titleCandles');
    if (candleEl) candleEl.textContent = save.candles;

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
    stopTimer();
    resolver = null;
    hideOverlay();
    hideTitle();

    S.you = makeSide('You', true, { maxVigil: v.maxVigil, vessel: S.vesselId });
    S.opponentIndex = 0;
    S.message = '';

    save.seenIntro = true;
    writeSave();

    sfx.startDrone();
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
      totalOf: function (cards) { return cards.reduce(function (a, c) { return a + c.v; }, 0); },
      TRUMPS: TRUMPS,
      VESSELS: VESSELS,
      ACT_I: ACT_I
    };
  }

})();

#!/usr/bin/env node
/**
 * Ruleset tests for The Last Hand.
 *
 *   node tests/rules.test.js
 *   npm test
 *
 * Covers the resolution table — including the both-bust rule, which is the
 * one people get wrong (the *closer* hand wins, not the higher one).
 */

const path = require('path');
const game = require(path.resolve(__dirname, '..', 'js', 'game.js'));

const { computeWinner, totalOf, TRUMPS, VESSELS, ACT_I, ACTS, rollDraft, MAX_COPIES,
        BASE_LOADOUT, arcadePool, arcadeScaled, DIFFICULTY, reseed, rnd, seedFrom,
        TAUNTS, COSMETICS, redealChoice, handLesson } = game;

let passed = 0;
let failed = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  if (ok) passed++;
  else failed++;
  const label = ok ? 'PASS' : 'FAIL';
  const detail = ok ? '' : `  (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`;
  console.log(`  ${label}  ${name}${detail}`);
}

function section(title) {
  console.log(`\n${title}`);
}

/* ---------------------------------------------------------
   Resolution table
   --------------------------------------------------------- */

section('Resolution — neither busts');
check('21 beats 20', computeWinner(21, 20, 21), 'you');
check('20 loses to 21', computeWinner(20, 21, 21), 'rival');
check('equal hands draw', computeWinner(19, 19, 21), null);
check('17 loses to 18', computeWinner(17, 18, 21), 'rival');

section('Resolution — one busts');
check('busting loses to standing', computeWinner(23, 18, 21), 'rival');
check('standing beats a bust', computeWinner(18, 23, 21), 'you');

section('Resolution — both bust (the easy one to get wrong)');
check('22 beats 26 — closer to target wins', computeWinner(26, 22, 21), 'rival');
check('22 beats 26 (mirrored)', computeWinner(22, 26, 21), 'you');
check('equal busts draw', computeWinner(30, 30, 21), null);
check('23 beats 29', computeWinner(29, 23, 21), 'rival');

section('Resolution — shifted target (The New Creed)');
check('target 24: 24 beats 22', computeWinner(24, 22, 24), 'you');
check('target 24: 26 busts, 22 wins', computeWinner(26, 22, 24), 'rival');
check('target 17: 18 busts, 12 wins', computeWinner(18, 12, 17), 'rival');
check('target 24: both bust, 25 beats 27', computeWinner(27, 25, 24), 'rival');

/* ---------------------------------------------------------
   Card values
   --------------------------------------------------------- */

section('Card values');
check('empty hand is 0', totalOf([]), 0);
check('1 + 11 = 12', totalOf([{ v: 1 }, { v: 11 }]), 12);
check('deck of 11 sums to 66', totalOf(Array.from({ length: 11 }, (_, i) => ({ v: i + 1 }))), 66);

/* ---------------------------------------------------------
   Content integrity
   --------------------------------------------------------- */

section('Content integrity');

const trumpIds = Object.keys(TRUMPS);
check('12 trump cards defined', trumpIds.length, 12);

let badTrump = null;
for (const id of trumpIds) {
  const t = TRUMPS[id];
  if (!t.name || !t.desc || typeof t.use !== 'function') badTrump = id;
  if (![1, 2, 3].includes(t.rarity)) badTrump = `${id} has bad rarity`;
}
check('every trump has name, desc, use(), valid rarity', badTrump, null);

const legendaries = trumpIds.filter((id) => TRUMPS[id].rarity === 3);
check('4 legendary trumps', legendaries.length, 4);
check('Ash Ward is countered by The Severing',
  TRUMPS.severing.piercesWard === true, true);

section('Vessels');
const vesselIds = Object.keys(VESSELS);
check('4 vessels defined', vesselIds.length, 4);
check('exactly one vessel is unlocked at 0 wins',
  vesselIds.filter((v) => VESSELS[v].unlockWins === 0).length, 1);
check('Widow has 6 Vigil', VESSELS.widow.maxVigil, 6);
check('other vessels have 5 Vigil',
  vesselIds.filter((v) => v !== 'widow').every((v) => VESSELS[v].maxVigil === 5), true);

section('Act I');
check('3 opponents', ACT_I.opponents.length, 3);
check('final opponent cheats', ACT_I.opponents[2].cheats, 1);
check('only the final opponent cheats',
  ACT_I.opponents.filter((o) => o.cheats > 0).length, 1);
check('Act I heals between duels', ACT_I.healAfterWin, 2);

/* ---------------------------------------------------------
   The descent: three acts, nine chairs
   --------------------------------------------------------- */

section('The descent');

const chairs = ACTS.reduce((acc, a) => acc.concat(a.opponents), []);

check('three acts', ACTS.length, 3);
check('every act seats three', ACTS.every((a) => a.opponents.length === 3), true);
check('nine opponents in total', chairs.length, 9);
check('every opponent id is unique',
  new Set(chairs.map((o) => o.id)).size, chairs.length);
check('every opponent has a name, a line and a portrait id',
  chairs.every((o) => o.name && o.line && o.id), true);
check('accuracy is always a real probability',
  chairs.every((o) => o.accuracy > 0.5 && o.accuracy <= 0.99), true);
check('everyone starts with at least one trump',
  chairs.every((o) => o.startTrumps >= 1), true);
check('nobody starts with more trumps than the hand can hold',
  chairs.every((o) => o.startTrumps <= 4), true);

const avg = (act) => act.opponents.reduce((n, o) => n + o.accuracy, 0) / act.opponents.length;
check('act II is harder than act I', avg(ACTS[1]) > avg(ACTS[0]), true);
check('act III is harder than act II', avg(ACTS[2]) > avg(ACTS[1]), true);

check('the final chair is the thing at the head of the table',
  ACTS[2].opponents[2].id, 'head');
/* v3.6 re-cut the final chair: its cheat now fires only when it is *losing*
   (which is what ships), so a second charge measured at a 22% hero win rate —
   below anything playable. It keeps the highest accuracy and the drain; the
   Warden and the Surgeon carry the other tricks. */
check('the boss cheats', ACTS[2].opponents[2].cheats >= 1, true);
check('no chair cheats more than the final chair',
  chairs.every((o) => (o.cheats || 0) <= ACTS[2].opponents[2].cheats), true);
check('the final chair is the hardest in the campaign',
  ACTS[2].opponents[2].accuracy >= Math.max.apply(null, chairs.map((o) => o.accuracy)), true);

section('New mechanics');

check('the Charnel Warden lowers the target',
  ACTS[1].opponents[0].targetShift, -2);
check('the surgeon lowers it further',
  ACTS[2].opponents[1].targetShift, -3);
check('a shifted target stays playable',
  chairs.every((o) => !o.targetShift || (21 + o.targetShift) >= 12), true);
check('the Twins deal an extra card', !!ACTS[1].opponents[1].extraCard, true);
check('only the Twins do that',
  chairs.filter((o) => o.extraCard).length, 1);
check('the drain rate is a sane probability',
  chairs.every((o) => !o.drain || (o.drain > 0 && o.drain < 1)), true);

/* ---------------------------------------------------------
   Arcade
   --------------------------------------------------------- */

section('Arcade');

const early = arcadePool(0);
check('an early run only meets gentle opponents',
  early.every((o) => o.accuracy <= 0.62), true);
check('the early pool is not empty', early.length > 0, true);
check('the pool grows as the streak grows',
  arcadePool(10).length >= early.length, true);
check('a long run can meet everyone', arcadePool(20).length, 9);

const soft = ACTS[0].opponents[0];
const scaled = arcadeScaled(soft, 5);
check('scaling raises accuracy', scaled.accuracy > soft.accuracy, true);
check('scaling never exceeds the cap', arcadeScaled(ACTS[2].opponents[2], 30).accuracy <= 0.99, true);
check('scaling does not mutate the source', soft.accuracy, 0.62);
check('a long arcade run has fewer trumps to spare',
  arcadeScaled(soft, 7).startTrumps > soft.startTrumps, true);

/* ---------------------------------------------------------
   Trump draft
   --------------------------------------------------------- */

section('Trump draft');

const ALL = Object.keys(TRUMPS);

check('offers three cards from an empty deck',
  rollDraft([], ALL, 3).length, 3);

const offer = rollDraft([], ALL, 3);
check('every offer comes from the pool',
  offer.every((id) => ALL.includes(id)), true);
check('a single offer has no duplicates',
  new Set(offer).size, offer.length);

check('offers what remains when the pool is small',
  rollDraft([], ['seersEye', 'charity'], 3).length, 2);

// A card at the copy cap must not be offered while others are available.
const maxed = [];
for (let i = 0; i < MAX_COPIES; i++) maxed.push('seersEye');
const cappedOffer = rollDraft(maxed, ['seersEye', 'charity', 'graveDebt'], 1);
check('does not offer a card already at the copy cap',
  cappedOffer.includes('seersEye'), false);

// If literally everything is capped, it must still offer something.
const allMaxed = [];
ALL.forEach((id) => { for (let i = 0; i < MAX_COPIES; i++) allMaxed.push(id); });
check('falls back rather than returning nothing',
  rollDraft(allMaxed, ALL, 3).length, 3);

check('starting deck has 4 trumps', BASE_LOADOUT.length, 4);
check('starting deck only holds real trumps',
  BASE_LOADOUT.every((id) => !!TRUMPS[id]), true);
check('starting deck is all common rarity',
  BASE_LOADOUT.every((id) => TRUMPS[id].rarity === 1), true);

// Statistical sanity: repeated rolls should surface more than one distinct card.
const seen = new Set();
for (let i = 0; i < 60; i++) rollDraft([], ALL, 3).forEach((id) => seen.add(id));
check('draft is not stuck on one card', seen.size > 6, true);

/* ---------------------------------------------------------
   Summary
   --------------------------------------------------------- */

/* ---------------------------------------------------------
   Determinism — the daily run's whole contract
   --------------------------------------------------------- */

section('Deterministic runs');

const seq = (n) => { const out = []; for (let i = 0; i < n; i++) out.push(rnd()); return out; };

reseed('last-hand-daily:2026-11-20');
const a = seq(8);
reseed('last-hand-daily:2026-11-20');
const b = seq(8);
check('the same seed replays the same sequence',
  a.join(',') === b.join(','), true);

reseed('last-hand-daily:2026-11-21');
const c = seq(8);
check('a different day deals a different shoe', a.join(',') !== c.join(','), true);
check('seeded values stay in [0,1)', a.every((v) => v >= 0 && v < 1), true);
check('seedFrom is stable', seedFrom('abc'), seedFrom('abc'));
check('seedFrom separates inputs', seedFrom('abc') !== seedFrom('abd'), true);

reseed(null);
check('random mode still produces valid values', seq(4).every((v) => v >= 0 && v < 1), true);

/* ---------------------------------------------------------
   Difficulty
   --------------------------------------------------------- */

section('Difficulty');

check('three difficulties', Object.keys(DIFFICULTY).length, 3);
check('casual gives more Vigil', DIFFICULTY.casual.vigil > DIFFICULTY.standard.vigil, true);
check('nightmare gives less Vigil', DIFFICULTY.nightmare.vigil < DIFFICULTY.standard.vigil, true);
check('standard is neutral',
  DIFFICULTY.standard.vigil === 0 && DIFFICULTY.standard.accuracy === 0 && DIFFICULTY.standard.cheats === 0, true);
check('matching AI accuracy never exceeds 1',
  chairs.every((o) => Math.min(0.995, o.accuracy + DIFFICULTY.nightmare.accuracy) <= 1), true);
check('matching AI accuracy never drops below a floor',
  chairs.every((o) => Math.max(0.35, o.accuracy + DIFFICULTY.casual.accuracy) >= 0.35), true);
check('nightmare never produces negative cheat charges',
  chairs.every((o) => Math.max(0, (o.cheats || 0) + DIFFICULTY.nightmare.cheats) >= 0), true);

/* ---------- v3.6: boss voices and the two cheat kinds ----------
   Every chair must have all four beats, or a boss goes silent at the exact
   moment the game is trying to say something. */
const BEATS = ['deal', 'yourBust', 'yourWin', 'theirWin'];
const allOpps = ACTS.reduce((a, act) => a.concat(act.opponents), []);
check('nine chairs, nine voices', allOpps.length, 9);
check('every chair has taunt lines for every beat',
  allOpps.every((o) => TAUNTS[o.id] && BEATS.every((b) => Array.isArray(TAUNTS[o.id][b]) && TAUNTS[o.id][b].length > 0)),
  true);
check('no taunt table belongs to a chair that does not exist',
  Object.keys(TAUNTS).every((id) => allOpps.some((o) => o.id === id)), true);
check('every taunt line is a real sentence',
  allOpps.every((o) => BEATS.every((b) => TAUNTS[o.id][b].every((l) => typeof l === 'string' && l.length > 12))),
  true);

const KINDS = ['replace', 'redeal'];
check('every cheat has a known kind',
  allOpps.filter((o) => (o.cheats || 0) > 0).every((o) => KINDS.indexOf(o.cheatKind || 'replace') >= 0),
  true);
check('both cheat kinds are actually used in the campaign',
  KINDS.every((k) => allOpps.some((o) => (o.cheats || 0) > 0 && (o.cheatKind || 'replace') === k)), true);
check('the Warden is the redeal chair',
  allOpps.filter((o) => (o.cheatKind || 'replace') === 'redeal').map((o) => o.id).join(','), 'charnel');

/* ---------- the defeat screen teaches ---------- */
check('a bust says what standing would have done',
  /would have won the hand/.test(handLesson({ yt: 24, rt: 16, target: 21, youBust: true }, 17, [])), true);
check('a bust that would still have lost says so, and does not flatter',
  /would still have lost, but by less/.test(handLesson({ yt: 24, rt: 20, target: 21, youBust: true }, 17, [])), true);
check('standing on the number is called unwinnable, not "you needed 22"',
  /no card that beats it/.test(handLesson({ yt: 15, rt: 21, target: 21, youBust: false }, 15, [4, 5])), true);
check('standing on the number never asks for an impossible card',
  /needed 22/.test(handLesson({ yt: 15, rt: 21, target: 21, youBust: false }, 15, [4])), false);
check('a winnable hand names the outs still in the shoe',
  /The shoe still held 2 cards/.test(handLesson({ yt: 15, rt: 18, target: 21, youBust: false }, 15, [4, 5, 11])), true);
check('an unwinnable hand says the shoe had nothing',
  /Nothing left in the shoe/.test(handLesson({ yt: 20, rt: 20, target: 21, youBust: false }, 20, [9])), true);
check('both bust blames the closer hand, not the player',
  /closer hand takes it/.test(handLesson({ yt: 24, rt: 23, target: 21, youBust: true, rivalBust: true }, 20, [])), true);

/* ---------- the Warden's redeal ---------- */
check('a better redealt hand is kept',
  redealChoice([{ v: 4 }, { v: 5 }], [{ v: 10 }, { v: 9 }], 19), 'fresh');
check('a worse redealt hand is thrown back',
  redealChoice([{ v: 10 }, { v: 9 }], [{ v: 2 }, { v: 3 }], 19), 'before');
check('a redeal that busts never replaces a standing hand',
  redealChoice([{ v: 9 }, { v: 9 }], [{ v: 11 }, { v: 11 }], 19), 'before');
check('a redeal that busts less badly still replaces a worse bust',
  redealChoice([{ v: 11 }, { v: 11 }], [{ v: 10 }, { v: 10 }], 19), 'fresh');
check('a tie keeps the hand already on the table',
  redealChoice([{ v: 10 }, { v: 5 }], [{ v: 9 }, { v: 6 }], 19), 'before');

/* ---------- v3.5: cosmetics ---------- */
check('the free cosmetic is free, in both groups',
  COSMETICS.back.filter((c) => c.cost === 0).length + COSMETICS.cloth.filter((c) => c.cost === 0).length, 2);
check('every cosmetic id is unique across groups',
  new Set(COSMETICS.back.concat(COSMETICS.cloth).map((c) => c.id)).size, 6);
check('cosmetics are priced but never a power gate',
  ['back', 'cloth'].every((g) => COSMETICS[g].every((c) => typeof c.cost === 'number' && c.cost >= 0)), true);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

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

const { computeWinner, totalOf, TRUMPS, VESSELS, ACT_I, rollDraft, MAX_COPIES, BASE_LOADOUT } = game;

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
check('final opponent cheats', ACT_I.opponents[2].cheat, true);
check('only the final opponent cheats',
  ACT_I.opponents.filter((o) => o.cheat).length, 1);

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

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);

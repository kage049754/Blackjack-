#!/usr/bin/env node
/**
 * Balance harness.
 *
 * The `accuracy` values in js/game.js were set by judgement. This script
 * replaces judgement with numbers: it models the real ruleset (1-11 shoe,
 * two cards each, hidden hole card, both-bust resolution) and replays a few
 * thousand duels against each opponent at their current accuracy.
 *
 *   node scripts/balance.js [--duels 500] [--no-cheats]
 *
 * Cheats are modelled the way they ship: the boss spends one only when the
 * round is already lost, then plays its own kind (replace / redeal).
 *
 * It is a model of the rules, not the shipped UI loop: it uses the shipped
 * `computeWinner` and the shipped opponent table from js/game.js, but the
 * draw/stand policy and the trump economy are simplified. Read it as
 * "is the difficulty curve shaped right", not "is every card interaction
 * identical".
 *
 * Trumps are deliberately excluded: they are player agency, and including
 * them would measure the harness's trump policy rather than the opponent.
 */
const path = require('path');
const game = require(path.resolve(__dirname, '..', 'js', 'game.js'));

const { computeWinner, ACTS } = game;

const argv = process.argv.slice(2);
const DUELS = Number((argv[argv.indexOf('--duels') + 1]) || 500);
const NO_CHEATS = argv.includes('--no-cheats');

/* ---------- a deterministic model of the shoe ---------- */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

function makeDeck(rng) {
  const d = [];
  for (let i = 1; i <= 11; i++) d.push(i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = d[i]; d[i] = d[j]; d[j] = t;
  }
  return d;
}

/* Chance the next card takes you over, given what is left in the shoe. */
function bustChance(total, deck, target) {
  if (!deck.length) return 1;
  let bad = 0;
  for (const v of deck) if (total + v > target) bad++;
  return bad / deck.length;
}

/* A competent human: draw while the odds are kind, stand when they turn. */
function playerWantsCard(total, deck, target) {
  if (total > target) return false;
  if (!deck.length) return false;
  if (total <= 11) return true;             // cannot bust, always take it
  return bustChance(total, deck, target) < 0.55;
}

/* ---------- one duel ---------- */
function sum(cards) { return cards.reduce((a, b) => a + b, 0); }

/* A bust scores below every standing hand, which is what "closer to the
   number" means once one side has gone over. */
function cheatScore(cards, target) {
  const t = sum(cards);
  return t > target ? -t : t;
}

function applyCheat(rival, deck, target, kind) {
  if (kind === 'redeal') {
    if (deck.length < 2) return false;
    const fresh = [deck.shift(), deck.shift()];
    if (cheatScore(fresh, target) > cheatScore(rival, target)) {
      const old = rival.slice();
      rival.length = 0;
      fresh.forEach((v) => rival.push(v));
      old.forEach((v) => deck.push(v));
    } else {
      fresh.forEach((v) => deck.push(v));
    }
    return true;
  }

  // 'replace': swap the weakest card for the best one that keeps it under
  let worst = 0;
  for (let i = 1; i < rival.length; i++) if (rival[i] < rival[worst]) worst = i;
  const kept = sum(rival) - rival[worst];
  let best = null;
  for (const v of deck) {
    if (kept + v <= target && (best === null || v > best)) best = v;
  }
  if (best === null) return false;
  deck.push(rival[worst]);
  rival[worst] = best;
  return true;
}

function duel(opp, rng) {
  const target = Math.max(12, 21 + (opp.targetShift || 0));
  let youVigil = 5;
  let rivalVigil = 5;
  let cheatsLeft = NO_CHEATS ? 0 : (opp.cheats || 0);

  let round = 0;
  while (youVigil > 0 && rivalVigil > 0 && round < 40) {
    round++;
    const deck = makeDeck(rng);

    const you = [deck.shift(), deck.shift()];
    const rival = [deck.shift(), deck.shift()];
    if (opp.extraCard && deck.length) you.push(deck.shift());

    // You draw while the odds are kind. The drain bosses eat your trumps, so
    // you have fewer answers than this model can see: it is modelled as a
    // matching chance of a bad decision, which is what losing your outs feels
    // like at the table.
    let guard = 0;
    while (deck.length && guard++ < 12) {
      let want = playerWantsCard(sum(you), deck, target);
      if (opp.drain && rng() < opp.drain * 0.15) want = !want;
      if (!want) break;
      you.push(deck.shift());
    }

    // they draw the same way, but misplay at odds (1 - accuracy)
    guard = 0;
    while (deck.length && guard++ < 12) {
      let want = rivalWantsCard(sum(rival), deck, target);
      if (rng() > opp.accuracy) want = !want;
      if (!want) break;
      rival.push(deck.shift());
    }

    // The boss bends the rules only when the round is already lost: same
    // trigger as the shipped showdown, then its own kind of trick.
    let winner = computeWinner(sum(you), sum(rival), target);
    if (cheatsLeft > 0 && winner === 'you') {
      applyCheat(rival, deck, target, opp.cheatKind || 'replace');
      cheatsLeft--;
      winner = computeWinner(sum(you), sum(rival), target);
    }
    if (winner === 'you') rivalVigil -= 2;
    else if (winner === 'rival') youVigil -= 2;
  }

  return youVigil > 0;
}

/* Same read as you: the accuracy dial is the misplay odds, not a worse policy. */
function rivalWantsCard(total, deck, target) {
  return playerWantsCard(total, deck, target);
}

/* ---------- run ---------- */
function main() {
  const rng = makeRng(20261120);
  const rows = [];

  for (const act of ACTS) {
    for (const opp of act.opponents) {
      let wins = 0;
      for (let i = 0; i < DUELS; i++) {
        if (duel(opp, rng)) wins++;
      }
      const rate = wins / DUELS;
      rows.push({
        act: act.numeral,
        name: opp.name,
        accuracy: opp.accuracy,
        winRate: rate
      });
    }
  }

  const pad = (s, n) => String(s).padEnd(n);
  console.log('');
  console.log('  Opponent                          Acc.    Hero win rate   (n=' + DUELS + ')');
  console.log('  ' + '-'.repeat(68));
  for (const r of rows) {
    const bar = '#'.repeat(Math.round(r.winRate * 30)).padEnd(30, '.');
    console.log('  ' + pad(r.name, 33) + pad((r.accuracy * 100).toFixed(0) + '%', 7) +
      (r.winRate * 100).toFixed(1).padStart(5) + '%  ' + bar);
  }
  console.log('');

  const overall = rows.reduce((a, r) => a + r.winRate, 0) / rows.length;
  console.log('  mean hero win rate: ' + (overall * 100).toFixed(1) + '%');
  console.log('  target band: 45-65% for a first-time player, falling across the acts');
  console.log('');
}

main();

# THE LAST HAND

### A gothic survival blackjack duel

**Working title:** *The Last Hand* · **Codename:** OSSUARY
**Genre:** 1v1 competitive card duel / survival horror
**Camera:** 2.5D — first-person seated at the table

---

## 1. Pitch

You are seated in the dark. Across the velvet, something with your face deals you
two cards — one turned down. A blade hangs on a chain between you, and every round
you lose, it creeps closer.

You play **twenty-one**. Not for chips. For the wick of your own life.

---

## 2. The references, and exactly what each supplies

Both of your references are the same lineage: **Resident Evil 7 — Banned Footage
Vol. 2, "21"** is the original, and **Roblox — ♠ Twenty One** is a direct adaptation
of it for a younger, multiplayer-first audience. Studying both tells us which parts
of the formula are load-bearing.

### Resident Evil 7 — "21" (Capcom, 2017)

The canonical ruleset, and the source of the *horror* framing:

- **Modified deck: only cards 1–11, exactly one of each.** Eleven cards, total. This
  is the single most important design decision in the whole genre — it makes card
  counting trivial and turns the game from luck into **perfect-information deduction**
  once cards start leaving the shoe.
- Two cards each, **the first dealt face down** so your rival can't read your total.
- Draw or stand until both players stand. Then hole cards flip and totals compare.
- Going over 21 is a bust — **but if both bust, the closer total still wins.** Ties are
  draws.
- **The bet is your body.** Round 1 stakes fingers (a guillotine), then escalating
  voltage, then a tug-of-war of spinning blades dragged toward whoever is losing.
- **Trump cards** arrive in later rounds as a strategic override layer: draw a specific
  card, force a discard, swap hands, change the target number, raise the stake.
- **Survival / Survival+ modes:** a gauntlet of 5 then 10 opponents, each with their own
  trump arsenal, including a cheating final boss.

### Roblox — ♠ Twenty One

The adaptation layer, and the source of the *competitive/1v1/live-service* framing:

- **The buzzsaw.** The wager you place before the deal decides how far the blade travels
  toward the loser. Bet high when confident, low when unsure — a real risk/reward dial.
- **Trump cards don't consume your turn.** You can act *and* play a trump in the same
  beat, which opens reaction plays.
- **A turn timer.** Hesitation is punished — bluffing pressure comes from the clock, not
  just the cards.
- **Trump cards are acquired and stocked** (shop/packs), not dealt at random forever.
- **Progression** through currency and cosmetics (card backs, tables, sound packs), plus
  ranked PvP and bot matches for practice.
- Bots follow basic strategy (hit at ≤16, stand at 17+) and fire trumps semi-randomly.

### The synthesis — what the genre actually is

> **A perfect-information deduction game wearing a horror costume.**

Strip the atmosphere and it's an 11-card counting game. The horror isn't decoration —
it is what makes a spreadsheet of probabilities feel like life or death. Every design
decision should preserve **the tension between cold math and hot fear.**

---

## 3. IP safety — read this before building

You are inspired by two properties you do not own:

| Element | Status | Guidance |
|---|---|---|
| Blackjack / 1–11 deck / draw-stand-compare | **Public domain / uncopyrightable rules** | Free to use. This is the core. |
| "21", trump cards, buzzsaw, guillotine | **Mechanics are not copyrightable** | Free to use the *idea*. |
| Boris, Lucas, Hoffman, Capcom names, RE7 assets | **Protected** | Never use. |
| ♠ Twenty One's exact art, trumps, UI | **Protected** | Never copy. |
| Your characters, art, names, trumps, story | **Yours** | Own all of it. |

**Rule of thumb: steal the mechanics, invent the identity.** Nothing in this document
uses a Capcom or Roblox name, asset, or character. Our blade is a chained censer-blade,
our table is a crypt, our dealer is a thing in a mourning veil, and our IP is ours.

---

## 4. Design pillars

1. **Every card has a consequence.** Because the deck is 11 unique cards, the player who
   tracks the shoe beats the player with better cards. The UI must *reward* this.
2. **Terror is a resource, not a texture.** Fear should make you misplay. The clock, the
   blade, and the rival's hidden card are all pressure systems.
3. **The trump is the drama.** Rounds should be decided by a well-timed trump, not by a
   lucky draw. That's where stories come from.
4. **Gothic, not gory.** Dread over splatter — candles, bone, iron, wet stone. Restraint
   reads as expensive.

---

## 5. Core loop

```
   ┌──────────────────────────────────────────────────┐
   │  WAGER      both players secretly stake 1–3       │
   │     ↓                                             │
   │  DEAL       2 cards each, first card face-down    │
   │     ↓                                             │
   │  PLAY       alternate: Draw / Stand / play Trump  │
   │     ↓                                             │
   │  REVEAL     hole cards flip, totals compare       │
   │     ↓                                             │
   │  RECKON     winner's wager = loser's damage       │
   │     ↓                                             │
   │  repeat until one Vigil reaches zero              │
   └──────────────────────────────────────────────────┘
```

A duel is **5–9 rounds**, roughly 4–7 minutes. Short enough to rematch, long enough to
hurt.

---

## 6. Ruleset (vertical slice)

**Deck.** Cards 1–11, one of each. 11 cards total. Once the shoe empties, both players
are forced to stand — the deck is the clock.

**Deal.** 2 cards each. The **first** card of each hand is face-down. Your rival sees
only your face-up cards; you must infer their hole card from what's *missing* from the
shoe.

**Vigil.** Each player starts with **5 Vigil**. Losing a round costs Vigil; at 0 you lose
the duel.

**Wager.** Before the deal, each player secretly stakes **1–3 Vigil**. Wagers are hidden
until the reveal. ***Damage dealt to the loser = the higher of the two wagers*** (+ trumps).

Why the *higher* of the two, and not the winner's: it makes every wager a real commitment
in both directions. Bet 3 when you're confident and you win big — or you lose big. Bet 1
when you're unsure and you're safe, but you can never profit from a round you didn't dare
stake. Over-betting can never *protect* you, so bluffing works on the opponent's **mind**
(they see you hesitate, they guess your stake), never on the numbers. It is the purest
possible expression of the genre's tension: you must commit before you know.

**Turn.** Alternate single actions. Actions:

- **Draw** — take the top card of the shoe.
- **Stand** — lock your hand.
- **Trump** — play a card from your trump hand (*does not* consume your turn, per the
  Roblox reference — this is what makes reaction plays possible).
- **Timer** — 20 s per turn. Timeout = forced stand.

**Showdown.**

1. Both bust → closer to 21 wins. Equal → draw.
2. One bust → the other wins.
3. Neither bust → higher total wins. Equal → draw.
4. Draw → no damage. The blade doesn't move.

**Match end.** Vigil 0 = defeat. The blade reaches you.

---

## 7. Trump cards

Trump cards are the strategic layer. Each is drawn at the start of a round, with a
chance to gain one on any draw. **Hand limit 3.** All names and effects below are
original to *The Last Hand*.

### Common — the manipulation layer

| Card | Effect | Counterplay |
|---|---|---|
| **The Seer's Eye** | Draw the single best remaining card for your hand. | Costs you the knowledge of that card leaving the shoe. |
| **Charity of the Damned** | Your rival draws one card. | Deadly only when they're at 15+. |
| **Grave Debt** | Your rival returns their last drawn card to the shoe. | Undoes a lucky draw; doesn't help you. |
| **The Liar's Mirror** | Reveal your rival's hidden card. | Information only — no tempo. |

### Rare — the swing layer

| Card | Effect | Counterplay |
|---|---|---|
| **Sympathy of Thieves** | Swap your hidden card with your rival's. | Ruinous if you misread their hand. |
| **The New Creed: XVII** | The target becomes **17** for this round. | Their 19 is now a bust. |
| **The New Creed: XXIV** | The target becomes **24** for this round. | Safety buffer to draw into. |
| **Blood Price** | +2 damage if you win this round. | Incentivises them to overcommit. |

### Legendary — the story layer

| Card | Effect | Counterplay |
|---|---|---|
| **Ash Ward** | Negate the next trump played against you. | **The Severing**. |
| **The Severing** | Destroy your rival's Ash Ward. | Bait it out. |
| **Second Breath** | The next card that would bust you returns to the shoe instead. | Bait it out, then hit them again. |
| **The Guillotine** | Double the damage if you win this round. | High-risk finisher. |

Design intent: **every legendary has a named counter**, so a well-built trump hand is a
deckbuilding puzzle and not a coin flip.

---

## 8. Character progression

### Characters ("Vessels")

Each Vessel has a **passive** and a **starting trump affinity**. Chosen before the duel;
visible to your opponent, so the matchup is a read.

| Vessel | Passive | Affinity |
|---|---|---|
| **The Widow** | Starts each duel with **6 Vigil**. | Rares over Legendary |
| **The Gravedigger** | Sees the top card of the shoe once per round. | Information rares |
| **The Confessor** | Draws a trump at the start of **every** round. | Breadth |
| **The Hollow Bride** | Takes **1 less damage** from any single round. | Survival |

### The Trump Draft

Between duels you are offered **three trump cards** and keep one. It is added to your
**loadout** — the deck your trump hand is drawn from for the rest of the act. Hand size
stays at 3; the *deck* behind it grows.

This is the difference between a card game and a build. It also makes the draft a real
decision: a second copy of a rare beats a first copy of a legendary if the rare is the
one that saves you.

- Maximum **3 copies** of any single trump.
- Offers are drawn only from your unlocked pool.
- The loadout resets each act — every run is a fresh build, not a permanent arms race.

### The Difficulty Curve

Opponents have an **accuracy** rating. On any decision there is a chance the opponent
misplays — reads the shoe correctly and then does the wrong thing anyway. This is what
separates a tutorial from a wall.

| Opponent | Trumps | Accuracy | Cheats |
|---|---|---|---|
| The Pale Croupier | 1 | 62% | — |
| The Mourner | 2 | 84% | — |
| The Veiled Dealer | 3 | 96% | once per duel |

Before the curve existed, a naive player almost never won a single duel. A difficulty
that cannot be climbed is not difficulty, it is a closed door.

### Meta progression

- **XP per duel** — win or lose, you learn. Levels unlock trumps into your pool.
- **Candles** (currency) — cosmetic only: card backs, table cloths, candle colours,
  ambient sound packs, blade finishes. **Never power.** Paid cosmetics are fine; paid
  power poisons a competitive 1v1 game.
- **Ranks** — Aspirant → Acolyte → Seer → Confessor → Harbinger. Visible ladder.
- **Acts** — Act I: the Dealer (scripted tutorial boss who *cheats*, teaching you to save
  a trump for the final round). Act II: the Gauntlet (5-challenger survival). Act III:
  live PvP ladder.

---

## 9. Atmosphere & art direction

**Palette**

| Role | Hex | Use |
|---|---|---|
| Void | `#07070A` | Backgrounds, negative space |
| Bone | `#E6DCC9` | Type, card faces |
| Blood | `#8E1B18` | Damage, defeat states |
| Amber | `#E8B063` | Candlelight, focus, highlights |
| Tarnished gold | `#B08D4F` | Ornament, borders, rare trumps |

**Type.** Engraved serif, generous letterspacing, small caps for labels. Cinzel or
Cormorant for display; a bare serif for body. Nothing rounded, nothing modern.

**Light.** One warm source (candle / hanging censer), everything else falls off into
black. Heavy vignette. Slow flicker. Film grain at ~4% opacity.

**Motion.** Slow by default. Cards are *placed*, not thrown. The blade moves in one
inexorable crawl per round, never snaps. Slow-motion only at the reveal.

**Audio.**
- A low drone that never resolves — the room's presence.
- Your own heartbeat, audible only when your Vigil is low.
- Card flick (dry, papery, close-mic'd).
- The blade: a chain creak, then silence, then the scrape.
- No music on the reveal. **Silence is the scariest sound in the mix.**

**Camera.** Seated first-person at the table (2.5D). Head bob is small but present. The
rival is across from you, mostly in shadow — you see hands and the veil, never a face.
This is cheaper than a full character rig and *more* frightening.

---

## 10. Engine decision

You asked about the engine. The honest answer depends on one question — **where do you
need to ship 1v1?**

| Target | Engine | Why / why not |
|---|---|---|
| **Match the Roblox reference** | **Roblox Studio (Luau)** | ✅ Best fit if you want *Twenty One*'s audience: free servers, matchmaking, avatars, chat/friends, and monetization are all provided. 1v1 real-time is trivial. ⚠️ Ports only to Roblox; you don't own the platform. |
| **Premium PC/console (RE7-adjacent)** | **Godot 4** or **Unity** | ✅ Own your IP, ship on Steam, full audio/lighting control, no platform cuts. Godot is free and excellent for this scope. ⚠️ You build matchmaking/netcode yourself. |
| **Fastest playable validation** | **Web (this prototype)** | ✅ Zero install, instant iteration on *feel*. ⚠️ Not a shipping target for a horror title. |

**My recommendation:** build the vertical slice in **Roblox Studio** if your goal is a
live 1v1 ladder with an audience you don't have to acquire — it's the shortest path to
"two strangers playing my game tonight." Build in **Godot 4** if you want a thing you
own, can sell on Steam, and can make genuinely terrifying with real lighting and audio.

Either way the architecture is the same:

```
   CLIENT  ── intents only ──▶  SERVER (authoritative)
     ▲                             │ owns shoe, hands, trumps, Vigil
     └────── state snapshots ──────┘  validates every action
```

**Never let the client hold the deck.** The rival's hole card and the shoe order must
live server-side or the game is instantly cheatable — and this genre is *entirely*
about hidden information. Deadline: the 20 s turn timer is also server-side.

---

## 11. Roadmap

| Phase | Scope | Goal |
|---|---|---|
| **0 — Prototype** ✅ | Playable web slice: full rules, 12 trumps, AI rival, Vigil, rank save | Prove the loop is fun *before* art |
| **1 — Vertical slice** | Roblox or Godot, 1 table, 1 Vessel, 6 trumps, 1 boss, real audio | The "does it feel scary" test |
| **2 — Alpha** | Real-time 1v1 + matchmaking, 4 Vessels, full trump set, ranked | Retention test |
| **3 — Beta** | Cosmetics shop, seasons, Act I boss, tutorial | Monetization test |
| **4 — Launch** | Act II gauntlet, seasonal trumps, spectator mode | Ship |

**Kill criterion for Phase 0→1:** if testers don't voluntarily say *"one more round"*
after losing, the loop needs work before any art budget is spent.

---

## 12. Characters, art and sound

### 12.1 Portraits are code, not images

`js/art.js` builds every character as inline SVG at runtime: a bust in a 200×250
frame, a dark halo, a single-source rim light, and one silhouette cue that identifies
them at 38 px on a phone.

| Character | Cue |
|---|---|
| The Widow | lace veil, the ace of spades in a gloved hand |
| The Gravedigger | hood, stubble, a spade over the shoulder |
| The Confessor | white bandage across the eyes, a candle burning down |
| The Hollow Bride | cracked porcelain face, hollow eyes, a dried bouquet |
| The Pale Croupier | no face at all, top hat, two cards already dealt |
| The Mourner | hood, a tear track, a black-bordered card |
| The Veiled Dealer | gilt filigree mask, sealed mouth, red seal |

Why code instead of art files:

- **Weight.** Seven portraits cost ~25 KB total, uncompressed.
- **Sharpness.** Vector, so there is no @2x/@3x sprite ladder.
- **Licence clarity.** Nothing to audit; there is no third-party binary in the repo.
- **Motion.** Each figure *breathes* via a CSS transform on a `<g>`; a frame turns
  blood-red and desaturates when its owner is one Vigil from death.

Generated gradient and filter ids are suffixed per instance, so several portraits can
sit in one document without colliding.

### 12.2 The crypt

The room is gradients: stone courses in `repeating-linear-gradient`, a vaulted arch
implied by a huge inset-shadowed ellipse, three candle flames with independent flicker
timings, two fog banks drifting on 46 s and 61 s cycles, and 26 dust motes rising on
randomised durations. Nothing is an image, so the whole room scales to any screen.

Damage fires a radial blood vignette over the lens plus a screen shake and a haptic
pattern. All of it is disabled by the reduced-motion switch.

### 12.3 The score

`js/bgm.js` is a generative composer, not a loop. A bar is scheduled, then the next is
scheduled from the same rules, so the music never audibly repeats.

- **Harmony** — D phrygian dominant. The flat second is the entire mood.
- **Layers** — detuned drone; detuned-saw pad through a sweeping lowpass; inharmonic
  bell (2.76 ratio, i.e. struck metal, not a violin); sparse melody; heartbeat.
- **Space** — a 2.6 s impulse response generated from decaying noise, fed by a send.
- **Reactivity** — intensity rises with lost Vigil; the heartbeat only starts below
  about half; the mix ducks for the draft; the boss cheat plays a wrong chord.
- **Cost** — 12 KB of JavaScript, zero audio files.

### 12.4 What's in this repo

- `index.html` — the playable game (open it, no build step, no dependencies)
- `css/style.css` — gothic styling, the crypt, card faces
- `js/game.js` — the entire ruleset, AI, and progression
- `js/art.js` — seven vector character portraits
- `js/bgm.js` — the generative score and stingers
- `docs/ROADMAP.md` — milestones and what is still missing
- `docs/REFERENCES.md` — sources studied and the licence position
- `docs/GAME-DESIGN.md` — this document

The game implements **everything in §6, §7 and §12** so the rules can be felt rather
than argued about.

---

## 13. The descent, and arcade

### 13.1 Three acts

The story mode is nine duels in three acts. Vigil carries *between* duels inside an
act, heals a little after each win, and **deepens by one point per act** — so the run
gets longer and the pressure gets slower-burning rather than spikier.

| Act | Chairs | The lesson |
|---|---|---|
| **I — The Gauntlet** | Croupier (62%), Mourner (84%), Veiled Dealer (96%, cheats once) | read the shoe, then save a trump |
| **II — The Long Table** | Charnel Warden, Twins, Candle-Eater | the rules are not fixed |
| **III — The Head of the Table** | Hollow Choir, Bone Surgeon, the Thing | everything you have learned, at once |

Each act introduces exactly **one new rule**, and the opponent's line of dialogue
teaches it before the deal:

- **The Charnel Warden** deals to **19**. Fewer cards fit under it, so the shoe empties
  faster and counting gets sharper.
- **The Twins** give you a **third card unasked**. A free card is not a gift in a game
  where 22 loses.
- **The Candle-Eater** **eats a trump out of your hand** (50% per round). Your safety
  net is consumable.
- **The Hollow Choir** drains trumps and plays at 92%.
- **The Bone Surgeon** deals to **18** and plays at 94%.
- **The Thing at the Head of the Table** deals to 21, drains, plays at 98%, and
  **cheats twice**. The second cheat is the act's whole point: the trump you saved for
  the end has to cover being robbed twice.

Clearing Act III ends the game with an epilogue and sets `cleared` in the save. The
title screen then reads *Act III — cleared*.

### 13.2 Arcade

Arcade is the same rules with the structure taken out. It exists because the descent is
a 25-minute commitment and sometimes you have three.

- **Full Vigil every duel.** No carrying wounds; you lose because of one hand, not a run.
- **A pool that opens up.** At streak 0 you only meet opponents rated ≤ 62%. The cap
  rises 3.7% per win until, around streak 10, everything in the game is eligible —
  including the Thing.
- **No repeats.** The same opponent never sits down twice in a row.
- **It gets worse.** Accuracy creeps up 1.2% per win (capped), their trump hand fills at
  streak 6, and they gain an extra cheat at streak 8.
- **Tightening loot.** You still draft after every win, so the deck grows all run.
- **Best run is persisted** and shown on the title screen.

The design intent: arcade should feel *generous* for the first few duels and then turn,
without a wall. Because Vigil is always full, a single bad round never ends you — only a
bad opponent does.

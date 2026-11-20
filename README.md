# The Last Hand

A gothic survival duel of twenty-one. **Runs fully offline** — no server, no network,
no accounts.

> Eleven cards. One of each, numbered one to eleven. You and the thing across the table
> are dealt two apiece — the first turned face down. Get closest to twenty-one without
> passing it. Bet what you're willing to lose, and lose Vigil when you're wrong.
> Five Vigil is all you have.

---

## Three ways to play

| | How | Notes |
|---|---|---|
| **Browser** | open `index.html` | Works from the filesystem. No build step. |
| **Installable app (PWA)** | serve the folder, then *Add to Home Screen* | Installs like a native app, works offline via service worker |
| **Android APK** | see below | Real installable `.apk`, built by GitHub Actions |

```bash
python3 -m http.server 8000     # or: npm run serve
```

## Download the Android APK

**[⬇ The Last Hand v3.8.0 — Android APK](https://github.com/kage049754/Blackjack-/releases/download/v3.8.0/TheLastHand-v3.8.0.apk)**

- 9 250 991 bytes (8.9 MB) · `sha256 39154fea…9ec2` · `com.lasthand.game` · minSdk 23 (Android 6.0+) · targetSdk 35
- Debug-signed, so it sideloads onto any device. Enable
  *Install unknown apps* for your file manager, then tap the file.
- **Works in airplane mode.** The whole game is inside the APK.

**v3.8.0 — twenty trumps, and eight new ways to cheat death.**

M3's target was a full trump set; the deck now holds twenty. The eight new cards
each do something the old twelve did not:

- **Read the room** — The Counting House names the three highest cards left in the
  shoe. The Grave Robber takes the top card, whatever it is: certainty costs less
  than choice.
- **Change the terms** — The Toll takes a Vigil from your rival (it cannot kill);
  The Long Dark cuts their wager to a single flame, so the round is cheap; The
  Empty Chair makes them stand before they have decided.
- **Survive** — Borrowed Time gives a Vigil back, never past your maximum. The Vigil
  Bell halves the next damage you take in the duel, and says the arithmetic out loud
  when it rings.
- **Cut both ways** — The Ferryman's Cut returns the last card of *both* hands to the
  shoe. It saves you from a bust you have not made yet, and takes away the card that
  was about to win it.

Drafting is gated by duels won, as before: five cards at the first chair, seven more
at two wins, eight more at five. Every card in the game is reachable, and a test now
asserts that, because an unreachable trump is a card that does not exist.

**v3.7.0 — watch the hand that killed you.**

The defeat screen now offers **Watch it again**: the duel you just lost plays back on
the same table, round by round — your wagers, the cards as they lay, the moment the
dealer's sleeve moved, the totals that ended it. It is a recap of hands, not a
recording of your inputs: there is nothing to imitate, only something to see. Skip
takes you straight back. Works from the campaign and from arcade.

Under it, `tapeFrame()` records each hand as it resolves, so the replay cannot drift
from what actually happened — it is the same numbers the defeat lesson reads.

**v3.6.0 — the chairs have voices, and the table tells you why you died.**

- **Every boss speaks.** Four beats per chair — the deal, your bust, the hand you
  take, the hand they take — twenty-six lines written per opponent, fading in under
  their hand. The Croupier is bored, the Twins finish each other's sentences, the
  Thing at the Head of the Table is not talking to you.
- **The defeat screen teaches.** It names your total, theirs and the number, then
  says what you actually did: what standing would have won, how many cards left in
  the shoe would have carried you, or that the hand was lost when it was dealt. It
  no longer claims you "did not go far enough" when they had already stopped on 21.
- **A second kind of cheat.** The Charnel Warden now takes its whole hand off the
  table and deals itself another — the only trick in the game that can come out
  worse than the hand it threw away, and the only one with its own animation.
- **The cheat trigger was wrong in the harness, not the game.** `balance.js` modelled
  the boss cheating when it *busted*; the game has it cheat when it is *losing*.
  Fixing the model showed the documented v3.4 numbers were flattering: the Thing
  measured 42.8% there and 22.3% in reality. Accuracy was re-tuned against the
  shipped rule until the curve held (mean 52.9%, final chair 32.0%).

**v3.5.0 — a crypt you can furnish.**

Candles you earn buy visible things: three card backs (classic, bone, blood) and
three table cloths (crypt, ash, wine). Bought once, kept forever, re-equipped free —
the purchase is written to the save and re-applied at boot, so the table you left is
the table you return to. Cosmetics are never paid power: nothing here changes a card,
a wager, or a Vigil. The hidden hole card wears your back the moment it is dealt.

**v3.4.0 — difficulty tuned from data, not judgement.**

`scripts/balance.js` (`npm run balance`) replays hundreds of duels per opponent
against the real ruleset. The first run found a real pacing fault: Act II opened
*easier* than Act I closed. Accuracy was re-tuned twice against the table; each act
now opens with a breather and descends. Mean hero win rate 58.7%, final boss 42.8%.

**v3.3.0 added a local record.**

- **Statistics on the title screen** — hands played, bust rate, best hand, trumps
  played. Counted at the showdown, saved immediately, and **never transmitted**:
  there is no server to send them to, which is the point.

**v3.2.0 finished the feel pass and added the modes.**

- **Difficulty** — Casual / Standard / Nightmare. Vigil, AI accuracy and cheat
  charges all move; the rules never do, so skill transfers.
- **Daily Run** — a seeded, deterministic shoe. Everyone who sits down today plays
  the same cards. No server: the date is the seed. Today's best streak is shown on
  the title screen.
- **The cheat is now a moment.** When the Veiled Dealer (or the Thing) plays dirty,
  the room desaturates and blurs, the score drops to a whisper, a veil covers the
  table, and the phone holds a haptic. It reads as a betrayal, not a rule.
- **Candlelight answers your Vigil.** Lose Vigil and the candles dim; at death the
  room is nearly dark.
- **Damage cues no longer rely on colour** — a numeral badge with a hatch pattern,
  and `BUST` / `EXACT` spelled out under the hand.

**v3.1.0 added a recorded score and a 3D character stage.**

- **The score is now baked, not synthesised live.** `scripts/render-score.js`
  composes and renders three loops offline — bowed strings, a formant choir, pipe
  organ, harp, timpani and inhomonic bells through a Schroeder reverb — then encodes
  them to MP3. 5.5 minutes of music, 3.7 MB, built from source, reproducible.
  The live synth from v2.0 is still there as the fallback and for one-off stingers.
- **Each track routes through a lowpass that opens as you lose Vigil** — the score
  muffles when you are calm and brightens as the blade closes.
- **A 3D character stage** (`js/models3d.js`): a dependency-free software renderer
  with real geometry, model-space normals, four lights, back-face culling and depth
  sorting. Thirteen busts built from spheres, cones and boxes.
  It ships **off by default** — at 58x72 px the vector portraits read better — and
  the toggle is in the top bar (`Portraits: 2D / 3D`). Both are real; judge for
  yourself.

**v3.0.0 was the finished game.**

- **Three acts, nine opponents.** Act I is a gauntlet; Act II is the long table; Act III
  is the head of the table, where the last thing at it has two cheats and no patience.
  Your Vigil deepens one point per act; the descent ends with an epilogue, not a menu.
- **New mechanics, one per act.** The Charnel Warden deals to **19** instead of 21. The
  Twins deal you a **third card unasked**. The Candle-Eater **eats a trump out of your
  hand**. The Bone Surgeon deals to **18**. The Hollow Choir drains and reads you.
- **Six new characters**, all drawn in code: the Charnel Warden, the Twins, the
  Candle-Eater, the Hollow Choir, the Bone Surgeon, and the Thing at the Head of the Table.
- **Arcade mode.** No acts, no continues: one hand after another, full Vigil every duel,
  opponents unlocked gradually as your streak climbs, accuracy creeping up the longer you
  last. Best run is saved. It is the mode for playing on a bus.

**v2.0.0 added: characters, art and a full score.**

- **Seven characters, drawn in code.** Every Vessel and every opponent has a
  hand-built vector portrait — veil, bandage, top hat, porcelain cracks — with rim
  lighting, breathing motion, and a frame that turns red when they are dying.
  No image files, no licences, ~3.5 KB each.
- **A generative score** (`js/bgm.js`). Five synth layers — a detuned drone, a
  filtered pad, inharmonic bells, a sparse melody in D phrygian dominant, and a
  heartbeat that only starts when your Vigil is low. It never loops, because it is
  composed bar by bar. It ducks for the draft and stops dead on a killing blow.
- **Twelve sound effects** synthesised at runtime: cards leaving the shoe, cards
  turning, chips, the crypt bell on a death, and a deliberately *wrong* chord when
  the Veiled Dealer cheats.
- **The crypt.** Stone walls, a vaulted arch, three living candle flames, drifting
  fog, and 26 dust motes rising through the light.
- **Blood on the lens** when you take damage, plus screen shake and haptics.
- **Music toggle**, persisted. Reduced-motion silences the dust, fog and flames.

**v1.2.0 added:** **trump drafting** — after each won duel, pick 1 of 3 cards and build
the deck your trump hand draws from. Plus a **difficulty curve** (opponents now misplay
at different rates), **haptics**, a **reduced-motion** mode, save migration, and a loss
screen that tells you what went wrong.

**v1.1.0 added:** four playable **Vessels**, a three-opponent **Act I gauntlet**
(Vigil carries between duels), a **boss that cheats**, candles and rank progression,
and a title screen.

All releases: <https://github.com/kage049754/Blackjack-/releases>

## Building the Android APK

The `android/` folder is a complete **Capacitor 7** project (package
`com.lasthand.game`, minSdk 23, targetSdk 35).

### Option A — let GitHub build it (no Android Studio needed)

Every push triggers `.github/workflows/android.yml`, which assembles a debug APK in
the cloud:

1. Open the **Actions** tab → **Build Android APK** → latest run
2. Download the **`the-last-hand-apk`** artifact
3. Unzip it, copy the `.apk` to your phone, tap to install
   (you'll need *Install unknown apps* enabled for your file manager)

Push a tag to get a permanent download link:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

The APK is then attached to a **GitHub Release**.

### Option B — build locally

Requires JDK 17+ and the Android SDK.

```bash
npm install
npm run sync          # builds www/ + npx cap sync android
npm run apk:debug     # → android/app/build/outputs/apk/debug/app-debug.apk
```

Then install it:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Load it onto a phone with `adb`, or just copy the file across and tap it.

### Why not a release APK?

A debug APK installs on any device and is signed with a debug key — fine for testing
and sideloading. For the Play Store you need a **release** build signed with your own
keystore:

```bash
keytool -genkey -v -keystore last-hand.keystore -alias lasthand \
        -keyalg RSA -keysize 2048 -validity 10000
npm run apk:release
```

Keep that keystore safe and out of git. You cannot update an app on Play with a
different key.

## Offline guarantees

This is enforced, not promised:

- **Self-hosted fonts.** Cinzel + Cormorant Garamond (SIL OFL) live in `assets/fonts/`
  as woff2. No Google Fonts CDN.
- **Zero external references.** `scripts/build-www.js` greps the whole bundle for any
  `http(s)://` URL and **fails the build** if it finds one.
- **Service worker** (`sw.js`) precaches all 16 runtime files, cache-first.
- **Precache manifest is validated** against the filesystem at build time.
- The APK bundles everything in `assets/public/` — it works in airplane mode.

Total bundle: **~426 KB**.

## Play

| Input | Action |
|---|---|
| Choose a **Vessel** on the title screen | Your character and passive |
| Tap **Wager 1/2/3** (keys `1` `2` `3`) | Stake Vigil before the deal |
| Tap **Draw** or `D` | Take a card |
| Tap **Stand** or `S` | Lock your hand |
| Tap any **Trump** | Play it — trumps do **not** consume your turn |
| **Sound** button | Toggle procedural audio (synthesised, no asset files) |
| **Motion** button | Reduced-motion mode (also follows your OS setting) |

Turns are 20 seconds. Time out and you're forced to stand.

## Vessels

| Vessel | Passive | Unlock |
|---|---|---|
| **The Widow** | Begins with **six** Vigil instead of five | start |
| **The Gravedigger** | Always sees the **next card** in the shoe | 2 wins |
| **The Confessor** | Draws a **second trump** every round | 5 wins |
| **The Hollow Bride** | Takes **one less** Vigil of damage each round | 8 wins |

## The Trump Draft

Win a duel and you are offered **three trumps**; keep one. It joins your **loadout** —
the deck your trump hand is drawn from for the rest of the act. Max 3 copies of any card.

This is the difference between playing a card game and building one. A second copy of a
rare usually beats a first copy of a legendary.

## Act I — The Gauntlet

Three opponents in sequence, and **your Vigil carries between them** — you only heal 2
after a win. Each opponent misplays at a different rate, from the Croupier's 62% to the
Dealer's 96%. The Pale Croupier, then The Mourner, then **The Veiled Dealer**, who cheats
exactly once per duel, and only when it is about to lose. That is the act's teaching
moment: save a trump for the end.

## What's implemented

- ✅ Full ruleset — 1–11 unique deck, hidden hole cards, draw/stand, bust, draw, both-bust
- ✅ **Vigil** life system and secret wagering (damage = higher of the two stakes)
- ✅ **12 trump cards** across three rarities, every legendary with a named counter
- ✅ AI rival — reads the shoe, computes bust probability, plays trumps by heuristic
- ✅ Mid-round target changes (*The New Creed*) and rescue effects (*Second Breath*)
- ✅ 20 s turn clock, paused when the app is backgrounded
- ✅ **Shoe tracker** — the deduction layer made visible
- ✅ Progression — rank from duels won, trump pool unlocked by rank, saved to localStorage
- ✅ Procedural audio — drone, heartbeat, card flick. Zero asset files.
- ✅ Mobile hardening — safe-area insets, 44 px tap targets, no hover stick, no scroll
- ✅ **4 Vessels** with passives, unlocked by progression
- ✅ **Act I gauntlet** with a cheating boss and Vigil carried between duels
- ✅ **Trump drafting** — build your own trump deck between duels
- ✅ **Difficulty curve** — opponents have an accuracy rating and misplay accordingly
- ✅ **Haptics** on damage (Android), **reduced-motion** mode, save migration
- ✅ **38 automated tests** (`npm test`) — ruleset, both-bust rule, draft maths, content integrity

## Not built yet

See **`docs/ROADMAP.md`** for the full plan. In short:

- Real 1v1 multiplayer (needs an authoritative server — Milestone 4)
- Act II survival, endless gauntlet, trump deck-building
- Real art and recorded sound
- Release signing for the Play Store

## Project layout

```
index.html                 the game (authored at root, runs in a browser)
css/style.css              gothic styling + self-hosted @font-face + mobile rules
js/game.js                 rules, trumps, AI, progression, service-worker registration
manifest.webmanifest       PWA manifest
sw.js                      offline service worker
assets/fonts/              Cinzel + Cormorant Garamond (SIL OFL 1.1)
assets/icons/              generated icons
docs/GAME-DESIGN.md        full design document
docs/ROADMAP.md            master roadmap: milestones, backlog, risks, timeline
docs/REFERENCES.md         design references, code references, CC0 asset sources
scripts/make_icons.py      regenerates every icon and splash screen
scripts/build-www.js       assembles + verifies the offline bundle
tests/rules.test.js        38 ruleset + draft + content tests (npm test)
capacitor.config.json      Capacitor config (appId com.lasthand.game)
android/                   complete Android Studio / Gradle project
.github/workflows/         cloud APK build
```

## Regenerating art

```bash
pip install pillow
python3 scripts/make_icons.py    # icons + Android launcher + splash screens
```

Everything is drawn procedurally from `scripts/make_icons.py` — there is no binary art
committed that you can't reproduce.

## Docs

| Document | What's in it |
|---|---|
| [`docs/GAME-DESIGN.md`](docs/GAME-DESIGN.md) | Pillars, ruleset, trump table, art direction, engine rationale |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestones M0–M6, dependency-ordered backlog, risks, timeline |
| [`docs/REFERENCES.md`](docs/REFERENCES.md) | What we studied, what we may legally ship, CC0 asset sources |

## Testing

```bash
npm test               # 38 ruleset, draft + content assertions
npm run verify         # tests + offline bundle check + Android resource check
```

## IP

All mechanics are drawn from uncopyrightable game rules. All names, characters, art,
and text are original to this project. No Capcom or Roblox assets, names, or characters
are used anywhere.

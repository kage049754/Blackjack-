# The Last Hand — Master Roadmap

Start to finish: from the shipped prototype to a released product.

**Status: v2.0.0 — Act I with drafting, seven vector characters, a generative score,
full sound design, offline APK shipping.**
Target: **v2.0 — Steam + Android release** with real-time PvP.

---

## 0. North star

> **A 90-second loop you cannot stop playing, dressed in dread.**

Three constraints that every decision must survive:

1. **Offline-first.** The game must be fully playable with no server, no account, no
   network. Multiplayer is an *addition*, never a dependency.
2. **Rules are free to run on a phone.** It must be learnable in one round and
   lose-able in three.
3. **Licence-clean by construction.** No third-party binary art. Every visual is
   generated from source in this repo or commissioned with a signed assignment.

### Success metric

A first-time player, on their own, plays **three duels in a row** — and after losing,
taps *again* without being asked. If that fails, no amount of art fixes it.

---

## 1. Where we are today (v1.1.0)

Shipped and verified:

| Area | State |
|---|---|
| **Ruleset** | Full. 11-card deck, hidden hole cards, both-bust resolution, draws, mid-round target changes |
| **Vigil** | 5–6 life, secret wagering, damage = higher stake |
| **Trumps** | 12 cards, 3 rarities, every legendary has a named counter |
| **AI** | Reads the shoe, computes live bust probability, plays trumps on heuristics |
| **Act I** | 3-opponent gauntlet; Villain carries Vigil between duels; boss cheats once |
| **Vessels** | 4 playable characters with passives, unlocked by progression |
| **Progression** | Rank, candles, unlock gates — persisted to localStorage |
| **Offline** | Self-hosted fonts, service worker, zero external references (build-enforced) |
| **Platform** | Browser, installable PWA, **signed* Android APK via CI** |
| **Tests** | 28 ruleset + content-integrity assertions, run in CI |
| **Docs** | Game design, references, roadmap, README |

\* debug-signed. Release signing is a Phase 5 task.

---

## 2. Milestones

Each milestone has a **gate**. Do not start the next one until the gate passes.

### M0 — Prototype ✅ *done*
**Goal:** prove the loop is fun before spending on art.
**Gate:** testers voluntarily play a third duel after losing.

### M1 — Act I vertical slice ✅ *done (v1.1)*
**Goal:** one complete act with a beginning, a boss, and an ending.
**Delivered:** 4 Vessels, 3-opponent gauntlet, cheating boss, candles, title screen.
**Gate:** a full Act I run completes without a runtime error; the boss cheat reads as
*fair* (the player can explain why they lost).

### M2 — Feel pass 🔶 *in progress (v1.2 partial)*
**Goal:** make it *feel* like horror, not a web page with dark colours.
- ✅ Haptics on Android (`navigator.vibrate`, VIBRATE permission)
- ✅ Reduced-motion mode (OS default + in-game toggle)
- ✅ Blade lurch + shake on damage
- ✅ Card deal animation, staggered with a per-card sound
- ⬜ Boss cheat moment: deliberate slow-motion + sound dropout
- ⬜ Candle flicker tied to Vigil (more danger → less light)
- ⬜ Ambient loop with an unresolved fifth
- **Gate:** silent-playtesters describe the game as "tense" unprompted.

### M3 — Act II + progression depth *(~3 weeks)*
**Goal:** reasons to come back tomorrow.
- Act II: 5-challenger survival (RE7 "Survival" analogue)
- Act III: endless gauntlet with escalating stakes
- Full trump set (target 20 cards), trump *deck-building* between acts
- Cosmetics: card backs, table cloths, candle colours (candles currency)
- **Gate:** 40% of players who finish Act I start Act II.

### M4 — Real-time PvP *(~5 weeks)*
**Goal:** the thing the genre is actually for.
- Authoritative server (Node + WebSocket), **server owns the shoe**
- Matchmaking by rank, reconnect handling, 20 s turn clock server-side
- Remote opponent emotes only (no chat — moderation cost)
- **Gate:** two strangers complete a duel; cheat detection passes red-team.

### M5 — Release engineering *(~1 week)*
**Goal:** shippable artifacts.
- Release keystore + signed AAB for Play Store
- Steam build (Godot port or Electron wrapper — decide at M4 gate)
- Privacy policy, age rating, store copy, screenshots
- **Gate:** installable from a store listing on a clean device.

### M6 — Live *(ongoing)*
- Seasons, leaderboards, weekly curated trump sets
- Balance patches driven by win-rate telemetry
- **Gate:** D7 retention > 12%.

---

## 3. Dependency-ordered backlog

Size: **S** ≤ 1 day · **M** ≈ 2–3 days · **L** ≈ 1 week · **XL** > 1 week.

### P0 — must ship before any store release

| # | Task | Size | Notes |
|---|---|---|---|
| 1 | Release signing + AAB | S | Generate keystore now, store off-repo |
| 2 | ~~Save migration & corruption recovery~~ ✅ **shipped v1.2** | S | `SAVE_VERSION` + field sanitising |
| 3 | Accessibility: colour-blind safe damage cues | M | Never rely on red/green alone |
| 4 | ~~Reduce-motion setting~~ ✅ **shipped v1.2** | S | OS default + manual toggle |
| 5 | Pause/resume correctness on Android | S | Verify lifecycle on a real device |
| 6 | Crash-free session audit | M | Manual matrix across 5 Android versions |

### P1 — the "one more duel" work

| # | Task | Size | Notes |
|---|---|---|---|
| 7 | ~~Trump deck-building between acts~~ ✅ **shipped v1.2** | L | Turns a card game into a *build* |
| 8 | Boss personality: taunts, tempo | M | Text + timing, no art needed |
| 9 | Streak / daily seed | M | Deterministic seeded runs, offline-friendly |
| 10 | Loss screen that teaches | S | Show *why* you lost: the card you ignored |
| 11 | Difficulty modes | M | Affects AI aggression + trump count |
| 12 | Second boss with a different cheat | L | e.g. forces a re-deal |

### P2 — depth & longevity

| # | Task | Size |
|---|---|---|
| 13 | Act II survival mode | L |
| 14 | Endless gauntlet + leaderboard | L |
| 15 | Cosmetics shop (candles only, never paid power) | M |
| 16 | Local stat page (win rate, best hand, trumps used) | S |
| 17 | Spectator/replay of a lost duel | L |

### P3 — multiplayer

| # | Task | Size |
|---|---|---|
| 18 | Authoritative server + protocol | XL |
| 19 | Matchmaking + rank | L |
| 20 | Anti-cheat: server-side shoe, action validation | L |
| 21 | Reconnect / forfeit handling | M |

---

## 4. Technical architecture

### Current (v1.1) — offline, single device

```
index.html ─── render ──┐
                        ├──►  js/game.js  (IIFE)
css/style.css ── style ─┘        │
                                 ├── rules (pure functions, unit-tested)
                                 ├── trumps registry
                                 ├── AI (bust probability + heuristics)
                                 └── localStorage save
                                          │
                             Capacitor WebView (APK)  ·  PWA  ·  browser
```

**Known limitations to pay down:**
- Single 1,300-line IIFE — split into modules (`rules.js`, `trumps.js`, `ai.js`,
  `render.js`, `state.js`) before M4. The rules are already pure; the rest is not.
- Rendering is imperative DOM patching. Fine at this scale; revisit if we add scenes.
- No save schema version — migration will bite.

### Target (M4) — authoritative multiplayer

```
            ┌─────────────── SERVER (owns everything secret) ───────────────┐
   client   │  shoe order · both hole cards · trumps held · Vigil · timer  │
   ─────►   │  validates every action against the current phase            │
  intents   │                                                              │
   ◄─────   │  emits state snapshots; never sends the opponent's hole card  │
            └──────────────────────────────────────────────────────────────┘
```

**Non-negotiable:** the client never holds the deck. This genre is entirely hidden
information; a client-side shoe is cheatable in an afternoon. The same pure
`computeWinner()` runs on both sides — server for truth, client for prediction.

### Engine decision (unchanged from GAME-DESIGN §10)

| Path | Engine | When |
|---|---|---|
| Android-first, offline, no server cost | **Capacitor + web** (current) | Now → M3 |
| Steam + real lighting/audio | **Godot 4** | M5 |
| Roblox audience, free servers | **Roblox Studio** | Alternative to M4 |

---

## 5. Quality gates

**Definition of Done for any feature:**
1. `npm test` passes (ruleset + content integrity)
2. `npm run build:www` passes the **offline check** (zero external references)
3. Played on a real Android device, portrait *and* landscape
4. No console errors across a full act
5. Save survives force-quit mid-duel
6. Documented in README or GAME-DESIGN

**Release checklist:**
- [ ] Version bumped in `package.json` **and** `android/app/build.gradle`
- [ ] Ruleset tests green in CI
- [ ] APK artifact downloaded and installed on a clean device
- [ ] Aeroplane-mode run completes
- [ ] Tag pushed → release published → checksum recorded

---

## 6. Testing strategy

| Layer | Method | Status |
|---|---|---|
| Rules | Pure-function unit tests (`tests/rules.test.js`) | ✅ 28 assertions |
| Content | Integrity tests (every trump usable, rarity valid) | ✅ |
| Offline | Build-time URL scan + precache validation | ✅ |
| Android res | `scripts/check-android-res.py` (keywords, duplicates) | ✅ |
| Integration | Headless DOM playthrough (jsdom) | ad hoc — formalise in M2 |
| Device | Manual matrix, 5 Android versions | M5 |

**Add in M2:** a headless playthrough harness committed to the repo that runs 100 random
duels and asserts no crash, no negative Vigil, no card duplication.

---

## 7. Telemetry without a server

Offline-first means no analytics SDK. Options, in order of preference:

1. **Local only.** Record stats to localStorage; show the player their own history.
2. **Opt-in export.** "Share your run" produces a text blob the player chooses to post.
3. **Opt-in anonymous ping** on an explicit settings toggle. Never silent.

Balance decisions come from player reports and *our own* 100-duel simulations, not from
covert tracking. This is a deliberate product stance.

---

## 8. Monetisation — the ethical line

| Allowed | Forbidden |
|---|---|
| Cosmetic packs (card backs, table skins, ambient audio) | Paid trump cards |
| One-time "full act" unlock | Pay-to-win in PvP |
| Cosmetic season pass | Loot boxes with gameplay items |
| Ads **between** acts only (never mid-duel) | Ads during a duel |

**Rationale:** a competitive 1v1 game with purchasable power is dead on arrival — the
opponent can never trust the loss. Cosmetics protect the ladder. If the game must make
money from ads, it stays outside the table.

---

## 9. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| **Loop isn't fun** | Fatal | M2 gate is a *feel* test, not a feature count. Cut features, not feel. |
| **Scope creep into 3D** | High | 2.5D locked by design. A 3D dealer rig is a 6-month detour for zero rule value. |
| **Solo-dev burnout** | High | Ship APKs on a rhythm. Each milestone ends in something installable. |
| **IP challenge** | Low–medium | Original names, original art, mechanical rules only. See REFERENCES §5. |
| **Multiplayer cheating** | High at M4 | Server-authoritative from day one of that milestone. Never retrofit. |
| **Android fragmentation** | Medium | minSdk 23 covers ~98%. Test on a genuinely old device, not an emulator. |
| **Web tech feels "not a game"** | Medium | M2 exists entirely to kill this. Motion, audio, haptics. |

---

## 10. Timeline (solo developer, part-time)

| Milestone | Duration | Cumulative |
|---|---|---|
| M0 Prototype | ✅ done | — |
| M1 Act I slice | ✅ done | — |
| M2 Feel pass | 2 weeks | 2 wks |
| M3 Act II + progression | 3 weeks | 5 wks |
| M4 PvP | 5 weeks | 10 wks |
| M5 Release engineering | 1 week | 11 wks |
| **v2.0 ship** | | **~11 weeks** |

Full-time, compress to roughly 6–7 weeks. M4 is the schedule risk — it is double every
other milestone combined.

---

## 11. Immediate next three tasks

Shipped in v1.2: damage haptics, reduced motion, the loss screen that teaches, save
migration, and **trump deck-building** (the highest-leverage retention change).

Next, in order:

1. **M2-3:** The boss cheat as a set-piece — slow motion, sound dropout, a held breath.
   Right now it reads as a rules event; it should read as a betrayal. *(M)*
2. **Balance harness:** a headless simulator running 500 duels per opponent to tune
   `accuracy` with data rather than feel. The current curve was set by jaw, not numbers. *(M)*
3. **P1-9:** Daily seeded run — a deterministic shuffle shared by everyone who plays that
   day. Offline-friendly, zero server, enormous replay value. *(M)*

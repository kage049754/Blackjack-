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

**[⬇ The Last Hand v1.0.0 — Android APK](https://github.com/kage049754/Blackjack-/releases/download/v1.0.0/TheLastHand-f73ddee18f1efb340eac8cc38145ca985cca327d.apk)**

- 5.1 MB · `com.lasthand.game` · minSdk 23 (Android 6.0+) · targetSdk 35
- SHA-256 `dfbe524f4509bd7e3c0350854571375e17db4178dff2fdad9061db8462c0a15f`
- Debug-signed, so it sideloads onto any device. Enable
  *Install unknown apps* for your file manager, then tap the file.
- **Works in airplane mode.** The whole game is inside the APK.

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
| Tap **Wager 1/2/3** (keys `1` `2` `3`) | Stake Vigil before the deal |
| Tap **Draw** or `D` | Take a card |
| Tap **Stand** or `S` | Lock your hand |
| Tap any **Trump** | Play it — trumps do **not** consume your turn |
| **Sound** button | Toggle procedural audio (synthesised, no asset files) |

Turns are 20 seconds. Time out and you're forced to stand.

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

## Not built yet

- Real 1v1 multiplayer (needs an authoritative server)
- Vessel/character system with passives
- Acts, cheating boss, gauntlet mode
- Real art and sound design

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
scripts/make_icons.py      regenerates every icon and splash screen
scripts/build-www.js       assembles + verifies the offline bundle
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

## Design

See **`docs/GAME-DESIGN.md`** for the full design: pillars, ruleset, trump table,
Vessel characters, art direction, engine rationale, and roadmap.

## IP

All mechanics are drawn from uncopyrightable game rules. All names, characters, art,
and text are original to this project. No Capcom or Roblox assets, names, or characters
are used anywhere.

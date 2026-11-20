# References & Source Material

Everything The Last Hand is built from, what each source gives us, and what licence it
carries. Split into **design references** (things to study), **code references** (things
to read), and **asset sources** (things to legally use).

> **Rule of law:** game *mechanics* are not copyrightable. Game *expression* — art,
> names, characters, audio, code — is. Study freely, copy nothing.

---

## 1. Primary design references

These two define the genre. Everything in our ruleset descends from them.

### Resident Evil 7 — Banned Footage Vol. 2, "21" (Capcom, 2017)

The origin. Study the ruleset, not the assets.

- **What it is:** blackjack played to the death, strapped to a table, with trump cards.
- **The one real innovation:** a modified deck of **cards 1–11, exactly one of each**.
  Eleven cards total. Card counting becomes trivial, which converts luck into
  deduction. This single decision is the genre.
- **Rules:** two cards each, first one face down; draw or stand until both stand;
  hole cards flip; closest to 21 wins; both bust → closer wins; ties draw.
- **Stakes:** fingers (guillotine) → escalating voltage → spinning-blade tug-of-war.
- **Trump cards:** draw a specific card, force a discard, swap hands, change the target,
  raise the stake, destroy a trump, escape.
- **Modes:** "21" (narrative), "Survival" (5 opponents, 5 fingers), "Survival+"
  (10 opponents). Final boss cheats.

Sources:
- PSNProfiles trophy/trump-card guide — <https://psnprofiles.com/guide/6459-resident-evil-7-biohazard-banned-footage-vol-2-dlc-trophy-guide>
- Steam community guide (all trumps + boss counters) — <https://steamcommunity.com/sharedfiles/filedetails?id=869401121>
- The Nocturnal Rambler review (accurate mechanical description) — <http://thenocturnalrambler.blogspot.com/2017/03/resident-evil-7-banned-footage-dlc.html>

**Take:** the 1–11 deck, hidden hole card, both-bust rule, trump layer, gauntlet structure.
**Never take:** Boris, Lucas, Hoffman, Capcom art, the name "21".

### Roblox — ♠ Twenty One

A direct adaptation of RE7's "21" for a younger, multiplayer-first audience. Study the
*live-service* framing.

- **What it is:** 1v1 horror blackjack on Roblox with a buzzsaw that advances on the loser.
- **Contribution 1 — the wager as a dial.** You bet before the deal; the bet determines
  how far the blade travels. Confidence is measurable and punishable.
- **Contribution 2 — trumps don't consume a turn.** Enables reaction plays.
- **Contribution 3 — a turn timer.** Hesitation is punished; bluffing gets teeth.
- **Contribution 4 — economy.** Trumps acquired via shop/packs, cosmetics, ranked PvP,
  bot matches for practice.
- Bots follow basic strategy (hit ≤16, stand 17+) and fire trumps semi-randomly.

Sources:
- Game page — <https://www.roblox.com/games/16446180574/Twenty-One>
- Deltia's beginner guide (mechanics summary) — <https://deltiasgaming.com/roblox-twenty-one-a-beginners-guide/>

**Take:** the wager dial, free-action trumps, timer, cosmetic-only economy.
**Never take:** their trump names, art, UI layout, or code.

### The synthesis

> A perfect-information deduction game in horror dress.

Strip the atmosphere and it is an 11-card counting puzzle. The horror is what makes a
probability table feel fatal. Every future feature must preserve the tension between
**cold math** and **hot fear**.

---

## 2. Rules & theory references

- **Blackjack, canonical rules** — <https://en.wikipedia.org/wiki/Blackjack>
  *Hand values, dealer rules, the 3:2 natural, splits/doubles.*
- **Card counting** — <https://en.wikipedia.org/wiki/Card_counting>
  *Why a short deck changes everything: with 11 unique cards, "counting" is exact
  recall, not estimation.*
- **Basic strategy** — <https://en.wikipedia.org/wiki/Blackjack#Basic_strategy>
  *Used by our AI as a floor, then refined with live bust probability.*

---

## 3. Code references

Read these for implementation patterns, not for copying. Licences noted so you know
what is actually reusable.

| Repository | Licence | What it's useful for |
|---|---|---|
| [cl0ax/BlackJack-Game](https://github.com/cl0ax/BlackJack-Game) | MIT | Cleanest of the bunch: 52-card deck tracked with a `dealt` flag, reshuffle that holds back live cards, 14 logic tests. Good model for deck bookkeeping. |
| [lucasdcampos/blackjack](https://github.com/lucasdcampos/blackjack) | MIT | Responsive layout + dealing animations. |
| [RabihMoustapha/black-jack](https://github.com/RabihMoustapha/black-jack) | "educational/personal use" | Minimal vanilla state machine. |
| [vasurajan/Blackjack-game-javascript](https://github.com/vasurajan/Blackjack-game-javascript) | unspecified | Multi-player comparison against a dealer. |
| [KasuniPrabodha/Black-Jack-Game](https://github.com/KasuniPrabodha/Black-Jack-Game) | unspecified | Score-tracking UI. |

**Caution:** everything above is a *52-card casino* blackjack. None of them implement the
11-card deck, hidden hole cards on both sides, trump cards, or Vigil. They are useful for
deck/deal bookkeeping only. Our engine is original precisely because the genre differs.

### Platform & tooling docs

- **Capacitor 7** — <https://capacitorjs.com/docs> *(Android wrapper used by this repo)*
- **Android developer docs** — <https://developer.android.com/guide>
  *Adaptive icons, splash screens, resource naming, minSdk/targetSdk policy.*
- **Gradle** — <https://docs.gradle.org/current/userguide/userguide.html>
- **Godot 4** — <https://docs.godotengine.org/> *(the alternative engine path)*
- **Roblox Studio / Luau** — <https://create.roblox.com/docs> *(the other alternative)*

---

## 4. Asset sources — what you can legally ship

### Already used in this repo

| Asset | Source | Licence |
|---|---|---|
| **Cinzel** (display serif) | [Fontsource](https://fontsource.org/fonts/cinzel) → `@fontsource/cinzel` on npm | **SIL OFL 1.1** — free to embed and ship |
| **Cormorant Garamond** (body serif) | [Fontsource](https://fontsource.org/fonts/cormorant-garamond) | **SIL OFL 1.1** |
| **All icons & splash screens** | `scripts/make_icons.py` in this repo | **Yours** — generated procedurally |
| **All audio** | Web Audio oscillators + filtered noise, generated at runtime | **Yours** — zero asset files |
| **Card faces** | CSS + typography | **Yours** |

We ship **zero third-party binary art**. That is deliberate: it means the whole product
is licence-clean by construction, and every visual can be regenerated from source.

### Available if you want real card art

All **CC0 (public domain)** on OpenGameArt — no attribution legally required, none of
the restrictions of CC-BY:

| Pack | Link | Notes |
|---|---|---|
| **Kenney — Playing Cards Pack** | <https://opengameart.org/content/playing-cards-pack> | 270+ PNG sprites, tilesheet, vector source. Pixel-art style. The safest bet. |
| **mehrasaur — 52-card deck + chips** | <https://opengameart.org/content/playing-card-assets-52-cards-deck-chips> | Explicitly built for poker/blackjack. Separated PNGs + spritesheets + `.ai` source. |
| **Byron Knoll — vector playing cards** | <https://opengameart.org/content/playing-cards-vector-png> | SVG + PNG, classic Bicycle faces. *Caveat: uploader's CC0 claim is community-disputed — verify before commercial use.* |
| **Konson — cards with light & shadow** | <https://opengameart.org/content/playing-cards-sprites-with-light-and-shadow> | CC0, already lit — good fit for a candlelit table. |
| **minime453 — vintage playing cards** | <https://opengameart.org/content/vintage-playing-cards> | CC0, grungy/aged textures + PSD template. Best aesthetic match for gothic. Large file (173 MB). |

**But note:** our deck is **11 cards, not 52**. Any standard pack gives you 41 cards you
will never show. For the gothic look you are better off commissioning 11 custom faces
(one per numeral) — it is a far smaller art job than a full deck, and it is the single
highest-leverage art spend in the project.

### Audio sources

- **Kenney Audio packs** — <https://kenney.nl/assets?q=audio> — CC0, UI clicks, card
  flicks, impacts.
- **Freesound** — <https://freesound.org/> — filter by **CC0** to avoid attribution
  obligations. Search: "card shuffle", "chain creak", "candle flicker", "heartbeat".
- **Sonniss GDC Game Audio bundles** — royalty-free, large.

Current build synthesises all audio at runtime; real recordings are a Phase 3 upgrade.

---

## 5. IP safety checklist

Before shipping anything, confirm:

- [ ] No Capcom names, characters, or art (Boris, Lucas, Hoffman, "21", RE7 assets)
- [ ] No Roblox Twenty One names, trumps, UI, or code
- [ ] Every font is OFL (or you own it)
- [ ] Every image is CC0, commissioned with a signed assignment, or self-generated
- [ ] Every sound is CC0, licensed, or synthesised
- [ ] The app name and icon are original and trademark-searchable
- [ ] Store listing text is written fresh, not paraphrased from a reference

Our mechanics (11-card deck, hidden hole card, both-bust resolution, trump effects) are
**uncopyrightable rules**. Our expression (names, art, code, prose) is entirely original.

---

## 6. Reading list for the *feel*

Not sources — influences worth studying for tone:

- **Resident Evil 7** — intimate, domestic horror; the table as a trap.
- **Inscryption** — a card game that becomes horror through presentation and rules.
- **Cultist Simulator** — text, dread, and the fear of a bad draw.
- **The Masque of the Red Death** (Poe) — colour-coded rooms, inevitability.
- **Bloodborne / Dark Souls** — gothic architecture, restraint, "you will die and
  return".
- **Buckshot Roulette** — a tiny, brutal, complete product. Study its scope discipline.

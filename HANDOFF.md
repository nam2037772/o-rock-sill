# O-ROCK-SILL — Handoff

A walkable 1980s Korean neighbourhood arcade that acts as the hub for our retro
browser games. It is deliberately **not** a game list. You arrive on the street,
push the door open, change a ₩1,000 note at the 동전교환기, walk the aisles, sit
down at a machine, drop a ₩100 coin, and the game runs inside that cabinet.

**Production:** https://o-rock-sill.vercel.app
**Repository:** https://github.com/nam2037772/o-rock-sill

---

## 1. Adding a game — the only thing most people need

Open [`js/games.js`](js/games.js) and add one object to `GAMES`. Nothing else in
the codebase changes: collision, the interaction zone, the stool, the CRT glow,
the info plate and the launch flow are all derived from the entry.

```js
{
  id: 'neon-racer',            // unique slug; also the deep link (…/#neon-racer)
  title: 'NEON RACER',         // marquee text, drawn in the 3×5 pixel font
  year: 1985,
  genre: 'RACING',
  description: '노을 진 고속도로와 밀려드는 차들…',   // shown on the info plate
  status: 'playable',          // 'playable' | 'broken'
  url: 'https://neon-racer.vercel.app',
  cabinetTheme: 'magenta',     // key of CABINET_THEMES
  machine: 'cabinet',          // 'cabinet' | 'racing' | 'table' | 'whack'
  x: 800, y: 356               // optional — see below
}
```

**Activating a machine that is currently broken** is a two-field edit: set
`status: 'playable'` and fill in `url`. The taped 고장 note, the dead tube, the
crooked stool and the dark marquee all disappear on their own.

**`x` / `y` are optional.** Omit both and the machine is auto-parked in an
overflow row along the south aisle, so a game can be added without touching the
layout at all. Give coordinates when you want it in a specific row. The room is
960 × 760 world px; the walkable interior is roughly x 24–936, y 64–700.

`cabinetTheme` picks the side art, marquee colour and CRT tint from
`CABINET_THEMES` in the same file. Add a new key there if you want a new colour.
`machine` picks the physical shape from `MACHINE_SHAPES` — which also defines the
seat offset and where the camera aims when it zooms into the tube.

---

## 2. Architecture

Plain HTML/CSS/ES modules. **No framework, no build step, no dependencies, and
no asset files at all** — every sprite is drawn from rectangles at runtime and
every sound is synthesised with Web Audio. The whole site is about 130 KB of
text and loads in one round trip.

| File | Responsibility |
|---|---|
| `js/games.js` | **The registry.** Games, cabinet themes, machine shapes. The data layer. |
| `js/world.js` | The building: walls, scenery, background machines, wall art, ceiling tubes, the regulars. |
| `js/art.js` | All pixel drawing — the 3×5 bitmap font, cabinets, props, people, lighting, the storefront. |
| `js/engine.js` | Room simulation: input, collision, camera, focus, and the sit → coin → zoom → play → stand state machine. |
| `js/launcher.js` | The shared game-launch/return system (see §4). |
| `js/session.js` | One visit: the note, the coins, your position. Persisted in `sessionStorage`. |
| `js/ui.js` | DOM chrome: wallet, info plate, subtitles, touch stick, story beats. |
| `js/audio.js` | Original synthesised soundtrack, room ambience and SFX. |
| `js/main.js` | Boot and wiring. Nothing game-specific lives here. |

**The engine knows nothing about any individual game.** A machine is whatever
the registry says it is, and launching one is handed to the launcher.

### Rendering
A 3/4 top-down room drawn on a canvas. The camera sizes itself by *area*
(`TARGET_PIXELS`) rather than fixed dimensions, so a phone in portrait sees the
same amount of arcade as a desktop instead of a letterboxed crop. Static floor,
walls and posters are pre-rendered once into an offscreen canvas; only machines,
people and lighting are redrawn each frame. Objects are sorted by the front edge
of their footprint (painter's algorithm) so you walk in front of and behind
things correctly.

**Sharpness rules — the room looked out of focus until all three held.**

1. The canvas backing store is the **real device resolution**
   (`clientWidth × devicePixelRatio`), never a small buffer stretched by CSS.
   `#scene` therefore has no width/height in the stylesheet; the engine sets an
   exact pixel size. Desktop at dpr 2 renders 2880×1620; a phone at dpr 3
   renders 975×2109.
2. There is a **whole number of device pixels per world pixel** (`pxScale`).
   At a fractional scale some art pixels land on two screen pixels and their
   neighbours on three, which reads as blur no matter what `image-rendering`
   says.
3. The **camera translation is rounded to whole device pixels** every frame. A
   fractional translate smears every sprite in the room even when the scale is
   perfect.

Smoothing is off on every context, and the CRT overlays are deliberately faint —
scanlines at 0.16 alpha / 0.32 opacity and a light vignette. At any real
strength they halve the contrast of 3-pixel-tall text and read as softness.

---

## 3. Controls

**Navigation is never a requirement.** Clicking or tapping a cabinet is a
complete instruction to play it, not a request to walk somewhere. `tapTarget()`
carries the whole errand: route via the 동전교환기 if the note has not been
changed yet, walk to the stool, sit, insert the coin. If the straight-line
steering wedges on another cabinet — there is no path finder — the player is
snapped onto the stool after about a second rather than left stranded. A cold
tap on a cabinet with no coins in hand ends in a running game in ~6 seconds.

One gesture vocabulary everywhere:

| gesture | result |
|---|---|
| click / tap a machine | play it — walk, change money, sit, coin, launch |
| click / tap the floor  | walk there |
| drag | look around the room without walking |

**Desktop** — `WASD` / arrow keys and `Enter`/`Space` remain as optional
exploration; `Esc` leaves a running game.

**Mobile has no joystick and no d-pad.** Holding a stick to travel was
uncomfortable and, since tapping a cabinet does the whole job, unnecessary. You
drag to browse the room and tap the machine you want. Interaction zones are
generous — cabinet width + 60 px wide, 88 px deep — so pixel-perfect positioning
is never required. Taking the controls yourself always cancels an errand and
hands the camera back to the player.

### First-visit guidance

A new visitor is oriented for exactly as long as they need it and no longer:

- a **나** tag over the player, so you know which sprite you are
- a bobbing chevron at arm's length pointing at whatever you need next — the
  coin changer while you still have the note, then the nearest live cabinet
- a one-line control hint on arrival, worded for keyboard or touch
- **LAST BUS PANIC is placed directly ahead of the door** and the 동전교환기 a
  few steps to its right, so both are on screen together even on a phone

All of it retires permanently the moment the first coin goes in
(`Session.played`). Live cabinets stay distinguishable on their own after that:
lit marquee with chasing attract bulbs, a bright animated CRT, and a floor pool
that breathes. Dead ones stay dark with their taped notes.

Measured from a cold load, following only what is on screen: **9.6 s to playing
on desktop, 10.1 s on mobile; 6.5 s if you simply tap the cabinet.**

---

## 4. The launch / return system

**A game never replaces the page.** It is mounted in an iframe behind a CRT
bezel while the arcade keeps running underneath, which is what makes standing up
put you back on the same stool with the same coins. There is no reliance on
browser Back.

The chrome supplies the two required controls for *every* game, so no individual
game has to implement them:

- **다시하기** — reloads the frame
- **오락실로** — closes it, zooms the camera back out, stands the player up

Games may optionally talk to the cabinet, but nothing is required — a plain
static game works untouched:

```js
parent.postMessage({ type: 'orocksill:exit' },     '*');  // stand up
parent.postMessage({ type: 'orocksill:gameover' }, '*');  // offer retry / exit
```

**Requirement for any new game:** it must be embeddable, i.e. it must not send
`X-Frame-Options: DENY/SAMEORIGIN` or a `frame-ancestors` CSP that excludes us.
All five current games are clean. Verify a candidate before adding it:

```bash
curl -sI https://your-game.example | grep -iE 'x-frame-options|content-security-policy'
```

---

## 5. The coin economy

Play money for a nostalgia mechanic — no real currency, payments or purchases.

1. A session begins with one virtual **₩1,000 note**.
2. The **동전교환기** by the door exchanges it for **10 × ₩100**.
3. Every play costs **exactly one ₩100 coin**, deducted at the INSERT COIN beat
   with the coin-drop sound, then CREDIT 1.
4. Broken machines cost nothing and launch nothing — they only say
   `고장난 것 같다.`
5. **Running out never dead-ends.** With no coins and no note left, the day is
   simply over: the mom event fires and hands you a fresh ₩1,000. Saying
   "동전이 없다" and doing nothing left the player walking up to machine after
   machine with no way out — it looked exactly like a broken launch.
5. Coins and position survive a refresh via `sessionStorage`.

Spend all ten and, once the last game ends, **엄마가 오락실에 찾아오셨습니다.**
Red flash, alarm, screen shake, every tube in the building browns out, the
doorway lights up, controls are taken away and the player is marched to the
exit. Fade to **GAME OVER / 오늘은 여기까지.** and **다음에 또 놀기**, which
starts a fresh session with a new note.

Constants live in `js/session.js` (`COIN_VALUE`, `COINS_PER_BILL`).

---

## 6. Broken machines, not placeholders

There is no "COMING SOON" anywhere in the product, by design. An unavailable
machine is a physically dead cabinet: dark or static-filled tube, a hand-written
**고장** or **수리중** note taped across the screen, a stuttering marquee on a
failing ballast, duct tape, a chipped corner, and a stool knocked out of line.
It reads as a real arcade with a couple of broken machines rather than an
unfinished website. Override the note text per machine with `defect: '수리중'`.

---

## 7. Audio

An original 8-bar disco-funk loop in A minor at 112 BPM — kick, hats, snare,
filtered saw bass, chord stabs and an arpeggio — plus room tone (mains hum,
filtered noise, other people's machines bleeping two rows over) and SFX for
coins, buttons, footsteps, the door and the alarm. Everything is generated in
the browser; **no audio files and nothing sampled from or imitating any existing
recording.**

Audio only starts on the player's first interaction (autoplay policy). The music
ducks when a game starts and fades back when you stand up. The ♪ ON/OFF toggle
is top-right and the preference persists in `localStorage`. Likewise, every
background cabinet marquee is an invented title — no real trademarks on the wall.

---

## 8. Deploying

Static site, no build step.

```bash
npx vercel deploy --prod        # from the repo root
```

Pushes to `main` on GitHub also deploy. To test locally you need a real HTTP
server (ES modules do not load over `file://`):

```bash
npx serve .        # then open http://localhost:3000
```

---

## 9. Verification status

Three suites, all run on desktop (1440×810) and mobile (390×844):

- **Functional — 67 checks.** Front scene, entering, the ₩1,000 → 10 coin
  exchange, all five playable cabinets (launch, exactly one coin each, return to
  the same stool standing), broken cabinets costing nothing and launching
  nothing, the absence of "COMING SOON" anywhere, the mom event, and restart.
- **First visit.** Drives the game following only the on-screen guidance, with
  no prior knowledge, and fails if it cannot get a game running quickly.
- **Tap-only.** Never touches a movement control; clicks cabinets cold and
  requires every one to end in a running game.
- **Real-click.** The strictest one: no keyboard, no programmatic calls at all.
  Floor clicks to travel, then a single click on the cabinet, for all five
  active machines on desktop and mobile.

- **Production cabinet walk-through.** Runs against the live site and, for each
  of the five active cabinets in turn: clicks the cabinet, confirms the player
  walks over and sits, confirms exactly one ₩100 coin is deducted, confirms the
  frame loaded the URL the registry registered, confirms 오락실로 / 다시하기 are
  both present, and confirms exit returns the player to the arcade standing.
  Five plays, five coins, five left — verified on desktop and mobile.

All passing against production with no JS errors. All five game URLs return 200
and there are no production asset 404s.

| Cabinet | Status | URL |
|---|---|---|
| SKY RAID 1983 | playable | https://sky-raid-1983.vercel.app |
| STAR SWARM 1981 | playable | https://nam2037772.github.io/star-swarm-1981/ |
| LAST BUS PANIC 1984 | playable | https://last-bus-panic-1984.vercel.app (the cabinet by the door) |
| STEEL CLIMBER 1981 | playable | https://nam2037772.github.io/steel-climber-1981/ |
| KIM MANAGER 1983 | playable | https://kim-manager-1983.vercel.app/ |
| TANK ZONE 1983 | broken | — |
| GALAXY DEFENDER 1981 | broken | — |
| MOON LANDER 1980 | broken | — |
| NEON RACER 1985 | broken | — |
| DUNGEON 84 | broken | — |
| BOMB CITY 1982 | broken | — |

Eleven registry machines plus twenty-odd background cabinets, two pinballs, a
crane, a photo booth, a vending machine and a jukebox that exist purely to make
the room feel full.

### Known limitations

- Auto-walk steers in a straight line with collision sliding rather than
  pathfinding. Wedging is detected after ~1.1 s and the player is snapped to the
  destination, so a tap always completes — but across a crowded room you will
  sometimes see them scuff along a row before the snap. Real pathfinding is the
  first thing to add if the floor plan grows.
- Only the cabinets currently on screen can be tapped, which is the point of
  drag-to-look. LAST BUS PANIC faces the door so there is always something
  playable in view the moment you walk in.
- **Automated tests can produce false positives here.** An earlier suite called
  `tapTarget()` directly whenever a cabinet was off screen, which quietly
  skipped the real click path and reported five green cabinets while a real
  visitor could hit a dead end. Tests that claim to cover input must use
  `page.mouse.click` / `page.touchscreen.tap` on the canvas, from a fresh
  session, and never poke engine methods.
- Full-screen overlays must never intercept taps. The guidance subtitle sits
  over the middle of the room on a phone and silently ate every tap until it was
  given `pointer-events: none`; anything new added to the overlay layer needs the
  same treatment. Likewise `[hidden]` is forced to `display: none !important`
  because several panels set `display` themselves.
- The room is a fixed hand-placed layout. Machines added without `x`/`y` land in
  an overflow row that is not as densely dressed as the main floor.
- Landscape phones get a short viewport; the info plate is compact but the
  description line is hidden below 560 px wide.

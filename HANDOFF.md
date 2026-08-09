# O-ROCK-SILL — Handoff

A walkable 1980s Korean neighbourhood arcade that acts as the hub for our retro browser games. It is deliberately **not** a game list. You arrive on the street, push the door open, change a ₩1,000 note at the 동전교환기, walk the aisles, sit down at a machine, drop a ₩100 coin, and the game runs inside that cabinet.

**Production:** https://o-rock-sill.vercel.app
**Repository:** https://github.com/nam2037772/o-rock-sill

---

## 1. Adding a game — the only thing most people need

Open `js/games.js` and add one object to `GAMES`. Nothing else in the codebase changes: collision, the interaction zone, the stool, the CRT glow, the info plate and the launch flow are all derived from the entry.

```js
{
  id: 'neon-racer', // unique slug; also the deep link (…/#neon-racer)
  title: 'NEON RACER', // marquee text, drawn in the 3×5 pixel font
  year: 1985,
  genre: 'RACING',
  description: '노을 진 고속도로와 밀려드는 차들…', // shown on the info plate
  status: 'playable', // 'playable' | 'broken'
  url: 'https://neon-racer.vercel.app',
  cabinetTheme: 'magenta', // key of CABINET_THEMES
  machine: 'cabinet', // 'cabinet' | 'racing' | 'table' | 'whack'
  x: 800, y: 356 // optional — see below
}
```

**Activating a machine that is currently broken** is a two-field edit: set `status: 'playable'` and fill in `url`. The taped 고장 note, the dead tube, the crooked stool and the dark marquee all disappear on their own.

**`x` / `y` are optional.** Omit both and the machine is auto-parked in an overflow row along the south aisle, so a game can be added without touching the layout at all. Give coordinates when you want it in a specific row. The room is 960 × 760 world px; the walkable interior is roughly x 24–936, y 64–700.

`cabinetTheme` picks the side art, marquee colour and CRT tint from `CABINET_THEMES` in the same file. Add a new key there if you want a new colour.

`machine` picks the physical shape from `MACHINE_SHAPES` — which also defines the seat offset and where the camera aims when it zooms into the tube.

---

## 2. Architecture

Plain HTML/CSS/ES modules. **No framework, no build step, no dependencies, and no asset files at all** — every sprite is drawn from rectangles at runtime and every sound is synthesised with Web Audio. The whole site is about 130 KB of text and loads in one round trip.

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

**The engine knows nothing about any individual game.** A machine is whatever the registry says it is, and launching one is handed to the launcher.

### Rendering
A 3/4 top-down room drawn on a canvas at a low virtual resolution and scaled up with `image-rendering: pixelated`. The camera sizes itself by *area* (`TARGET_PIXELS`) rather than fixed dimensions, so a phone in portrait sees the same amount of arcade as a desktop instead of a letterboxed crop.

Static floor, walls and posters are pre-rendered once into an offscreen canvas; only machines, people and lighting are redrawn each frame. Objects are sorted by the front edge of their footprint (painter's algorithm) so you walk in front of and behind things correctly.

---

## 3. Controls

| Input | Desktop | Mobile |
|---|---|---|
| **Walk** | `W` `A` `S` `D` / Arrow Keys | Drag the virtual stick, or tap a clear spot on the floor to auto-walk there. |
| **Interact** | `Enter` / `Space` | Tap the glowing machine you are standing at, or press the big 확인 button. |

The arcade is fully responsive. The virtual stick only appears for touch-capable devices, and the UI layout changes on narrow screens so the text fits.

---

## 4. The Game Launcher / iframe Embedding

A game never replaces the page. It is mounted inside the cabinet the player is sitting at, in an `<iframe>` behind a CRT bezel (`#cabinet`). The arcade engine suspends itself underneath, which is why standing up puts you back on the same stool with the same coins in your pocket.

Because of this:
1. Every machine gets the same two controls (`다시하기` and `오락실로`), so no individual game has to implement them.
2. The game must **not** send `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'`, or the browser will refuse to load it. All current Vercel and GitHub Pages games are fine.
3. Games may optionally talk to the cabinet with `postMessage`, but it is not required:
   - `parent.postMessage({ type: 'orocksill:exit' }, '*')` — Stand up and return to the arcade.
   - `parent.postMessage({ type: 'orocksill:gameover' }, '*')` — Show the arcade's native Game Over overlay instead of building your own.

---

## 5. Development

Start any local static server in the root directory.

```bash
npx serve .
```

There is no build process. Edit a file and refresh.

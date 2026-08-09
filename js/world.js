/**
 * THE ROOM
 * --------
 * Everything here is scenery and structure. Playable machines live in
 * games.js — this file only describes the building they sit in.
 *
 * World units are pixels on a 960 x 760 floor plan. The camera shows roughly
 * a 380 x 215 slice of it on desktop, so the room is about six screens big.
 *
 * Props use footprint centre (x, y), footprint size (w, d) and drawn height h.
 */

export const ROOM = {
  w: 960,
  h: 760,
  wall: 24,        // side / bottom wall thickness
  backWall: 64,    // the tall north wall we hang posters on
  spawn: { x: 480, y: 724 }   // just inside the front doors
};

/** Solid blocks the player cannot walk through. Machines add their own. */
export const WALLS = [
  { x: 0,   y: 0,   w: 960, h: 64 },   // back wall
  { x: 0,   y: 0,   w: 24,  h: 760 },  // west wall
  { x: 936, y: 0,   w: 24,  h: 760 },  // east wall
  { x: 0,   y: 700, w: 420, h: 60 },   // south wall, west of the doors
  { x: 540, y: 700, w: 420, h: 60 },   // south wall, east of the doors
  { x: 420, y: 744, w: 120, h: 16 }    // the front doors themselves
];

/**
 * Scenery. `solid: false` means you can walk over it (floor mats, litter).
 * Decorative machines are deliberately not in the game registry — they exist
 * to make the room feel full, not to be played.
 */
const CAB = { w: 46, d: 22, h: 52 };

export const PROPS = [
  // --- north wall, shoulder to shoulder the whole way along -----------------
  { type: 'deco-cab',  x: 374, y: 116, ...CAB, tint: '#6b4a2a', pattern: 'bars',   label: 'ROCK DIVER' },
  { type: 'deco-cab',  x: 438, y: 116, ...CAB, tint: '#3d2f5c', pattern: 'stars',  label: 'COMET BOY' },
  { type: 'crane',     x: 508, y: 118, w: 54, d: 32, h: 60 },
  { type: 'deco-cab',  x: 566, y: 116, ...CAB, tint: '#5c2f2f', pattern: 'blocks', label: 'JELLY BOMB' },
  { type: 'deco-cab',  x: 622, y: 116, ...CAB, tint: '#2f5d6b', pattern: 'maze',   label: 'GHOST ALLEY' },
  { type: 'deco-cab',  x: 750, y: 116, ...CAB, tint: '#4a5d2a', pattern: 'lander', label: 'SOLAR TAXI' },
  { type: 'deco-cab',  x: 806, y: 116, ...CAB, tint: '#5c4a2a', pattern: 'dead',   label: 'TIGER LANE', broken: true, defect: '고장' },
  { type: 'photo',     x: 878, y: 124, w: 58, d: 40, h: 70 },

  { type: 'deco-cab',  x: 246, y: 116, ...CAB, tint: '#2f5c46', pattern: 'blocks', label: 'CANDY LIFT' },

  // --- middle row, back to back with the aisle behind it --------------------
  { type: 'deco-cab',  x: 190, y: 250, ...CAB, tint: '#6b2f3a', pattern: 'stars',  label: 'DIZZY POP' },
  { type: 'deco-cab',  x: 246, y: 250, ...CAB, tint: '#2f4a6b', pattern: 'bars',   label: 'METRO RUN' },
  { type: 'deco-cab',  x: 302, y: 250, ...CAB, tint: '#3d5c2f', pattern: 'maze',   label: 'TURBO MULE' },
  { type: 'deco-cab',  x: 358, y: 250, ...CAB, tint: '#5c3a2a', pattern: 'blocks', label: 'PANDA KICK' },

  // --- island row: the registry machines sit here, plus two strays ----------
  { type: 'deco-cab',  x: 414, y: 372, ...CAB, tint: '#4a4a52', pattern: 'dead',   label: 'IRON MOLE', broken: true, defect: '수리중' },
  { type: 'deco-cab',  x: 478, y: 372, ...CAB, tint: '#4a5d2a', pattern: 'bars',   label: 'NIGHT RALLY' },

  // --- pinball alley ---------------------------------------------------------
  { type: 'pinball',   x: 640, y: 388, w: 34, d: 54, h: 34, tint: '#7a3520' },
  { type: 'pinball',   x: 692, y: 388, w: 34, d: 54, h: 34, tint: '#2c4a7a' },
  { type: 'pinball',   x: 560, y: 540, w: 34, d: 54, h: 34, tint: '#3d6b45' },

  // --- along the walls -------------------------------------------------------
  { type: 'vending',   x: 52,  y: 300, w: 40, d: 24, h: 54 },
  { type: 'jukebox',   x: 52,  y: 438, w: 38, d: 24, h: 48 },
  // the coin changer, deliberately right where you come in
  // Sits well clear of the south wall on purpose: its standing spot is y+26,
  // and the player's feet need ~8px, so anything below y≈650 leaves them
  // pinned between the machine and the wall on the way in.
  { type: 'change',    x: 604, y: 640, w: 32, d: 24, h: 48, interact: 'change' },

  // --- fourth row, west side ------------------------------------------------
  { type: 'deco-cab',  x: 96,  y: 488, ...CAB, tint: '#5c3a4a', pattern: 'stars',  label: 'GOLD MINER' },
  { type: 'deco-cab',  x: 154, y: 488, ...CAB, tint: '#3a4a5c', pattern: 'bars',   label: 'SEA HUNT' },
  { type: 'deco-cab',  x: 212, y: 488, ...CAB, tint: '#4a5c3a', pattern: 'maze',   label: 'ANT FARM' },
  { type: 'deco-cab',  x: 270, y: 488, ...CAB, tint: '#5c4a3a', pattern: 'blocks', label: 'BULL RUN' },
  { type: 'deco-cab',  x: 452, y: 470, ...CAB, tint: '#3a3a5c', pattern: 'lander', label: 'SKY HOOK' },
  { type: 'deco-cab',  x: 510, y: 470, ...CAB, tint: '#5c2f3a', pattern: 'stars',  label: 'RED ARROW' },
  { type: 'pinball',   x: 782, y: 486, w: 34, d: 54, h: 34, tint: '#6b4a20' },

  // --- south end: more machines, the counter, benches, clutter --------------
  { type: 'deco-cab',  x: 96,  y: 612, ...CAB, tint: '#4a3a5c', pattern: 'blocks', label: 'MOTH TOWN' },
  { type: 'deco-cab',  x: 154, y: 612, ...CAB, tint: '#2f4a4a', pattern: 'dead',   label: 'DEEP WELL', broken: true, defect: '고장' },
  { type: 'deco-cab',  x: 240, y: 546, ...CAB, tint: '#5c2f4a', pattern: 'stars',  label: 'SNOW DASH' },
  { type: 'deco-cab',  x: 304, y: 546, ...CAB, tint: '#2f5c5c', pattern: 'blocks', label: 'LASER OX' },
  { type: 'counter',   x: 780, y: 652, w: 236, d: 44, h: 28 },
  { type: 'bench',     x: 320, y: 664, w: 66, d: 16, h: 14 },
  { type: 'bench',     x: 690, y: 566, w: 66, d: 16, h: 14 },
  { type: 'plant',     x: 60,  y: 660, w: 24, d: 20, h: 34 },
  { type: 'plant',     x: 906, y: 104, w: 24, d: 20, h: 34 },
  { type: 'bin',       x: 384, y: 636, w: 20, d: 18, h: 22 },
  { type: 'bin',       x: 352, y: 596, w: 20, d: 18, h: 22 },
  { type: 'bin',       x: 906, y: 466, w: 20, d: 18, h: 22 },

  // --- empty stools nobody put back ------------------------------------------
  { type: 'stool',     x: 348, y: 466, w: 16, d: 14, h: 16, tilt: -1 },
  { type: 'stool',     x: 470, y: 604, w: 16, d: 14, h: 16, tilt: 1 },
  { type: 'stool',     x: 128, y: 466, w: 16, d: 14, h: 16, tilt: 0 },
  { type: 'stool',     x: 700, y: 300, w: 16, d: 14, h: 16, tilt: -1 },

  // --- litter you can walk over ---------------------------------------------
  { type: 'cup',       x: 262, y: 196, w: 0, d: 0, h: 0, solid: false },
  { type: 'cup',       x: 704, y: 300, w: 0, d: 0, h: 0, solid: false },
  { type: 'cup',       x: 452, y: 486, w: 0, d: 0, h: 0, solid: false },
  { type: 'bottle',    x: 150, y: 620, w: 0, d: 0, h: 0, solid: false },
  { type: 'bottle',    x: 520, y: 470, w: 0, d: 0, h: 0, solid: false },
  { type: 'bottle',    x: 830, y: 250, w: 0, d: 0, h: 0, solid: false },
  { type: 'flyer',     x: 470, y: 690, w: 0, d: 0, h: 0, solid: false },
  { type: 'flyer',     x: 210, y: 320, w: 0, d: 0, h: 0, solid: false },
  { type: 'flyer',     x: 662, y: 486, w: 0, d: 0, h: 0, solid: false }
];

/**
 * Things bolted to the north wall. Drawn into the static layer, except the
 * lit signs which flicker every frame.
 */
export const WALL_ART = [
  { type: 'sign-main',  x: 480, y: 24 },                       // O-ROCK-SILL
  { type: 'poster',     x: 96,  y: 30, w: 40, h: 46, art: 0 },
  { type: 'poster',     x: 154, y: 32, w: 36, h: 42, art: 1 },
  { type: 'poster',     x: 268, y: 30, w: 38, h: 44, art: 2 },
  { type: 'notice',     x: 196, y: 34 },                       // handwritten high scores
  { type: 'notice',     x: 684, y: 30 },
  { type: 'poster',     x: 606, y: 32, w: 36, h: 42, art: 1 },
  { type: 'poster',     x: 718, y: 30, w: 40, h: 46, art: 0 },
  { type: 'poster',     x: 40,  y: 30, w: 34, h: 40, art: 1 },
  { type: 'poster',     x: 400, y: 30, w: 36, h: 42, art: 2 },
  { type: 'poster',     x: 440, y: 34, w: 32, h: 36, art: 0 },
  { type: 'poster',     x: 654, y: 34, w: 32, h: 38, art: 2 },
  { type: 'poster',     x: 756, y: 32, w: 34, h: 40, art: 1 },
  { type: 'poster',     x: 848, y: 30, w: 36, h: 42, art: 2 },
  { type: 'notice',     x: 336, y: 36 },
  { type: 'notice',     x: 508, y: 34 },
  { type: 'notice',     x: 906, y: 36 },
  { type: 'clock',      x: 796, y: 28 },
  { type: 'sign-lit',   x: 340, y: 44, text: 'TOKENS', tone: '#ffb347' },
  { type: 'sign-lit',   x: 600, y: 44, text: 'GAMES',  tone: '#ff6b6b' }
];

/** Signs on the side / south walls. */
export const ROOM_SIGNS = [
  { type: 'exit',    x: 480, y: 716 },                              // over the doors
  { type: 'hanging', x: 604, y: 586, text: '동전교환', tone: '#ffd166', kr: true },
  { type: 'hanging', x: 780, y: 596, text: 'PRIZES',   tone: '#e8a04a' },
  { type: 'hanging', x: 168, y: 500, text: 'COCKTAIL', tone: '#7ab8a8' }
];

/**
 * Regulars. `mode` is 'play' (stands at a machine, leans and mashes buttons),
 * 'sit' (parked on a stool) or 'walk' (shuffles between waypoints).
 */
export const NPCS = [
  { id: 'kid',     mode: 'play', x: 750, y: 146, shirt: '#b5453f', pants: '#33405e', hair: '#241a14' },
  { id: 'teen',    mode: 'play', x: 640, y: 424, shirt: '#3f6b4a', pants: '#2e2a36', hair: '#4a3320' },
  { id: 'friend',  mode: 'play', x: 302, y: 280, shirt: '#8a7a3f', pants: '#2b3340', hair: '#2b1d16' },
  { id: 'watcher', mode: 'play', x: 322, y: 288, shirt: '#4a5a7a', pants: '#33313a', hair: '#3a2a1a' },
  { id: 'r1',      mode: 'sit',  x: 438, y: 144, shirt: '#8a4a3f', pants: '#2e3646', hair: '#221a12' },
  { id: 'r2',      mode: 'sit',  x: 566, y: 144, shirt: '#3f5a8a', pants: '#33313a', hair: '#2b1d16' },
  { id: 'r3',      mode: 'sit',  x: 190, y: 278, shirt: '#6b6b3f', pants: '#2b2733', hair: '#1e1a18' },
  { id: 'r4',      mode: 'sit',  x: 358, y: 278, shirt: '#4a7a6b', pants: '#2e2a36', hair: '#3a2418' },
  { id: 'r5',      mode: 'sit',  x: 154, y: 516, shirt: '#8a5a7a', pants: '#33405e', hair: '#241a14' },
  { id: 'r6',      mode: 'sit',  x: 510, y: 498, shirt: '#5a5a8a', pants: '#2b2733', hair: '#2b1d16' },
  { id: 'sitter',  mode: 'sit',  x: 690, y: 556, shirt: '#6b5a2f', pants: '#33313a', hair: '#1e1a18' },
  { id: 'clerk',   mode: 'play', x: 780, y: 624, shirt: '#4a4460', pants: '#2b2733', hair: '#3a2418' },
  {
    id: 'wanderer', mode: 'walk', x: 470, y: 316, shirt: '#57506b', pants: '#2a2733', hair: '#2b1d16',
    path: [{ x: 470, y: 316 }, { x: 610, y: 316 }, { x: 610, y: 480 }, { x: 400, y: 480 }]
  }
];

/**
 * The fixtures themselves, bolted to the ceiling above each aisle. Drawn over
 * everything because they hang above the machines.
 */
export const CEILING_TUBES = [
  // y values sit in the clear bands between rows. A cabinet occupies screen
  // y-63..y+11, so a tube anywhere else ends up lying across a marquee.
  { x: 200, y: 158, w: 140 }, { x: 470, y: 158, w: 140, bad: true }, { x: 740, y: 158, w: 140 },
  { x: 200, y: 288, w: 140 }, { x: 470, y: 288, w: 140 }, { x: 740, y: 288, w: 140 },
  { x: 640, y: 452, w: 140 },
  { x: 300, y: 654, w: 130 }, { x: 700, y: 692, w: 130, bad: true }
];

/** Ceiling fluorescents. `bad: true` ones buzz and stutter. */
export const CEILING_LIGHTS = [
  { x: 180, y: 190, r: 150 },
  { x: 480, y: 190, r: 150, bad: true },
  { x: 780, y: 190, r: 150 },
  { x: 180, y: 450, r: 150 },
  { x: 480, y: 450, r: 150 },
  { x: 780, y: 450, r: 150, bad: true },
  { x: 300, y: 660, r: 140 },
  { x: 700, y: 660, r: 140 }
];

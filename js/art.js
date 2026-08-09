/**
 * PIXEL ART
 * ---------
 * Every sprite in the arcade is drawn from rectangles at 1 world px = 1 art px,
 * then the whole canvas is scaled up with image-rendering: pixelated. That keeps
 * the proportions coherent and stops anything from looking like a web widget.
 *
 * Palette is deliberately worn: warm greys, tobacco browns, faded reds. The only
 * saturated colour in the room comes from CRTs and a couple of lit signs.
 */

import { ROOM, WALLS, WALL_ART } from './world.js';

/* ---------------------------------------------------------------- helpers */

export const PAL = {
  floorA: '#2f2833', floorB: '#2a2430', grout: '#1d1822',
  wornA: '#3a3038', wornB: '#241f2a',
  wallHi: '#4a3f47', wall: '#3b323c', wallLo: '#2c2530', skirt: '#1f1a24',
  metal: '#585260', metalHi: '#7b7484', metalLo: '#33303a',
  brass: '#9a7b3f', dark: '#14111a', black: '#0b090f',
  paper: '#cfc4a8', ink: '#2a2118'
};

/**
 * Room-wide effects the engine drives. `blackout` 0..1 browns every tube in the
 * building out at once — used when a certain someone walks through the door.
 */
export const FX = { blackout: 0 };

/** Integer-snapped rect. Everything goes through here so nothing lands on a half pixel. */
export function r(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Deterministic noise so the grime is in the same place every load. */
export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A 3x5 bitmap font.
 *
 * Everything painted inside the room — marquees, signs, posters — uses this
 * rather than the browser's font rasteriser. At the sizes a cabinet marquee
 * actually is (about 38px across), real glyph hinting turns to grey mush and
 * instantly reads as a web page zoomed out. Hand-plotted pixels stay crisp at
 * any scale and are the whole reason the room looks like sprite work.
 *
 * Each glyph is five rows of three bits, high bit leftmost.
 */
const GLYPHS = {
  A: [0b010, 0b101, 0b111, 0b101, 0b101], B: [0b110, 0b101, 0b110, 0b101, 0b110],
  C: [0b011, 0b100, 0b100, 0b100, 0b011], D: [0b110, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b110, 0b100, 0b111], F: [0b111, 0b100, 0b110, 0b100, 0b100],
  G: [0b011, 0b100, 0b101, 0b101, 0b011], H: [0b101, 0b101, 0b111, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b111], J: [0b001, 0b001, 0b001, 0b101, 0b010],
  K: [0b101, 0b101, 0b110, 0b101, 0b101], L: [0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101], N: [0b101, 0b111, 0b111, 0b111, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b010], P: [0b110, 0b101, 0b110, 0b100, 0b100],
  Q: [0b010, 0b101, 0b101, 0b111, 0b011], R: [0b110, 0b101, 0b110, 0b101, 0b101],
  S: [0b011, 0b100, 0b010, 0b001, 0b110], T: [0b111, 0b010, 0b010, 0b010, 0b010],
  U: [0b101, 0b101, 0b101, 0b101, 0b011], V: [0b101, 0b101, 0b101, 0b101, 0b010],
  W: [0b101, 0b101, 0b111, 0b111, 0b101], X: [0b101, 0b101, 0b010, 0b101, 0b101],
  Y: [0b101, 0b101, 0b010, 0b010, 0b010], Z: [0b111, 0b001, 0b010, 0b100, 0b111],
  0: [0b111, 0b101, 0b101, 0b101, 0b111], 1: [0b010, 0b110, 0b010, 0b010, 0b111],
  2: [0b110, 0b001, 0b010, 0b100, 0b111], 3: [0b110, 0b001, 0b010, 0b001, 0b110],
  4: [0b101, 0b101, 0b111, 0b001, 0b001], 5: [0b111, 0b100, 0b110, 0b001, 0b110],
  6: [0b011, 0b100, 0b110, 0b101, 0b010], 7: [0b111, 0b001, 0b010, 0b010, 0b010],
  8: [0b010, 0b101, 0b010, 0b101, 0b010], 9: [0b010, 0b101, 0b011, 0b001, 0b110],
  ' ': [0, 0, 0, 0, 0],
  '-': [0, 0, 0b111, 0, 0], '.': [0, 0, 0, 0, 0b010], '·': [0, 0, 0b010, 0, 0],
  '!': [0b010, 0b010, 0b010, 0, 0b010], ':': [0, 0b010, 0, 0b010, 0],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100], "'": [0b010, 0b010, 0, 0, 0]
};

const GW = 3, GH = 5, GAP = 1;
export const pxWidth = (text, scale = 1) => (text.length * (GW + GAP) - GAP) * scale;

/** Draw pixel text from its top-left corner. */
export function pxText(ctx, text, x, y, color, scale = 1) {
  ctx.fillStyle = color;
  const s = Math.max(1, Math.round(scale));
  let cx = Math.round(x);
  for (const ch of String(text).toUpperCase()) {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < GH; row++) {
      const bits = g[row];
      if (!bits) continue;
      for (let col = 0; col < GW; col++) {
        if (bits & (1 << (GW - 1 - col))) {
          ctx.fillRect(cx + col * s, Math.round(y) + row * s, s, s);
        }
      }
    }
    cx += (GW + GAP) * s;
  }
}

/** Centred, at the biggest whole scale that still fits. */
export function pxFit(ctx, text, cx, y, maxW, color, maxScale = 3) {
  let s = maxScale;
  while (s > 1 && pxWidth(text, s) > maxW) s--;
  pxText(ctx, text, cx - pxWidth(text, s) / 2, y, color, s);
  return s;
}

/**
 * Marquee text. Long titles break onto a second line at the space nearest the
 * middle rather than being squashed — that is what a real marquee would do.
 */
export function pxMarquee(ctx, text, cx, y, maxW, maxH, color) {
  const t = String(text).toUpperCase();
  if (pxWidth(t) <= maxW) {
    pxText(ctx, t, cx - pxWidth(t) / 2, y + (maxH - GH) / 2, color, 1);
    return;
  }
  const spaces = [...t].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i >= 0);
  let cut = spaces.length
    ? spaces.reduce((a, b) => (Math.abs(b - t.length / 2) < Math.abs(a - t.length / 2) ? b : a))
    : Math.floor(t.length / 2);
  const a = t.slice(0, cut).trim(), b = t.slice(cut).trim();
  const top = y + (maxH - (GH * 2 + 1)) / 2;
  pxText(ctx, a, cx - pxWidth(a) / 2, top, color, 1);
  pxText(ctx, b, cx - pxWidth(b) / 2, top + GH + 1, color, 1);
}

/** Korean text — the taped notes and the room signs. Uses whatever hangul face the OS has. */
export function krText(ctx, text, cx, y, size, color, rot = 0) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(y));
  if (rot) ctx.rotate(rot);
  ctx.font = `${size}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const cl = (v) => Math.max(0, Math.min(255, v));
  const r_ = cl((n >> 16) + amt), g = cl(((n >> 8) & 255) + amt), b = cl((n & 255) + amt);
  return `#${((r_ << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Soft floor shadow under a footprint. */
function shadow(ctx, x, y, w, d) {
  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y + d * 0.18, w * 0.56, d * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------------------------------------------------ static layer */

/**
 * Floor, walls, posters, stains — anything that never changes gets painted once
 * into an offscreen canvas the size of the whole room and blitted every frame.
 */
export function buildStaticLayer() {
  const c = document.createElement('canvas');
  c.width = ROOM.w; c.height = ROOM.h;
  const ctx = c.getContext('2d');
  const rnd = mulberry(19840611);

  // --- floor: small worn vinyl tiles ---------------------------------------
  // 16px tiles with low-contrast grout; big tiles and dark grout read as a
  // modern bathroom rather than a 1980s arcade floor.
  const T = 16;
  for (let ty = 0; ty < ROOM.h; ty += T) {
    for (let tx = 0; tx < ROOM.w; tx += T) {
      const check = ((tx / T + ty / T) & 1) === 0;
      let col = check ? PAL.floorA : PAL.floorB;
      if (rnd() < 0.22) col = shade(col, Math.round(rnd() * 8 - 4));
      r(ctx, tx, ty, T, T, col);
    }
  }
  ctx.save();
  ctx.globalAlpha = 0.4;
  for (let ty = 0; ty < ROOM.h; ty += T) r(ctx, 0, ty, ROOM.w, 1, PAL.grout);
  for (let tx = 0; tx < ROOM.w; tx += T) r(ctx, tx, 0, 1, ROOM.h, PAL.grout);
  ctx.restore();

  // traffic wear along the main aisles — the paths everyone actually walks.
  // Kept very faint and flat, otherwise it reads as lens blur, not worn lino.
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = '#8a7a66';
  for (let i = 0; i < 320; i++) {
    const lane = rnd();
    let x, y;
    if (lane < 0.42) { x = 60 + rnd() * 840; y = 240 + rnd() * 80; }
    else if (lane < 0.78) { x = 60 + rnd() * 840; y = 470 + rnd() * 80; }
    else { x = 430 + rnd() * 110; y = 300 + rnd() * 400; }
    ctx.beginPath();
    ctx.ellipse(x, y, 10 + rnd() * 26, 4 + rnd() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // scuffs, spills and cigarette burns
  ctx.save();
  for (let i = 0; i < 130; i++) {
    ctx.globalAlpha = 0.06 + rnd() * 0.12;
    ctx.fillStyle = rnd() < 0.3 ? '#000' : '#4a3a2c';
    const x = rnd() * ROOM.w, y = 70 + rnd() * (ROOM.h - 140);
    ctx.beginPath();
    ctx.ellipse(x, y, 1 + rnd() * 6, 1 + rnd() * 4, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // --- entrance mat ---------------------------------------------------------
  r(ctx, 424, 690, 112, 46, '#3d1c22');
  r(ctx, 428, 694, 104, 38, '#4a232a');
  for (let i = 0; i < 104; i += 8) r(ctx, 428 + i, 694, 4, 38, '#411f26');
  pxFit(ctx, 'O-ROCK-SILL', 480, 704, 94, '#8c5a52', 2);

  // --- walls ----------------------------------------------------------------
  paintWall(ctx, rnd);

  // --- posters and paper on the north wall ---------------------------------
  for (const a of WALL_ART) {
    if (a.type === 'poster') poster(ctx, a, rnd);
    else if (a.type === 'notice') notice(ctx, a, rnd);
  }

  return c;
}

function paintWall(ctx, rnd) {
  // north wall: upper block, grubby wainscot, skirting
  r(ctx, 0, 0, ROOM.w, ROOM.backWall, PAL.wall);
  r(ctx, 0, 0, ROOM.w, 4, PAL.wallHi);
  r(ctx, 0, ROOM.backWall - 16, ROOM.w, 16, PAL.wallLo);
  r(ctx, 0, ROOM.backWall - 17, ROOM.w, 1, shade(PAL.wall, 18));
  r(ctx, 0, ROOM.backWall - 4, ROOM.w, 4, PAL.skirt);
  // vertical panel joins
  for (let x = 0; x < ROOM.w; x += 48) r(ctx, x, 0, 1, ROOM.backWall - 4, shade(PAL.wall, -12));
  // damp stains
  ctx.save();
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.1;
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.ellipse(rnd() * ROOM.w, rnd() * ROOM.backWall, 6 + rnd() * 22, 3 + rnd() * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // side + south walls, seen edge-on
  for (const w of WALLS) {
    if (w.y === 0 && w.h === 64) continue;
    r(ctx, w.x, w.y, w.w, w.h, PAL.wallLo);
    r(ctx, w.x, w.y, w.w, 3, PAL.wall);
    r(ctx, w.x, w.y + w.h - 3, w.w, 3, PAL.skirt);
    for (let x = w.x; x < w.x + w.w; x += 40) r(ctx, x, w.y + 3, 1, w.h - 6, shade(PAL.wallLo, -10));
  }

  // the front doors: glass, kick plates, a taped opening-hours card
  r(ctx, 420, 744, 120, 16, '#1a161e');
  r(ctx, 424, 746, 52, 12, '#2b3a3c');
  r(ctx, 484, 746, 52, 12, '#2b3a3c');
  r(ctx, 478, 744, 4, 16, PAL.metal);
  r(ctx, 424, 754, 52, 4, PAL.metalLo);
  r(ctx, 484, 754, 52, 4, PAL.metalLo);
  r(ctx, 500, 747, 14, 8, PAL.paper);

  // vestibule floor is a different, older tile
  for (let ty = 700; ty < 744; ty += 22) {
    for (let tx = 420; tx < 540; tx += 22) {
      r(ctx, tx, ty, 22, 22, ((tx / 22 + ty / 22) & 1) ? '#282029' : '#221b24');
      r(ctx, tx, ty, 22, 1, PAL.grout);
    }
  }
}

const POSTER_ART = [
  ['#7a2530', '#d9a441', '#2b1a2e'],
  ['#1f3a5c', '#4fb0c6', '#101a2c'],
  ['#3d2a5c', '#c05c8e', '#1a1030']
];

function poster(ctx, a, rnd) {
  const { x, y, w, h } = a;
  const p = POSTER_ART[a.art % POSTER_ART.length];
  const x0 = x - w / 2, y0 = y - h / 2;
  ctx.save();
  ctx.globalAlpha = 0.86;                       // sun-faded
  r(ctx, x0 + 1, y0 + 1, w, h, '#000');
  r(ctx, x0, y0, w, h, p[2]);
  r(ctx, x0 + 2, y0 + 2, w - 4, h - 14, p[0]);
  // crude cover art: a shape and a horizon
  r(ctx, x0 + 2, y0 + h - 24, w - 4, 8, p[1]);
  for (let i = 0; i < 5; i++) r(ctx, x0 + 4 + i * 6, y0 + 8 + (i % 2) * 5, 4, 4, p[1]);
  r(ctx, x0 + 3, y0 + h - 11, w - 6, 6, '#0d0a12');
  pxFit(ctx, ['ATTACK', 'ORBIT', 'RIVAL'][a.art % 3], x, y0 + h - 10, w - 6, p[1], 1);
  ctx.restore();
  // curling corner + tape
  r(ctx, x0 - 1, y0 - 1, 6, 3, '#d8cfae');
  r(ctx, x0 + w - 5, y0 - 1, 6, 3, '#d8cfae');
  ctx.save(); ctx.globalAlpha = 0.5;
  r(ctx, x0 + w - 5, y0 + h - 6, 5, 6, PAL.wall);
  ctx.restore();
}

function notice(ctx, a, rnd) {
  // a handwritten high-score card, taped up crooked
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate((rnd() - 0.5) * 0.14);
  r(ctx, -13, -14, 26, 28, '#0000004d');
  r(ctx, -14, -15, 26, 28, PAL.paper);
  for (let i = 0; i < 6; i++) {
    const w = 8 + Math.round(rnd() * 12);
    r(ctx, -11, -10 + i * 4, w, 1, PAL.ink);
  }
  r(ctx, -11, -13, 18, 2, '#8a2b2b');
  r(ctx, -4, -17, 9, 4, '#e8e0c4');    // tape
  ctx.restore();
}

/* ------------------------------------------------------------------ screens */

/**
 * CRT contents. Each pattern is a tiny attract-mode loop — this is what makes
 * the room feel switched on. `t` is seconds, `s` a per-machine phase offset.
 */
export function drawScreen(ctx, x, y, w, h, theme, pattern, t, s, dim = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  r(ctx, x, y, w, h, theme.screen);

  if (FX.blackout > 0.05) {
    // every machine in the room stutters and drops out together
    const alive = Math.random() > FX.blackout;
    if (!alive) {
      r(ctx, x, y, w, h, '#0a0810');
      for (let i = 0; i < 8; i++) r(ctx, x + Math.random() * w, y + Math.random() * h, 2, 1, '#2a2a34');
      ctx.restore();
      return;
    }
  }

  const n = theme.neon;
  const T = t + s * 7.3;

  if (pattern === 'off') {
    // tube is cold: just the room reflecting off dusty glass
    r(ctx, x, y, w, h, '#141219');
    ctx.globalAlpha = 0.07;
    r(ctx, x + 2, y + 2, w - 8, 3, '#c9c4d0');
    r(ctx, x + 2, y + 6, w - 14, 1, '#c9c4d0');
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }
  if (pattern === 'dead') {
    // busted set: rolling static bar only
    for (let i = 0; i < 30; i++) {
      const yy = y + ((i * 7 + Math.floor(T * 40)) % h);
      r(ctx, x + ((i * 13) % w), yy, 1 + (i % 3), 1, '#3a3a42');
    }
    r(ctx, x, y + ((T * 26) % (h + 10)) - 5, w, 3, '#4d4d57');
  } else if (pattern === 'stars') {
    for (let i = 0; i < 22; i++) {
      const sx = x + ((i * 37) % w);
      const sy = y + ((i * 19 + T * 26) % h);
      r(ctx, sx, sy, 1, 1, i % 4 ? '#8d92a8' : n);
    }
    const px_ = x + w / 2 + Math.sin(T * 1.7) * (w / 3);
    r(ctx, px_, y + h - 5, 3, 3, n);
    r(ctx, px_ + 1, y + h - 8, 1, 3, '#fff');
    for (let i = 0; i < 4; i++) r(ctx, x + 4 + i * 6 + Math.sin(T + i) * 2, y + 4, 3, 2, n);
  } else if (pattern === 'bars') {
    for (let i = 0; i < 7; i++) {
      const bh = 2 + Math.abs(Math.sin(T * 2 + i)) * (h - 6);
      r(ctx, x + 2 + i * ((w - 4) / 7), y + h - bh, Math.max(2, (w - 4) / 7 - 1), bh, i % 2 ? n : shade(n, -60));
    }
  } else if (pattern === 'maze') {
    for (let gy = 0; gy < h; gy += 4) {
      for (let gx = 0; gx < w; gx += 4) {
        if (((gx * 7 + gy * 13) % 11) < 4) r(ctx, x + gx, y + gy, 3, 3, shade(n, -80));
      }
    }
    const mx = x + 2 + ((T * 16) % (w - 6));
    r(ctx, mx, y + h / 2, 3, 3, n);
  } else if (pattern === 'racer') {
    r(ctx, x, y, w, h / 2, shade(theme.screen, 14));
    for (let i = 0; i < 6; i++) {
      const p = ((T * 0.7 + i / 6) % 1);
      const yy = y + h / 2 + p * p * (h / 2);
      r(ctx, x + w / 2 - p * w * 0.6, yy, Math.max(1, p * 5), 1, n);
      r(ctx, x + w / 2 + p * w * 0.6, yy, Math.max(1, p * 5), 1, n);
    }
    r(ctx, x + w / 2 - 3, y + h - 6, 6, 4, '#d8d8e0');
  } else if (pattern === 'lander') {
    for (let i = 0; i < w; i += 3) {
      const gy = y + h - 6 - Math.abs(Math.sin(i * 0.4)) * 6;
      r(ctx, x + i, gy, 3, 1, n);
    }
    const ly = y + 4 + Math.abs(Math.sin(T * 0.9)) * (h - 18);
    r(ctx, x + w / 2 - 2, ly, 4, 3, n);
    if (Math.sin(T * 9) > 0) r(ctx, x + w / 2 - 1, ly + 3, 2, 2, '#ffb347');
  } else {                                    // 'blocks'
    for (let i = 0; i < 10; i++) {
      const bx = x + ((i * 11 + Math.floor(T * 9)) % (w - 4));
      const by = y + 2 + ((i * 5) % (h - 6));
      r(ctx, bx, by, 3, 2, i % 3 ? n : '#e8e8f0');
    }
    r(ctx, x + 2, y + h - 4, w - 4, 1, shade(n, -50));
  }

  // CRT scanlines + a slow roll bar + curved edge shading
  ctx.globalAlpha = 0.3;
  for (let sy = 0; sy < h; sy += 2) r(ctx, x, y + sy, w, 1, '#000');
  ctx.globalAlpha = 0.10 + Math.sin(T * 31) * 0.03;
  r(ctx, x, y + ((T * 34) % (h + 20)) - 10, w, 6, '#ffffff');
  ctx.globalAlpha = 0.35 * (1 - dim) + 0.18;
  r(ctx, x, y, 1, h, '#000'); r(ctx, x + w - 1, y, 1, h, '#000');
  r(ctx, x, y, w, 1, '#000'); r(ctx, x, y + h - 1, w, 1, '#000');
  ctx.restore();
}

/* ----------------------------------------------------------------- machines */

const PATTERN_BY_MACHINE = { racing: 'racer', table: 'maze', whack: 'blocks' };

/** Which attract loop a registry entry gets. Dead machines get static or nothing. */
export function patternFor(game, i) {
  if (game.status !== 'playable') return i % 3 === 0 ? 'dead' : 'off';
  return PATTERN_BY_MACHINE[game.machine] || ['stars', 'bars', 'maze', 'blocks', 'lander'][i % 5];
}

const DEFECTS = ['고장', '수리중'];
export function defectOf(game, i) {
  return game.defect || DEFECTS[i % DEFECTS.length];
}

export function drawMachine(ctx, m, t, focus) {
  const { x, y } = m, s = m.shape, th = m.theme;
  shadow(ctx, x, y + s.d / 2, s.w, s.d);
  if (m.game.machine === 'racing') return racingCab(ctx, m, t, focus);
  if (m.game.machine === 'table') return tableCab(ctx, m, t, focus);
  if (m.game.machine === 'whack') return whackCab(ctx, m, t, focus);
  uprightCab(ctx, m, t, focus);
}

function uprightCab(ctx, m, t, focus) {
  const { x, y } = m, s = m.shape, th = m.theme;
  const dead = m.game.status !== 'playable';
  const w = s.w, front = y + s.d / 2, top = y - s.d / 2 - s.h;
  const x0 = x - w / 2;

  // body + side art
  r(ctx, x0, top, w, s.h + s.d, th.body);
  r(ctx, x0, top, w, 3, shade(th.body, 26));            // top face catches the strip light
  r(ctx, x0, top + 3, 3, s.h + s.d - 3, shade(th.body, -18));
  r(ctx, x0 + w - 3, top + 3, 3, s.h + s.d - 3, shade(th.body, -18));
  for (let i = 0; i < 3; i++) r(ctx, x0 + 4, top + 34 + i * 7, w - 8, 2, th.trim);

  // marquee — lit from behind on a live machine, a dark grey slab on a dead one
  const mq = top + 1;
  r(ctx, x0 + 1, mq, w - 2, 14, shade(th.trim, -22));
  if (dead) {
    // one tube left half-alive, stuttering on a bad ballast
    const gasp = Math.sin(t * 23 + m.phase * 11) > 0.965;
    r(ctx, x0 + 2, mq + 1, w - 4, 12, gasp ? shade(th.neon, -86) : '#191521');
    pxMarquee(ctx, m.game.title, x, mq + 1, w - 8, 12, gasp ? '#8d8794' : '#4a4552');
  } else {
    r(ctx, x0 + 2, mq + 1, w - 4, 12, shade(th.neon, -34));
    pxMarquee(ctx, m.game.title, x, mq + 1, w - 8, 12, '#f4f1e8');
    // attract bulbs chasing along the bottom of the marquee
    for (let i = 0; i < 6; i++) {
      const on = (Math.floor(t * 6) + i) % 6 < 2;
      r(ctx, x0 + 5 + i * ((w - 10) / 6), mq + 12, 2, 1, on ? '#fff2cc' : shade(th.neon, -70));
    }
  }
  r(ctx, x0 + 2, mq + 12, w - 4, 1, '#00000055');

  // bezel + CRT
  const sw = w - 12, sh = 18, sx = x - sw / 2, sy = top + 17;
  r(ctx, sx - 3, sy - 3, sw + 6, sh + 6, '#15121a');
  drawScreen(ctx, sx, sy, sw, sh, th, m.pattern, dead ? t * 0.5 : t, m.phase, dead ? 0.45 : 1);

  // control panel: overhangs, catches light, has a stick and buttons
  const cy = top + 38;
  r(ctx, x0 - 2, cy, w + 4, 9, shade(th.body, 16));
  r(ctx, x0 - 2, cy, w + 4, 2, shade(th.body, 40));
  r(ctx, x - 12, cy + 3, 3, 3, '#1a1720');
  r(ctx, x - 11, cy + 2, 2, 2, dead ? '#6b3634' : '#c93b3b');
  for (let i = 0; i < 3; i++) {
    const c = [th.neon, '#e8d34a', '#5ac8e0'][i];
    r(ctx, x - 2 + i * 6, cy + 4, 3, 2, dead ? shade(c, -70) : c);
  }

  // coin door + kick panel
  r(ctx, x - 8, top + s.h + 2, 16, 9, PAL.metalLo);
  r(ctx, x - 6, top + s.h + 4, 5, 4, dead ? '#5c4a2a' : PAL.brass);
  r(ctx, x + 1, top + s.h + 4, 5, 4, dead ? '#5c4a2a' : PAL.brass);
  r(ctx, x0, front - 4, w, 4, '#100d16');

  wear(ctx, x0, top, w, s.h + s.d, m.phase);
  if (dead) {
    damage(ctx, x0, top, w, s.h + s.d, m.phase);
    brokenNote(ctx, x, sy + 3, m.defect, m.phase);
  }

  // the stool. Nobody straightens the one in front of a dead machine.
  const skew = dead ? ((m.phase * 13) % 1 - 0.5) * 16 : 0;
  if (!m.occupied) stool(ctx, x + skew, front + 15, dead ? (skew > 0 ? 1 : -1) : 0);

  if (focus) focusRing(ctx, x, front, w, t, { x: x0, y: top, w, h: s.h + s.d });
}

/**
 * A sheet of paper taped over the screen. Someone wrote on it with a marker,
 * stuck it on crooked, and never came back.
 */
function brokenNote(ctx, x, y, text, phase) {
  const tilt = ((phase * 37) % 1 - 0.5) * 0.22;
  ctx.save();
  ctx.translate(x, y + 8);
  ctx.rotate(tilt);
  r(ctx, -15, -8, 31, 17, '#00000066');
  r(ctx, -16, -9, 31, 17, PAL.paper);
  r(ctx, -16, -9, 31, 1, '#e6ddbe');
  krText(ctx, text, -1, -6, 12, '#7a2420');
  r(ctx, -20, -12, 9, 5, '#e4dcc0aa');       // tape, top left
  r(ctx, 10, 6, 9, 5, '#e4dcc0aa');          // tape, bottom right
  ctx.restore();
}

/** Cracks, missing trim and a strip of duct tape. Only dead machines get this. */
function damage(ctx, x, y, w, h, phase) {
  const rnd = mulberry(Math.floor(phase * 4211) + 91);
  ctx.save();
  // duct tape holding a side panel on
  ctx.globalAlpha = 0.7;
  r(ctx, x + 1, y + h - 22 - rnd() * 10, w - 2, 3, '#6b6b70');
  // chipped corner showing bare chipboard
  ctx.globalAlpha = 1;
  r(ctx, x + w - 5, y + h - 8, 5, 6, '#6b5a42');
  r(ctx, x, y + 14 + rnd() * 20, 3, 5, '#5c4d3a');
  // a long scratch
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#0a0810';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 30);
  ctx.lineTo(x + w - 8, y + 30 + rnd() * 14);
  ctx.stroke();
  ctx.restore();
}

function racingCab(ctx, m, t, focus) {
  const { x, y } = m, s = m.shape, th = m.theme;
  const front = y + s.d / 2, back = y - s.d / 2, x0 = x - s.w / 2;
  // seat unit at the front
  r(ctx, x - 16, front - 26, 32, 24, shade(th.body, -14));
  r(ctx, x - 14, front - 24, 28, 8, '#2a2530');              // backrest
  r(ctx, x - 13, front - 15, 26, 12, '#39323f');             // cushion
  r(ctx, x - 13, front - 5, 26, 3, PAL.metalLo);
  // console + screen hood
  const top = back - s.h;
  r(ctx, x0, top, s.w, s.h + 14, th.body);
  r(ctx, x0, top, s.w, 3, shade(th.body, 24));
  r(ctx, x0 + 2, top + 2, s.w - 4, 12, shade(th.neon, -40));
  pxMarquee(ctx, m.game.title, x, top + 2, s.w - 8, 12, '#f4f1e8');
  const sw = s.w - 20, sh = 15, sx = x - sw / 2, sy = top + 17;
  r(ctx, sx - 3, sy - 3, sw + 6, sh + 6, '#15121a');
  drawScreen(ctx, sx, sy, sw, sh, th, 'racer', t, m.phase, 0.6);
  // wheel + pedals
  r(ctx, x - 7, top + 34, 14, 3, '#181520');
  r(ctx, x - 8, top + 33, 2, 5, '#181520');
  r(ctx, x + 6, top + 33, 2, 5, '#181520');
  r(ctx, x - 10, front - 30, 6, 4, PAL.metalLo);
  r(ctx, x + 4, front - 30, 6, 4, PAL.metalLo);
  // side pods with stripe livery
  r(ctx, x0 - 3, top + 20, 4, 22, shade(th.trim, -10));
  r(ctx, x0 + s.w - 1, top + 20, 4, 22, shade(th.trim, -10));
  wear(ctx, x0, top, s.w, s.h, m.phase);
  if (m.game.status !== 'playable') {
    damage(ctx, x0, top, s.w, s.h, m.phase);
    brokenNote(ctx, x, sy + 2, m.defect, m.phase);
  }
  if (focus) focusRing(ctx, x, front, s.w + 6, t);
}

function tableCab(ctx, m, t, focus) {
  const { x, y } = m, s = m.shape, th = m.theme;
  const x0 = x - s.w / 2, y0 = y - s.d / 2, top = y0 - s.h;
  // two stools, one each side
  stool(ctx, x, y - s.d / 2 - 16, 0);
  stool(ctx, x, y + s.d / 2 + 16, 0);
  // table body seen from above with a lit glass top
  r(ctx, x0, top, s.w, s.h + s.d, shade(th.body, -6));
  r(ctx, x0, top, s.w, 3, shade(th.body, 22));
  r(ctx, x0 + 3, top + 4, s.w - 6, s.d + s.h - 10, '#15121a');
  drawScreen(ctx, x0 + 5, top + 6, s.w - 10, s.d + s.h - 14, th, 'maze', t, m.phase, 0.7);
  r(ctx, x0 + 2, top + 2, s.w - 4, 2, PAL.metalHi);          // chrome edge
  // ashtray and a ring from a cold drink
  r(ctx, x0 + 5, top + 1, 5, 2, '#6b6470');
  ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#8a7f6a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x + s.w / 2 - 8, top + 3, 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  if (m.game.status !== 'playable') brokenNote(ctx, x, top + 8, m.defect, m.phase);
  if (focus) focusRing(ctx, x, y + s.d / 2, s.w, t);
}

function whackCab(ctx, m, t, focus) {
  const { x, y } = m, s = m.shape, th = m.theme;
  const x0 = x - s.w / 2, front = y + s.d / 2, top = y - s.d / 2 - s.h;
  // backboard with lamps
  r(ctx, x0, top, s.w, 16, shade(th.body, 10));
  r(ctx, x0 + 2, top + 2, s.w - 4, 11, shade(th.neon, -50));
  pxMarquee(ctx, m.game.title, x, top + 2, s.w - 8, 11, '#f7f3e6');
  for (let i = 0; i < 4; i++) {
    const on = Math.sin(t * 3 + i * 1.6 + m.phase) > 0;
    r(ctx, x0 + 4 + i * ((s.w - 8) / 4), top + 13, 3, 2, on ? th.neon : shade(th.neon, -90));
  }
  // sloped play deck
  r(ctx, x0, top + 16, s.w, s.h + s.d - 16, shade(th.body, -10));
  r(ctx, x0 + 2, top + 18, s.w - 4, s.h + s.d - 22, '#241f28');
  for (let i = 0; i < 5; i++) {
    const hx = x0 + 7 + (i % 3) * ((s.w - 18) / 2), hy = top + 22 + Math.floor(i / 3) * 10;
    r(ctx, hx, hy, 8, 5, '#100d14');
    const up = Math.sin(t * 2.6 + i * 2.1 + m.phase) > 0.55;
    if (up) { r(ctx, hx + 1, hy - 3, 6, 5, '#6b5a3f'); r(ctx, hx + 2, hy - 2, 1, 1, '#000'); r(ctx, hx + 5, hy - 2, 1, 1, '#000'); }
  }
  r(ctx, x0 + s.w - 12, front - 8, 10, 3, '#5a4632');        // mallet on its cord
  r(ctx, x0, front - 4, s.w, 4, '#100d16');
  if (m.game.status !== 'playable') {
    damage(ctx, x0, top, s.w, s.h, m.phase);
    brokenNote(ctx, x, top + 26, m.defect, m.phase);
  }
  if (focus) focusRing(ctx, x, front, s.w, t);
}

/** Grime pass so no two machines look factory fresh. */
function wear(ctx, x, y, w, h, phase) {
  const rnd = mulberry(Math.floor(phase * 9871) + 7);
  ctx.save();
  for (let i = 0; i < 9; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.09;
    ctx.fillStyle = rnd() < 0.5 ? '#000' : '#c9bfa8';
    ctx.fillRect(Math.round(x + rnd() * w), Math.round(y + rnd() * h), 1 + Math.round(rnd() * 3), 1 + Math.round(rnd() * 2));
  }
  ctx.restore();
}

/** The "you can use this" pool of light on the floor. Diegetic, not a UI ring. */
function focusRing(ctx, x, y, w, t, box) {
  if (box) {
    // catch-light along the cabinet edges, as if you are standing in its glow
    ctx.save();
    ctx.globalAlpha = 0.30 + Math.sin(t * 4) * 0.12;
    r(ctx, box.x - 1, box.y, 1, box.h, '#ffe9b8');
    r(ctx, box.x + box.w, box.y, 1, box.h, '#ffe9b8');
    r(ctx, box.x - 1, box.y - 1, box.w + 2, 1, '#ffe9b8');
    ctx.restore();
  }
  const pulse = 0.45 + Math.sin(t * 4) * 0.12;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = pulse * 0.5;
  const g = ctx.createRadialGradient(x, y + 12, 1, x, y + 12, w * 0.8);
  g.addColorStop(0, '#fff3d0');
  g.addColorStop(1, '#00000000');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + 12, w * 0.8, w * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // small blinking floor arrow, the way an arcade tapes one down
  const a = Math.sin(t * 5) > 0 ? 0.9 : 0.45;
  ctx.save(); ctx.globalAlpha = a;
  r(ctx, x - 3, y + 20, 6, 2, '#e8d089');
  r(ctx, x - 2, y + 18, 4, 2, '#e8d089');
  r(ctx, x - 1, y + 16, 2, 2, '#e8d089');
  ctx.restore();
}

/* -------------------------------------------------------------------- props */

export function drawProp(ctx, p, t) {
  const f = PROP_PAINTERS[p.type];
  if (!f) return;
  if (p.w) shadow(ctx, p.x, p.y + p.d / 2, p.w, p.d);
  f(ctx, p, t);
}

function stool(ctx, x, y, tilt) {
  r(ctx, x - 7, y - 10, 14, 5, '#5a2f30');
  r(ctx, x - 7, y - 6, 14, 2, '#3d1f20');
  r(ctx, x - 5 + tilt, y - 4, 2, 6, PAL.metalLo);
  r(ctx, x + 3 + tilt, y - 4, 2, 6, PAL.metalLo);
  r(ctx, x - 6 + tilt, y + 1, 12, 2, PAL.metal);
}

/**
 * Marquees for the background machines. All invented — a room full of real
 * cabinet names would be somebody else's trademarks on our wall.
 */
const DECO_TITLES = [
  'ROCK DIVER', 'NIGHT RALLY', 'ASTRO WAGON', 'JELLY BOMB', 'TIGER LANE',
  'METRO RUN', 'PANDA KICK', 'SOLAR TAXI', 'GHOST ALLEY', 'IRON MOLE',
  'SNOW DASH', 'LASER OX', 'DIZZY POP', 'TURBO MULE', 'COMET BOY'
];

const PROP_PAINTERS = {
  stool: (ctx, p) => stool(ctx, p.x, p.y, p.tilt || 0),

  // Background machines. Same construction as a registry cabinet so the rows
  // read as one continuous wall of arcade, just without an entry behind them.
  'deco-cab': (ctx, p, t) => {
    const th = { body: p.tint, trim: shade(p.tint, -20), neon: shade(p.tint, 70), screen: shade(p.tint, -46) };
    const x0 = p.x - p.w / 2, front = p.y + p.d / 2, top = p.y - p.d / 2 - p.h;
    const label = p.label || DECO_TITLES[Math.floor(p.x / 7) % DECO_TITLES.length];
    const phase = (p.x % 97) / 97;

    r(ctx, x0, top, p.w, p.h + p.d, th.body);
    r(ctx, x0, top, p.w, 3, shade(th.body, 24));
    r(ctx, x0, top + 3, 3, p.h + p.d - 3, shade(th.body, -18));
    r(ctx, x0 + p.w - 3, top + 3, 3, p.h + p.d - 3, shade(th.body, -18));

    r(ctx, x0 + 1, top + 1, p.w - 2, 14, shade(th.trim, -22));
    r(ctx, x0 + 2, top + 2, p.w - 4, 12, shade(th.neon, p.broken ? -112 : -46));
    pxMarquee(ctx, label, p.x, top + 2, p.w - 8, 12, p.broken ? '#4a4552' : '#ddd6c8');

    const sw = p.w - 12, sx = p.x - sw / 2, sy = top + 17;
    r(ctx, sx - 3, sy - 3, sw + 6, 24, '#15121a');
    drawScreen(ctx, sx, sy, sw, 18, th, p.pattern, t, phase, p.broken ? 0.3 : 0.8);

    r(ctx, x0 - 2, top + 38, p.w + 4, 9, shade(th.body, 16));
    r(ctx, x0 - 2, top + 38, p.w + 4, 2, shade(th.body, 40));
    r(ctx, p.x - 12, top + 41, 3, 3, '#1a1720');
    for (let i = 0; i < 3; i++) {
      const c = [th.neon, '#e8d34a', '#5ac8e0'][i];
      r(ctx, p.x - 2 + i * 6, top + 42, 3, 2, p.broken ? shade(c, -70) : c);
    }
    r(ctx, p.x - 8, top + p.h + 2, 16, 9, PAL.metalLo);
    r(ctx, x0, front - 4, p.w, 4, '#100d16');

    if (p.broken) {
      damage(ctx, x0, top, p.w, p.h + p.d, phase);
      brokenNote(ctx, p.x, sy + 3, p.defect || '수리중', phase);
    }
    wear(ctx, x0, top, p.w, p.h, phase);
    stool(ctx, p.x + (p.broken ? 13 : 0), front + 15, p.broken ? 1 : 0);
  },

  pinball: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    // backbox
    r(ctx, x0, top, p.w, 22, shade(p.tint, -14));
    r(ctx, x0 + 2, top + 2, p.w - 4, 17, shade(p.tint, 22));
    for (let i = 0; i < 3; i++) r(ctx, x0 + 4 + i * 8, top + 5 + (i % 2) * 4, 5, 4, shade(p.tint, 60));
    r(ctx, x0 + 3, top + 15, p.w - 6, 3, '#0d0a12');
    // playfield running away from us
    r(ctx, x0, top + 22, p.w, p.d + p.h - 22, '#1d1a24');
    r(ctx, x0 + 2, top + 24, p.w - 4, p.d + p.h - 28, shade(p.tint, -34));
    for (let i = 0; i < 5; i++) {
      const on = Math.sin(t * 4 + i * 1.3 + p.x) > 0.3;
      r(ctx, x0 + 5 + (i % 3) * 9, top + 28 + Math.floor(i / 3) * 11, 3, 3, on ? '#ffd98a' : '#6b5f45');
    }
    r(ctx, x0 + 6, top + p.h + p.d - 12, 6, 2, '#c9c4d0');
    r(ctx, x0 + p.w - 12, top + p.h + p.d - 12, 6, 2, '#c9c4d0');
    r(ctx, x0, top + p.h + p.d - 6, p.w, 6, '#120f18');
  },

  crane: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, p.h + p.d, '#2a2a34');
    r(ctx, x0 + 2, top + 2, p.w - 4, 12, '#c2452f');
    pxFit(ctx, 'PRIZE', p.x, top + 5, p.w - 8, '#f6e7c8', 2);
    // glass box
    ctx.save(); ctx.globalAlpha = 0.5; r(ctx, x0 + 3, top + 16, p.w - 6, p.h - 26, '#7fa8b8'); ctx.restore();
    r(ctx, x0 + 3, top + 16, p.w - 6, 1, '#9fc8d8');
    // plushes heaped in the bottom
    const cols = ['#d98aa8', '#e8c66a', '#7fb8a0', '#c98a5a'];
    for (let i = 0; i < 7; i++) r(ctx, x0 + 6 + (i * 7) % (p.w - 14), top + p.h - 20 + (i % 3) * 4, 6, 5, cols[i % 4]);
    // claw tracking left and right
    const cx = p.x + Math.sin(t * 0.6) * (p.w / 2 - 10);
    r(ctx, x0 + 3, top + 18, p.w - 6, 1, PAL.metal);
    r(ctx, cx - 1, top + 18, 2, 10, PAL.metalHi);
    r(ctx, cx - 3, top + 27, 6, 2, PAL.metalHi);
    r(ctx, x0, top + p.h + 2, p.w, p.d - 2, '#1e1e26');
  },

  photo: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, p.h + p.d, '#2b2430');
    r(ctx, x0, top, p.w, 4, '#3c3341');
    r(ctx, x0 + 2, top + 4, p.w - 4, 10, '#4a2c3a');
    pxFit(ctx, 'PHOTO', p.x, top + 6, p.w - 8, '#e3c9a8', 2);
    // curtain
    for (let i = 0; i < 9; i++) r(ctx, x0 + 5 + i * 6, top + 16, 4, p.h - 26, i % 2 ? '#5a2230' : '#4a1c28');
    r(ctx, x0 + 4, top + 15, p.w - 8, 2, PAL.metalLo);
    if (Math.sin(t * 0.9) > 0.94) { ctx.save(); ctx.globalAlpha = 0.5; r(ctx, x0 + 5, top + 16, p.w - 10, p.h - 26, '#fff'); ctx.restore(); }
  },

  vending: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, p.h + p.d, '#8c2f2a');
    r(ctx, x0, top, p.w, 3, '#a8443c');
    r(ctx, x0 + 3, top + 5, p.w - 12, p.h - 22, '#1d2430');
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 3; col++)
        r(ctx, x0 + 5 + col * 6, top + 8 + row * 7, 4, 5, ['#d94f4f', '#4f8cd9', '#4fd98c'][(row + col) % 3]);
    r(ctx, x0 + p.w - 8, top + 6, 6, p.h - 24, '#2a2028');
    r(ctx, x0 + p.w - 7, top + 8, 4, 3, '#e8d34a');
    r(ctx, x0 + 4, top + p.h - 12, p.w - 8, 8, '#1a1620');
  },

  jukebox: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top + 4, p.w, p.h + p.d - 4, '#4a2f22');
    r(ctx, x0 + 1, top, p.w - 2, 8, '#6b432c');
    const hue = Math.sin(t * 0.8) * 0.5 + 0.5;
    r(ctx, x0 + 3, top + 9, p.w - 6, 5, hue > 0.5 ? '#d98a3f' : '#3f8ad9');
    r(ctx, x0 + 4, top + 16, p.w - 8, 12, '#1c1620');
    for (let i = 0; i < 4; i++) r(ctx, x0 + 6 + i * 6, top + 18, 4, 8, '#3a2f42');
    r(ctx, x0 + 4, top + 30, p.w - 8, 3, '#2a2028');
  },

  // The 동전교환기 by the door: a blue steel box with a hand-lettered ₩100 plate,
  // which in a real arcade is the first thing you walk to and the last thing
  // you have any money for.
  change: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, p.h + p.d, '#2f4a7a');
    r(ctx, x0, top, p.w, 3, '#4a6ba8');
    r(ctx, x0, top + 3, 2, p.h + p.d - 3, '#22375c');
    r(ctx, x0 + p.w - 2, top + 3, 2, p.h + p.d - 3, '#22375c');

    // the sign board
    r(ctx, x0 + 2, top + 4, p.w - 4, 11, '#e8e4d4');
    krText(ctx, '동전교환기', p.x, top + 5, 8, '#1f3560');
    r(ctx, x0 + 4, top + 17, p.w - 8, 9, '#c9302c');
    krText(ctx, '100원', p.x, top + 18, 8, '#fdf3d8');

    r(ctx, x0 + 5, top + 29, p.w - 10, 3, '#0e1219');       // bill slot
    r(ctx, x0 + 6, top + 30, p.w - 12, 1, Math.sin(t * 2.4) > -0.3 ? '#5fd0a0' : '#276b52');
    r(ctx, x0 + 6, top + 35, p.w - 12, 9, '#0e1219');       // coin tray
    r(ctx, x0 + 8, top + 41, 3, 2, PAL.brass);
    r(ctx, x0 + 12, top + 41, 3, 2, PAL.brass);
    r(ctx, x0 + 17, top + 41, 3, 2, PAL.brass);
    r(ctx, x0 + 2, top + p.h - 4, p.w - 4, 6, '#22375c');
  },

  counter: (ctx, p, t) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, p.h + p.d, '#4a3a28');
    r(ctx, x0, top, p.w, 5, '#6b543a');                    // worn wooden top
    r(ctx, x0, top + 5, p.w, 2, '#2e2418');
    for (let i = 0; i < p.w; i += 14) r(ctx, x0 + i, top, 1, 5, '#5c4830');
    // token dish, a register, a jar of pens, a coffee cup
    r(ctx, x0 + 18, top - 4, 14, 5, '#6b6470');
    for (let i = 0; i < 5; i++) r(ctx, x0 + 20 + i * 2, top - 3, 2, 2, PAL.brass);
    r(ctx, x0 + 46, top - 10, 18, 11, '#3a3540');
    r(ctx, x0 + 48, top - 8, 14, 5, '#7fd0a0');
    r(ctx, x0 + 78, top - 6, 6, 7, '#8a5a3a');
    r(ctx, x0 + p.w - 30, top - 5, 5, 6, '#c9c4d0');
    // glass prize case at the far end
    ctx.save(); ctx.globalAlpha = 0.4; r(ctx, x0 + p.w - 60, top - 16, 52, 17, '#8fb8c8'); ctx.restore();
    for (let i = 0; i < 6; i++) r(ctx, x0 + p.w - 56 + i * 8, top - 8, 5, 6, ['#d98aa8', '#e8c66a', '#7fb8a0'][i % 3]);
  },

  bench: (ctx, p) => {
    const x0 = p.x - p.w / 2, top = p.y - p.d / 2 - p.h;
    r(ctx, x0, top, p.w, 8, '#5a3f2a');
    r(ctx, x0, top + 8, p.w, 3, '#3a2718');
    r(ctx, x0 + 3, top + 11, 3, 6, PAL.metalLo);
    r(ctx, x0 + p.w - 6, top + 11, 3, 6, PAL.metalLo);
  },

  plant: (ctx, p, t) => {
    const top = p.y - p.d / 2 - p.h;
    r(ctx, p.x - 8, top + p.h - 12, 16, 14, '#6b4a32');
    r(ctx, p.x - 8, top + p.h - 12, 16, 2, '#8a6242');
    const sway = Math.sin(t * 0.7 + p.x) * 1;
    for (let i = 0; i < 5; i++) {
      const a = -1.2 + i * 0.6;
      r(ctx, p.x + Math.cos(a) * 7 + sway, top + 4 + i * 3, 6, 3, i % 2 ? '#3f6b42' : '#2f5533');
    }
    r(ctx, p.x - 1, top + 6, 2, p.h - 18, '#3a5c38');
  },

  bin: (ctx, p) => {
    const top = p.y - p.d / 2 - p.h;
    r(ctx, p.x - p.w / 2, top, p.w, p.h + p.d, '#3a3f42');
    r(ctx, p.x - p.w / 2, top, p.w, 3, '#4d545a');
    r(ctx, p.x - p.w / 2 + 2, top + 1, p.w - 4, 2, '#15171c');
    r(ctx, p.x - 4, top - 3, 3, 4, '#8a8070');            // overflowing
    r(ctx, p.x + 1, top - 4, 4, 5, '#c9c4b0');
  },

  cup: (ctx, p) => { r(ctx, p.x - 2, p.y - 3, 4, 5, '#c9c4b8'); r(ctx, p.x - 2, p.y - 3, 4, 1, '#8a2b2b'); },
  bottle: (ctx, p) => { r(ctx, p.x - 4, p.y - 1, 8, 3, '#3f6b4a'); r(ctx, p.x + 3, p.y, 3, 1, '#2a4a33'); },
  flyer: (ctx, p) => { r(ctx, p.x - 4, p.y - 3, 9, 6, '#b8ae94'); r(ctx, p.x - 2, p.y - 1, 5, 1, '#5a5040'); }
};

/* -------------------------------------------------------------- signs & lights */

export function drawWallSigns(ctx, t) {
  for (const a of WALL_ART) {
    if (a.type === 'sign-main') mainSign(ctx, a, t);
    else if (a.type === 'sign-lit') litSign(ctx, a, t);
    else if (a.type === 'clock') clock(ctx, a, t);
  }
}

function mainSign(ctx, a, t) {
  const w = 176, h = 42, x0 = a.x - w / 2, y0 = a.y - h / 2;
  // painted board, not a neon slab — this arcade could not afford neon everywhere
  r(ctx, x0 - 2, y0 - 2, w + 4, h + 4, '#181420');
  r(ctx, x0, y0, w, h, '#241c2c');
  r(ctx, x0, y0, w, 2, '#3a2f42');
  // strip lights along the top and bottom, a couple of dud bulbs
  for (let i = 0; i < 22; i++) {
    const bx = x0 + 4 + i * 8;
    const dud = i === 5 || i === 14;
    const on = dud ? Math.sin(t * 17 + i) > 0.6 : Math.sin(t * 2 + i * 0.5) > -0.85;
    r(ctx, bx, y0 + 2, 3, 2, on ? '#ffe6a8' : '#5c4f38');
    r(ctx, bx, y0 + h - 4, 3, 2, on ? '#ffe6a8' : '#5c4f38');
  }
  const flick = Math.sin(t * 13) > 0.93 ? 0.55 : 1;
  ctx.save(); ctx.globalAlpha = flick;
  pxFit(ctx, 'O-ROCK-SILL', a.x, y0 + 9, w - 16, '#e8c15a', 3);
  ctx.restore();
  pxFit(ctx, 'INSERT COIN · PICK A GAME', a.x, y0 + 29, w - 16, '#9a8a6a', 1);
}

function litSign(ctx, a, t) {
  const w = 44, h = 13, x0 = a.x - w / 2, y0 = a.y - h / 2;
  const on = Math.sin(t * 9 + a.x) > -0.9;
  r(ctx, x0 - 1, y0 - 1, w + 2, h + 2, '#141018');
  r(ctx, x0, y0, w, h, on ? shade(a.tone, -104) : '#1a1620');
  pxFit(ctx, a.text, a.x, y0 + 4, w - 6, on ? a.tone : '#4a4038', 2);
}

function clock(ctx, a, t) {
  r(ctx, a.x - 11, a.y - 11, 22, 22, '#3a3038');
  r(ctx, a.x - 9, a.y - 9, 18, 18, '#cfc9b8');
  r(ctx, a.x - 1, a.y - 7, 2, 7, '#2a2418');
  r(ctx, a.x, a.y - 1, 6, 2, '#2a2418');
  r(ctx, a.x - 1, a.y - 1, 2, 2, '#8a2b2b');
}

export function drawRoomSigns(ctx, signs, t) {
  for (const s of signs) {
    if (s.type === 'exit') {
      r(ctx, s.x - 20, s.y - 7, 40, 14, '#1a1620');
      const on = Math.sin(t * 1.3) > -0.95;
      r(ctx, s.x - 18, s.y - 5, 36, 10, on ? '#3a1418' : '#241014');
      pxFit(ctx, 'EXIT', s.x, s.y - 3, 30, on ? '#ff6b5c' : '#6b3a34', 2);
    } else {
      // hanging card sign on two little chains
      r(ctx, s.x - 1, s.y - 14, 1, 6, PAL.metal);
      r(ctx, s.x + 1, s.y - 14, 1, 6, PAL.metal);
      const w = 46;
      r(ctx, s.x - w / 2, s.y - 8, w, 13, '#241c26');
      r(ctx, s.x - w / 2 + 1, s.y - 7, w - 2, 11, shade(s.tone, -100));
      if (s.kr) krText(ctx, s.text, s.x, s.y - 6, 10, s.tone);
      else pxFit(ctx, s.text, s.x, s.y - 4, w - 6, s.tone, 2);
    }
  }
}

/**
 * Light pass. Fluorescent tubes wash the room a dirty warm white; every live
 * CRT throws a coloured pool onto the floor in front of its machine.
 */
export function drawLights(ctx, lights, machines, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const L of lights) {
    let a = 0.20;
    if (L.bad) {
      const f = Math.sin(t * 21 + L.x) * Math.sin(t * 6.3 + L.y);
      a = f > 0.1 ? 0.20 : 0.05;
    }
    ctx.globalAlpha = a;
    const g = ctx.createRadialGradient(L.x, L.y, 4, L.x, L.y, L.r);
    g.addColorStop(0, '#fff0d0');
    g.addColorStop(0.55, '#6a5f52');
    g.addColorStop(1, '#00000000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(L.x, L.y, L.r, L.r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const m of machines) {
    const live = m.game.status === 'playable';
    const flick = 0.82 + Math.sin(t * 12 + m.phase * 9) * 0.06 + Math.sin(t * 3.1 + m.phase) * 0.12;
    // a dead machine throws almost nothing — that is how you spot it from across
    // the room, and the slow breathe on a live one reads as attract mode
    const breathe = live ? 1 + Math.sin(t * 1.6 + m.phase * 6) * 0.18 : 1;
    ctx.globalAlpha = (live ? 0.42 : 0.05) * flick * breathe;
    const y = m.y + m.shape.d / 2 + 6;
    const g = ctx.createRadialGradient(m.x, y, 2, m.x, y, 52);
    g.addColorStop(0, m.theme.neon);
    g.addColorStop(1, '#00000000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(m.x, y, 46, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The fluorescent battens themselves, hanging above the aisles. Drawn last
 * because they are above every machine in the room — and because a bare tube
 * on a dirty ceiling is the single strongest cue that this is a 1980s arcade
 * and not a dark stylised game level.
 */
export function drawCeiling(ctx, tubes, t) {
  for (const L of tubes) {
    const x0 = L.x - L.w / 2, y0 = L.y - 3;
    let lit = 1;
    if (L.bad) {
      const f = Math.sin(t * 17 + L.x) * Math.sin(t * 5.1 + L.y);
      lit = f > 0.05 ? 1 : (Math.random() < 0.4 ? 0.35 : 0.1);
    }
    // Its shadow on the floor, offset south. Without this the tube reads as a
    // white stick lying on the lino instead of a fitting hanging over the aisle.
    ctx.save();
    ctx.globalAlpha = 0.22;
    r(ctx, x0 + 4, y0 + 13, L.w, 3, '#000000');
    ctx.restore();

    // the batten: end caps, housing, tube
    ctx.save();
    ctx.globalAlpha = 0.5;
    r(ctx, x0 - 4, y0 - 2, 4, 8, '#4a4650');
    r(ctx, x0 + L.w, y0 - 2, 4, 8, '#4a4650');
    r(ctx, x0, y0 - 1, L.w, 2, '#3f3d46');
    r(ctx, x0, y0 + 4, L.w, 2, '#2b2930');
    // the little chains it hangs from
    r(ctx, x0 + 8, y0 - 6, 1, 5, '#57535e');
    r(ctx, x0 + L.w - 9, y0 - 6, 1, 5, '#57535e');
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.34 + lit * 0.34;
    r(ctx, x0, y0 + 1, L.w, 3, lit > 0.6 ? '#f2ecd8' : '#5f5a4c');
    ctx.restore();
    // its bloom, spilling down onto whatever is under it
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.14 * lit;
    const g = ctx.createLinearGradient(0, y0 - 10, 0, y0 + 22);
    g.addColorStop(0, '#00000000');
    g.addColorStop(0.4, '#fff2d8');
    g.addColorStop(1, '#00000000');
    ctx.fillStyle = g;
    ctx.fillRect(x0 - 12, y0 - 10, L.w + 24, 32);
    ctx.restore();
  }
}

/** Faint colour smear on the floor under each machine — cheap wet-lino reflection. */
export function drawReflections(ctx, machines) {
  ctx.save();
  ctx.globalAlpha = 0.13;
  for (const m of machines) {
    const y = m.y + m.shape.d / 2;
    const g = ctx.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, m.theme.neon);
    g.addColorStop(1, '#00000000');
    ctx.fillStyle = g;
    ctx.fillRect(m.x - m.shape.w / 2 + 3, y, m.shape.w - 6, 16);
  }
  ctx.restore();
}

/* -------------------------------------------------------------- storefront */

/**
 * The front scene: a back-street arcade at night, seen from the pavement.
 * Drawn straight into the viewport so it works at any aspect ratio.
 * `open` 0..1 slides the door open when the player goes in.
 */
export function drawStorefront(ctx, w, h, t, open = 0) {
  const gy = Math.round(h * 0.80);          // pavement line
  const bx = Math.round(w * 0.10), bw = Math.round(w * 0.80);
  const by = Math.round(h * 0.06), bh = gy - by;
  const rnd = mulberry(8801);

  // --- night sky and the block behind ---------------------------------------
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#0a0b16');
  sky.addColorStop(1, '#1c1526');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, gy);
  for (let i = 0; i < 40; i++) {
    const sx = rnd() * w, sy = rnd() * h * 0.45;
    ctx.globalAlpha = 0.2 + rnd() * 0.5;
    r(ctx, sx, sy, 1, 1, '#c8d0e8');
  }
  ctx.globalAlpha = 1;
  // neighbouring buildings, mostly dark, a few lit windows
  for (let i = 0; i < 9; i++) {
    const sx = i * (w / 9) - 6, sw2 = w / 9 + 8, sh2 = h * (0.18 + rnd() * 0.22);
    r(ctx, sx, gy - sh2, sw2, sh2, '#12101c');
    for (let k = 0; k < 5; k++) {
      if (rnd() < 0.35) r(ctx, sx + 4 + (k % 3) * 7, gy - sh2 + 6 + Math.floor(k / 3) * 9, 4, 5, '#3c3a2a');
    }
  }

  // --- the arcade itself ----------------------------------------------------
  r(ctx, bx, by, bw, bh, '#2a2230');
  r(ctx, bx, by, bw, 4, '#3a3040');
  r(ctx, bx, gy - 14, bw, 14, '#1d1824');                       // grubby base course
  for (let x = bx; x < bx + bw; x += 16) r(ctx, x, by + 4, 1, bh - 18, '#241d2a');

  // the sign board, bulbs all round it
  const sgw = Math.round(bw * 0.78), sgx = Math.round(bx + (bw - sgw) / 2), sgy = by + Math.round(bh * 0.08);
  const sgh = Math.round(Math.min(46, bh * 0.26));
  r(ctx, sgx - 2, sgy - 2, sgw + 4, sgh + 4, '#15111c');
  r(ctx, sgx, sgy, sgw, sgh, '#241a2c');
  const bulbs = Math.max(8, Math.floor(sgw / 12));
  for (let i = 0; i < bulbs; i++) {
    const bxx = sgx + 4 + i * ((sgw - 8) / bulbs);
    const dud = i === 3 || i === bulbs - 4;
    const on = dud ? Math.sin(t * 19 + i) > 0.5 : Math.sin(t * 2.4 - i * 0.6) > -0.8;
    r(ctx, bxx, sgy + 3, 3, 3, on ? '#ffe6a8' : '#4a4032');
    r(ctx, bxx, sgy + sgh - 6, 3, 3, on ? '#ffe6a8' : '#4a4032');
  }
  const flick = Math.sin(t * 11) > 0.9 ? 0.5 : 1;
  ctx.save(); ctx.globalAlpha = flick;
  pxFit(ctx, 'O-ROCK-SILL', sgx + sgw / 2, sgy + Math.round(sgh * 0.28), sgw - 16, '#f0c95e', 6);
  ctx.restore();

  // window either side of the door, posters taped inside
  const winY = sgy + sgh + 8, winH = Math.max(20, gy - winY - 40);
  for (const side of [-1, 1]) {
    const wx = bx + bw / 2 + side * (bw * 0.30) - bw * 0.10;
    const ww = bw * 0.20;
    r(ctx, wx, winY, ww, winH, '#161320');
    ctx.save(); ctx.globalAlpha = 0.30;
    r(ctx, wx + 1, winY + 1, ww - 2, winH - 2, '#5a4a6a');
    ctx.restore();
    r(ctx, wx + 3, winY + 4, ww * 0.4, winH * 0.5, side < 0 ? '#7a2530' : '#1f3a5c');
    r(ctx, wx + ww * 0.5, winY + 8, ww * 0.35, winH * 0.36, '#3d2a5c');
    r(ctx, wx, winY, ww, 2, PAL.metalLo);
  }

  // door, with warm light and machine noise leaking out
  const dw = Math.max(30, Math.round(bw * 0.16)), dx = Math.round(bx + bw / 2 - dw / 2);
  const dy = winY, dh = gy - dy;
  r(ctx, dx - 3, dy - 3, dw + 6, dh + 3, '#151220');
  const slide = Math.round(open * (dw / 2 - 2));
  r(ctx, dx, dy, dw, dh, '#0e0c14');
  ctx.save(); ctx.globalAlpha = 0.85;
  const glow = ctx.createLinearGradient(0, dy, 0, gy);
  glow.addColorStop(0, '#4a3a2a'); glow.addColorStop(1, '#7a5a32');
  ctx.fillStyle = glow; ctx.fillRect(dx + 2, dy + 2, dw - 4, dh - 4);
  ctx.restore();
  // silhouetted cabinets inside
  r(ctx, dx + 3, dy + dh * 0.35, 5, dh * 0.6, '#241c28');
  r(ctx, dx + dw - 10, dy + dh * 0.4, 6, dh * 0.55, '#241c28');
  if (Math.sin(t * 7) > 0.7) r(ctx, dx + 4, dy + dh * 0.38, 3, 4, '#7ad0e0');
  // the two glass leaves
  r(ctx, dx + 1 - slide, dy + 1, dw / 2 - 2, dh - 2, '#2b3a3c');
  r(ctx, dx + dw / 2 + 1 + slide, dy + 1, dw / 2 - 2, dh - 2, '#2b3a3c');
  ctx.save(); ctx.globalAlpha = 0.25;
  r(ctx, dx + 3 - slide, dy + 3, dw / 2 - 8, dh * 0.4, '#a8c8d8');
  ctx.restore();
  r(ctx, dx + dw / 2 - 2 - slide, dy + dh * 0.45, 2, 8, PAL.metalHi);
  r(ctx, dx + dw / 2 + 1 + slide, dy + dh * 0.45, 2, 8, PAL.metalHi);
  // opening-hours card and a sticker
  r(ctx, dx + 4 - slide, dy + dh * 0.18, 9, 6, PAL.paper);
  r(ctx, dx + dw - 12 + slide, dy + dh * 0.62, 7, 5, '#8a3a3a');

  // --- pavement -------------------------------------------------------------
  r(ctx, 0, gy, w, h - gy, '#20202a');
  r(ctx, 0, gy, w, 2, '#2e2e3a');
  for (let x = 0; x < w; x += 22) r(ctx, x, gy + 2, 1, h - gy - 2, '#1a1a24');
  ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = '#000';
  for (let i = 0; i < 40; i++) ctx.fillRect(rnd() * w, gy + rnd() * (h - gy), 2 + rnd() * 5, 1 + rnd() * 2);
  ctx.restore();

  // warm spill from the doorway across the wet pavement
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.22 + open * 0.2;
  const sp = ctx.createLinearGradient(0, gy, 0, h);
  sp.addColorStop(0, '#8a6a3a'); sp.addColorStop(1, '#00000000');
  ctx.fillStyle = sp;
  ctx.beginPath();
  ctx.moveTo(dx, gy); ctx.lineTo(dx + dw, gy);
  ctx.lineTo(dx + dw + 16, h); ctx.lineTo(dx - 16, h);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // --- streetlamp, moths, a leaning bike ------------------------------------
  const lx = Math.round(w * 0.09);
  r(ctx, lx - 1, h * 0.30, 3, gy - h * 0.30, '#2a2a34');
  r(ctx, lx - 6, h * 0.28, 13, 4, '#33333f');
  r(ctx, lx - 4, h * 0.30, 9, 3, '#e8d9a8');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.16 + Math.sin(t * 30) * 0.02;
  const lg = ctx.createRadialGradient(lx, h * 0.31, 2, lx, h * 0.31, w * 0.22);
  lg.addColorStop(0, '#ffe0a0'); lg.addColorStop(1, '#00000000');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(lx, h * 0.31, w * 0.22, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 4; i++) {
    const a = t * (1.4 + i * 0.4) + i * 2;
    r(ctx, lx + Math.cos(a) * (7 + i * 2), h * 0.31 + Math.sin(a * 1.3) * (5 + i), 1, 1, '#d8cfa8');
  }
  const bkx = Math.round(w * 0.86);
  ctx.save(); ctx.globalAlpha = 0.85;
  ctx.strokeStyle = '#3a3a46'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(bkx, gy - 5, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(bkx + 13, gy - 5, 5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  r(ctx, bkx + 2, gy - 12, 10, 1, '#4a4a58');
  r(ctx, bkx + 11, gy - 15, 1, 4, '#4a4a58');

  // vignette so the eye goes to the door
  const vg = ctx.createRadialGradient(w / 2, gy - h * 0.1, h * 0.2, w / 2, gy - h * 0.1, h * 0.85);
  vg.addColorStop(0, '#00000000');
  vg.addColorStop(1, '#000000cc');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

  return { doorX: dx + dw / 2, doorY: gy, groundY: gy };
}

/** The kid, seen from behind, a thousand-won note in one hand. */
export function drawFrontPlayer(ctx, x, y, t, walking) {
  const pal = { shirt: '#c05a4a', pants: '#33405e', hair: '#241a14' };
  drawPerson(ctx, x, y, 3, walking, t * 1.6, pal);
  if (!walking) {
    const wave = Math.sin(t * 2) * 1;
    r(ctx, x + 6, y - 15 + wave, 7, 4, '#c8b878');       // the note
    r(ctx, x + 7, y - 14 + wave, 5, 2, '#a89a5e');
  }
}

/* ---------------------------------------------------------------- guidance */

/**
 * First-visit orientation, drawn in the world so it stays part of the room
 * rather than becoming a UI layer floating over it. Two pieces:
 *
 *   나        a small tag over the player, so you know which sprite is you
 *   chevron   a bobbing pointer at arm's length, aimed at whatever you need
 *             next — the coin changer while you still have the note, the
 *             nearest live cabinet once you have coins
 *
 * Both retire for good the moment the player puts their first coin in.
 */
export function drawGuide(ctx, px, py, target, t) {
  // the "나" tag
  const bob = Math.round(Math.sin(t * 3) * 1);
  const top = py - 34 + bob;
  ctx.save();
  ctx.globalAlpha = 0.92;
  r(ctx, px - 9, top, 18, 12, '#141019');
  r(ctx, px - 9, top, 18, 1, '#4a4250');
  krText(ctx, '나', px, top + 1, 10, '#f0d78a');
  r(ctx, px - 2, top + 12, 4, 2, '#141019');
  r(ctx, px - 1, top + 14, 2, 1, '#141019');
  ctx.restore();

  if (!target) return;

  // the pointer, out at arm's length in the direction you should walk
  const dx = target.x - px, dy = target.y - py;
  const d = Math.hypot(dx, dy);
  if (d < 46) return;                       // close enough, stop nagging
  const ux = dx / d, uy = dy / d;
  const reach = 30 + Math.sin(t * 4) * 3;
  const ax = px + ux * reach, ay = py - 12 + uy * reach;

  ctx.save();
  ctx.translate(Math.round(ax), Math.round(ay));
  ctx.rotate(Math.atan2(uy, ux));
  ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.2;
  // a chunky chevron, built from pixel columns so it stays in style
  ctx.fillStyle = '#f0c95e';
  for (let i = 0; i < 5; i++) ctx.fillRect(i - 2, -(4 - i), 1, (4 - i) * 2);
  ctx.restore();
}

/* ------------------------------------------------------------------ people */

const SKIN = '#c98f6a';

/**
 * A person, 12 x 22, drawn from the front-three-quarter angle the room uses.
 * `dir` is 0 down, 1 left, 2 right, 3 up. `phase` drives the walk cycle.
 */
export function drawPerson(ctx, x, y, dir, moving, phase, pal, sitting = false) {
  const step = moving ? Math.floor(phase * 8) % 4 : 0;
  const bob = moving ? (step === 1 || step === 3 ? 1 : 0) : 0;
  const swing = moving ? [0, 1, 0, -1][step] : 0;

  if (sitting) return drawSeated(ctx, x, y, dir, phase, pal);

  const top = y - 22 + bob;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // legs
  r(ctx, x - 4, top + 14, 3, 8 - Math.abs(swing), pal.pants);
  r(ctx, x + 1, top + 14, 3, 8 - Math.abs(swing) * (swing > 0 ? 0 : 1), pal.pants);
  r(ctx, x - 4, y - 2, 3, 2, '#1a1620');
  r(ctx, x + 1, y - 2, 3, 2, '#1a1620');
  // torso
  r(ctx, x - 5, top + 6, 10, 9, pal.shirt);
  r(ctx, x - 5, top + 6, 10, 1, shade(pal.shirt, 22));
  // arms
  r(ctx, x - 7, top + 7 + swing, 2, 6, pal.shirt);
  r(ctx, x + 5, top + 7 - swing, 2, 6, pal.shirt);
  r(ctx, x - 7, top + 13 + swing, 2, 2, SKIN);
  r(ctx, x + 5, top + 13 - swing, 2, 2, SKIN);
  // head
  r(ctx, x - 4, top, 8, 7, SKIN);
  if (dir === 3) { r(ctx, x - 4, top, 8, 6, pal.hair); }
  else {
    r(ctx, x - 4, top, 8, 3, pal.hair);
    r(ctx, x - 5, top + 1, 1, 4, pal.hair);
    r(ctx, x + 4, top + 1, 1, 4, pal.hair);
    if (dir === 0) { r(ctx, x - 3, top + 4, 2, 1, '#2a1f1a'); r(ctx, x + 1, top + 4, 2, 1, '#2a1f1a'); }
    if (dir === 1) { r(ctx, x - 3, top + 4, 2, 1, '#2a1f1a'); }
    if (dir === 2) { r(ctx, x + 1, top + 4, 2, 1, '#2a1f1a'); }
  }
  r(ctx, x - 5, top + 6, 10, 1, shade(pal.hair, -10));
}

function drawSeated(ctx, x, y, dir, phase, pal) {
  const top = y - 17;
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(x, y, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  const lean = Math.sin(phase * 2) * 0.5;
  r(ctx, x - 5, top + 11, 4, 6, pal.pants);      // thighs forward
  r(ctx, x + 1, top + 11, 4, 6, pal.pants);
  r(ctx, x - 5, top + 4 + lean, 10, 8, pal.shirt);
  r(ctx, x - 7, top + 5 + lean, 2, 5, pal.shirt);
  r(ctx, x + 5, top + 5 + lean, 2, 5, pal.shirt);
  r(ctx, x - 4, top - 2 + lean, 8, 7, SKIN);
  r(ctx, x - 4, top - 2 + lean, 8, 3, pal.hair);
  r(ctx, x - 3, top + 2 + lean, 2, 1, '#2a1f1a');
  r(ctx, x + 1, top + 2 + lean, 2, 1, '#2a1f1a');
}

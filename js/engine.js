/**
 * THE ARCADE
 * ----------
 * Owns the room simulation: where the player is, what they can walk into, which
 * machine they are standing at, and the sit → coin → zoom → play → stand loop.
 *
 * It knows nothing about any individual game. A machine is whatever the registry
 * says it is, and launching one is handed off to the launcher.
 */

import { GAMES, themeOf, shapeOf } from './games.js';
import { ROOM, WALLS, PROPS, NPCS, CEILING_LIGHTS, CEILING_TUBES, ROOM_SIGNS } from './world.js';
import {
  FX, buildStaticLayer, drawMachine, drawProp, drawPerson, drawLights, drawReflections,
  drawWallSigns, drawRoomSigns, drawCeiling, drawGuide, drawStorefront, drawFrontPlayer,
  patternFor, defectOf, r
} from './art.js';
import { Sound } from './audio.js';
import { Session } from './session.js';

const WALK = 78;              // px per second
// Viewport area rather than fixed dimensions: the camera then shows the same
// amount of arcade whatever the aspect ratio, instead of cropping on phones.
// Tuned so roughly four cabinets are on screen at once — enough to explore by,
// still big enough to read a marquee.
const TARGET_PIXELS = 205000;

export const Arcade = {
  canvas: null, ctx: null,
  vw: 380, vh: 216,
  mode: 'front',              // front | walk | seating | coin | zoom | playing | unzoom | standing | mom | over
  t: 0,
  machines: [],
  solids: [],
  npcs: [],
  player: { x: ROOM.spawn.x, y: ROOM.spawn.y, dir: 3, moving: false, anim: 0, sitting: false },
  cam: { x: ROOM.spawn.x, y: ROOM.spawn.y - 40, scale: 1, shake: 0 },
  input: { ax: 0, ay: 0, keys: new Set() },
  focus: null,                // { kind:'machine'|'change', ref }
  active: null,               // machine currently being used
  autoTarget: null,
  pending: null,              // a tapped cabinet we are on our way to
  camFree: false,             // true while the player is dragging the view around
  pxScale: 1,                 // device pixels per world pixel (always an integer)
  timer: 0,
  fade: 0,
  redFlash: 0,
  doorOpen: 0,
  hooks: {},                  // filled in by main.js

  /* ------------------------------------------------------------------ setup */

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;

    this.buildMachines();
    this.buildSolids();
    this.npcs = NPCS.map((n) => ({ ...n, dir: 0, moving: false, anim: Math.random() * 10, wp: 0, wait: 0 }));
    this.staticLayer = buildStaticLayer();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    const s = Session.load();
    if (s && s.inside) {
      this.mode = 'walk';
      this.player.x = s.x; this.player.y = s.y;
      this.cam.x = s.x; this.cam.y = s.y - 40;
    }

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  /** Turn registry rows into physical objects. Missing coordinates get parked. */
  buildMachines() {
    let overflow = 0;
    this.machines = GAMES.map((game, i) => {
      const shape = shapeOf(game);
      let { x, y } = game;
      if (x == null || y == null) {          // a new game added without a position
        x = 120 + (overflow % 8) * 88;
        y = 620 + Math.floor(overflow / 8) * 90;
        overflow++;
      }
      return {
        game, shape, x, y,
        theme: themeOf(game),
        phase: (i * 0.618) % 1,
        pattern: patternFor(game, i),
        defect: defectOf(game, i),
        seat: { x: x + shape.seat.x, y: y + shape.seat.y },
        crt: { x, y: y + shape.crtY },
        occupied: false
      };
    });
  },

  buildSolids() {
    this.solids = WALLS.map((w) => ({ ...w }));
    for (const p of PROPS) {
      if (p.solid === false || !p.w) continue;
      this.solids.push({ x: p.x - p.w / 2, y: p.y - p.d / 2, w: p.w, h: p.d });
    }
    for (const m of this.machines) {
      this.solids.push({ x: m.x - m.shape.w / 2, y: m.y - m.shape.d / 2, w: m.shape.w, h: m.shape.d });
    }
    // keep the player out of the counter's serving side
    this.changeSpot = PROPS.find((p) => p.type === 'change');
  },

  resize() {
    const host = this.canvas.parentElement;
    const cw = Math.max(1, host.clientWidth), ch = Math.max(1, host.clientHeight);
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    const dw = Math.round(cw * dpr), dh = Math.round(ch * dpr);

    // The logical viewport we would like, from the target area.
    let want = Math.round(Math.sqrt(TARGET_PIXELS * (cw / ch)));
    want = Math.max(300, Math.min(780, want));

    // Render at the real device resolution with a whole number of device pixels
    // per world pixel. A low-res backing store stretched by CSS is what made the
    // room look out of focus: at a fractional scale some art pixels land on 2
    // screen pixels and their neighbours on 3, which reads as blur.
    const S = Math.max(1, Math.round(dw / want));
    this.pxScale = S;
    this.vw = Math.max(160, Math.floor(dw / S));
    this.vh = Math.max(160, Math.floor(dh / S));

    this.canvas.width = this.vw * S;
    this.canvas.height = this.vh * S;
    this.canvas.style.width = (this.vw * S / dpr) + 'px';
    this.canvas.style.height = (this.vh * S / dpr) + 'px';
    this.ctx.imageSmoothingEnabled = false;
  },

  /* ----------------------------------------------------------------- update */

  update(dt) {
    if (this.sayTimer > 0) this.sayTimer -= dt;

    if (this.mode === 'front') this.updateFront(dt);
    else if (this.mode === 'entering') this.updateEntering(dt);
    else if (this.mode === 'walk') this.updateWalk(dt);

    this.t += dt;
    if (this.timer > 0) this.timer -= dt;
    FX.blackout = Math.max(0, FX.blackout - dt * 0.8);
    this.redFlash = Math.max(0, this.redFlash - dt * 2.2);
    this.cam.shake = Math.max(0, this.cam.shake - dt * 14);

    switch (this.mode) {
      case 'mom':      this.updateMom(dt); break;
    }
    if (this.mode !== 'front' && this.mode !== 'over') this.updateNpcs(dt);
    if (this.mode !== 'playing' && this.mode !== 'front') this.updateCamera(dt);
  },

  updateFront(dt) {
    this.doorOpen = Math.max(0, this.doorOpen - dt);
  },

  updateEntering(dt) {
    this.doorOpen = Math.min(1, this.doorOpen + dt * 2);
    this.fade = Math.min(1, this.fade + dt * 1.6);
    if (this.fade >= 1) {
      this.mode = 'walk';
      this.fade = 0;
      this.player.x = ROOM.spawn.x; this.player.y = ROOM.spawn.y;
      this.cam.x = this.player.x; this.cam.y = this.player.y - 40;
      Session.patch({ inside: true });
      if (this.hooks.onArrive) this.hooks.onArrive();
    }
  },

  updateWalk(dt) {
    const p = this.player;
    let ax = this.input.ax, ay = this.input.ay;

    // tap-to-walk: steer toward the tapped spot until we arrive or get stuck
    if (this.autoTarget) {
      const a = this.autoTarget;
      const dx = a.x - p.x, dy = a.y - p.y;
      const d = Math.hypot(dx, dy);
      const moved = a.last ? Math.hypot(p.x - a.last.x, p.y - a.last.y) : 1;
      a.stuck = (a.last && moved < 0.3) ? (a.stuck || 0) + dt : 0;
      a.last = { x: p.x, y: p.y };
      if (d < 6 || a.life <= 0 || a.stuck > 1.1) {
        const gaveUp = d >= 6;
        this.autoTarget = null;
        this.resolvePending(gaveUp);
      } else {
        a.life -= dt;
        ax = dx / d; ay = dy / d;
      }
    }

    const len = Math.hypot(ax, ay);
    p.moving = len > 0.15;
    if (p.moving) {
      ax /= len; ay /= len;
      this.move(p, ax * WALK * dt, ay * WALK * dt);
      p.dir = Math.abs(ax) > Math.abs(ay) ? (ax < 0 ? 1 : 2) : (ay < 0 ? 3 : 0);
      p.anim += dt;
      if (Math.floor(p.anim * 8) !== Math.floor((p.anim - dt) * 8) && Math.floor(p.anim * 8) % 2 === 0) Sound.step();
    }
    this.updateFocus();
  },

  updateFocus() {
    const p = this.player;
    let best = null, bestD = Infinity;
    for (const m of this.machines) {
      const dx = Math.abs(p.x - m.seat.x), dy = Math.abs(p.y - m.seat.y);
      // deliberately roomy — pressing ENTER anywhere near a machine snaps you
      // onto its stool, so precise positioning is never required
      if (dx > m.shape.w / 2 + 30 || dy > 44) continue;
      const d = dx + dy;
      if (d < bestD) { bestD = d; best = { kind: 'machine', ref: m }; }
    }
    if (!best && this.changeSpot) {
      const c = this.changeSpot;
      if (Math.abs(p.x - c.x) < 46 && Math.abs(p.y - (c.y + 26)) < 40) best = { kind: 'change', ref: c };
    }
    const changed = (best && best.ref) !== (this.focus && this.focus.ref);
    this.focus = best;
    if (changed && this.hooks.onFocus) this.hooks.onFocus(best);
  },

  /** Axis-separated AABB slide. Cheap and never lets you tunnel through a cabinet. */
  move(p, dx, dy) {
    const hw = 5, hh = 4, footY = 3;       // the player's feet are the collider
    const hits = (x, y) => {
      const l = x - hw, rr = x + hw, tp = y - hh + footY, bt = y + hh + footY;
      for (const s of this.solids) {
        if (rr > s.x && l < s.x + s.w && bt > s.y && tp < s.y + s.h) return true;
      }
      return false;
    };
    if (dx && !hits(p.x + dx, p.y)) p.x += dx;
    if (dy && !hits(p.x, p.y + dy)) p.y += dy;
    p.x = Math.max(12, Math.min(ROOM.w - 12, p.x));
    p.y = Math.max(70, Math.min(ROOM.h - 8, p.y));
  },

  /* ------------------------------------------------------- the boss fight */

  startMomEvent() {
    this.mode = 'mom';
    this.momPhase = 0;
    this.timer = 1.5;
    this.input.ax = this.input.ay = 0;
    this.autoTarget = null;
    this.focus = null;
    FX.blackout = 1;
    this.redFlash = 1;
    this.cam.shake = 5;
    Sound.powerDip();
    Sound.alarm();
    if (this.hooks.onMom) this.hooks.onMom(0);
  },

  updateMom(dt) {
    const p = this.player;
    if (this.momPhase === 0) {
      // flashes, shake, every screen in the building dropping out
      if (Math.random() < 0.3) { this.redFlash = Math.max(this.redFlash, 0.7); this.cam.shake = 4; }
      FX.blackout = 1;
      if (this.timer <= 0) {
        this.momPhase = 1; this.timer = 2.8;
        Sound.door();
        if (this.hooks.onMom) this.hooks.onMom(1);
      }
    } else if (this.momPhase === 1) {
      // the dramatic pause while the text lands
      if (this.timer <= 0) {
        this.momPhase = 2; this.timer = 6;
        // Out to the south aisle first, then along it to the door. A straight
        // line from deep in the arcade walks you into a row of cabinets and the
        // march stalls there, which is not the dignified exit we are after.
        this.momPath = [{ x: p.x, y: 676 }, { x: ROOM.spawn.x, y: ROOM.spawn.y - 6 }];
        this.momStuck = 0;
        if (this.hooks.onMom) this.hooks.onMom(2);
      }
    } else if (this.momPhase === 2) {
      const tgt = this.momPath[0];
      const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy);
      const was = { x: p.x, y: p.y };
      if (d > 5 && this.timer > 0) {
        const k = Math.min(1, (WALK * 1.15 * dt) / d);
        this.move(p, dx * k, dy * k);
        p.moving = true; p.anim += dt;
        p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
        // wedged against a cabinet? take the next waypoint, or just give up
        this.momStuck = Math.hypot(p.x - was.x, p.y - was.y) < 0.4 ? this.momStuck + dt : 0;
        if (this.momStuck > 0.7) { this.momStuck = 0; this.momPath.shift(); }
      } else {
        this.momPath.shift();
      }
      if (!this.momPath.length || this.timer <= 0) {
        p.moving = false; p.dir = 0;
        this.momPhase = 3; this.timer = 1.4;
      }
    } else if (this.momPhase === 3) {
      this.fade = Math.min(1, this.fade + dt * 0.9);
      if (this.fade >= 1) {
        this.momPhase = 4;
        this.mode = 'over';
        Sound.duck(0.25, 1.2);
        if (this.hooks.onMom) this.hooks.onMom(4);
      }
    }
  },

  /* -------------------------------------------------------------- npcs, cam */

  updateNpcs(dt) {
    for (const n of this.npcs) {
      n.anim += dt;
      if (n.mode === 'walk' && n.path) {
        if (n.wait > 0) { n.wait -= dt; n.moving = false; continue; }
        const tgt = n.path[n.wp];
        const dx = tgt.x - n.x, dy = tgt.y - n.y, d = Math.hypot(dx, dy);
        if (d < 3) { n.wp = (n.wp + 1) % n.path.length; n.wait = 1 + Math.random() * 3; n.moving = false; }
        else {
          const k = (WALK * 0.55 * dt) / d;
          n.x += dx * k; n.y += dy * k;
          n.moving = true;
          n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
        }
      } else if (n.mode === 'play') {
        n.moving = false;
        n.dir = 3;
      }
    }
  },

  updateCamera(dt) {
    if (this.mode === 'zoom' || this.mode === 'unzoom') return;
    if (this.camFree && this.mode === 'walk') { this.clampCam(); return; }
    const p = this.player;
    const tx = p.x, ty = p.y - 40;
    const k = 1 - Math.pow(0.0025, dt);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.scale += (1 - this.cam.scale) * k;
    this.clampCam();
  },

  clampCam() {
    const halfW = this.vw / (2 * this.cam.scale), halfH = this.vh / (2 * this.cam.scale);
    if (ROOM.w > halfW * 2) this.cam.x = Math.max(halfW, Math.min(ROOM.w - halfW, this.cam.x));
    else this.cam.x = ROOM.w / 2;
    if (ROOM.h > halfH * 2) this.cam.y = Math.max(halfH, Math.min(ROOM.h - halfH, this.cam.y));
    else this.cam.y = ROOM.h / 2;
  },

  /* ------------------------------------------------------------------ draw */

  draw() {
    const ctx = this.ctx;
    const S = this.pxScale || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.mode === 'front' || this.mode === 'entering') {
      ctx.setTransform(S, 0, 0, S, 0, 0);
      const g = drawStorefront(ctx, this.vw, this.vh, this.t, this.doorOpen);
      drawFrontPlayer(ctx, g.doorX + 26, g.groundY + 12, this.t, this.mode === 'entering');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.drawFade();
      return;
    }

    const sh = this.cam.shake;
    const ox = sh ? (Math.random() - 0.5) * sh * 2 : 0;
    const oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;

    // Whole device pixels for the camera offset too — a fractional translate
    // would smear every sprite in the room no matter how crisp the scale is.
    const k = S * this.cam.scale;
    const tx = Math.round((this.vw / 2 + ox) * S - this.cam.x * k);
    const ty = Math.round((this.vh / 2 + oy) * S - this.cam.y * k);
    ctx.save();
    ctx.setTransform(k, 0, 0, k, tx, ty);

    ctx.drawImage(this.staticLayer, 0, 0);
    drawReflections(ctx, this.machines);
    drawWallSigns(ctx, this.t);
    drawRoomSigns(ctx, ROOM_SIGNS, this.t);

    // painter's algorithm on the front edge of each footprint
    const items = [];
    for (const p of PROPS) items.push({ y: p.y + (p.d || 0) / 2, draw: () => drawProp(ctx, p, this.t) });
    for (const m of this.machines) {
      const focused = this.focus && this.focus.kind === 'machine' && this.focus.ref === m;
      items.push({ y: m.y + m.shape.d / 2, draw: () => drawMachine(ctx, m, this.t, focused) });
    }
    for (const n of this.npcs) {
      items.push({ y: n.y, draw: () => drawPerson(ctx, n.x, n.y, n.dir, n.moving, n.anim, n, n.mode === 'sit') });
    }
    const p = this.player;
    items.push({
      y: p.y + (p.sitting ? -2 : 0),
      draw: () => drawPerson(ctx, p.x, p.y, p.dir, p.moving, p.anim, PLAYER_PAL, p.sitting)
    });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    drawLights(ctx, CEILING_LIGHTS, this.machines, this.t);
    if (this.mode === 'walk' && !Session.played) {
      drawGuide(ctx, p.x, p.y, this.guideTarget(), this.t);
    }
    drawCeiling(ctx, CEILING_TUBES, this.t);
    if (this.mode === 'mom' && this.momPhase >= 1) this.drawDoorSpotlight(ctx);

    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.redFlash > 0.01) {
      ctx.fillStyle = `rgba(200,30,30,${this.redFlash * 0.5})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    this.drawFade();
  },

  /** The doorway lighting up like a boss arena. */
  drawDoorSpotlight(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.5 + Math.sin(this.t * 6) * 0.18;
    ctx.globalAlpha = pulse;
    const g = ctx.createRadialGradient(480, 730, 6, 480, 730, 190);
    g.addColorStop(0, '#ffd9a0');
    g.addColorStop(0.5, '#8a3a2a');
    g.addColorStop(1, '#00000000');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(480, 720, 190, 150, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // a very large silhouette filling the doorway
    ctx.save();
    ctx.globalAlpha = 0.9;
    r(ctx, 452, 640, 56, 96, '#120d14');
    r(ctx, 462, 616, 36, 30, '#120d14');
    r(ctx, 440, 664, 14, 44, '#120d14');
    r(ctx, 506, 664, 14, 44, '#120d14');
    ctx.restore();
  },

  drawFade() {
    if (this.fade > 0.001) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade)})`;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },

  /* ------------------------------------------------------------- commands */

  enter() {
    if (this.mode !== 'front') return;
    this.mode = 'entering';
    this.doorOpen = 0;
    this.fade = 0;
    Sound.start();
    Sound.door();
  },

  /** Enter / Space / the A button / tapping the prompt. */
  interact() {
    if (this.mode !== 'walk') return;
    const f = this.focus;
    if (!f) return;

    if (f.kind === 'change') {
      if (Session.exchanged) { this.say('이미 다 바꿨다.', 1.8); Sound.deny(); return; }
      Session.exchange();
      Sound.exchange();
      this.say('₩1,000 → ₩100 열 개. 이제 게임기를 누르자.', 3.2);
      if (this.hooks.onCoins) this.hooks.onCoins();
      if (this.hooks.onFocus) this.hooks.onFocus(this.focus);   // relabel the plate
      return;
    }

    const m = f.ref;
    if (m.game.status !== 'playable') {
      Sound.deny();
      this.say('고장난 것 같다.', 2.0);
      return;
    }
    this.directPlay(m);
  },

  directPlay(m) {
    if (Session.coins <= 0) {
      if (!Session.exchanged) {
        Session.exchange();
        Sound.exchange();
        if (this.hooks.onCoins) this.hooks.onCoins();
      } else {
        this.outOfMoney();
        return;
      }
    }
    
    Session.spend();
    Sound.coin();
    if (this.hooks.onCoins) this.hooks.onCoins();
    
    this.player.x = m.seat.x;
    this.player.y = m.seat.y;
    this.cam.x = m.seat.x;
    this.cam.y = m.seat.y - 40;
    this.updateFocus();

    window.open(m.game.url, '_blank');
  },

  /** Walk to a point the player tapped, and pick up any machine there. */
  walkTo(wx, wy) {
    if (this.mode !== 'walk') return;
    this.pending = null;
    this.followPlayer();
    this.autoTarget = { x: wx, y: wy, life: 6 };
  },

  /** Screen point → world point, honouring the current camera. */
  toWorld(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const px = ((sx - rect.left) / rect.width) * this.vw;
    const py = ((sy - rect.top) / rect.height) * this.vh;
    return {
      x: this.cam.x + (px - this.vw / 2) / this.cam.scale,
      y: this.cam.y + (py - this.vh / 2) / this.cam.scale
    };
  },

  /**
   * Drag anywhere on the floor to look around without walking. Used on touch,
   * where holding a stick to travel is miserable and unnecessary — you browse
   * the room with your thumb and tap the machine you want.
   */
  panBy(dxCss, dyCss) {
    if (this.mode !== 'walk') return;
    const rect = this.canvas.getBoundingClientRect();
    const perCss = this.vw / rect.width / this.cam.scale;
    this.camFree = true;
    this.cam.x -= dxCss * perCss;
    this.cam.y -= dyCss * perCss;
    this.clampCam();
  },

  /** Hand the camera back to the player. */
  followPlayer() { this.camFree = false; },

  /** Whatever interactive thing was tapped on screen — its body or its stool. */
  pick(wx, wy) {
    for (const m of this.machines) {
      const s = m.shape;
      if (wx > m.x - s.w / 2 - 6 && wx < m.x + s.w / 2 + 6 &&
          wy > m.y - s.d / 2 - s.h && wy < m.y + s.seat.y + 16) return { kind: 'machine', ref: m };
    }
    const c = this.changeSpot;
    if (c && wx > c.x - c.w / 2 - 8 && wx < c.x + c.w / 2 + 8 &&
        wy > c.y - c.d / 2 - c.h && wy < c.y + c.d / 2 + 30) return { kind: 'change', ref: c };
    return null;
  },

  /**
   * Tapping a machine is a complete instruction, not a request to walk there.
   * We head over, change the note on the way if that has not happened yet, and
   * sit down on arrival — and if the route is blocked we simply step onto the
   * stool rather than leaving the player stranded. Walking is always optional.
   */
  tapTarget(hit) {
    if (this.mode !== 'walk' || !hit) return;
    this.followPlayer();
    if (hit.kind === 'change') {
      this.pending = { stage: 'change', machine: null };
      this.autoTarget = { x: this.changeSpot.x, y: this.changeSpot.y + 26, life: 5 };
      return;
    }
    const m = hit.ref;
    if (m.game.status === 'playable') return; // Handled by directPlay

    this.pending = { stage: 'broken', machine: m };
    this.autoTarget = { x: m.seat.x, y: m.seat.y, life: 5 };
  },

  resolvePending(gaveUp) {
    const q = this.pending;
    if (!q) return;

    if (q.stage === 'change') {
      if (gaveUp) { this.player.x = this.changeSpot.x; this.player.y = this.changeSpot.y + 26; }
      this.updateFocus();
      if (!Session.exchanged) {
        Session.exchange();
        Sound.exchange();
        this.say('₩1,000 → ₩100 열 개.', 2.4);
        if (this.hooks.onCoins) this.hooks.onCoins();
        if (this.hooks.onFocus) this.hooks.onFocus(this.focus);
      }
      this.pending = null;
      return;
    }

    const m = q.machine;
    this.pending = null;
    if (gaveUp) { this.player.x = m.seat.x; this.player.y = m.seat.y; }
    this.updateFocus();
    if (m.game.status !== 'playable') { Sound.deny(); this.say('고장난 것 같다.', 2.0); return; }
  },

  /**
   * No coins and no note left means the day is simply over — end it, so the
   * player gets a fresh ₩1,000. Saying "동전이 없다" and doing nothing leaves
   * them tapping cabinets forever with no way out, which is exactly what it
   * looked like: walk up to a machine, stop, nothing happens.
   */
  outOfMoney() {
    this.say('동전이 다 떨어졌다.', 2.2);
    Sound.deny();
    this.startMomEvent();
  },

  /** Manual input always wins: cancel whatever we were walking toward. */
  cancelAuto() { this.autoTarget = null; this.pending = null; this.followPlayer(); },

  /**
   * Where a lost first-time visitor should be heading: the coin changer while
   * they still have the note, otherwise the nearest machine that actually works.
   */
  guideTarget() {
    if (Session.played) return null;
    if (!Session.exchanged) {
      const c = this.changeSpot;
      return c ? { x: c.x, y: c.y + 26 } : null;
    }
    let best = null, bestD = Infinity;
    for (const m of this.machines) {
      if (m.game.status !== 'playable') continue;
      const d = Math.hypot(m.seat.x - this.player.x, m.seat.y - this.player.y);
      if (d < bestD) { bestD = d; best = m; }
    }
    return best ? { x: best.seat.x, y: best.seat.y } : null;
  },

  say(text, seconds) { if (this.hooks.onSay) this.hooks.onSay(text, seconds); },

  restart() {
    Session.reset();
    this.pending = null;
    this.camFree = false;
    this.mode = 'front';
    this.momPhase = 0;
    this.fade = 0;
    this.redFlash = 0;
    FX.blackout = 0;
    this.doorOpen = 0;
    this.active = null;
    this.focus = null;
    this.player = { x: ROOM.spawn.x, y: ROOM.spawn.y, dir: 3, moving: false, anim: 0, sitting: false };
    this.cam = { x: ROOM.spawn.x, y: ROOM.spawn.y - 40, scale: 1, shake: 0 };
    for (const m of this.machines) m.occupied = false;
    Sound.unduck(0.6);
  }
};

const PLAYER_PAL = { shirt: '#c05a4a', pants: '#33405e', hair: '#241a14' };

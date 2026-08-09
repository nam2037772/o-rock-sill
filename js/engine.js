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
  drawWallSigns, drawRoomSigns, drawCeiling, drawStorefront, drawFrontPlayer,
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
    const cw = host.clientWidth, chh = host.clientHeight;
    const aspect = cw / chh;
    let vw = Math.round(Math.sqrt(TARGET_PIXELS * aspect));
    vw = Math.max(300, Math.min(780, vw));
    let vh = Math.round(vw / aspect);
    if (vh > 780) { vh = 780; vw = Math.round(vh * aspect); }
    if (vh < 240) { vh = 240; vw = Math.round(vh * aspect); }
    this.vw = vw; this.vh = vh;
    const dpr = 1;                      // we want chunky pixels, not device pixels
    this.canvas.width = vw * dpr;
    this.canvas.height = vh * dpr;
    this.ctx.imageSmoothingEnabled = false;
  },

  /* ----------------------------------------------------------------- update */

  update(dt) {
    this.t += dt;
    if (this.timer > 0) this.timer -= dt;
    FX.blackout = Math.max(0, FX.blackout - dt * 0.8);
    this.redFlash = Math.max(0, this.redFlash - dt * 2.2);
    this.cam.shake = Math.max(0, this.cam.shake - dt * 14);

    switch (this.mode) {
      case 'front':    this.doorOpen = Math.max(0, this.doorOpen - dt); break;
      case 'entering': this.updateEntering(dt); break;
      case 'walk':     this.updateWalk(dt); break;
      case 'seating':  this.updateSeating(dt); break;
      case 'coin':     this.updateCoin(dt); break;
      case 'zoom':     this.updateZoom(dt); break;
      case 'playing':  break;
      case 'unzoom':   this.updateUnzoom(dt); break;
      case 'standing': this.updateStanding(dt); break;
      case 'mom':      this.updateMom(dt); break;
    }
    if (this.mode !== 'front' && this.mode !== 'over') this.updateNpcs(dt);
    if (this.mode !== 'playing' && this.mode !== 'front') this.updateCamera(dt);
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
      this.say('₩1,000짜리 한 장. 동전으로 바꿔야 한다.', 3.4);
    }
  },

  updateWalk(dt) {
    const p = this.player;
    let ax = this.input.ax, ay = this.input.ay;

    // tap-to-walk: steer toward the tapped spot until we arrive or get stuck
    if (this.autoTarget) {
      const dx = this.autoTarget.x - p.x, dy = this.autoTarget.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 5 || this.autoTarget.life <= 0) this.autoTarget = null;
      else {
        this.autoTarget.life -= dt;
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
      if (dx > m.shape.w / 2 + 24 || dy > 30) continue;
      const d = dx + dy;
      if (d < bestD) { bestD = d; best = { kind: 'machine', ref: m }; }
    }
    if (!best && this.changeSpot) {
      const c = this.changeSpot;
      if (Math.abs(p.x - c.x) < 40 && Math.abs(p.y - (c.y + 26)) < 28) best = { kind: 'change', ref: c };
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

  updateSeating(dt) {
    const p = this.player, m = this.active;
    const tx = m.seat.x, ty = m.seat.y;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    if (d > 2) {
      const k = Math.min(1, (WALK * 1.5 * dt) / d);
      p.x += dx * k; p.y += dy * k;
      p.moving = true; p.anim += dt;
      p.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    } else {
      p.x = tx; p.y = ty; p.moving = false; p.dir = 3;
      if (!p.sitting) {
        p.sitting = true;
        m.occupied = true;
        Sound.button();
        this.timer = 0.45;
      }
      if (this.timer <= 0) {
        this.mode = 'coin';
        this.timer = 0.55;
        if (this.hooks.onSeated) this.hooks.onSeated(m);
      }
    }
  },

  updateCoin(dt) {
    // the beat where you actually put the coin in
    if (this.timer > 0) return;
    if (!this.coinDropped) {
      this.coinDropped = true;
      Session.spend();
      Sound.coin();
      this.timer = 0.7;
      if (this.hooks.onCredit) this.hooks.onCredit();
      return;
    }
    Sound.credit();
    this.coinDropped = false;
    this.mode = 'zoom';
    this.timer = 1.0;
    this.zoomFrom = { x: this.cam.x, y: this.cam.y, scale: this.cam.scale };
  },

  updateZoom(dt) {
    const m = this.active;
    const k = 1 - Math.max(0, this.timer) / 1.0;
    const e = k * k * (3 - 2 * k);                 // smoothstep
    this.cam.x = this.zoomFrom.x + (m.crt.x - this.zoomFrom.x) * e;
    this.cam.y = this.zoomFrom.y + (m.crt.y - this.zoomFrom.y) * e;
    this.cam.scale = this.zoomFrom.scale + (3.4 - this.zoomFrom.scale) * e;
    this.fade = Math.max(0, (e - 0.7) / 0.3);
    if (this.timer <= 0) {
      this.mode = 'playing';
      this.fade = 1;
      Sound.duck();
      if (this.hooks.onLaunch) this.hooks.onLaunch(m);
    }
  },

  updateUnzoom(dt) {
    const k = 1 - Math.max(0, this.timer) / 0.9;
    const e = k * k * (3 - 2 * k);
    const m = this.active;
    this.cam.x = m.crt.x + (m.seat.x - m.crt.x) * e;
    this.cam.y = m.crt.y + (m.seat.y - 40 - m.crt.y) * e;
    this.cam.scale = 3.4 + (1 - 3.4) * e;
    this.fade = Math.max(0, 1 - k * 2.2);
    if (this.timer <= 0) {
      this.mode = 'standing';
      this.timer = 0.5;
      this.fade = 0;
    }
  },

  updateStanding(dt) {
    const p = this.player, m = this.active;
    if (this.timer > 0.2) return;
    if (p.sitting) {
      p.sitting = false;
      m.occupied = false;
      Sound.button();
      // step back off the stool into the aisle
      this.autoTarget = { x: m.seat.x, y: Math.min(ROOM.h - 30, m.seat.y + 22), life: 1.2 };
    }
    if (this.timer <= 0) {
      this.mode = 'walk';
      this.active = null;
      Session.patch({ x: p.x, y: p.y });
      if (Session.coins <= 0) this.startMomEvent();
      else if (this.hooks.onStood) this.hooks.onStood();
    }
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07060b';
    ctx.fillRect(0, 0, this.vw, this.vh);

    if (this.mode === 'front' || this.mode === 'entering') {
      const g = drawStorefront(ctx, this.vw, this.vh, this.t, this.doorOpen);
      drawFrontPlayer(ctx, g.doorX + 26, g.groundY + 12, this.t, this.mode === 'entering');
      this.drawFade();
      return;
    }

    const sh = this.cam.shake;
    const ox = sh ? (Math.random() - 0.5) * sh * 2 : 0;
    const oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;

    ctx.save();
    ctx.translate(this.vw / 2 + ox, this.vh / 2 + oy);
    ctx.scale(this.cam.scale, this.cam.scale);
    ctx.translate(-this.cam.x, -this.cam.y);

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
    drawCeiling(ctx, CEILING_TUBES, this.t);
    if (this.mode === 'mom' && this.momPhase >= 1) this.drawDoorSpotlight(ctx);

    ctx.restore();

    if (this.redFlash > 0.01) {
      ctx.fillStyle = `rgba(200,30,30,${this.redFlash * 0.5})`;
      ctx.fillRect(0, 0, this.vw, this.vh);
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
      this.ctx.fillStyle = `rgba(0,0,0,${Math.min(1, this.fade)})`;
      this.ctx.fillRect(0, 0, this.vw, this.vh);
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
      this.say('₩1,000 → ₩100 열 개.', 2.6);
      if (this.hooks.onCoins) this.hooks.onCoins();
      return;
    }

    const m = f.ref;
    if (m.game.status !== 'playable') {
      Sound.deny();
      this.say('고장난 것 같다.', 2.0);
      return;
    }
    if (Session.coins <= 0) {
      Sound.deny();
      this.say(Session.exchanged ? '동전이 없다.' : '동전부터 바꿔야 한다.', 2.4);
      return;
    }
    this.sitAt(m);
  },

  sitAt(m) {
    this.active = m;
    this.mode = 'seating';
    this.autoTarget = null;
    this.coinDropped = false;
    Session.patch({ x: this.player.x, y: this.player.y, machine: m.game.id });
    if (this.hooks.onSit) this.hooks.onSit(m);
  },

  /** Called by the launcher when the player leaves a game. */
  returnFromGame() {
    if (this.mode !== 'playing') return;
    this.mode = 'unzoom';
    this.timer = 0.9;
    Sound.unduck();
  },

  /** Walk to a point the player tapped, and pick up any machine there. */
  walkTo(wx, wy) {
    if (this.mode !== 'walk') return;
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

  /** Which machine, if any, was tapped on screen. */
  pick(wx, wy) {
    for (const m of this.machines) {
      const s = m.shape;
      if (wx > m.x - s.w / 2 - 4 && wx < m.x + s.w / 2 + 4 &&
          wy > m.y - s.d / 2 - s.h && wy < m.y + s.seat.y + 12) return m;
    }
    return null;
  },

  say(text, seconds) { if (this.hooks.onSay) this.hooks.onSay(text, seconds); },

  restart() {
    Session.reset();
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

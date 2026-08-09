/**
 * BOOT
 * ----
 * Wires the three pieces together: the room (engine), the chrome (ui) and the
 * cabinet a game runs inside (launcher). Nothing game-specific lives here —
 * adding a machine means adding a row to games.js and nothing else.
 */

import { Arcade } from './engine.js';
import { UI } from './ui.js';
import { Launcher } from './launcher.js';
import { Sound } from './audio.js';
import { Session } from './session.js';

const canvas = document.getElementById('scene');

Arcade.init(canvas);
UI.init(Arcade);
Launcher.init(() => Arcade.returnFromGame());

/* ------------------------------------------------------------------- hooks */

Arcade.hooks = {
  onFocus: (f) => UI.setFocus(f),
  onSay: (text, secs) => UI.say(text, secs),
  onCoins: () => UI.paintWallet(),
  onSit: () => UI.hidePlacard(),
  onCredit: () => { UI.paintWallet(); UI.say('CREDIT 1', 1.4); },
  onLaunch: (m) => Launcher.open(m.game),
  onStood: () => Arcade.updateFocus(),
  onMom: (phase) => UI.momBeat(phase)
};

/* ------------------------------------------------------------------- input */

const HELD = new Set();
const AXIS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1]
};

function applyAxis() {
  let ax = 0, ay = 0;
  for (const code of HELD) {
    const a = AXIS[code];
    if (a) { ax += a[0]; ay += a[1]; }
  }
  Arcade.input.ax = Math.max(-1, Math.min(1, ax));
  Arcade.input.ay = Math.max(-1, Math.min(1, ay));
  if (ax || ay) Arcade.autoTarget = null;
}

addEventListener('keydown', (e) => {
  if (Launcher.isOpen()) return;             // the game has the keyboard
  if (AXIS[e.code]) {
    HELD.add(e.code);
    applyAxis();
    e.preventDefault();
    firstGesture();
    return;
  }
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') {
    e.preventDefault();
    firstGesture();
    if (Arcade.mode === 'front') Arcade.enter();
    else if (Arcade.mode === 'over') UI.restart();
    else Arcade.interact();
  }
});

addEventListener('keyup', (e) => {
  if (AXIS[e.code]) { HELD.delete(e.code); applyAxis(); }
});

addEventListener('blur', () => { HELD.clear(); applyAxis(); });

/* --------------------------------------------------------------- tap to go */

let down = null;
canvas.addEventListener('pointerdown', (e) => {
  firstGesture();
  down = { x: e.clientX, y: e.clientY, t: performance.now() };
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  const quick = performance.now() - down.t < 500;
  down = null;
  if (!quick || moved > 12) return;

  if (Arcade.mode === 'front') { Arcade.enter(); return; }
  if (Arcade.mode !== 'walk') return;

  const w = Arcade.toWorld(e.clientX, e.clientY);
  const m = Arcade.pick(w.x, w.y);
  if (m) Arcade.walkTo(m.seat.x, m.seat.y);          // auto-snap to the stool
  else Arcade.walkTo(w.x, w.y);
});

/* ------------------------------------------------------- audio gate + misc */

let gated = false;
function firstGesture() {
  if (gated) return;
  gated = true;
  Sound.start();
  Sound.setOn(UI.soundOn);
}
addEventListener('pointerdown', firstGesture, { once: true });

// coming back to the tab should not leave the music ducked or suspended
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') Sound.resume();
});

// deep link: index.html#star-swarm drops you at that machine
const wanted = location.hash.slice(1);
if (wanted) {
  const m = Arcade.machines.find((x) => x.game.id === wanted);
  if (m) {
    Session.patch({ inside: true });
    Arcade.mode = 'walk';
    Arcade.player.x = m.seat.x;
    Arcade.player.y = m.seat.y + 18;
    Arcade.cam.x = Arcade.player.x;
    Arcade.cam.y = Arcade.player.y - 40;
    UI.enteredArcade();
  }
}

// the engine flips to 'walk' on its own after the door animation
let wasFront = Arcade.mode === 'front';
setInterval(() => {
  const isFront = Arcade.mode === 'front' || Arcade.mode === 'entering';
  if (wasFront && !isFront) { UI.enteredArcade(); UI.paintWallet(); }
  wasFront = isFront;
}, 120);

// handy from the browser console, and what the smoke tests poke at
window.__arcade = Arcade;
window.__session = Session;
window.__launcher = Launcher;

// restored mid-session by a refresh
if (Session.inside && Arcade.mode === 'walk') {
  UI.enteredArcade();
  UI.paintWallet();
  wasFront = false;
}

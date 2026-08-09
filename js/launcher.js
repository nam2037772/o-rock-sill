/**
 * THE CABINET
 * -----------
 * The shared launch/return system. A game never replaces the page — it is
 * mounted inside the cabinet the player is sitting at, in an iframe behind a
 * CRT bezel. The arcade keeps running underneath, which is why standing up
 * puts you back on the same stool with the same coins in your pocket.
 *
 * Every machine gets the same two controls, so no individual game has to
 * implement them: 다시하기 (retry) and 오락실로 (back to the arcade).
 *
 * Games may optionally talk to the cabinet with postMessage:
 *   parent.postMessage({ type: 'orocksill:exit' }, '*')      -- stand up
 *   parent.postMessage({ type: 'orocksill:gameover' }, '*')  -- offer retry/exit
 * Nothing is required: a plain static game works untouched.
 */

import { Sound } from './audio.js';

export const Launcher = {
  el: null, frame: null, titleEl: null, overEl: null,
  game: null,
  onExit: null,

  init(onExit) {
    this.onExit = onExit;
    this.el = document.getElementById('cabinet');
    this.frame = document.getElementById('game-frame');
    this.titleEl = document.getElementById('cab-title');
    this.overEl = document.getElementById('cab-over');

    document.getElementById('cab-retry').addEventListener('click', () => this.retry());
    document.getElementById('cab-exit').addEventListener('click', () => this.exit());
    document.getElementById('over-retry').addEventListener('click', () => this.retry());
    document.getElementById('over-exit').addEventListener('click', () => this.exit());

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); this.exit(); }
    });

    // a game inside the frame can ask to be let out
    window.addEventListener('message', (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object' || !this.isOpen()) return;
      if (d.type === 'orocksill:exit') this.exit();
      else if (d.type === 'orocksill:gameover') this.showGameOver();
    });
  },

  isOpen() { return this.el && this.el.classList.contains('is-open'); },

  open(game) {
    this.game = game;
    this.titleEl.textContent = `${game.title}  ${game.year}`;
    this.overEl.hidden = true;
    this.el.classList.add('is-open');
    this.el.setAttribute('aria-hidden', 'false');
    this.frame.src = game.url;
    // let the game have the keyboard straight away
    setTimeout(() => { try { this.frame.focus(); } catch {} }, 220);
  },

  retry() {
    if (!this.game) return;
    Sound.button();
    this.overEl.hidden = true;
    this.frame.src = 'about:blank';
    setTimeout(() => { this.frame.src = this.game.url; try { this.frame.focus(); } catch {} }, 60);
  },

  exit() {
    if (!this.isOpen()) return;
    Sound.button();
    this.overEl.hidden = true;
    this.el.classList.remove('is-open');
    this.el.setAttribute('aria-hidden', 'true');
    this.frame.src = 'about:blank';
    this.game = null;
    if (this.onExit) this.onExit();
  },

  showGameOver() { this.overEl.hidden = false; }
};

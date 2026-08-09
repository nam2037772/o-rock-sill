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
  el: null, link: null, titleEl: null,
  game: null,
  onExit: null,

  init(onExit) {
    this.onExit = onExit;
    this.el = document.getElementById('cabinet');
    this.link = document.getElementById('game-link');
    this.titleEl = document.getElementById('cab-title');

    document.getElementById('cab-exit').addEventListener('click', () => this.exit());

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); this.exit(); }
    });
  },

  isOpen() { return this.el && this.el.classList.contains('is-open'); },

  open(game) {
    this.game = game;
    this.titleEl.textContent = `${game.title}  ${game.year}`;
    this.el.classList.add('is-open');
    this.el.setAttribute('aria-hidden', 'false');
    this.link.href = game.url;
  },

  exit() {
    if (!this.isOpen()) return;
    Sound.button();
    this.el.classList.remove('is-open');
    this.el.setAttribute('aria-hidden', 'true');
    this.game = null;
    if (this.onExit) this.onExit();
  }
};

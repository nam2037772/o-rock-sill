/**
 * THE CHROME
 * ----------
 * Everything drawn in DOM rather than on the canvas: the wallet, the plate on
 * the machine you are standing at, the one-line things the player thinks, the
 * touch stick, and the two full-screen story beats.
 *
 * It only ever reads engine state and calls engine commands.
 */

import { Session, COINS_PER_BILL } from './session.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);

export const UI = {
  arcade: null,
  sayTimer: 0,

  init(arcade) {
    this.arcade = arcade;
    this.el = {
      hud: $('hud'), sound: $('sound-btn'),
      placard: $('placard'), plTitle: $('pl-title'), plYear: $('pl-year'),
      plGenre: $('pl-genre'), plDesc: $('pl-desc'), plGo: $('pl-go'),
      say: $('say'), touch: $('touchhint'),
      mom: $('mom'), over: $('over'), overStat: $('over-stat'), again: $('again-btn')
    };

    this.el.plGo.addEventListener('click', (e) => { e.stopPropagation(); arcade.interact(); });
    this.el.again.addEventListener('click', () => this.restart());

    // sound preference survives between visits
    const pref = localStorage.getItem('orocksill.sound');
    this.soundOn = pref !== 'off';
    Sound.on = this.soundOn;
    this.paintSound();
    this.el.sound.addEventListener('click', () => {
      this.soundOn = !this.soundOn;
      Sound.setOn(this.soundOn);
      localStorage.setItem('orocksill.sound', this.soundOn ? 'on' : 'off');
      this.paintSound();
    });

    this.paintWallet();
  },

  /* ------------------------------------------------------------------ hud */

  paintSound() {
    this.el.sound.setAttribute('aria-pressed', String(this.soundOn));
    this.el.sound.textContent = this.soundOn ? '♪ ON' : '♪ OFF';
  },

  paintWallet() {
  },

  /* -------------------------------------------------------------- placard */

  setFocus(f) {
    const p = this.el.placard;
    if (!f) { p.hidden = true; return; }

    if (f.kind === 'change') {
      p.hidden = false;
      p.classList.remove('dead');
      this.el.plTitle.textContent = '동전교환기';
      this.el.plYear.textContent = '';
      this.el.plGenre.textContent = 'CHANGE MACHINE';
      this.el.plDesc.textContent = '지금은 사용할 필요가 없다.';
      this.el.plGo.textContent = '사용 불필요';
      this.el.plGo.disabled = true;
      return;
    }

    const g = f.ref.game;
    const dead = g.status !== 'playable';
    p.hidden = false;
    p.classList.toggle('dead', dead);
    this.el.plTitle.textContent = g.title;
    this.el.plYear.textContent = g.year;
    this.el.plGenre.textContent = dead ? '고장' : g.genre;
    this.el.plDesc.textContent = dead
      ? '화면이 꺼져 있고 종이가 붙어 있다.'
      : g.description;
    this.el.plGo.textContent = dead
      ? '준비중'
      : '게임 시작';
    this.el.plGo.disabled = dead;
  },

  hidePlacard() { this.el.placard.hidden = true; },

  /* ------------------------------------------------------------ orientation */

  /** True when the player is driving with a thumb rather than a keyboard. */
  get touch() { return matchMedia('(pointer: coarse)').matches; },

  /**
   * The one-off welcome. Leads with the thing that actually works everywhere —
   * pick a machine — rather than with movement controls, which are optional on
   * desktop and gone entirely on touch.
   */
  arrived() {
    this.say(
      this.touch
        ? '오락기를 누르면 알아서 앉아서 시작합니다'
        : '오락기를 클릭하면 알아서 앉아서 시작합니다',
      7
    );
  },

  /* ------------------------------------------------------------- subtitle */

  say(text, seconds = 2.2) {
    const s = this.el.say;
    s.textContent = text;
    s.hidden = false;
    clearTimeout(this.sayTimer);
    this.sayTimer = setTimeout(() => { s.hidden = true; }, seconds * 1000);
  },

  /* ----------------------------------------------------------- story beats */

  enteredArcade() {
    this.el.hud.hidden = false;
    if (this.touch) this.el.touch.hidden = false;
  },

  momBeat(phase) {
    if (phase === 1) {
      this.hidePlacard();
      this.el.say.hidden = true;
      this.el.mom.hidden = false;
    } else if (phase === 2) {
      setTimeout(() => { this.el.mom.hidden = true; }, 1400);
    } else if (phase === 4) {
      this.el.mom.hidden = true;
      this.el.hud.hidden = true;
      this.el.touch.hidden = true;
      this.el.overStat.textContent = `PLAYED ${Session.spent} / ${COINS_PER_BILL}`;
      this.el.over.hidden = false;
    }
  },

  restart() {
    Sound.button();
    this.el.over.hidden = true;
    this.el.mom.hidden = true;
    this.el.hud.hidden = false;
    if (this.touch) this.el.touch.hidden = false;
    this.arcade.restart();
  }
};

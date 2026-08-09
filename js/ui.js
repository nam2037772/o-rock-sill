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
      front: $('front'), enter: $('enter-btn'),
      hud: $('hud'), coins: $('coins'), won: $('won'), sound: $('sound-btn'),
      placard: $('placard'), plTitle: $('pl-title'), plYear: $('pl-year'),
      plGenre: $('pl-genre'), plDesc: $('pl-desc'), plGo: $('pl-go'),
      say: $('say'), touch: $('touchhint'),
      mom: $('mom'), over: $('over'), overStat: $('over-stat'), again: $('again-btn')
    };

    this.el.enter.addEventListener('click', () => arcade.enter());
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
    const c = this.el.coins;
    c.innerHTML = '';
    if (!Session.exchanged) {
      this.el.won.textContent = '₩1,000';
      const note = document.createElement('span');
      note.className = 'coin';
      note.style.cssText = 'width:16px;height:9px;border-radius:1px;background:linear-gradient(#cbbd82,#9b8d55)';
      c.appendChild(note);
      return;
    }
    for (let i = 0; i < COINS_PER_BILL; i++) {
      const d = document.createElement('i');
      d.className = 'coin' + (i < Session.coins ? '' : ' spent');
      c.appendChild(d);
    }
    this.el.won.textContent = '₩' + (Session.coins * 100).toLocaleString();
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
      this.el.plDesc.textContent = '지폐를 넣으면 ₩100짜리 동전으로 바꿔준다.';
      this.el.plGo.textContent = Session.exchanged
        ? '이미 바꿨다'
        : (this.touch ? '₩1,000 넣기' : 'ENTER · ₩1,000 넣기');
      this.el.plGo.disabled = false;
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
      ? '살펴보기'
      : Session.coins > 0
        ? (this.touch ? '게임하기 · ₩100' : 'ENTER · 앉아서 게임하기')
        : (Session.exchanged ? '동전이 없다' : '동전부터 바꾸기');
    this.el.plGo.disabled = false;
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
    this.paintWallet();
    this.say(
      this.touch
        ? '오락기를 누르면 알아서 앉아서 시작합니다'
        : '오락기를 클릭하면 알아서 앉아서 시작합니다',
      7
    );
    clearTimeout(this.goalTimer);
    this.goalTimer = setTimeout(() => {
      if (!Session.played && !Session.exchanged) this.say('₩1,000짜리 한 장. 먼저 동전으로 바꾸자.', 4);
    }, 8200);
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
    this.el.front.classList.add('gone');
    setTimeout(() => { this.el.front.style.display = 'none'; }, 500);
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
    this.el.hud.hidden = true;
    this.el.touch.hidden = true;
    this.el.front.style.display = '';
    // let the display change land before we fade back in
    requestAnimationFrame(() => this.el.front.classList.remove('gone'));
    this.arcade.restart();
    this.paintWallet();
  }
};

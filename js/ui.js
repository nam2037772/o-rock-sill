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
      say: $('say'), touch: $('touch'), stick: $('stick'), knob: $('knob'), abtn: $('abtn'),
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

    if (matchMedia('(pointer: coarse)').matches) this.el.touch.hidden = false;
    this.bindStick();
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
      this.el.plGo.textContent = Session.exchanged ? '이미 바꿨다' : '₩1,000 넣기';
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
      : (Session.coins > 0 ? '₩100 넣기' : (Session.exchanged ? '동전이 없다' : '동전부터 바꾸기'));
    this.el.plGo.disabled = false;
  },

  hidePlacard() { this.el.placard.hidden = true; },

  /* ------------------------------------------------------------- subtitle */

  say(text, seconds = 2.2) {
    const s = this.el.say;
    s.textContent = text;
    s.hidden = false;
    clearTimeout(this.sayTimer);
    this.sayTimer = setTimeout(() => { s.hidden = true; }, seconds * 1000);
  },

  /* ----------------------------------------------------------- the stick */

  bindStick() {
    const stick = this.el.stick, knob = this.el.knob, arcade = this.arcade;
    let id = null, cx = 0, cy = 0, R = 42;

    const set = (dx, dy) => {
      const d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      const n = Math.min(1, d / R);
      arcade.input.ax = d ? (dx / d) * n : 0;
      arcade.input.ay = d ? (dy / d) * n : 0;
      if (d > 6) arcade.autoTarget = null;
    };
    const release = () => {
      id = null;
      knob.style.transform = '';
      arcade.input.ax = arcade.input.ay = 0;
    };

    stick.addEventListener('pointerdown', (e) => {
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2; R = r.width * 0.38;
      id = e.pointerId;
      stick.setPointerCapture(id);
      set(e.clientX - cx, e.clientY - cy);
      e.preventDefault();
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      set(e.clientX - cx, e.clientY - cy);
      e.preventDefault();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      stick.addEventListener(ev, (e) => { if (e.pointerId === id) release(); });
    }

    this.el.abtn.addEventListener('click', (e) => { e.preventDefault(); arcade.interact(); });
  },

  /* ----------------------------------------------------------- story beats */

  enteredArcade() {
    this.el.front.classList.add('gone');
    setTimeout(() => { this.el.front.style.display = 'none'; }, 500);
    this.el.hud.hidden = false;
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
    if (matchMedia('(pointer: coarse)').matches) this.el.touch.hidden = false;
    this.el.front.style.display = '';
    // let the display change land before we fade back in
    requestAnimationFrame(() => this.el.front.classList.remove('gone'));
    this.arcade.restart();
    this.paintWallet();
  }
};

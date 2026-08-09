/**
 * SOUND
 * -----
 * Everything you hear is generated in the browser with Web Audio — there are no
 * audio files in this project, so nothing here is sampled from or imitating any
 * existing recording. The music is an original 8-bar disco-funk loop in A minor,
 * the kind of thing that would have been coming out of a speaker bolted to the
 * ceiling of a Korean neighbourhood arcade in about 1984.
 *
 * Three buses:
 *   music  — the loop, ducked while a game is running
 *   amb    — room tone: CRT hum, distant machines, the odd bleep
 *   sfx    — coins, buttons, doors, the alarm
 *
 * Nothing starts until the player's first real interaction (autoplay policy).
 */

const BPM = 112;
const SPB = 60 / BPM;          // seconds per beat
const STEP = SPB / 4;          // sixteenth note

// A minor, one chord per bar. Intervals are semitones from A.
const PROG = [
  { root: 57, chord: [0, 3, 7, 10] },   // Am7
  { root: 62, chord: [0, 3, 7, 10] },   // Dm7
  { root: 55, chord: [0, 4, 7, 10] },   // G7
  { root: 60, chord: [0, 4, 7, 11] }    // Cmaj7
];

// Sixteenth-note bass rhythm: 1 = play, 0 = rest. Octave jumps on the offbeats.
const BASS = [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0];
const BASS_OCT = [0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 0, 0, 0, 12, 0];
const HAT = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1];
const STAB = [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2];

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const Sound = {
  ctx: null,
  on: true,
  ready: false,
  buses: {},
  _step: 0,
  _next: 0,
  _timer: null,
  _amb: null,
  _duck: 1,

  /** Called from the first click / keypress. Safe to call repeatedly. */
  start() {
    if (this.ready) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = this.on ? 0.9 : 0;
    master.connect(ctx.destination);

    // gentle bus compression so coins never spike over the music
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4; comp.release.value = 0.25;
    comp.connect(master);

    const music = ctx.createGain(); music.gain.value = 0.26;
    // lo-fi: roll the top off, the way a ceiling speaker does
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass'; tone.frequency.value = 3400; tone.Q.value = 0.6;
    // slap-back delay for a bit of room
    const dly = ctx.createDelay(0.5); dly.delayTime.value = SPB * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.22;
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    music.connect(tone); tone.connect(comp);
    tone.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(comp);

    const amb = ctx.createGain(); amb.gain.value = 0.5;
    amb.connect(comp);
    const sfx = ctx.createGain(); sfx.gain.value = 0.6;
    sfx.connect(comp);

    this.buses = { master, music, amb, sfx, comp };
    this.ready = true;

    this._startAmbience();
    this._next = ctx.currentTime + 0.15;
    this._step = 0;
    this._timer = setInterval(() => this._schedule(), 25);
  },

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },

  setOn(v) {
    this.on = v;
    if (!this.ready) return;
    const g = this.buses.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(v ? 0.9 : 0, this.ctx.currentTime, 0.08);
  },

  /** Drop the arcade music under a running game, then bring it back. */
  duck(amount = 0.12, time = 0.6) {
    this._duck = amount;
    if (!this.ready) return;
    const g = this.buses.music.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(0.26 * amount, this.ctx.currentTime, time / 3);
    this.buses.amb.gain.setTargetAtTime(0.5 * amount, this.ctx.currentTime, time / 3);
  },

  unduck(time = 0.9) {
    this._duck = 1;
    if (!this.ready) return;
    this.buses.music.gain.setTargetAtTime(0.26, this.ctx.currentTime, time / 3);
    this.buses.amb.gain.setTargetAtTime(0.5, this.ctx.currentTime, time / 3);
  },

  /* ------------------------------------------------------------- the loop */

  _schedule() {
    if (!this.ready) return;
    const ctx = this.ctx;
    while (this._next < ctx.currentTime + 0.12) {
      this._playStep(this._step, this._next);
      this._next += STEP;
      this._step++;
    }
  },

  _playStep(step, t) {
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const ch = PROG[bar % PROG.length];
    const phrase = Math.floor(bar / 4) % 2;      // A / B halves of the 8-bar loop

    if (s16 % 4 === 0) this._kick(t);
    if (s16 === 4 || s16 === 12) this._snare(t);
    if (HAT[s16]) this._hat(t, s16 === 15 ? 0.16 : 0.055, s16 === 6 || s16 === 14);
    if (BASS[s16]) this._bass(t, midi(ch.root - 24 + BASS_OCT[s16]));
    if (STAB[s16]) this._stab(t, ch);
    // the little synth line only shows up in the second half of the loop
    if (phrase === 1 && s16 % 2 === 0) {
      const n = ch.root + ch.chord[ARP[(step / 2) % ARP.length] % ch.chord.length] + 12;
      this._arp(t, midi(n));
    }
    // handclap fill at the turnaround
    if (bar % 8 === 7 && s16 >= 12) this._hat(t, 0.09, true);
  },

  _env(node, t, a, d, peak) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + d);
  },

  _kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    this._env(g, t, 0.004, 0.20, 0.9);
    o.connect(g); g.connect(this.buses.music);
    o.start(t); o.stop(t + 0.26);
  },

  _snare(t) {
    const ctx = this.ctx;
    const n = this._noise(0.18), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    this._env(g, t, 0.004, 0.13, 0.35);
    n.connect(f); f.connect(g); g.connect(this.buses.music);
    n.start(t); n.stop(t + 0.2);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t);
    this._env(og, t, 0.003, 0.07, 0.16);
    o.connect(og); og.connect(this.buses.music);
    o.start(t); o.stop(t + 0.12);
  },

  _hat(t, dur, open) {
    const n = this._noise(dur + 0.05), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = open ? 6000 : 8200;
    this._env(g, t, 0.002, dur, open ? 0.13 : 0.08);
    n.connect(f); f.connect(g); g.connect(this.buses.music);
    n.start(t); n.stop(t + dur + 0.06);
  },

  _bass(t, freq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq * 6, t);
    f.frequency.exponentialRampToValueAtTime(freq * 2.2, t + 0.12);
    f.Q.value = 6;
    this._env(g, t, 0.006, 0.15, 0.5);
    o.connect(f); f.connect(g); g.connect(this.buses.music);
    o.start(t); o.stop(t + 0.22);
  },

  _stab(t, ch) {
    const ctx = this.ctx;
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(900, t + 0.18);
    this._env(g, t, 0.008, 0.16, 0.13);
    f.connect(g); g.connect(this.buses.music);
    for (const iv of ch.chord) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midi(ch.root + iv) * (Math.random() < 0.5 ? 1.001 : 0.999);
      o.connect(f); o.start(t); o.stop(t + 0.24);
    }
  },

  _arp(t, freq) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq;
    this._env(g, t, 0.004, 0.09, 0.055);
    o.connect(g); g.connect(this.buses.music);
    o.start(t); o.stop(t + 0.14);
  },

  _noise(dur) {
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },

  /* ---------------------------------------------------------- room ambience */

  _startAmbience() {
    const ctx = this.ctx;
    // continuous filtered noise = air handling + the murmur of a busy room
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(f); f.connect(g); g.connect(this.buses.amb);
    src.start();
    this._amb = src;

    // mains hum off a wall of CRTs
    for (const [hz, lvl] of [[60, 0.035], [120, 0.018]]) {
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz; og.gain.value = lvl;
      o.connect(og); og.connect(this.buses.amb); o.start();
    }

    this._bleepLoop();
  },

  /** Somebody else's game, two rows over. */
  _bleepLoop() {
    if (!this.ready) return;
    const t = this.ctx.currentTime + 0.01;
    const notes = [523, 659, 784, 880, 1047, 392];
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      o.type = Math.random() < 0.5 ? 'square' : 'triangle';
      o.frequency.value = notes[Math.floor(Math.random() * notes.length)] * (Math.random() < 0.3 ? 0.5 : 1);
      const tt = t + i * 0.09;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.045, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.1);
      o.connect(g);
      if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; g.connect(pan); pan.connect(this.buses.amb); }
      else g.connect(this.buses.amb);
      o.start(tt); o.stop(tt + 0.14);
    }
    setTimeout(() => this._bleepLoop(), 900 + Math.random() * 2600);
  },

  /* ----------------------------------------------------------------- sfx */

  _beep(freq, dur, type = 'square', level = 0.25, slide = 0, delay = 0) {
    if (!this.ready || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.buses.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  },

  /** ₩100 dropping through the mech and hitting the box. */
  coin(delay = 0) {
    if (!this.ready) return;
    this._beep(1660, 0.09, 'square', 0.20, -260, delay);
    this._beep(2490, 0.07, 'square', 0.12, -400, delay + 0.02);
    this._beep(1180, 0.14, 'triangle', 0.16, -500, delay + 0.10);
    const ctx = this.ctx, t = ctx.currentTime + delay + 0.16;
    const n = this._noise(0.08), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3200;
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    n.connect(f); f.connect(g); g.connect(this.buses.sfx);
    n.start(t); n.stop(t + 0.1);
  },

  /** The changer swallowing a note and paying out a fistful of coins. */
  exchange() {
    if (!this.ready) return;
    this._beep(180, 0.3, 'sawtooth', 0.12, 60);       // motor pulling the bill in
    for (let i = 0; i < 10; i++) this.coin(0.45 + i * 0.085);
  },

  credit() {
    this._beep(784, 0.08, 'square', 0.2);
    this._beep(1046, 0.16, 'square', 0.2, 0, 0.09);
  },

  button() { this._beep(440, 0.05, 'square', 0.14, 120); },
  deny()   { this._beep(180, 0.16, 'square', 0.16, -60); },
  step()   {
    if (!this.ready || !this.on) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noise(0.06), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    n.connect(f); f.connect(g); g.connect(this.buses.sfx);
    n.start(t); n.stop(t + 0.08);
  },

  /** Shop door chime. */
  door() {
    this._beep(1318, 0.5, 'sine', 0.22);
    this._beep(1046, 0.7, 'sine', 0.20, 0, 0.16);
  },

  /** Mom. */
  alarm() {
    if (!this.ready) return;
    for (let i = 0; i < 4; i++) {
      this._beep(880, 0.18, 'sawtooth', 0.20, -420, i * 0.22);
      this._beep(440, 0.18, 'square', 0.12, 260, i * 0.22 + 0.02);
    }
  },

  /** Everything in the room browning out at once. */
  powerDip() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const n = this._noise(0.5), g = ctx.createGain(), f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 0.5);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(f); f.connect(g); g.connect(this.buses.sfx);
    n.start(t); n.stop(t + 0.55);
    this._beep(140, 0.6, 'sawtooth', 0.14, -80);
  }
};

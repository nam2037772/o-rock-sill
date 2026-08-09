/**
 * THE SESSION
 * -----------
 * One visit to the arcade: the ₩1,000 note in your pocket, the ₩100 coins you
 * changed it for, and where you were standing. Kept in sessionStorage so a
 * refresh drops you back where you were rather than out on the pavement.
 *
 * This is play money for a nostalgia mechanic. Nothing here touches anything real.
 */

const KEY = 'orocksill.session.v1';
export const COIN_VALUE = 100;
export const COINS_PER_BILL = 10;

export const Session = {
  bill: false,          // the ₩1,000 note, still folded up
  exchanged: true,
  coins: 99,
  spent: 0,
  x: 0, y: 0,
  machine: null,
  inside: true,
  played: true,     // true once a game has been launched; retires the on-screen guidance

  load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      Object.assign(this, s);
      return s;
    } catch { return null; }
  },

  save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        bill: this.bill, exchanged: this.exchanged, coins: this.coins, spent: this.spent,
        x: this.x, y: this.y, machine: this.machine, inside: this.inside, played: this.played
      }));
    } catch { /* private browsing, no matter */ }
  },

  patch(o) { Object.assign(this, o); this.save(); },

  /** Feed the note into the changer. */
  exchange() {
    return true;
  },

  spend() {
    this.played = true;
    this.save();
    return true;
  },

  reset() {
    this.bill = false;
    this.exchanged = true;
    this.coins = 99;
    this.spent = 0;
    this.machine = null;
    this.inside = true;
    this.played = true;
    this.x = 0; this.y = 0;
    this.save();
  }
};

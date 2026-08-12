/* ---------------------------------------------------------------
   Focus timer (pomodoro + plain countdown), alarms, stopwatch.
   All three tick off the shared 1s loop in app.js.
   --------------------------------------------------------------- */
import { pad, chime, toast, hhmmToMinutes } from './util.js';
import { t } from './i18n.js';

/* ------------------------------ focus timer ------------------------------ */

export class FocusTimer {
  constructor(settings, onTick) {
    this.settings = settings;
    this.onTick = onTick;
    this.mode = 'idle';        // idle | work | short | long | countdown
    this.running = false;
    this.remaining = 0;        // ms
    this.total = 0;
    this.round = 0;
    this.last = 0;
  }

  get label() {
    return {
      work: t('Focus · round {n}', { n: this.round || 1 }),
      short: t('Break'),
      long: t('Long rest'),
      countdown: t('Timer'),
      idle: t('Ready'),
    }[this.mode];
  }

  startPomodoro() {
    this.round = 1;
    this.begin('work');
  }

  begin(mode, minutes) {
    const p = this.settings.pomodoro;
    const mins = minutes ?? { work: p.work, short: p.short, long: p.long }[mode] ?? 25;
    this.mode = mode;
    this.total = Math.max(1, mins) * 60000;
    this.remaining = this.total;
    this.running = true;
    this.last = Date.now();
    this.onTick(this);
  }

  countdown(minutes) { this.begin('countdown', minutes); }

  toggle() {
    if (this.mode === 'idle') return this.startPomodoro();
    this.running = !this.running;
    this.last = Date.now();
    this.onTick(this);
  }

  stop() {
    this.mode = 'idle';
    this.running = false;
    this.remaining = 0;
    this.total = 0;
    this.round = 0;
    this.onTick(this);
  }

  skip() { this.complete(true); }

  complete(skipped = false) {
    const p = this.settings.pomodoro;
    if (!skipped && p.sound) chime(this.settings.soundVolume, this.mode === 'work' ? [880, 1320, 1760] : [660, 880]);
    if (this.mode === 'countdown') {
      if (!skipped) toast(`⏰ ${t('Time is up!')}`);
      return this.stop();
    }
    if (this.mode === 'work') {
      const isLong = this.round % Math.max(1, p.rounds) === 0;
      if (!skipped) toast(t(isLong ? 'Round done — take a long break!' : 'Focus time is up — take a break!'));
      this.begin(isLong ? 'long' : 'short');
    } else {
      this.round += 1;
      if (!skipped) toast(t('Back to focus 💪'));
      this.begin('work');
    }
    this.running = p.autoStart || skipped;
    this.onTick(this);
  }

  tick() {
    if (!this.running || this.mode === 'idle') return;
    const now = Date.now();
    this.remaining -= now - this.last;
    this.last = now;
    if (this.remaining <= 0) { this.remaining = 0; this.complete(); return; }
    this.onTick(this);
  }

  get display() {
    const t = Math.max(0, Math.ceil(this.remaining / 1000));
    return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
  }

  get progress() { return this.total ? 1 - this.remaining / this.total : 0; }
}

/* ------------------------------ alarms ------------------------------ */

export class AlarmEngine {
  constructor(settings, onFire) {
    this.settings = settings;
    this.onFire = onFire;
    this.fired = new Set();
  }

  check(parts) {
    const stamp = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    const nowMin = parts.hour * 60 + parts.minute;
    for (const a of this.settings.alarms || []) {
      if (!a.enabled) continue;
      if (a.days?.length && !a.days.includes(parts.weekday)) continue;
      if (hhmmToMinutes(a.time) !== nowMin) continue;
      const key = `${a.id}@${stamp}`;
      if (this.fired.has(key)) continue;
      this.fired.add(key);
      this.onFire(a);
    }
    if (this.fired.size > 40) this.fired = new Set([...this.fired].slice(-20));
  }
}

/* ------------------------------ stopwatch ------------------------------ */

export class Stopwatch {
  constructor() { this.elapsed = 0; this.running = false; this.last = 0; this.laps = []; }

  toggle() {
    this.running = !this.running;
    this.last = Date.now();
  }

  tick() {
    if (!this.running) return;
    const now = Date.now();
    this.elapsed += now - this.last;
    this.last = now;
  }

  lap() { if (this.running) this.laps.unshift(this.elapsed); }
  reset() { this.elapsed = 0; this.running = false; this.laps = []; }

  static format(ms) {
    const t = Math.floor(ms / 10);
    const cs = t % 100;
    const s = Math.floor(t / 100) % 60;
    const m = Math.floor(t / 6000) % 60;
    const hr = Math.floor(t / 360000);
    return `${hr ? `${pad(hr)}:` : ''}${pad(m)}:${pad(s)}.${pad(cs)}`;
  }

  get display() { return Stopwatch.format(this.elapsed); }
}
